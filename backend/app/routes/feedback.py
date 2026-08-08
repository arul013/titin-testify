"""
Learning Nexus CBT — Masukan & Perbaikan Routes (Fase 1)

Papan internal admin: catat perbaikan / perubahan-logic / fitur baru.
Semua endpoint `require_admin`. Edit/hapus/ubah-status dijaga di service
(pembuat + super_admin).
"""

from fastapi import APIRouter, Depends, Query, Request

from app.models.feedback import (
    CreateFeedbackRequest, UpdateFeedbackRequest, UpdateStatusRequest,
    FeedbackItem, FeedbackListResponse,
    CreateCommentRequest, FeedbackComment, FeedbackCommentListResponse,
    VoteResponse,
)
from app.models.user import UserProfile
from app.services.feedback_service import FeedbackService
from app.services.audit_service import AuditService
from app.dependencies import require_admin

router = APIRouter(tags=["Feedback"])


@router.get("/api/feedback", response_model=FeedbackListResponse)
async def list_feedback(
    status: str = Query("", description="Filter status: open|in_progress|done|rejected"),
    category: str = Query("", description="Filter kategori: bug|logic|feature|ui|other"),
    priority: str = Query("", description="Filter prioritas: critical|high|medium|low"),
    q: str = Query("", description="Cari judul/deskripsi"),
    sort: str = Query("recent", description="recent | priority | votes"),
    current_user: UserProfile = Depends(require_admin),
):
    """Daftar item Masukan & Perbaikan (semua admin melihat semua)."""
    return await FeedbackService.list_items(
        current_user.id, current_user.role.value,
        status_filter=status, category=category, priority=priority, search=q, sort=sort,
    )


@router.get("/api/feedback/{item_id}", response_model=FeedbackItem)
async def get_feedback(
    item_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Detail satu item."""
    return await FeedbackService.get_item(item_id, current_user.id, current_user.role.value)


@router.post("/api/feedback", response_model=FeedbackItem, status_code=201)
async def create_feedback(
    request: CreateFeedbackRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat item baru."""
    result = await FeedbackService.create_item(request, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="feedback.create", entity_type="feedback",
        entity_id=result.id, summary=f"Buat masukan '{result.title}' [{result.category}]",
    )
    return result


@router.patch("/api/feedback/{item_id}", response_model=FeedbackItem)
async def update_feedback(
    item_id: str,
    request: UpdateFeedbackRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Ubah isi/kategori/prioritas (pembuat + super_admin)."""
    result = await FeedbackService.update_item(item_id, request, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="feedback.update", entity_type="feedback",
        entity_id=item_id, summary=f"Perbarui masukan '{result.title}'",
    )
    return result


@router.patch("/api/feedback/{item_id}/status", response_model=FeedbackItem)
async def update_feedback_status(
    item_id: str,
    request: UpdateStatusRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Ubah status (pembuat + super_admin)."""
    result = await FeedbackService.update_status(item_id, request.status, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="feedback.status", entity_type="feedback",
        entity_id=item_id, summary=f"Status masukan '{result.title}' → {result.status}",
    )
    return result


@router.delete("/api/feedback/{item_id}")
async def delete_feedback(
    item_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus item (pembuat + super_admin)."""
    await FeedbackService.delete_item(item_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="feedback.delete", entity_type="feedback",
        entity_id=item_id, summary="Hapus item masukan",
    )
    return {"message": "Item dihapus.", "success": True}


# ─── Komentar (Fase 3) ───────────────────────────────────────

@router.get("/api/feedback/{item_id}/comments", response_model=FeedbackCommentListResponse)
async def list_comments(
    item_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Daftar komentar sebuah item (semua admin melihat)."""
    return await FeedbackService.list_comments(item_id, current_user.id, current_user.role.value)


@router.post("/api/feedback/{item_id}/comments", response_model=FeedbackComment, status_code=201)
async def add_comment(
    item_id: str,
    request: CreateCommentRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Tambah komentar (semua admin)."""
    return await FeedbackService.add_comment(item_id, request.body, current_user.id, current_user.role.value)


@router.delete("/api/feedback/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus komentar (penulis komentar atau super_admin)."""
    await FeedbackService.delete_comment(comment_id, current_user.id, current_user.role.value)
    return {"message": "Komentar dihapus.", "success": True}


# ─── Voting (Fase 4) ─────────────────────────────────────────

@router.post("/api/feedback/{item_id}/vote", response_model=VoteResponse)
async def add_vote(
    item_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Beri suara (👍) — 1 orang 1 suara, idempoten."""
    return await FeedbackService.add_vote(item_id, current_user.id)


@router.delete("/api/feedback/{item_id}/vote", response_model=VoteResponse)
async def remove_vote(
    item_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Batalkan suara."""
    return await FeedbackService.remove_vote(item_id, current_user.id)
