"""
Learning Nexus CBT — Exam Builder Routes (Manajemen Ujian)
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.models.exam import (
    CreateExamRequest,
    UpdateExamRequest,
    ExamDetailResponse,
    ExamListResponse,
    ExamMessageResponse,
    PoolPreviewRequest,
    PoolPreviewResponse,
)
from app.models.user import UserProfile
from app.services.exam_service import ExamService
from app.dependencies import require_admin

router = APIRouter(tags=["Exam Builder"])


@router.post("/api/exams/pool-preview", response_model=PoolPreviewResponse)
async def pool_preview(
    request: PoolPreviewRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Cek ketersediaan stok soal Tayang untuk komposisi + pool tertentu (stateless)."""
    return await ExamService.pool_preview(request, current_user.id, current_user.role.value)


@router.get("/api/exams", response_model=ExamListResponse)
async def list_exams(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status (draft/published)"),
    search: str = Query("", description="Search in exam title"),
    current_user: UserProfile = Depends(require_admin),
):
    """List paket ujian dengan pagination & filter (admin only)."""
    return await ExamService.list_exams(
        user_id=current_user.id,
        user_role=current_user.role.value,
        page=page,
        per_page=per_page,
        status_filter=status,
        search=search,
    )


@router.post("/api/exams", response_model=ExamDetailResponse, status_code=201)
async def create_exam(
    request: CreateExamRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat paket ujian baru (admin only)."""
    return await ExamService.create_exam(request, current_user.id)


@router.get("/api/exams/{exam_id}", response_model=ExamDetailResponse)
async def get_exam(
    exam_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Ambil detail paket ujian (owner atau super_admin)."""
    return await ExamService.get_exam(exam_id, current_user.id, current_user.role.value)


@router.put("/api/exams/{exam_id}", response_model=ExamDetailResponse)
async def update_exam(
    exam_id: str,
    request: UpdateExamRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Perbarui paket ujian (owner atau super_admin)."""
    return await ExamService.update_exam(exam_id, request, current_user.id, current_user.role.value)


@router.delete("/api/exams/{exam_id}", response_model=ExamMessageResponse)
async def delete_exam(
    exam_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus paket ujian beserta komposisi & peserta (owner atau super_admin)."""
    await ExamService.delete_exam(exam_id, current_user.id, current_user.role.value)
    return ExamMessageResponse(message="Paket ujian berhasil dihapus.")


@router.post("/api/exams/{exam_id}/publish", response_model=ExamDetailResponse)
async def publish_exam(
    exam_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Tayangkan paket ujian (validasi stok/jadwal/peserta + safety net 5 menit)."""
    return await ExamService.publish_exam(exam_id, current_user.id, current_user.role.value)


@router.post("/api/exams/{exam_id}/unpublish", response_model=ExamDetailResponse)
async def unpublish_exam(
    exam_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Kembalikan paket ujian ke status Draf."""
    return await ExamService.unpublish_exam(exam_id, current_user.id, current_user.role.value)
