"""
Learning Nexus CBT — Pydantic Models for Exam Analytics (M2.2)

Analitik agregat sisi admin: ringkasan, distribusi skor, dan item-analysis
(tingkat kesulitan p-value + daya beda). Otorisasi di service (pemilik/super_admin).
"""

from pydantic import BaseModel
from typing import Optional


class ItemStat(BaseModel):
    exam_question_id: str
    position: int
    section: str
    question_type: str
    n_answered: int = 0
    n_correct: int = 0
    p_value: float = 0.0                # kesulitan: benar / peserta (0=sulit, 1=mudah)
    discrimination: Optional[float] = None  # daya beda (upper-lower 27%); None bila peserta sedikit
    flag: Optional[str] = None          # too_easy | too_hard | low_discrimination | negative
    correct_answer: Optional[str] = None
    option_counts: dict[str, int] = {}  # {'a': n, …} untuk single-choice


class ScoreBand(BaseModel):
    label: str
    lo: float
    hi: float
    count: int = 0


class AnalyticsSummary(BaseModel):
    submitted: int = 0            # attempt final (dihitung untuk skor)
    avg_score: Optional[float] = None
    median_score: Optional[float] = None
    highest: Optional[float] = None
    lowest: Optional[float] = None
    passed_count: Optional[int] = None
    pass_rate: Optional[float] = None   # persen


class ExamAnalytics(BaseModel):
    exam_id: str
    title: str
    scale_unit: str = "nilai"
    passing_value: Optional[float] = None
    summary: AnalyticsSummary
    distribution: list[ScoreBand] = []
    items: list[ItemStat] = []
