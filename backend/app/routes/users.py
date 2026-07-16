"""
Learning Nexus CBT — User Management Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.models.user import (
    CreateUserRequest,
    UpdateUserRequest,
    ChangeRoleRequest,
    UserProfile,
    UserListResponse,
    MessageResponse,
    UserRole,
    GenerateUsersRequest,
    GenerateUsersResponse,
    ResetPasswordResponse,
)
from app.services.user_service import UserService
from app.dependencies import require_admin, require_super_admin

router = APIRouter(prefix="/api/users", tags=["User Management"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: str = Query("", description="Search by username or full name"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    current_user: UserProfile = Depends(require_admin),
):
    """List all users with pagination and search (admin only)."""
    # Security constraint: Admin role can ONLY query/see 'peserta' role
    if current_user.role == UserRole.ADMIN:
        role = UserRole.PESERTA.value
        
    return await UserService.list_users(page=page, per_page=per_page, search=search, role_filter=role)


@router.post("", response_model=UserProfile, status_code=201)
async def create_user(
    request: CreateUserRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Create a new user account (admin only).
    
    Creates both the Supabase Auth account and the profile record.
    """
    # Security constraint: Only Super Admin can create another Super Admin (Multi-SA backup)
    if request.role == UserRole.SUPER_ADMIN and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya Super Admin yang diperbolehkan membuat akun Super Admin cadangan.",
        )

    # Security constraint: Admin role can ONLY create 'peserta' role
    if current_user.role == UserRole.ADMIN and request.role != UserRole.PESERTA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin hanya diperbolehkan membuat pengguna dengan peran Peserta.",
        )
        
    return await UserService.create_user(request)


@router.get("/{user_id}", response_model=UserProfile)
async def get_user(
    user_id: str,
    _current_user: UserProfile = Depends(require_admin),
):
    """Get a specific user's profile (admin only)."""
    return await UserService.get_user(user_id)


@router.put("/{user_id}", response_model=UserProfile)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Update a user's profile information (admin only)."""
    return await UserService.update_user(user_id, request)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: str,
    _current_user: UserProfile = Depends(require_super_admin),
):
    """Delete a user account (super_admin only).
    
    Removes both the auth account and profile.
    """
    await UserService.delete_user(user_id)
    return MessageResponse(message="Pengguna berhasil dihapus", success=True)


@router.patch("/{user_id}/role", response_model=UserProfile)
async def change_role(
    user_id: str,
    request: ChangeRoleRequest,
    _current_user: UserProfile = Depends(require_super_admin),
):
    """Change a user's role (super_admin only)."""
    return await UserService.change_role(user_id, request)


@router.post("/generate", response_model=GenerateUsersResponse, status_code=201)
async def generate_users(
    request: GenerateUsersRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Generate multiple peserta (examinees) accounts in bulk (admin only)."""
    return await UserService.generate_users(request)


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    user_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Reset a user's password to a random 8-character password.
    
    Rules:
    - Admin can only reset Peserta
    - Super Admin can reset Admin and Peserta
    """
    res = await UserService.reset_password(user_id, current_user.role.value)
    return ResetPasswordResponse(
        id=res.id,
        username=res.username,
        full_name=res.full_name,
        password=res.password,
        email=res.email,
        success=True
    )

