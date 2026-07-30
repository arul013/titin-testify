"""
Learning Nexus CBT — Auth Service (Business Logic)
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import HTTPException, status
from app.database import get_supabase_client, get_supabase_admin
from app.models.user import LoginRequest, AuthResponse, UserProfile
from app.config import get_settings
from app.services.audit_service import AuditService
# pyrefly: ignore [missing-import]
from gotrue.errors import AuthApiError


def _parse_dt(v) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


class AuthService:
    """Handles authentication business logic via Supabase Auth."""

    @staticmethod
    def _register_failed_login(admin, user_id: str, prev_count: int, http_request: Any = None) -> None:
        """Naikkan hitungan gagal login; kunci akun bila melewati ambang."""
        settings = get_settings()
        count = (prev_count or 0) + 1
        update: dict = {"failed_login_count": count}
        if count >= settings.login_max_failures:
            locked = datetime.now(timezone.utc) + timedelta(minutes=settings.login_lockout_minutes)
            update["locked_until"] = locked.isoformat()
            update["failed_login_count"] = 0  # reset penghitung setelah dikunci
            ip, ua = AuditService.context_from_request(http_request)
            AuditService.log(
                action="auth.account_locked", entity_type="user", entity_id=user_id,
                actor_id=user_id, actor_role="peserta",
                summary=f"Akun dikunci {settings.login_lockout_minutes} menit setelah {count} gagal login.",
                ip=ip, user_agent=ua,
            )
        try:
            admin.table("profiles").update(update).eq("id", user_id).execute()
        except Exception:
            pass  # jangan gagalkan alur login karena kegagalan bookkeeping

    @staticmethod
    async def login(request: LoginRequest, http_request: Any = None) -> AuthResponse:
        """Authenticate user with username and password.

        Resolves username to email via profiles and gotrue admin, cek lockout
        per-akun, lalu autentikasi kredensial via Supabase Auth.
        """
        admin = get_supabase_admin()

        # 1. Resolve username to user ID (+ status lockout)
        try:
            profile_res = (
                admin.table("profiles")
                .select("id, failed_login_count, locked_until")
                .eq("username", request.username)
                .execute()
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mencari profil pengguna: {str(e)}"
            )

        if not profile_res.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
            )

        prow = profile_res.data[0]
        user_id = prow["id"]

        # 1b. Lockout per-akun (anti-brute-force / credential stuffing)
        locked_until = _parse_dt(prow.get("locked_until"))
        now = datetime.now(timezone.utc)
        if locked_until and locked_until > now:
            mins = max(1, math.ceil((locked_until - now).total_seconds() / 60))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akun terkunci sementara karena terlalu banyak gagal login. Coba lagi dalam ~{mins} menit.",
            )

        # 2. Get email from auth admin
        try:
            user_res = admin.auth.admin.get_user_by_id(user_id)
            _u = getattr(user_res, "user", None) or user_res
            email = getattr(_u, "email", None)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
            )

        # 3. Authenticate with Supabase Auth
        supabase = get_supabase_client()
        try:
            auth_response = supabase.auth.sign_in_with_password(
                {"email": email, "password": request.password}  # type: ignore[arg-type]
            )
        except AuthApiError as e:
            # Password salah → catat kegagalan (kunci akun bila melewati ambang).
            AuthService._register_failed_login(
                admin, user_id, prow.get("failed_login_count") or 0, http_request
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
            )

        user = auth_response.user
        session = auth_response.session

        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Gagal melakukan autentikasi",
            )

        # Sukses → reset penghitung gagal + buka kunci (bila ada).
        if (prow.get("failed_login_count") or 0) or prow.get("locked_until"):
            try:
                admin.table("profiles").update(
                    {"failed_login_count": 0, "locked_until": None}
                ).eq("id", user_id).execute()
            except Exception:
                pass

        # Fetch user profile (service-role → tak bergantung RLS authenticated)
        profile_result = (
            admin.table("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .execute()
        )

        if not profile_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil pengguna tidak ditemukan. Hubungi admin.",
            )

        profile = profile_result.data

        # Check if user is active
        if not profile.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Akun Anda telah dinonaktifkan. Hubungi admin.",
            )

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=session.expires_in,
            user=UserProfile(
                id=str(user.id),
                email=user.email,
                username=profile["username"],
                full_name=profile["full_name"],
                role=profile["role"],
                avatar_url=profile.get("avatar_url"),
                is_active=profile.get("is_active", True),
                force_change_password=profile.get("force_change_password", False),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            ),
        )

    @staticmethod
    async def refresh_token(refresh_token: str) -> AuthResponse:
        """Refresh an expired access token."""
        supabase = get_supabase_client()

        try:
            auth_response = supabase.auth.refresh_session(refresh_token)
        except AuthApiError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token tidak valid atau sudah kedaluwarsa",
            )

        user = auth_response.user
        session = auth_response.session

        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Gagal memperbarui sesi",
            )

        # Fetch profile (service-role → tak bergantung RLS authenticated)
        profile_result = (
            get_supabase_admin()
            .table("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .execute()
        )

        profile = profile_result.data or {}

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=session.expires_in,
            user=UserProfile(
                id=str(user.id),
                email=user.email,
                username=profile.get("username", ""),
                full_name=profile.get("full_name", ""),
                role=profile.get("role", "peserta"),
                avatar_url=profile.get("avatar_url"),
                is_active=profile.get("is_active", True),
                force_change_password=profile.get("force_change_password", False),
                created_at=profile.get("created_at"),
                updated_at=profile.get("updated_at"),
            ),
        )

    @staticmethod
    async def logout(access_token: str) -> None:
        """Sign out the user and invalidate the session."""
        supabase = get_supabase_admin()
        try:
            supabase.auth.admin.sign_out(access_token)
        except Exception:
            # Even if sign-out fails server-side, the client should clear tokens
            pass

    @staticmethod
    async def change_password(
        user_id: str,
        new_password: str,
        current_password: str | None = None,
    ) -> None:
        """Change the password for the current user and reset force_change_password flag.

        If ``current_password`` is provided, it is verified first (voluntary change).
        """
        supabase = get_supabase_admin()

        # 0. Verify current password (voluntary change) via a sign-in attempt.
        if current_password is not None:
            try:
                user_res = supabase.auth.admin.get_user_by_id(user_id)
                _u = getattr(user_res, "user", None) or user_res
                email = getattr(_u, "email", None)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Gagal memverifikasi pengguna.",
                )
            try:
                get_supabase_client().auth.sign_in_with_password(
                    {"email": email, "password": current_password}  # type: ignore[arg-type]
                )
            except AuthApiError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password lama yang Anda masukkan salah.",
                )

        # 1. Update password in Supabase Auth
        try:
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
        except AuthApiError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal mengganti password: {str(e)}",
            )
            
        # 2. Reset force_change_password to False in profiles table
        try:
            supabase.table("profiles").update({"force_change_password": False}).eq("id", user_id).execute()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mereset status perubahan password: {str(e)}",
            )

