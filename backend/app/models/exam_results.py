"""
Learning Nexus CBT — Pydantic Models for Admin Exam Results (M2.1)

Hasil ujian sisi admin: daftar percobaan peserta + rincian per-soal.
Akses hanya pemilik ujian + super_admin (dijaga di service).
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.exam_attempt import SectionResult, AttemptReviewQuestion, AttemptIntegrity


class AdminAttemptRow(BaseModel):
    attempt_id: str
    user_id: str
    participant_name: Optional[str] = None
    status: str                       # in_progress | submitted
    grading_status: str = "not_required"
    score: Optional[float] = None
    passed: Optional[bool] = None
    scale_unit: str = "nilai"
    total_questions: int = 0
    total_correct: int = 0
    per_section: list[SectionResult] = []
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    # M8: jumlah pelanggaran anti-cheat (untuk badge).
    violation_count: int = 0


class AdminResultsSummary(BaseModel):
    participants_total: int = 0   # peserta terdaftar
    attempts_total: int = 0       # percobaan (submitted + in_progress)
    submitted: int = 0
    in_progress: int = 0
    pending_grading: int = 0
    avg_score: Optional[float] = None
    passed_count: Optional[int] = None
    highest: Optional[float] = None
    lowest: Optional[float] = None


class AdminResultsResponse(BaseModel):
    exam_id: str
    title: str
    scale_unit: str = "nilai"
    passing_value: Optional[float] = None
    show_review: bool = False
    summary: AdminResultsSummary
    attempts: list[AdminAttemptRow] = []


class AdminAttemptReviewResponse(BaseModel):
    attempt_id: str
    exam_id: str
    title: str
    participant_name: Optional[str] = None
    status: str
    grading_status: str = "not_required"
    score: Optional[float] = None
    passed: Optional[bool] = None
    scale_unit: str = "nilai"
    passing_value: Optional[float] = None
    total_questions: int = 0
    total_correct: int = 0
    per_section: list[SectionResult] = []
    submitted_at: Optional[datetime] = None
    questions: list[AttemptReviewQuestion] = []
    # M8: ringkasan integritas (pelanggaran anti-cheat).
    integrity: AttemptIntegrity = AttemptIntegrity()
