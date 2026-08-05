"""
Learning Nexus CBT — Notification Routes (M6 Fase 1)

Notifikasi milik pengguna yang login (peserta & admin). Tiap pengguna
hanya melihat/menandai notifikasinya sendiri (dijaga di service via user_id).
"""

from fastapi import APIRouter, Depends, Query

from app.models.notification import (
    NotificationListResponse, UnreadCountResponse, MessageResponse,
)
from app.models.user import UserProfile
from app.services.notification_service import NotificationService
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    current_user: UserProfile = Depends(get_current_user),
):
    """Daftar notifikasi terbaru + jumlah belum dibaca."""
    return await NotificationService.list_notifications(current_user.id, limit=limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(current_user: UserProfile = Depends(get_current_user)):
    """Jumlah notifikasi belum dibaca (untuk badge lonceng)."""
    return await NotificationService.unread_count(current_user.id)


@router.post("/{notification_id}/read", response_model=MessageResponse)
async def mark_read(
    notification_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """Tandai satu notifikasi sebagai dibaca."""
    await NotificationService.mark_read(current_user.id, notification_id)
    return MessageResponse(message="Notifikasi ditandai dibaca.")


@router.post("/read-all", response_model=MessageResponse)
async def mark_all_read(current_user: UserProfile = Depends(get_current_user)):
    """Tandai semua notifikasi sebagai dibaca."""
    await NotificationService.mark_all_read(current_user.id)
    return MessageResponse(message="Semua notifikasi ditandai dibaca.")
