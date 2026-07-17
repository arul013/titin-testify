"""
Learning Nexus CBT — Auth Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.models.user import (
    LoginRequest,
    AuthResponse,
    MessageResponse,
    UserProfile,
    ChangePasswordRequest,
)
from app.services.auth_service import AuthService
from app.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with username and password.
    
    Returns access token, refresh token, and user profile.
    """
    return await AuthService.login(request)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Logout and invalidate the current session."""
    await AuthService.logout(credentials.credentials)
    return MessageResponse(message="Berhasil logout", success=True)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshRequest):
    """Refresh an expired access token using a refresh token."""
    return await AuthService.refresh_token(request.refresh_token)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Change the password for the current logged-in user.

    Voluntary changes require the current password (verified). During the
    forced first-time change (``force_change_password`` = True) it may be omitted.
    """
    if current_user.force_change_password:
        # Forced first-time change: no current password needed.
        await AuthService.change_password(current_user.id, request.new_password)
    else:
        # Voluntary change: verify the current password first.
        if not request.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password lama wajib diisi.",
            )
        await AuthService.change_password(
            current_user.id,
            request.new_password,
            current_password=request.current_password,
        )
    return MessageResponse(message="Password berhasil diubah", success=True)

