"""
Learning Nexus CBT — Auth Service (Business Logic)
"""

from fastapi import HTTPException, status
from app.database import get_supabase_client, get_supabase_admin
from app.models.user import LoginRequest, AuthResponse, UserProfile
# pyrefly: ignore [missing-import]
from gotrue.errors import AuthApiError


class AuthService:
    """Handles authentication business logic via Supabase Auth."""

    @staticmethod
    async def login(request: LoginRequest) -> AuthResponse:
        """Authenticate user with username and password.
        
        Resolves username to email via profiles and gotrue admin,
        then authenticates credentials via Supabase Auth.
        """
        admin = get_supabase_admin()
        
        # 1. Resolve username to user ID
        try:
            profile_res = (
                admin.table("profiles")
                .select("id")
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

        user_id = profile_res.data[0]["id"]

        # 2. Get email from auth admin
        try:
            user_res = admin.auth.admin.get_user_by_id(user_id)
            user = user_res.user if hasattr(user_res, "user") else user_res
            email = user.email
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
            )

        # 3. Authenticate with Supabase Auth
        supabase = get_supabase_client()
        try:
            auth_response = supabase.auth.sign_in_with_password(
                {"email": email, "password": request.password}
            )
        except AuthApiError as e:
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

        # Fetch user profile
        profile_result = (
            supabase.table("profiles")
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

        # Fetch profile
        profile_result = (
            supabase.table("profiles")
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
                user = user_res.user if hasattr(user_res, "user") else user_res
                email = user.email
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Gagal memverifikasi pengguna.",
                )
            try:
                get_supabase_client().auth.sign_in_with_password(
                    {"email": email, "password": current_password}
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

