"""
Learning Nexus CBT — Auth Dependencies (Asymmetric JWKS & Role Guards)
"""

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError
from app.config import get_settings
from app.database import get_supabase_client
from app.models.user import UserProfile, UserRole

security = HTTPBearer()

# Global in-memory cache for Supabase JWKS keys to avoid high latency on every request
_jwks_cache = {}


def get_jwk_key(kid: str) -> dict:
    """Retrieve the public key matching the token's kid from local cache or Supabase API."""
    global _jwks_cache
    
    # Return from cache if we already fetched it
    if kid in _jwks_cache:
        return _jwks_cache[kid]
        
    settings = get_settings()
    supabase_url = settings.supabase_url.rstrip("/")
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    
    try:
        # Fetch public keys from Supabase well-known endpoint
        response = httpx.get(jwks_url, timeout=5.0)
        response.raise_for_status()
        jwks = response.json()
        
        # Populate global cache
        for key_dict in jwks.get("keys", []):
            k = key_dict.get("kid")
            if k:
                _jwks_cache[k] = key_dict
                
        if kid in _jwks_cache:
            return _jwks_cache[kid]
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengambil kunci verifikasi auth dari Supabase: {str(e)}"
        )
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kunci verifikasi token (KID) tidak terdaftar di Supabase"
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserProfile:
    """Validate JWT token and return current user profile.
    
    Supports Asymmetric (ES256 via JWKS) and Symmetric (HS256) validation.
    """
    token = credentials.credentials

    # Parse header to determine signature verification strategy
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg")
        if not alg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak lengkap: algoritma tanda tangan tidak ditemukan",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header token JWT tidak valid",
        )

    # Verify signature
    try:
        if alg == "ES256":
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token ES256 tidak memiliki klaim KID"
                )
            key_dict = get_jwk_key(kid)
            secret_key = jwk.construct(key_dict)
        else:
            # Fallback to HS256 symmetric verification
            settings = get_settings()
            secret_key = settings.supabase_jwt_secret

        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[alg],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid: user ID tidak ditemukan",
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token tidak valid atau sudah kedaluwarsa: {str(e)}",
        )

    # Fetch user profile from database using Admin client (bypasses RLS since backend has already validated the JWT)
    from app.database import get_supabase_admin
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
            detail="Profil pengguna tidak ditemukan",
        )

    profile_data = result.data
    
    # Check if user is active
    if not profile_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Anda telah dinonaktifkan. Hubungi admin.",
        )

    return UserProfile(
        id=profile_data["id"],
        email=payload.get("email"),
        username=profile_data["username"],
        full_name=profile_data["full_name"],
        role=profile_data["role"],
        avatar_url=profile_data.get("avatar_url"),
        is_active=profile_data.get("is_active", True),
        force_change_password=profile_data.get("force_change_password", False),
        created_at=profile_data.get("created_at"),
        updated_at=profile_data.get("updated_at"),
    )


async def require_admin(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Require the current user to be an admin or super_admin."""
    if current_user.force_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ganti password Anda terlebih dahulu sebelum menggunakan layanan.",
        )
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya admin yang diizinkan.",
        )
    return current_user


async def require_super_admin(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """Require the current user to be a super_admin."""
    if current_user.force_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ganti password Anda terlebih dahulu sebelum menggunakan layanan.",
        )
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya super admin yang diizinkan.",
        )
    return current_user

