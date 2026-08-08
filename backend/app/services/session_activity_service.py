"""
Learning Nexus CBT — Session Activity Service (Idle Timeout)

Melacak aktivitas terakhir per-sesi (klaim `session_id` JWT Supabase) dan
memaksa sesi berakhir setelah idle N menit (`settings.session_idle_minutes`).

Aturan penting:
- `check()` dipanggil di SETIAP request ber-auth → hanya MENGECEK (tolak bila basi),
  TIDAK me-refresh (agar polling latar tak membuat sesi hidup selamanya).
- `touch()` me-REFRESH last_activity → dipanggil oleh endpoint heartbeat (aktivitas nyata).
- `end()` menghapus record (logout).

Best-effort terhadap error koneksi (log + jangan crash), KECUALI kondisi "basi"
yang memang harus menolak (fail-safe ke logout).
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException, status
from jose import jwt

from app.config import get_settings
from app.database import get_supabase_admin

logger = logging.getLogger("app.session")


def extract_session_id(token: str) -> Optional[str]:
    """Ambil klaim `session_id` dari JWT (tanpa verifikasi — token sudah divalidasi
    di jalur pemanggil). Kembalikan None bila tak ada (mis. token lama)."""
    try:
        claims = jwt.get_unverified_claims(token)
        sid = claims.get("session_id")
        return sid if sid else None
    except Exception:
        return None


class SessionActivityService:

    @staticmethod
    def _limit() -> timedelta:
        return timedelta(minutes=get_settings().session_idle_minutes)

    @staticmethod
    def check(session_id: Optional[str], user_id: str) -> None:
        """Tolak (401) bila sesi idle melebihi batas. Buat record bila belum ada (grace).

        Dipanggil dari `get_current_user`. TIDAK me-refresh last_activity.
        """
        if not session_id:
            return  # token tanpa session_id (edge) — tak bisa dilacak, lewati.
        try:
            supabase = get_supabase_admin()
            res = (
                supabase.table("auth_sessions").select("last_activity")
                .eq("session_id", session_id).limit(1).execute()
            )
            rows = res.data or []
            if not rows:
                # Sesi lama / pertama kali terlihat → catat sekarang (grace, tak menendang).
                supabase.table("auth_sessions").upsert(
                    {"session_id": session_id, "user_id": user_id,
                     "last_activity": datetime.now(timezone.utc).isoformat()},
                    on_conflict="session_id",
                ).execute()
                return

            last = _parse_ts(rows[0].get("last_activity"))
            if last is None:
                return
            if datetime.now(timezone.utc) - last > SessionActivityService._limit():
                # Bersihkan record basi lalu tolak.
                try:
                    supabase.table("auth_sessions").delete().eq("session_id", session_id).execute()
                except Exception:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Sesi berakhir karena tidak aktif. Silakan masuk kembali.",
                )
        except HTTPException:
            raise
        except Exception as e:  # error koneksi → jangan blokir pemakai
            logger.warning("session check gagal: %s", e)

    @staticmethod
    def touch(session_id: Optional[str], user_id: str) -> None:
        """Refresh last_activity = now (dipanggil heartbeat & login). Best-effort."""
        if not session_id:
            return
        try:
            supabase = get_supabase_admin()
            supabase.table("auth_sessions").upsert(
                {"session_id": session_id, "user_id": user_id,
                 "last_activity": datetime.now(timezone.utc).isoformat()},
                on_conflict="session_id",
            ).execute()
        except Exception as e:
            logger.warning("session touch gagal: %s", e)

    @staticmethod
    def end(session_id: Optional[str]) -> None:
        """Hapus record sesi (logout). Best-effort."""
        if not session_id:
            return
        try:
            supabase = get_supabase_admin()
            supabase.table("auth_sessions").delete().eq("session_id", session_id).execute()
        except Exception as e:
            logger.warning("session end gagal: %s", e)


def _parse_ts(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None
