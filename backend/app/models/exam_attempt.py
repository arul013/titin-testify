"""
Learning Nexus CBT — Pydantic Models for Exam Attempts (Phase 4)
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class MyExamItem(BaseModel):
    exam_id: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    allow_retake: bool = False
    total_questions: int = 0
    schedule_state: str  # 'available' | 'upcoming' | 'ended'
    attempt_status: str  # 'none' | 'in_progress' | 'submitted'
    attempt_id: Optional[str] = None
    score: Optional[float] = None
    passed: Optional[bool] = None
    scale_unit: str = "percent"
    # F1.2: status penilaian manual (not_required | pending | complete).
    grading_status: str = "not_required"
    can_start: bool = False


class MyExamListResponse(BaseModel):
    exams: list[MyExamItem] = []


class AttemptIntroResponse(BaseModel):
    """Meta layar pra-ujian (M7.1) — TANPA memulai attempt/timer."""
    exam_id: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    total_questions: int = 0
    section_count: int = 0
    per_section_mode: bool = False
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    schedule_state: str  # 'available' | 'upcoming' | 'ended'
    allow_retake: bool = False
    has_in_progress: bool = False
    already_submitted: bool = False
    can_start: bool = False


class AttemptQuestion(BaseModel):
    exam_question_id: str
    position: int
    section: str
    payload: dict[str, Any]           # konten render — TANPA kunci jawaban
    selected_answer: Optional[str] = None       # single-choice (mcq_single/true_false_ng)
    answer_json: Optional[dict[str, Any]] = None  # jawaban kompleks (mcq_multi/matching/…)


class SectionTiming(BaseModel):
    """F1.4b: state timing per-bagian (mode berurutan, gaya iBT)."""
    order: list[str] = []                       # urutan bagian
    limits: dict[str, int] = {}                 # section → batas menit
    current_section: Optional[str] = None       # bagian aktif (None bila selesai)
    current_remaining_seconds: int = 0          # sisa waktu bagian aktif
    done_sections: list[str] = []               # bagian yang sudah terkunci
    finished: bool = False                      # semua bagian habis → runner submit


class StartAttemptResponse(BaseModel):
    attempt_id: str
    exam_id: str
    title: str
    duration_minutes: int
    started_at: datetime
    deadline: datetime
    remaining_seconds: int
    allow_retake: bool = False
    questions: list[AttemptQuestion] = []
    # F1.4b: bila diisi → ujian mode per-bagian; runner pakai timer per-bagian.
    section_timing: Optional[SectionTiming] = None


class AdvanceSectionRequest(BaseModel):
    section: str = Field(..., description="Kode bagian yang sedang aktif (dikunci saat maju)")


class SaveAnswerRequest(BaseModel):
    exam_question_id: str
    selected_answer: Optional[str] = Field(default=None, description="'a'..'d' atau null (single-choice)")
    answer_json: Optional[dict[str, Any]] = Field(default=None, description="Jawaban kompleks (mis. {selected:[…]}) untuk mcq_multi/matching/…")


class SectionResult(BaseModel):
    section: str
    total: int
    correct: int
    percent: float = 0.0
    # Label tampilan (mis. "Structure & Written Expression" untuk grup gabungan ITP).
    label: Optional[str] = None
    # Nilai konversi TOEFL ITP (bila skor resmi); None untuk Nilai 0–100.
    converted: Optional[int] = None


class AttemptResultResponse(BaseModel):
    attempt_id: str
    exam_id: str
    title: str
    status: str
    score: Optional[float] = None
    passed: Optional[bool] = None
    scale_unit: str = "percent"
    total_questions: int = 0
    total_correct: int = 0
    passing_value: Optional[float] = None
    per_section: list[SectionResult] = []
    submitted_at: Optional[datetime] = None
    # Pembahasan tersedia? (exam.show_review) → frontend tampilkan tombol pembahasan.
    show_review: bool = False
    # F1.2: status penilaian manual (not_required | pending | complete).
    grading_status: str = "not_required"


class SimpleMessage(BaseModel):
    success: bool = True


# ─── Review / Pembahasan (dibuka setelah submit bila exam.show_review) ───
class AttemptReviewQuestion(BaseModel):
    exam_question_id: str
    position: int
    section: str
    payload: dict[str, Any]                 # konten render (soal + opsi + materi)
    correct_answer: Optional[str] = None    # kunci single-choice ('a'..'d')
    selected_answer: Optional[str] = None
    answer_json: Optional[dict[str, Any]] = None      # jawaban peserta (kompleks)
    answer_key_json: Optional[dict[str, Any]] = None  # kunci kompleks (mis. {correct:[…]})
    is_correct: bool = False
    explanation: Optional[str] = None
    # F1.2: penilaian manual (essay) — terisi setelah grading complete.
    scoring_mode: Optional[str] = None
    awarded_score: Optional[float] = None
    max_score: Optional[float] = None
    rubric_scores: Optional[dict[str, Any]] = None
    feedback: Optional[str] = None


class AttemptReviewResponse(BaseModel):
    attempt_id: str
    exam_id: str
    title: str
    total_questions: int = 0
    total_correct: int = 0
    questions: list[AttemptReviewQuestion] = []
