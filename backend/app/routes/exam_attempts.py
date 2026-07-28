"""
Learning Nexus CBT — Exam Attempt Routes (Phase 4: peserta mengerjakan ujian)
"""

from fastapi import APIRouter, Depends

from app.models.exam_attempt import (
    MyExamListResponse,
    StartAttemptResponse,
    SaveAnswerRequest,
    AttemptResultResponse,
    AttemptReviewResponse,
    SimpleMessage,
)
from app.models.user import UserProfile
from app.services.exam_attempt_service import ExamAttemptService
from app.dependencies import get_current_user

router = APIRouter(tags=["Exam Attempts"])


@router.get("/api/my-exams", response_model=MyExamListResponse)
async def list_my_exams(current_user: UserProfile = Depends(get_current_user)):
    """Daftar ujian yang ditugaskan ke peserta + status percobaan."""
    return await ExamAttemptService.list_my_exams(current_user.id)


@router.post("/api/my-exams/{exam_id}/start", response_model=StartAttemptResponse)
async def start_attempt(exam_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Mulai/lanjut mengerjakan ujian → soal (tanpa kunci) + sisa waktu."""
    return await ExamAttemptService.start_attempt(exam_id, current_user.id)


@router.put("/api/attempts/{attempt_id}/answer", response_model=SimpleMessage)
async def save_answer(
    attempt_id: str,
    request: SaveAnswerRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Autosave satu jawaban."""
    await ExamAttemptService.save_answer(attempt_id, current_user.id, request)
    return SimpleMessage()


@router.post("/api/attempts/{attempt_id}/submit", response_model=AttemptResultResponse)
async def submit_attempt(attempt_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Kumpulkan & nilai → skor + lulus/tidak."""
    return await ExamAttemptService.submit_attempt(attempt_id, current_user.id)


@router.get("/api/attempts/{attempt_id}/result", response_model=AttemptResultResponse)
async def get_result(attempt_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Hasil sebuah percobaan."""
    return await ExamAttemptService.get_result(attempt_id, current_user.id)


@router.get("/api/attempts/{attempt_id}/review", response_model=AttemptReviewResponse)
async def review_attempt(attempt_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Pembahasan per soal (hanya bila ujian mengizinkan & attempt sudah dikumpulkan)."""
    return await ExamAttemptService.review_attempt(attempt_id, current_user.id)
