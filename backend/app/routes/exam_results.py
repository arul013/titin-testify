"""
Learning Nexus CBT — Admin Exam Results Routes (M2.1)

Hanya pemilik ujian + super_admin (dijaga di service). Akses dicatat ke audit.
"""

from fastapi import APIRouter, Depends, Request

from app.models.exam_results import AdminResultsResponse, AdminAttemptReviewResponse
from app.models.user import UserProfile
from app.services.exam_results_service import ExamResultsService
from app.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Exam Results"])


@router.get("/exams/{exam_id}/results", response_model=AdminResultsResponse)
async def exam_results(
    exam_id: str,
    request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Ringkasan + daftar percobaan peserta untuk satu ujian."""
    return await ExamResultsService.list_results(exam_id, current_user, request)


@router.get("/attempts/{attempt_id}/review", response_model=AdminAttemptReviewResponse)
async def attempt_review(
    attempt_id: str,
    request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Rincian per-soal satu percobaan peserta (jawaban vs kunci) — tak bergantung show_review."""
    return await ExamResultsService.admin_review(attempt_id, current_user, request)
