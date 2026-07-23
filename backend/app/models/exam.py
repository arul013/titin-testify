"""
Learning Nexus CBT — Pydantic Models for Exam Builder (Manajemen Ujian)
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime

from app.models.question import QuestionSection, ContentStatus


# ─── Nested input models ─────────────────────────────────────────

class ExamSectionInput(BaseModel):
    """Komposisi satu section dalam paket ujian."""
    section: QuestionSection = Field(..., description="Bagian ujian (TOEFL)")
    target_count: int = Field(..., ge=1, description="Target jumlah soal untuk section ini")
    weight: Optional[float] = Field(None, gt=0, description="Bobot opsional (default: setara)")


class ExamPoolUnitInput(BaseModel):
    """Satu unit pool: materi utuh (passage_id) ATAU soal tunggal (question_id)."""
    passage_id: Optional[str] = None
    question_id: Optional[str] = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "ExamPoolUnitInput":
        filled = [bool(self.passage_id), bool(self.question_id)]
        if sum(filled) != 1:
            raise ValueError("Setiap unit pool harus mengisi tepat satu dari passage_id atau question_id.")
        return self


# ─── Request models ──────────────────────────────────────────────

class CreateExamRequest(BaseModel):
    """Request body untuk membuat paket ujian."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: int = Field(..., ge=1, description="Total waktu (menit)")
    passing_grade: Optional[int] = Field(None, ge=0, le=100, description="Nilai kelulusan (opsional)")
    shuffle_questions: bool = False
    shuffle_options: bool = False
    status: ContentStatus = Field(default=ContentStatus.DRAFT)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    sections: list[ExamSectionInput] = Field(default_factory=list)
    participant_ids: list[str] = Field(default_factory=list)
    pool_units: list[ExamPoolUnitInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def _schedule_valid(self) -> "CreateExamRequest":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Tanggal selesai harus setelah tanggal mulai.")
        return self


class UpdateExamRequest(BaseModel):
    """Request body untuk memperbarui paket ujian.

    Field list (sections/participant_ids/pool_units) bila diisi akan
    MENGGANTI keseluruhan (replace), bila None dibiarkan apa adanya.
    """
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    passing_grade: Optional[int] = Field(None, ge=0, le=100)
    shuffle_questions: Optional[bool] = None
    shuffle_options: Optional[bool] = None
    status: Optional[ContentStatus] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    sections: Optional[list[ExamSectionInput]] = None
    participant_ids: Optional[list[str]] = None
    pool_units: Optional[list[ExamPoolUnitInput]] = None


# ─── Response models ─────────────────────────────────────────────

class ExamSectionResponse(BaseModel):
    section: QuestionSection
    target_count: int
    weight: Optional[float] = None


class ExamParticipantResponse(BaseModel):
    user_id: str
    username: Optional[str] = None
    full_name: Optional[str] = None


class ExamPoolUnitResponse(BaseModel):
    passage_id: Optional[str] = None
    question_id: Optional[str] = None


class ExamResponse(BaseModel):
    """Ringkasan paket ujian (untuk list)."""
    id: str
    created_by: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    passing_grade: Optional[int] = None
    shuffle_questions: bool = False
    shuffle_options: bool = False
    status: ContentStatus
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    sections: list[ExamSectionResponse] = []
    participants_count: int = 0
    total_target: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ExamDetailResponse(ExamResponse):
    """Detail lengkap paket ujian (untuk halaman edit)."""
    participants: list[ExamParticipantResponse] = []
    pool_units: list[ExamPoolUnitResponse] = []


class ExamListResponse(BaseModel):
    exams: list[ExamResponse]
    total: int
    page: int
    per_page: int


class ExamMessageResponse(BaseModel):
    message: str
    success: bool = True
