"""
Learning Nexus CBT — Observability (F4): request-id + structured access log.

- Tiap request dapat `request_id` (hormati header `X-Request-ID` masuk, mis. dari
  Cloudflare/proxy; kalau tak ada → generate). Disimpan di ContextVar → ikut di
  SEMUA log dalam request itu (termasuk warning/error dari service).
- Access log terstruktur: method, path, status, durasi ms, request_id.
- `request_id` juga dikembalikan di header respons untuk korelasi klien↔server.
"""

import contextvars
import logging
import time
import uuid

from fastapi import FastAPI, Request

# ContextVar global — dibaca filter logging & helper get_request_id().
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

logger = logging.getLogger("app.access")


def get_request_id() -> str:
    """Request-id aktif (untuk disisipkan mis. ke audit/log manual)."""
    return request_id_var.get()


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def setup_logging(app_level: int = logging.INFO) -> None:
    """Konfigurasi logging: format menyertakan [request_id]. Idempotent.

    Root tetap INFO + lib chatty (httpx/hpack/…) di-redam ke WARNING; hanya logger
    aplikasi (`app.*`) yang ikut `app_level` (mis. DEBUG saat app_debug) agar log dev
    tak banjir oleh internal HTTP/HTTP2.
    """
    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    # Redam library pihak ketiga yang sangat verbose di level DEBUG.
    for noisy in ("httpx", "httpcore", "hpack", "urllib3", "asyncio", "botocore", "boto3", "s3transfer"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Logger aplikasi boleh lebih verbose (DEBUG di dev).
    logging.getLogger("app").setLevel(app_level)


def install_request_logging(app: FastAPI) -> None:
    """Pasang middleware request-id + access log."""

    @app.middleware("http")
    async def _observability(request: Request, call_next):
        incoming = request.headers.get("x-request-id")
        rid = incoming if incoming else uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            dur_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "%s %s → ERROR (%.1fms)", request.method, request.url.path, dur_ms
            )
            request_id_var.reset(token)
            raise
        dur_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = rid
        # Health check tak perlu dicatat (mengurangi noise dari probe).
        if request.url.path != "/api/health":
            logger.info(
                "%s %s → %s (%.1fms)",
                request.method, request.url.path, response.status_code, dur_ms,
            )
        request_id_var.reset(token)
        return response
