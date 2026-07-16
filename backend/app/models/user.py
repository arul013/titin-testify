"""
Learning Nexus CBT — Pydantic Models for User/Profile
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles in the CBT system."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    PESERTA = "peserta"


# ─── Request Models ───────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Login request body."""
    username: str = Field(..., description="Unique username")
    password: str = Field(..., min_length=6, description="User password")


class CreateUserRequest(BaseModel):
    """Request body for creating a new user."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$", description="Unique username (alphanumeric and underscores only)")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name")
    role: UserRole = Field(default=UserRole.PESERTA, description="User role")


class UpdateUserRequest(BaseModel):
    """Request body for updating a user."""
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class ChangeRoleRequest(BaseModel):
    """Request body for changing user role (super_admin only)."""
    role: UserRole


# ─── Response Models ──────────────────────────────────────────────

class UserProfile(BaseModel):
    """User profile response."""
    id: str
    email: Optional[str] = None
    username: str
    full_name: str
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool = True
    force_change_password: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AuthResponse(BaseModel):
    """Authentication response with token and user data."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True


class UserListResponse(BaseModel):
    """Paginated user list response."""
    users: list[UserProfile]
    total: int
    page: int
    per_page: int


class GenerateUsersRequest(BaseModel):
    """Request body for generating bulk users."""
    names: list[str] = Field(..., description="List of participant full names")


class GeneratedUserItem(BaseModel):
    """Generated user result details."""
    id: str
    username: str
    full_name: str
    password: str
    email: str


class GenerateUsersResponse(BaseModel):
    """Response containing list of generated users."""
    users: list[GeneratedUserItem]
    success: bool = True


class ChangePasswordRequest(BaseModel):
    """Request body for changing password."""
    new_password: str = Field(..., min_length=6, description="New password")


class ResetPasswordResponse(BaseModel):
    """Response after resetting user password."""
    id: str
    username: str
    full_name: str
    password: str
    email: str
    success: bool = True
