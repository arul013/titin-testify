"""
Learning Nexus CBT — Test Type Routes (registry jenis tes, admin CRUD)
"""

from fastapi import APIRouter, Depends

from app.models.test_type import (
    CreateTestTypeRequest,
    UpdateTestTypeRequest,
    TestTypeResponse,
    TestTypeListResponse,
    TestTypeMessageResponse,
)
from app.models.user import UserProfile
from app.services.test_type_service import TestTypeService
from app.dependencies import require_admin

router = APIRouter(prefix="/api/test-types", tags=["Test Types"])


@router.get("", response_model=TestTypeListResponse)
async def list_test_types(_current_user: UserProfile = Depends(require_admin)):
    """Daftar jenis tes + skill-nya."""
    return await TestTypeService.list_test_types()


@router.post("", response_model=TestTypeResponse, status_code=201)
async def create_test_type(
    request: CreateTestTypeRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Buat jenis tes baru (+ skill)."""
    return await TestTypeService.create_test_type(request)


@router.put("/{test_type_id}", response_model=TestTypeResponse)
async def update_test_type(
    test_type_id: str,
    request: UpdateTestTypeRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Ubah jenis tes (skill diganti bila dikirim)."""
    return await TestTypeService.update_test_type(test_type_id, request)


@router.delete("/{test_type_id}", response_model=TestTypeMessageResponse)
async def delete_test_type(
    test_type_id: str,
    _current_user: UserProfile = Depends(require_admin),
):
    """Hapus jenis tes (non-bawaan & tak sedang dipakai)."""
    await TestTypeService.delete_test_type(test_type_id)
    return TestTypeMessageResponse(message="Jenis tes berhasil dihapus.")
