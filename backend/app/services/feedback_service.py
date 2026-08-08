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
from app.services.notification_service import NotificationService
from app.models.feedback import (
    CreateFeedbackRequest, UpdateFeedbackRequest,
    FeedbackItem, FeedbackListResponse,
    FeedbackComment, FeedbackCommentListResponse,
)

# Kolom yang dipilih dari DB + join nama pembuat.
_SELECT = "*, profiles!feedback_items_created_by_fkey(full_name)"

# Urutan prioritas untuk sort "priority" (kritis dulu).
_PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}

_CATEGORY_LABEL = {
    "bug": "Bug/Perbaikan", "logic": "Perubahan Logic", "feature": "Fitur Baru",
    "ui": "UI/UX", "other": "Lainnya",
}
_STATUS_LABEL = {
    "open": "Terbuka", "in_progress": "Dikerjakan", "done": "Selesai",
    "rejected": "Ditolak/Ditunda",
}


def _admin_recipient_ids(supabase, exclude_id: str) -> list[str]:
    """user_id semua admin & super_admin, kecuali `exclude_id` (pelaku)."""
    rows = (
        supabase.table("profiles").select("id")
        .in_("role", ["admin", "super_admin"]).execute().data or []
    )
    return [r["id"] for r in rows if r["id"] != exclude_id]


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
        item = await FeedbackService.get_item(res.data[0]["id"], user_id, user_role)

        # Notif ke admin lain (kecuali pembuat) — best-effort, sekali per item.
        NotificationService.notify(
            _admin_recipient_ids(supabase, user_id),
            "feedback_created",
            f"Masukan baru: {item.title}",
            body=f"{item.creator_name or 'Admin'} • {_CATEGORY_LABEL.get(item.category, item.category)}",
            entity_type="feedback", entity_id=item.id,
        )
        return item

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
        existing = FeedbackService._load_for_manage(supabase, item_id, user_id, user_role)
        supabase.table("feedback_items").update({
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", item_id).execute()
        item = await FeedbackService.get_item(item_id, user_id, user_role)

        # Notif ke PEMBUAT bila status diubah orang lain (hindari notif ke diri sendiri).
        creator_id = existing["created_by"]
        if creator_id != user_id:
            NotificationService.notify(
                [creator_id],
                "feedback_status_changed",
                f"Status masukan diperbarui: {item.title}",
                body=f"Status kini: {_STATUS_LABEL.get(new_status, new_status)}.",
                entity_type="feedback", entity_id=item_id,
                refresh=True,
            )
        return item

    @staticmethod
    async def delete_item(item_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        FeedbackService._load_for_manage(supabase, item_id, user_id, user_role)
        supabase.table("feedback_items").delete().eq("id", item_id).execute()

    # ─── Komentar (Fase 3) ────────────────────────────────────

    @staticmethod
    def _sync_comment_count(supabase, item_id: str) -> int:
        """Hitung ulang & simpan comment_count (self-healing, anti-drift)."""
        count = (
            supabase.table("feedback_comments").select("id", count=CountMethod.exact)
            .eq("feedback_id", item_id).execute().count or 0
        )
        supabase.table("feedback_items").update({"comment_count": count}).eq("id", item_id).execute()
        return count

    @staticmethod
    async def list_comments(
        item_id: str, user_id: str, user_role: str
    ) -> FeedbackCommentListResponse:
        supabase = get_supabase_admin()
        rows = (
            supabase.table("feedback_comments")
            .select("*, profiles!feedback_comments_author_id_fkey(full_name)")
            .eq("feedback_id", item_id).order("created_at", desc=False).execute().data or []
        )
        comments = [
            FeedbackComment(
                id=r["id"], feedback_id=r["feedback_id"], author_id=r["author_id"],
                author_name=(r.get("profiles") or {}).get("full_name"),
                body=r["body"],
                can_delete=(user_role == "super_admin" or r["author_id"] == user_id),
                created_at=r.get("created_at"),
            )
            for r in rows
        ]
        return FeedbackCommentListResponse(comments=comments, total=len(comments))

    @staticmethod
    async def add_comment(
        item_id: str, body: str, user_id: str, user_role: str
    ) -> FeedbackComment:
        supabase = get_supabase_admin()
        item = supabase.table("feedback_items").select("id, title, created_by").eq("id", item_id).single().execute()
        if not item.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item tidak ditemukan.")

        res = supabase.table("feedback_comments").insert({
            "feedback_id": item_id, "author_id": user_id, "body": body,
        }).execute()
        if not res.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Gagal menambah komentar.")
        FeedbackService._sync_comment_count(supabase, item_id)

        row = res.data[0]
        actor = supabase.table("profiles").select("full_name").eq("id", user_id).single().execute()
        author_name = (actor.data or {}).get("full_name")

        # Notif ke PEMBUAT item bila yang berkomentar orang lain.
        creator_id = item.data["created_by"]
        if creator_id != user_id:
            NotificationService.notify(
                [creator_id],
                "feedback_commented",
                f"Komentar baru: {item.data['title']}",
                body=f"{author_name or 'Admin'} menambahkan komentar.",
                entity_type="feedback", entity_id=item_id,
                refresh=True,
            )

        return FeedbackComment(
            id=row["id"], feedback_id=item_id, author_id=user_id,
            author_name=author_name, body=row["body"],
            can_delete=True, created_at=row.get("created_at"),
        )

    @staticmethod
    async def delete_comment(comment_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("feedback_comments").select("author_id, feedback_id")
            .eq("id", comment_id).single().execute()
        )
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Komentar tidak ditemukan.")
        if user_role != "super_admin" and existing.data["author_id"] != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak berhak menghapus komentar ini.")
        supabase.table("feedback_comments").delete().eq("id", comment_id).execute()
        FeedbackService._sync_comment_count(supabase, existing.data["feedback_id"])
