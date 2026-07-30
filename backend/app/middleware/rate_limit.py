"""
Learning Nexus CBT — Rate Limiting (F2.b)

Rate-limit per-IP berbasis `slowapi`/`limits`. **Redis-ready**: backend storage
diambil dari `settings.rate_limit_storage_uri` (dev: "memory://", prod: "redis://…"
mis. Upstash). Ganti skala = cukup ubah env, tanpa ubah kode.

Lapisan ini menangani proteksi VOLUMETRIK per-IP. Proteksi per-AKUN (lockout
kredensial) ditangani di auth_service. Proteksi edge/DDoS = Cloudflare (pra-domain).
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings

settings = get_settings()


def _client_key(request: Request) -> str:
    """Kunci rate-limit = IP klien; hormati X-Forwarded-For di belakang proxy/CDN."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


# Limiter global. `enabled=False` → semua limit dilewati (mis. saat test).
limiter = Limiter(
    key_func=_client_key,
    storage_uri=settings.rate_limit_storage_uri,
    enabled=settings.rate_limit_enabled,
    headers_enabled=True,  # kirim header RateLimit-* ke klien
)
