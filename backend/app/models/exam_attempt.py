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
    can_start: bool = False


class MyExamListResponse(BaseModel):
    exams: list[MyExamItem] = []


class AttemptQuestion(BaseModel):
    exam_question_id: str
    position: int
    section: str
    payload: dict[str, Any]           # konten render — TANPA kunci jawaban
    selected_answer: Optional[str] = None


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


class SaveAnswerRequest(BaseModel):
    exam_question_id: str
    selected_answer: Optional[str] = Field(default=None, description="'a'..'d' atau null")


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


class SimpleMessage(BaseModel):
    success: bool = True
