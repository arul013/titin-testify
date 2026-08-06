"""
Learning Nexus CBT — Storage Service (media upload)

Abstraksi penyimpanan media: **Cloudflare R2 bila dikonfigurasi**, kalau tidak
**jatuh ke Supabase Storage** (bucket publik, auto-dibuat). Ini melepas
ketergantungan pada setup custom-domain/sertifikat R2 — Supabase memberi URL
HTTPS valid otomatis. Dipakai oleh upload gambar/audio (F1.3 speaking, M8.4 kamera).
"""

import logging
from uuid import uuid4

from fastapi import HTTPException, status

from app.config import get_settings
from app.database import get_supabase_admin

logger = logging.getLogger("app.storage")

_bucket_ready = False  # cache: bucket Supabase sudah dipastikan ada


def _r2_configured() -> bool:
    s = get_settings()
    return all([
        s.cloudflare_r2_endpoint,
        s.cloudflare_r2_access_key_id,
        s.cloudflare_r2_secret_access_key,
        s.cloudflare_r2_bucket_name,
        s.cloudflare_r2_public_url,
    ])


def _upload_r2(key: str, content: bytes, content_type: str) -> str:
    import boto3
    from botocore.config import Config

    s = get_settings()
    try:
        client = boto3.client(
            "s3",
            endpoint_url=s.cloudflare_r2_endpoint,
            aws_access_key_id=s.cloudflare_r2_access_key_id,
            aws_secret_access_key=s.cloudflare_r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        client.put_object(Bucket=s.cloudflare_r2_bucket_name, Key=key, Body=content, ContentType=content_type)
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Gagal mengunggah ke penyimpanan: {e}")
    return f"{s.cloudflare_r2_public_url.rstrip('/')}/{key}"


def _ensure_bucket(supabase, bucket: str) -> None:
    """Pastikan bucket Supabase Storage ada & publik (best-effort, dicache)."""
    global _bucket_ready
    if _bucket_ready:
        return
    try:
        supabase.storage.get_bucket(bucket)
    except Exception:
        try:
            supabase.storage.create_bucket(bucket, options={"public": True})
        except Exception as e:
            logger.warning("create_bucket '%s' gagal (mungkin sudah ada): %s", bucket, e)
    _bucket_ready = True


def _upload_supabase(key: str, content: bytes, content_type: str) -> str:
    s = get_settings()
    supabase = get_supabase_admin()
    bucket = s.storage_bucket or "media"
    _ensure_bucket(supabase, bucket)
    try:
        supabase.storage.from_(bucket).upload(
            key, content, {"content-type": content_type, "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Gagal mengunggah ke penyimpanan: {e}")
    url = supabase.storage.from_(bucket).get_public_url(key)
    return url.rstrip("?")  # storage3 kadang menambah '?' di akhir


def _use_r2() -> bool:
    """Tentukan backend: hormati STORAGE_BACKEND, default 'auto' = R2 bila terkonfigurasi."""
    backend = (get_settings().storage_backend or "auto").lower()
    if backend == "supabase":
        return False
    if backend == "r2":
        return True
    return _r2_configured()  # auto


def put_media(content: bytes, content_type: str, folder: str, ext: str) -> tuple[str, str]:
    """Unggah media → (URL publik, storage_key). Backend sesuai STORAGE_BACKEND.

    `folder` = prefix logis (mis. 'images', 'listening', 'speaking', 'proctor').
    Nama file di-acak (uuid) demi keamanan. `storage_key` dipakai untuk hapus (retensi).
    """
    key = f"{folder}/{uuid4().hex}.{ext}"
    url = _upload_r2(key, content, content_type) if _use_r2() else _upload_supabase(key, content, content_type)
    return url, key


def upload_media(content: bytes, content_type: str, folder: str, ext: str) -> str:
    """Versi ringkas: kembalikan URL publik saja."""
    return put_media(content, content_type, folder, ext)[0]


def delete_media(key: str) -> None:
    """Hapus satu objek (best-effort) — dipakai job retensi. Tak melempar bila gagal."""
    if not key:
        return
    try:
        if _use_r2():
            import boto3
            from botocore.config import Config
            s = get_settings()
            client = boto3.client(
                "s3",
                endpoint_url=s.cloudflare_r2_endpoint,
                aws_access_key_id=s.cloudflare_r2_access_key_id,
                aws_secret_access_key=s.cloudflare_r2_secret_access_key,
                config=Config(signature_version="s3v4"),
                region_name="auto",
            )
            client.delete_object(Bucket=s.cloudflare_r2_bucket_name, Key=key)
        else:
            supabase = get_supabase_admin()
            supabase.storage.from_(get_settings().storage_bucket or "media").remove([key])
    except Exception as e:
        logger.warning("delete_media '%s' gagal: %s", key, e)
