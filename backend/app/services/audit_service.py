"""
Learning Nexus CBT — Audit Service (F3)

Menulis jejak aksi sensitif ke tabel append-only `audit_events`
(siapa/kapan/aksi/entitas/before→after). Best-effort: kegagalan audit
di-log sebagai warning dan TIDAK menggagalkan aksi utama.

Konvensi `action`: "<entity>.<verb>", mis. "exam.publish", "exam.update",
"exam.extend", "exam.close", "exam.archive", "exam.duplicate", "exam.delete".
"""

import logging
from typing import Any, Optional

from app.database import get_supabase_admin

logger = logging.getLogger(__name__)


class AuditService:
    @staticmethod
    def context_from_request(request: Any) -> tuple[Optional[str], Optional[str]]:
        """Ambil (ip, user_agent) dari FastAPI Request (hormati X-Forwarded-For)."""
        if request is None:
            return None, None
        ip = request.client.host if getattr(request, "client", None) else None
        xff = request.headers.get("x-forwarded-for")
        if xff:
            ip = xff.split(",")[0].strip()
        return ip, request.headers.get("user-agent")

    @staticmethod
    def log(
        *,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        summary: Optional[str] = None,
        before: Optional[dict] = None,
        after: Optional[dict] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> None:
        """Tulis satu baris audit (append-only). Best-effort."""
        try:
            get_supabase_admin().table("audit_events").insert({
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "actor_id": actor_id,
                "actor_role": actor_role,
                "summary": summary,
                "before_json": before,
                "after_json": after,
                "ip": ip,
                "user_agent": user_agent,
            }).execute()
        except Exception as e:  # noqa: BLE001 — audit tak boleh menggagalkan aksi utama
            logger.warning("Gagal menulis audit_events (action=%s entity=%s:%s): %s",
                           action, entity_type, entity_id, e)

    @staticmethod
    def log_action(
        request: Any,
        current_user: Any,
        *,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        summary: Optional[str] = None,
        before: Optional[dict] = None,
        after: Optional[dict] = None,
    ) -> None:
        """Convenience: turunkan aktor dari `current_user` & konteks dari `request`."""
        ip, ua = AuditService.context_from_request(request)
        actor_id = getattr(current_user, "id", None) if current_user is not None else None
        role = getattr(current_user, "role", None) if current_user is not None else None
        actor_role = None if role is None else (getattr(role, "value", None) or str(role))
        AuditService.log(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
            actor_role=actor_role,
            summary=summary,
            before=before,
            after=after,
            ip=ip,
            user_agent=ua,
        )
