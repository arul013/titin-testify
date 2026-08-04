"""
Learning Nexus CBT — Exam Builder Routes (Manajemen Ujian)
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request

from app.models.exam import (
    CreateExamRequest,
    UpdateExamRequest,
    ExamDetailResponse,
    ExamListResponse,
    ExamMessageResponse,
    PoolPreviewRequest,
    PoolPreviewResponse,
    SetParticipantExtraRequest,
)
from app.models.user import UserProfile
from app.services.exam_service import ExamService
from app.services.audit_service import AuditService
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
    templates: bool = Query(False, description="True = daftar template; False = ujian aktif"),
    current_user: UserProfile = Depends(require_admin),
):
    """List paket ujian dengan pagination & filter (admin only). `templates=true` = daftar template."""
    return await ExamService.list_exams(
        user_id=current_user.id,
        user_role=current_user.role.value,
        page=page,
        per_page=per_page,
        status_filter=status,
        search=search,
        is_template=templates,
    )


@router.post("/api/exams", response_model=ExamDetailResponse, status_code=201)
async def create_exam(
    request: CreateExamRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat paket ujian baru (admin only)."""
    result = await ExamService.create_exam(request, current_user.id)
    AuditService.log_action(
        http_request, current_user, action="exam.create", entity_type="exam",
        entity_id=result.id, summary=f"Buat ujian '{result.title}'",
    )
    return result


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
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Perbarui paket ujian (owner atau super_admin)."""
    result = await ExamService.update_exam(exam_id, request, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.update", entity_type="exam",
        entity_id=exam_id, summary=f"Perbarui ujian '{result.title}'",
    )
    return result


@router.delete("/api/exams/{exam_id}", response_model=ExamMessageResponse)
async def delete_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus (soft-delete) paket ujian (owner atau super_admin)."""
    await ExamService.delete_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.delete", entity_type="exam",
        entity_id=exam_id, summary="Hapus ujian (soft-delete)",
    )
    return ExamMessageResponse(message="Paket ujian berhasil dihapus.")


@router.post("/api/exams/{exam_id}/publish", response_model=ExamDetailResponse)
async def publish_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Tayangkan paket ujian (validasi stok/jadwal/peserta + safety net 5 menit)."""
    result = await ExamService.publish_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.publish", entity_type="exam",
        entity_id=exam_id, summary=f"Tayangkan ujian '{result.title}'",
    )
    return result


@router.post("/api/exams/{exam_id}/unpublish", response_model=ExamDetailResponse)
async def unpublish_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Kembalikan paket ujian ke status Draf."""
    result = await ExamService.unpublish_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.unpublish", entity_type="exam",
        entity_id=exam_id, summary="Kembalikan ke Draf",
    )
    return result


@router.post("/api/exams/{exam_id}/close", response_model=ExamDetailResponse)
async def close_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Tutup ujian Tayang → status 'closed' (read-only)."""
    result = await ExamService.close_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.close", entity_type="exam",
        entity_id=exam_id, summary=f"Tutup ujian '{result.title}'",
    )
    return result


@router.post("/api/exams/{exam_id}/archive", response_model=ExamDetailResponse)
async def archive_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Arsipkan ujian → status 'archived' (tersembunyi dari daftar aktif)."""
    result = await ExamService.archive_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.archive", entity_type="exam",
        entity_id=exam_id, summary=f"Arsipkan ujian '{result.title}'",
    )
    return result


@router.post("/api/exams/{exam_id}/unarchive", response_model=ExamDetailResponse)
async def unarchive_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Keluarkan ujian dari arsip."""
    result = await ExamService.unarchive_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.unarchive", entity_type="exam",
        entity_id=exam_id, summary="Keluarkan dari arsip",
    )
    return result


@router.post("/api/exams/{exam_id}/duplicate", response_model=ExamDetailResponse, status_code=201)
async def duplicate_exam(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Duplikat ujian jadi Draf baru (tanpa jadwal/snapshot/percobaan)."""
    result = await ExamService.duplicate_exam(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.duplicate", entity_type="exam",
        entity_id=result.id, summary=f"Duplikat dari {exam_id} → '{result.title}'",
    )
    return result


@router.patch("/api/exams/{exam_id}/participants/{participant_user_id}/extra-time", response_model=ExamDetailResponse)
async def set_participant_extra(
    exam_id: str,
    participant_user_id: str,
    request: SetParticipantExtraRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Set menit tambahan (akomodasi) satu peserta pada ujian (owner/super_admin)."""
    result = await ExamService.set_participant_extra(
        exam_id, participant_user_id, request.extra_minutes,
        current_user.id, current_user.role.value,
    )
    AuditService.log_action(
        http_request, current_user, action="exam.participant.extra_time", entity_type="exam",
        entity_id=exam_id,
        summary=f"Set waktu tambahan peserta {participant_user_id} = {request.extra_minutes} menit",
    )
    return result


@router.post("/api/exams/{exam_id}/save-as-template", response_model=ExamDetailResponse, status_code=201)
async def save_as_template(
    exam_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Simpan ujian sebagai template baru (resep dipakai ulang)."""
    result = await ExamService.save_as_template(exam_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.template.create", entity_type="exam",
        entity_id=result.id, summary=f"Jadikan template dari {exam_id} → '{result.title}'",
    )
    return result


@router.post("/api/exams/{template_id}/use-template", response_model=ExamDetailResponse, status_code=201)
async def use_template(
    template_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat ujian Draf baru dari sebuah template (tanpa jadwal/peserta)."""
    result = await ExamService.create_from_template(template_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="exam.from_template", entity_type="exam",
        entity_id=result.id, summary=f"Buat ujian dari template {template_id} → '{result.title}'",
    )
    return result
