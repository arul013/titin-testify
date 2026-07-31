"""
Learning Nexus CBT — Manual Grading Routes (F1.2.1)
"""

from fastapi import APIRouter, Depends

from app.models.grading import (
    PendingExamList,
    PendingAttemptList,
    GradingAttemptDetail,
    SubmitGradeRequest,
    GradeResultResponse,
)
from app.models.user import UserProfile
from app.services.grading_service import GradingService
from app.dependencies import require_admin

router = APIRouter(prefix="/api/grading", tags=["Grading"])


@router.get("/pending", response_model=PendingExamList)
async def list_pending(current_user: UserProfile = Depends(require_admin)):
    """Ujian dengan attempt menunggu penilaian manual (pemilik/super_admin)."""
    return await GradingService.list_pending(current_user.id, current_user.role.value)


@router.get("/exams/{exam_id}/attempts", response_model=PendingAttemptList)
async def list_exam_attempts(exam_id: str, current_user: UserProfile = Depends(require_admin)):
    """Attempt menunggu penilaian untuk satu ujian."""
    return await GradingService.list_exam_attempts(exam_id, current_user.id, current_user.role.value)


@router.get("/attempts/{attempt_id}", response_model=GradingAttemptDetail)
async def get_attempt_detail(attempt_id: str, current_user: UserProfile = Depends(require_admin)):
    """Detail penilaian: item manual + teks peserta + kriteria rubrik."""
    return await GradingService.get_attempt_detail(attempt_id, current_user.id, current_user.role.value)


@router.post("/attempts/{attempt_id}/answers/{answer_id}", response_model=GradeResultResponse)
async def submit_grade(
    attempt_id: str,
    answer_id: str,
    request: SubmitGradeRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Simpan skor per kriteria + feedback untuk satu jawaban esai; recompute bila lengkap."""
    return await GradingService.submit_grade(
        attempt_id, answer_id, request, current_user.id, current_user.role.value
    )
