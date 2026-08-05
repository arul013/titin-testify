"""
Learning Nexus CBT — Notifikasi In-App (M6)
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MessageResponse(BaseModel):
    message: str
    success: bool = True
