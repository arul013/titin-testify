"""
Learning Nexus CBT — Masukan & Perbaikan (papan internal admin)

Item perbaikan / perubahan-logic / fitur-baru yang ditulis admin & super_admin.
Hak edit/hapus/ubah-status: pembuat + super_admin (ditegakkan service).
Deskripsi = teks bertanda (dirender aman di frontend via node, bukan innerHTML).
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Category = Literal["bug", "logic", "feature", "ui", "other"]
Priority = Literal["critical", "high", "medium", "low"]
Status = Literal["open", "in_progress", "done", "rejected"]


class CreateFeedbackRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=20000)
    category: Category = "other"
    priority: Priority = "medium"


class UpdateFeedbackRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=20000)
    category: Optional[Category] = None
    priority: Optional[Priority] = None


class UpdateStatusRequest(BaseModel):
    status: Status


class FeedbackItem(BaseModel):
    id: str
    created_by: str
    creator_name: Optional[str] = None
    title: str
    description: str = ""
    category: Category = "other"
    priority: Priority = "medium"
    status: Status = "open"
    comment_count: int = 0
    vote_count: int = 0
    # Dihitung server untuk user aktif → frontend tak perlu menebak hak akses.
    can_manage: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FeedbackListResponse(BaseModel):
    items: list[FeedbackItem]
    total: int


# ─── Komentar (Fase 3) ───────────────────────────────────────

class CreateCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class FeedbackComment(BaseModel):
    id: str
    feedback_id: str
    author_id: str
    author_name: Optional[str] = None
    body: str
    can_delete: bool = False
    created_at: Optional[datetime] = None


class FeedbackCommentListResponse(BaseModel):
    comments: list[FeedbackComment]
    total: int
