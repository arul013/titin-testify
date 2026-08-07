"""
Learning Nexus CBT — Dashboard Summary (Admin & Super Admin)
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ExamCounts(BaseModel):
    total: int = 0
    published: int = 0
    draft: int = 0
    closed: int = 0
    archived: int = 0


class QuestionCounts(BaseModel):
    total: int = 0
    published: int = 0


class ActiveExam(BaseModel):
    exam_id: str
    title: str
    participants: int = 0
    submitted: int = 0
    avg_score: Optional[float] = None


class UserCounts(BaseModel):
    total: int = 0
    admins: int = 0
    participants: int = 0
    active: int = 0
    inactive: int = 0


class AuditItem(BaseModel):
    actor_name: Optional[str] = None
    action: str
    summary: Optional[str] = None
    created_at: Optional[datetime] = None


class DashboardSummary(BaseModel):
    role: str
    exams: ExamCounts = ExamCounts()
    questions: QuestionCounts = QuestionCounts()
    passages_total: int = 0
    participants_total: int = 0
    groups_total: int = 0
    pending_grading: int = 0
    flagged_attempts: int = 0
    active_exams: list[ActiveExam] = []
    # Super Admin saja:
    users: Optional[UserCounts] = None
    audit_recent: list[AuditItem] = []
