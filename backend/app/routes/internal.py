"""
Learning Nexus CBT — Internal Job Routes (F4/M3)

Endpoint untuk dipicu penjadwal EKSTERNAL (Cloudflare Cron / pg_cron-http /
cron-job.org). Dijaga secret bersama (`INTERNAL_JOB_SECRET`) di header
`X-Internal-Secret`. Bila secret belum diset → endpoint dinonaktifkan.
"""

import secrets

from fastapi import APIRouter, Header, HTTPException, status
from typing import Optional

from app.config import get_settings
from app.services.exam_attempt_service import ExamAttemptService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/internal/jobs", tags=["Internal Jobs"])


def _verify_secret(provided: Optional[str]) -> None:
    secret = get_settings().internal_job_secret
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Endpoint internal dinonaktifkan (INTERNAL_JOB_SECRET belum diset).",
        )
    if not provided or not secrets.compare_digest(provided, secret):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Secret internal tidak valid.")


@router.post("/expire-attempts")
async def expire_attempts(x_internal_secret: Optional[str] = Header(default=None)):
    """Finalisasi attempt yang deadline-nya lewat. Aman dipanggil berulang."""
    _verify_secret(x_internal_secret)
    return await ExamAttemptService.expire_stale_attempts()


@router.post("/dispatch-reminders")
async def dispatch_reminders(x_internal_secret: Optional[str] = Header(default=None)):
    """Kirim pengingat notifikasi ujian akan dibuka/ditutup (M6). Idempoten."""
    _verify_secret(x_internal_secret)
    return await NotificationService.dispatch_reminders()
