"""
Learning Nexus CBT — Exam Attempt Routes (Phase 4: peserta mengerjakan ujian)
"""

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status

from app.models.exam_attempt import (
    MyExamListResponse,
    AttemptIntroResponse,
    StartAttemptResponse,
    SaveAnswerRequest,
    AttemptResultResponse,
    AttemptReviewResponse,
    SimpleMessage,
    SectionTiming,
    AdvanceSectionRequest,
    ReportEventsRequest,
    ReportEventsResponse,
    HeartbeatRequest,
    HeartbeatResponse,
)
from app.models.user import UserProfile
from app.services.exam_attempt_service import ExamAttemptService
from app.dependencies import get_current_user

router = APIRouter(tags=["Exam Attempts"])


@router.get("/api/my-exams", response_model=MyExamListResponse)
async def list_my_exams(current_user: UserProfile = Depends(get_current_user)):
    """Daftar ujian yang ditugaskan ke peserta + status percobaan."""
    return await ExamAttemptService.list_my_exams(current_user.id)


@router.get("/api/my-exams/{exam_id}/intro", response_model=AttemptIntroResponse)
async def attempt_intro(exam_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Meta layar pra-ujian (M7.1) — TANPA memulai attempt/timer."""
    return await ExamAttemptService.attempt_intro(exam_id, current_user.id)


@router.post("/api/my-exams/{exam_id}/start", response_model=StartAttemptResponse)
async def start_attempt(exam_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Mulai/lanjut mengerjakan ujian → soal (tanpa kunci) + sisa waktu."""
    return await ExamAttemptService.start_attempt(exam_id, current_user.id)


@router.post("/api/attempts/{attempt_id}/heartbeat", response_model=HeartbeatResponse)
async def heartbeat(
    attempt_id: str,
    request: HeartbeatRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """M8.2: cek satu sesi aktif. active=False → sesi diambil alih di tempat lain."""
    return await ExamAttemptService.heartbeat(attempt_id, current_user.id, request.session_token)


@router.post("/api/attempts/{attempt_id}/capture")
async def record_capture(
    attempt_id: str,
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user),
):
    """M8.4: unggah satu foto capture kamera peserta (JPEG/PNG ≤ 3 MB)."""
    try:
        content = await file.read(3 * 1024 * 1024 + 1)
        if len(content) > 3 * 1024 * 1024:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Ukuran foto melebihi 3 MB.")
        return await ExamAttemptService.record_capture(attempt_id, current_user.id, content)
    finally:
        await file.close()


@router.post("/api/attempts/{attempt_id}/events", response_model=ReportEventsResponse)
async def report_events(
    attempt_id: str,
    request: ReportEventsRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """M8.1: lapor batch peristiwa perilaku (pindah tab/fullscreen keluar/copy diblok)."""
    return await ExamAttemptService.report_events(attempt_id, current_user.id, request)


@router.put("/api/attempts/{attempt_id}/answer", response_model=SimpleMessage)
async def save_answer(
    attempt_id: str,
    request: SaveAnswerRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Autosave satu jawaban."""
    await ExamAttemptService.save_answer(attempt_id, current_user.id, request)
    return SimpleMessage()


@router.post("/api/attempts/{attempt_id}/advance", response_model=SectionTiming)
async def advance_section(
    attempt_id: str,
    request: AdvanceSectionRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """F1.4b: kunci bagian aktif & mulai bagian berikutnya (mode per-bagian)."""
    return await ExamAttemptService.advance_section(attempt_id, current_user.id, request.section)


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
