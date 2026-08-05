"""
Learning Nexus CBT — Notification Service (M6 Fase 1, in-app)

Emit (event-driven & cron) + baca/tandai-dibaca. `notify()` bersifat
BEST-EFFORT & idempoten (UNIQUE user_id+type+entity_id) — tak boleh
menggagalkan alur utama pemanggil.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from postgrest.types import CountMethod

from app.database import get_supabase_admin
from app.services.exam_attempt_service import _parse_dt
from app.models.notification import (
    NotificationResponse, NotificationListResponse, UnreadCountResponse,
)

logger = logging.getLogger("app.notifications")


def _participant_ids(supabase, exam_id: str) -> list[str]:
    rows = (
        supabase.table("exam_participants").select("user_id")
        .eq("exam_id", exam_id).execute().data or []
    )
    return [r["user_id"] for r in rows]


def _submitted_user_ids(supabase, exam_id: str) -> set[str]:
    rows = (
        supabase.table("exam_attempts").select("user_id")
        .eq("exam_id", exam_id).eq("status", "submitted").is_("reset_at", "null")
        .execute().data or []
    )
    return {r["user_id"] for r in rows}


class NotificationService:

    # ─── Emit (dipanggil dari service lain; best-effort) ──────
    @staticmethod
    def notify(
        user_ids: list[str],
        type_: str,
        title: str,
        *,
        body: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> int:
        """Kirim notifikasi ke banyak pengguna (idempoten). Return jumlah baris di-upsert."""
        uids = [u for u in dict.fromkeys(user_ids) if u]
        if not uids:
            return 0
        supabase = get_supabase_admin()
        rows = [
            {"user_id": uid, "type": type_, "title": title, "body": body,
             "entity_type": entity_type, "entity_id": entity_id}
            for uid in uids
        ]
        try:
            supabase.table("notifications").upsert(
                rows, on_conflict="user_id,type,entity_id", ignore_duplicates=True,
            ).execute()
            return len(rows)
        except Exception as e:  # jangan pernah gagalkan alur pemanggil
            logger.warning("notify gagal (%s): %s", type_, e)
            return 0

    # ─── Baca / tandai dibaca ─────────────────────────────────
    @staticmethod
    async def list_notifications(user_id: str, limit: int = 30) -> NotificationListResponse:
        supabase = get_supabase_admin()
        rows = (
            supabase.table("notifications").select("*")
            .eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute().data or []
        )
        unread = (
            supabase.table("notifications").select("id", count=CountMethod.exact)
            .eq("user_id", user_id).is_("read_at", "null").execute().count or 0
        )
        return NotificationListResponse(
            notifications=[NotificationResponse(**r) for r in rows],
            unread_count=unread,
        )

    @staticmethod
    async def unread_count(user_id: str) -> UnreadCountResponse:
        supabase = get_supabase_admin()
        count = (
            supabase.table("notifications").select("id", count=CountMethod.exact)
            .eq("user_id", user_id).is_("read_at", "null").execute().count or 0
        )
        return UnreadCountResponse(unread_count=count)

    @staticmethod
    async def mark_read(user_id: str, notification_id: str) -> None:
        supabase = get_supabase_admin()
        supabase.table("notifications").update({"read_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("id", notification_id).eq("user_id", user_id).is_("read_at", "null").execute()

    @staticmethod
    async def mark_all_read(user_id: str) -> None:
        supabase = get_supabase_admin()
        supabase.table("notifications").update({"read_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("user_id", user_id).is_("read_at", "null").execute()

    # ─── Cron: pengingat buka/tutup (M6) ──────────────────────
    @staticmethod
    async def dispatch_reminders(window_hours: int = 24) -> dict:
        """Kirim pengingat untuk ujian yang akan dibuka/ditutup dalam `window_hours`.
        Idempoten (UNIQUE) → aman dipanggil berulang. Closing hanya ke peserta yang belum submit."""
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc)
        horizon = now + timedelta(hours=window_hours)

        exams = (
            supabase.table("exams").select("id, title, starts_at, ends_at")
            .eq("status", "published").eq("is_template", False).is_("deleted_at", "null")
            .execute().data or []
        )
        opening = closing = 0
        for e in exams:
            starts = _parse_dt(e.get("starts_at"))
            ends = _parse_dt(e.get("ends_at"))

            if starts and now < starts <= horizon:
                parts = _participant_ids(supabase, e["id"])
                opening += NotificationService.notify(
                    parts, "exam_opening",
                    f"Ujian akan dibuka: {e['title']}",
                    body=f"Dijadwalkan mulai {starts.strftime('%d %b %Y %H:%M')} UTC. Bersiaplah.",
                    entity_type="exam", entity_id=e["id"],
                )

            if ends and now < ends <= horizon:
                parts = _participant_ids(supabase, e["id"])
                done = _submitted_user_ids(supabase, e["id"])
                targets = [p for p in parts if p not in done]
                closing += NotificationService.notify(
                    targets, "exam_closing",
                    f"Ujian akan ditutup: {e['title']}",
                    body=f"Batas akhir {ends.strftime('%d %b %Y %H:%M')} UTC. Segera kerjakan sebelum ditutup.",
                    entity_type="exam", entity_id=e["id"],
                )

        return {"exams": len(exams), "opening": opening, "closing": closing}
