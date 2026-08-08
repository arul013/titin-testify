"""
Learning Nexus CBT — Masukan & Perbaikan Service (Fase 1)

CRUD papan internal admin. Semua admin bisa MEMBUAT & MELIHAT; hanya pembuat
(atau super_admin) yang bisa EDIT/HAPUS/UBAH-STATUS.

Akses via backend service-role (RLS lockdown). Mutasi dicatat ke audit di route.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from postgrest.types import CountMethod

from app.database import get_supabase_admin
from app.models.feedback import (
    CreateFeedbackRequest, UpdateFeedbackRequest,
    FeedbackItem, FeedbackListResponse,
)

# Kolom yang dipilih dari DB + join nama pembuat.
_SELECT = "*, profiles!feedback_items_created_by_fkey(full_name)"

# Urutan prioritas untuk sort "priority" (kritis dulu).
_PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def _can_manage(created_by: str, user_id: str, user_role: str) -> bool:
    return user_role == "super_admin" or created_by == user_id


def _to_item(row: dict[str, Any], user_id: str, user_role: str) -> FeedbackItem:
    return FeedbackItem(
        id=row["id"],
        created_by=row["created_by"],
        creator_name=(row.get("profiles") or {}).get("full_name"),
        title=row["title"],
        description=row.get("description") or "",
        category=row.get("category") or "other",
        priority=row.get("priority") or "medium",
        status=row.get("status") or "open",
        comment_count=row.get("comment_count") or 0,
        vote_count=row.get("vote_count") or 0,
        can_manage=_can_manage(row["created_by"], user_id, user_role),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


class FeedbackService:

    @staticmethod
    async def list_items(
        user_id: str, user_role: str, *,
        status_filter: str = "", category: str = "", priority: str = "",
        search: str = "", sort: str = "recent",
    ) -> FeedbackListResponse:
        supabase = get_supabase_admin()
        query = supabase.table("feedback_items").select(_SELECT, count=CountMethod.exact)

        if status_filter:
            query = query.eq("status", status_filter)
        if category:
            query = query.eq("category", category)
        if priority:
            query = query.eq("priority", priority)
        if search:
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")

        # Sort DB untuk recent/votes; priority diurutkan di Python (rank kustom).
        if sort == "votes":
            query = query.order("vote_count", desc=True).order("created_at", desc=True)
        else:
            query = query.order("created_at", desc=True)

        result = query.execute()
        rows = result.data or []

        if sort == "priority":
            rows.sort(key=lambda r: (_PRIORITY_RANK.get(r.get("priority") or "medium", 2)))

        items = [_to_item(r, user_id, user_role) for r in rows]
        return FeedbackListResponse(items=items, total=result.count or 0)

    @staticmethod
    async def get_item(item_id: str, user_id: str, user_role: str) -> FeedbackItem:
        supabase = get_supabase_admin()
        res = supabase.table("feedback_items").select(_SELECT).eq("id", item_id).single().execute()
        if not res.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item tidak ditemukan.")
        return _to_item(res.data, user_id, user_role)

    @staticmethod
    async def create_item(
        request: CreateFeedbackRequest, user_id: str, user_role: str
    ) -> FeedbackItem:
        supabase = get_supabase_admin()
        res = supabase.table("feedback_items").insert({
            "created_by": user_id,
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "priority": request.priority,
        }).execute()
        if not res.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Gagal membuat item.")
        return await FeedbackService.get_item(res.data[0]["id"], user_id, user_role)

    @staticmethod
    def _load_for_manage(supabase, item_id: str, user_id: str, user_role: str) -> dict[str, Any]:
        existing = supabase.table("feedback_items").select("created_by").eq("id", item_id).single().execute()
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item tidak ditemukan.")
        if not _can_manage(existing.data["created_by"], user_id, user_role):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak berhak mengubah item ini.")
        return existing.data

    @staticmethod
    async def update_item(
        item_id: str, request: UpdateFeedbackRequest, user_id: str, user_role: str
    ) -> FeedbackItem:
        supabase = get_supabase_admin()
        FeedbackService._load_for_manage(supabase, item_id, user_id, user_role)

        update: dict[str, Any] = {}
        if request.title is not None:
            update["title"] = request.title
        if request.description is not None:
            update["description"] = request.description
        if request.category is not None:
            update["category"] = request.category
        if request.priority is not None:
            update["priority"] = request.priority
        if update:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("feedback_items").update(update).eq("id", item_id).execute()

        return await FeedbackService.get_item(item_id, user_id, user_role)

    @staticmethod
    async def update_status(
        item_id: str, new_status: str, user_id: str, user_role: str
    ) -> FeedbackItem:
        supabase = get_supabase_admin()
        FeedbackService._load_for_manage(supabase, item_id, user_id, user_role)
        supabase.table("feedback_items").update({
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", item_id).execute()
        return await FeedbackService.get_item(item_id, user_id, user_role)

    @staticmethod
    async def delete_item(item_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        FeedbackService._load_for_manage(supabase, item_id, user_id, user_role)
        supabase.table("feedback_items").delete().eq("id", item_id).execute()
