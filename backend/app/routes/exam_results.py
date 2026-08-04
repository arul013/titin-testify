"""
Learning Nexus CBT — Admin Exam Results Routes (M2.1)

Hanya pemilik ujian + super_admin (dijaga di service). Akses dicatat ke audit.
"""

from fastapi import APIRouter, Depends, Request, Response

from app.models.exam_results import AdminResultsResponse, AdminAttemptReviewResponse
from app.models.exam_analytics import ExamAnalytics
from app.models.user import UserProfile
from app.services.exam_results_service import ExamResultsService
from app.services.exam_analytics_service import ExamAnalyticsService
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


@router.post("/attempts/{attempt_id}/reset")
async def reset_attempt(
    attempt_id: str,
    request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Reset (void lunak) percobaan peserta → peserta bisa mengerjakan ulang (M5.3)."""
    return await ExamResultsService.reset_attempt(attempt_id, current_user, request)


@router.get("/exams/{exam_id}/analytics", response_model=ExamAnalytics)
async def exam_analytics(
    exam_id: str,
    request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Analitik agregat: ringkasan, distribusi skor, item-analysis (p-value + daya beda)."""
    return await ExamAnalyticsService.analytics(exam_id, current_user, request)


@router.get("/exams/{exam_id}/results.csv")
async def exam_results_csv(
    exam_id: str,
    request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Ekspor hasil ujian sebagai CSV (unduh)."""
    csv_text, filename = await ExamAnalyticsService.results_csv(exam_id, current_user, request)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
