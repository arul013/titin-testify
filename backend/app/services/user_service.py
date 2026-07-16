"""
Learning Nexus CBT — User Service (Business Logic)
"""

from typing import Optional
import string
import random
from fastapi import HTTPException, status
from app.database import get_supabase_client, get_supabase_admin
from app.models.user import (
    CreateUserRequest,
    UpdateUserRequest,
    ChangeRoleRequest,
    UserProfile,
    UserListResponse,
    UserRole,
    GenerateUsersRequest,
    GeneratedUserItem,
    GenerateUsersResponse,
)
# pyrefly: ignore [missing-import]
from gotrue.errors import AuthApiError


class UserService:
    """Handles user management business logic."""

    @staticmethod
    async def list_users(page: int = 1, per_page: int = 20, search: str = "", role_filter: Optional[str] = None) -> UserListResponse:
        """List all users with pagination and optional search."""
        supabase = get_supabase_admin()
        offset = (page - 1) * per_page

        query = supabase.table("profiles").select("*", count="exact")

        if role_filter:
            query = query.eq("role", role_filter)

        if search:
            query = query.or_(
                f"username.ilike.%{search}%,full_name.ilike.%{search}%"
            )

        query = query.order("created_at", desc=True)
        query = query.range(offset, offset + per_page - 1)
        result = query.execute()

        users = [
            UserProfile(
                id=u["id"],
                username=u["username"],
                full_name=u["full_name"],
                role=u["role"],
                avatar_url=u.get("avatar_url"),
                is_active=u.get("is_active", True),
                force_change_password=u.get("force_change_password", False),
                created_at=u.get("created_at"),
                updated_at=u.get("updated_at"),
            )
            for u in (result.data or [])
        ]

        return UserListResponse(
            users=users,
            total=result.count or 0,
            page=page,
            per_page=per_page,
        )

    @staticmethod
    async def get_user(user_id: str) -> UserProfile:
        """Get a single user profile by ID."""
        supabase = get_supabase_admin()

        result = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan",
            )

        u = result.data
        return UserProfile(
            id=u["id"],
            username=u["username"],
            full_name=u["full_name"],
            role=u["role"],
            avatar_url=u.get("avatar_url"),
            is_active=u.get("is_active", True),
            force_change_password=u.get("force_change_password", False),
            created_at=u.get("created_at"),
            updated_at=u.get("updated_at"),
        )

    @staticmethod
    async def create_user(request: CreateUserRequest) -> UserProfile:
        """Create a new user account (Supabase Auth + profile).
        
        1. Creates user in Supabase Auth
        2. Creates corresponding profile in profiles table
        """
        supabase = get_supabase_admin()

        # Check if username already exists
        existing = (
            supabase.table("profiles")
            .select("id")
            .eq("username", request.username)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username sudah digunakan",
            )

        # Create user in Supabase Auth
        try:
            auth_response = supabase.auth.admin.create_user(
                {
                    "email": request.email,
                    "password": request.password,
                    "email_confirm": True,  # Auto-confirm since admin creates the account
                }
            )
        except AuthApiError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal membuat akun: {str(e)}",
            )

        user = auth_response.user
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat akun pengguna",
            )

        # Create profile
        profile_data = {
            "id": str(user.id),
            "username": request.username,
            "full_name": request.full_name,
            "role": request.role.value,
            "is_active": True,
            "force_change_password": request.role == UserRole.ADMIN,
        }

        try:
            result = supabase.table("profiles").insert(profile_data).execute()
        except Exception as e:
            # Rollback: delete the auth user if profile creation fails
            try:
                supabase.auth.admin.delete_user(str(user.id))
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal membuat profil: {str(e)}",
            )

        profile = result.data[0] if result.data else profile_data

        return UserProfile(
            id=str(user.id),
            email=request.email,
            username=profile["username"],
            full_name=profile["full_name"],
            role=profile["role"],
            avatar_url=profile.get("avatar_url"),
            is_active=profile.get("is_active", True),
            force_change_password=profile.get("force_change_password", False),
            created_at=profile.get("created_at"),
            updated_at=profile.get("updated_at"),
        )

    @staticmethod
    async def update_user(user_id: str, request: UpdateUserRequest) -> UserProfile:
        """Update a user's profile information."""
        supabase = get_supabase_admin()

        # Build update data (only non-None fields)
        update_data = {}
        if request.username is not None:
            # Check username uniqueness
            existing = (
                supabase.table("profiles")
                .select("id")
                .eq("username", request.username)
                .neq("id", user_id)
                .execute()
            )
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username sudah digunakan",
                )
            update_data["username"] = request.username

        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        if request.is_active is not None:
            # Super Admin Owner Protection: prevent deactivating the oldest Super Admin
            if request.is_active is False:
                oldest_super = (
                    supabase.table("profiles")
                    .select("id")
                    .eq("role", "super_admin")
                    .order("created_at", desc=False)
                    .limit(1)
                    .execute()
                )
                if oldest_super.data and oldest_super.data[0]["id"] == user_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Akun Super Admin Utama (akun pembuat pertama) tidak dapat dinonaktifkan.",
                    )
            update_data["is_active"] = request.is_active
        if request.avatar_url is not None:
            update_data["avatar_url"] = request.avatar_url

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada data yang diubah",
            )

        result = (
            supabase.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan",
            )

        u = result.data[0]
        return UserProfile(
            id=u["id"],
            username=u["username"],
            full_name=u["full_name"],
            role=u["role"],
            avatar_url=u.get("avatar_url"),
            is_active=u.get("is_active", True),
            force_change_password=u.get("force_change_password", False),
            created_at=u.get("created_at"),
            updated_at=u.get("updated_at"),
        )

    @staticmethod
    async def delete_user(user_id: str) -> None:
        """Delete a user (auth account + profile).
        
        Profile is auto-deleted via CASCADE, so we only need
        to delete the auth user.
        """
        supabase = get_supabase_admin()

        # Super Admin Owner Protection
        oldest_super = (
            supabase.table("profiles")
            .select("id")
            .eq("role", "super_admin")
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        if oldest_super.data and oldest_super.data[0]["id"] == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Super Admin Utama (akun pembuat pertama) tidak dapat dihapus.",
            )

        try:
            supabase.auth.admin.delete_user(user_id)
        except AuthApiError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal menghapus pengguna: {str(e)}",
            )

    @staticmethod
    async def change_role(user_id: str, request: ChangeRoleRequest) -> UserProfile:
        """Change a user's role (super_admin only)."""
        supabase = get_supabase_admin()

        # Super Admin Owner Protection
        oldest_super = (
            supabase.table("profiles")
            .select("id")
            .eq("role", "super_admin")
            .order("created_at", desc=False)
            .limit(1)
            .execute()
        )
        if oldest_super.data and oldest_super.data[0]["id"] == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Peran Super Admin Utama tidak dapat diubah.",
            )

        result = (
            supabase.table("profiles")
            .update({"role": request.role.value})
            .eq("id", user_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan",
            )

        u = result.data[0]
        return UserProfile(
            id=u["id"],
            username=u["username"],
            full_name=u["full_name"],
            role=u["role"],
            avatar_url=u.get("avatar_url"),
            is_active=u.get("is_active", True),
            force_change_password=u.get("force_change_password", False),
            created_at=u.get("created_at"),
            updated_at=u.get("updated_at"),
        )

    @staticmethod
    async def generate_users(request: GenerateUsersRequest) -> GenerateUsersResponse:
        """Generate multiple peserta (examinees) accounts in bulk from list of full names."""
        supabase = get_supabase_admin()
        generated_users = []

        if not request.names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Daftar nama lengkap peserta tidak boleh kosong.",
            )

        for i, full_name in enumerate(request.names, 1):
            full_name = full_name.strip()
            if not full_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Nama lengkap peserta pada baris {i} tidak boleh kosong.",
                )

            # Ambil kata terakhir dari nama lengkap
            name_parts = full_name.split()
            last_word = name_parts[-1] if name_parts else "peserta"

            # Bersihkan kata terakhir menjadi alfanumerik saja
            clean_last_word = "".join(c for c in last_word if c.isalnum()).lower()
            if not clean_last_word:
                clean_last_word = "peserta"

            # Cari username unik
            username = ""
            while True:
                random_suffix = f"{random.randint(1000, 9999)}"
                username = f"{clean_last_word}_{random_suffix}"

                existing = (
                    supabase.table("profiles")
                    .select("id")
                    .eq("username", username)
                    .execute()
                )
                if not existing.data:
                    break

            # Generate password acak 8 karakter
            chars = string.ascii_letters + string.digits
            password = "".join(random.choice(chars) for _ in range(8))

            # Email dummy untuk Supabase Auth
            email = f"{username}@testify.id"

            # Create user in Auth
            try:
                auth_response = supabase.auth.admin.create_user(
                    {
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                    }
                )
            except AuthApiError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Gagal membuat akun peserta untuk '{full_name}': {str(e)}",
                )

            user = auth_response.user
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Gagal membuat akun peserta untuk '{full_name}'",
                )

            # Create Profile
            profile_data = {
                "id": str(user.id),
                "username": username,
                "full_name": full_name,
                "role": UserRole.PESERTA.value,
                "is_active": True,
            }

            try:
                supabase.table("profiles").insert(profile_data).execute()
            except Exception as e:
                # Rollback Auth User
                try:
                    supabase.auth.admin.delete_user(str(user.id))
                except Exception:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Gagal membuat profil peserta untuk '{full_name}': {str(e)}",
                )

            generated_users.append(
                GeneratedUserItem(
                    id=str(user.id),
                    username=username,
                    full_name=full_name,
                    password=password,
                    email=email,
                )
            )

        return GenerateUsersResponse(users=generated_users)

    @staticmethod
    async def reset_password(user_id: str, current_user_role: str) -> GeneratedUserItem:
        """Reset a user's password to a random 8-character password.
        
        Rules:
        - Admin can only reset Peserta
        - Super Admin can reset Admin and Peserta
        - Cannot reset Super Admin Utama (oldest super_admin)
        """
        supabase = get_supabase_admin()
        
        # 1. Fetch user profile
        target_profile = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not target_profile.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pengguna tidak ditemukan",
            )
        
        target = target_profile.data
        target_role = target["role"]
        
        # 2. Authorization guards
        if current_user_role == "admin" and target_role != "peserta":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin hanya diizinkan mengatur ulang password untuk Peserta.",
            )
            
        # Check Super Admin Owner Protection
        if target_role == "super_admin":
            oldest_super = (
                supabase.table("profiles")
                .select("id")
                .eq("role", "super_admin")
                .order("created_at", desc=False)
                .limit(1)
                .execute()
            )
            if oldest_super.data and oldest_super.data[0]["id"] == user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password Super Admin Utama (akun pembuat pertama) tidak dapat diatur ulang.",
                )
                
        # 3. Generate password
        chars = string.ascii_letters + string.digits
        new_password = "".join(random.choice(chars) for _ in range(8))
        
        # 4. Update password in Supabase Auth & retrieve real email
        try:
            auth_response = supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": new_password}
            )
            # Extract real email from auth response; fallback to dummy for peserta
            real_email = (
                auth_response.user.email
                if auth_response.user and auth_response.user.email
                else None
            )
        except AuthApiError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gagal mengatur ulang password di sistem auth: {str(e)}",
            )
            
        # 5. If target is admin, set force_change_password to True
        update_profile = {}
        if target_role == "admin":
            update_profile["force_change_password"] = True
            
        if update_profile:
            supabase.table("profiles").update(update_profile).eq("id", user_id).execute()
            
        # Use real email from auth for admins, dummy email for peserta
        email = real_email or f"{target['username']}@testify.id"
        
        return GeneratedUserItem(
            id=user_id,
            username=target["username"],
            full_name=target["full_name"],
            password=new_password,
            email=email
        )
