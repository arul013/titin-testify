"""
Learning Nexus CBT — Pydantic Models for Manual Grading (F1.2.1)

Antrean penilaian esai/writing: daftar ujian ber-item manual → daftar attempt
menunggu → detail penilaian (teks peserta + kriteria rubrik → skor + feedback).
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ─── Antrean ─────────────────────────────────────────────
class PendingExamItem(BaseModel):
    exam_id: str
    title: str
    pending_count: int = 0        # attempt menunggu penilaian
    total_submitted: int = 0      # attempt terkumpul (info)


class PendingExamList(BaseModel):
    exams: list[PendingExamItem] = []


class PendingAttemptItem(BaseModel):
    attempt_id: str
    user_id: str
    participant_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    manual_total: int = 0     # jumlah item manual pada attempt ini
    manual_graded: int = 0    # sudah dinilai


class PendingAttemptList(BaseModel):
    exam_id: str
    title: str
    attempts: list[PendingAttemptItem] = []


# ─── Detail penilaian satu attempt ───────────────────────
class GradingCriterion(BaseModel):
    name: str
    max_score: float
    descriptors: Optional[str] = None
    score: Optional[float] = None   # skor yang sudah diberi (bila ada)


class GradingAnswerItem(BaseModel):
    answer_id: Optional[str] = None       # null bila peserta tak menjawab
    exam_question_id: str
    position: int
    section: str
    payload: dict[str, Any]               # render soal (perintah esai + materi)
    participant_text: str = ""            # jawaban esai peserta
    rubric_name: Optional[str] = None
    criteria: list[GradingCriterion] = []
    max_score: float = 0
    awarded_score: Optional[float] = None
    feedback: Optional[str] = None
    graded: bool = False


class GradingAttemptDetail(BaseModel):
    attempt_id: str
    exam_id: str
    title: str
    participant_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    grading_status: str = "pending"
    answers: list[GradingAnswerItem] = []


# ─── Submit skor satu jawaban ────────────────────────────
class SubmitGradeRequest(BaseModel):
    scores: list[float] = Field(..., description="Skor per kriteria (urut sesuai rubrik)")
    feedback: Optional[str] = None


class GradeResultResponse(BaseModel):
    success: bool = True
    answer_id: str
    awarded_score: float
    grading_status: str            # status attempt setelah simpan (pending|complete)
    attempt_score: Optional[float] = None   # skor final bila complete
    attempt_passed: Optional[bool] = None
