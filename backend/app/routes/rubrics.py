"""
Learning Nexus CBT — Rubric Routes (Penilaian Manual F1.2)
"""

from fastapi import APIRouter, Depends

from app.models.rubric import (
    CreateRubricRequest,
    UpdateRubricRequest,
    RubricResponse,
    RubricListResponse,
    RubricMessageResponse,
)
from app.models.user import UserProfile
from app.services.rubric_service import RubricService
from app.dependencies import require_admin

router = APIRouter(prefix="/api/rubrics", tags=["Rubrics"])


@router.get("", response_model=RubricListResponse)
async def list_rubrics(current_user: UserProfile = Depends(require_admin)):
    """Daftar rubrik (bawaan + milik sendiri; super_admin melihat semua)."""
    return await RubricService.list_rubrics(current_user.id, current_user.role.value)


@router.post("", response_model=RubricResponse, status_code=201)
async def create_rubric(
    request: CreateRubricRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat rubrik baru."""
    return await RubricService.create_rubric(request, current_user.id)


@router.put("/{rubric_id}", response_model=RubricResponse)
async def update_rubric(
    rubric_id: str,
    request: UpdateRubricRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Ubah rubrik (nama/deskripsi/kriteria)."""
    return await RubricService.update_rubric(rubric_id, request, current_user.id, current_user.role.value)


@router.delete("/{rubric_id}", response_model=RubricMessageResponse)
async def delete_rubric(
    rubric_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus rubrik (soft-delete)."""
    await RubricService.delete_rubric(rubric_id, current_user.id, current_user.role.value)
    return RubricMessageResponse(message="Rubrik berhasil dihapus.")
