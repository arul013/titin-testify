"""
Learning Nexus CBT — Media Upload Routes (Cloudflare R2)

Keamanan (F2.c):
- Batas ukuran hard: audio ≤ 50 MB, gambar ≤ 10 MB (tolak sebelum ke R2).
- Validasi tipe via **magic bytes** (baca header file), BUKAN sekadar percaya
  `content_type` dari klien (mudah dipalsukan).
- Whitelist format + nama file acak (uuid) + ContentType hasil deteksi server.
"""

import uuid
import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from app.config import get_settings
from app.models.user import UserProfile
from app.dependencies import require_admin

router = APIRouter(prefix="/api/questions", tags=["Question Bank Uploader"])
settings = get_settings()

MB = 1024 * 1024
MAX_AUDIO_BYTES = 50 * MB
MAX_IMAGE_BYTES = 10 * MB

# Tipe hasil deteksi magic-bytes → ekstensi kanonik.
EXT_BY_KIND = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
}
IMAGE_KINDS = {"image/png", "image/jpeg", "image/gif", "image/webp"}
AUDIO_KINDS = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"}


def _sniff(head: bytes) -> str | None:
    """Deteksi tipe file dari signature (magic bytes) di header."""
    # Gambar
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:4] in (b"GIF8",):
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    # Audio
    if head[:3] == b"ID3":
        return "audio/mpeg"
    if len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0:  # MPEG frame sync
        return "audio/mpeg"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "audio/wav"
    if head[:4] == b"OggS":
        return "audio/ogg"
    if head[4:8] == b"ftyp":  # ISO-BMFF (m4a/mp4)
        return "audio/mp4"
    return None


def _s3_client():
    """Klien R2 (S3-compatible). Raise 503 bila belum dikonfigurasi."""
    if not all([
        settings.cloudflare_r2_endpoint,
        settings.cloudflare_r2_access_key_id,
        settings.cloudflare_r2_secret_access_key,
        settings.cloudflare_r2_bucket_name,
        settings.cloudflare_r2_public_url,
    ]):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Penyimpanan Cloudflare R2 belum dikonfigurasi di backend (.env).",
        )
    try:
        return boto3.client(
            "s3",
            endpoint_url=settings.cloudflare_r2_endpoint,
            aws_access_key_id=settings.cloudflare_r2_access_key_id,
            aws_secret_access_key=settings.cloudflare_r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Gagal menginisialisasi penyimpanan: {str(e)}",
        )


async def _read_validated(
    file: UploadFile, max_bytes: int, allowed: set[str], human: str
) -> tuple[bytes, str, str]:
    """Baca file dengan batas ukuran + validasi magic-bytes. Return (isi, kind, ext)."""
    # Baca maksimal (max+1) byte → kalau lebih, tolak tanpa memuat tak terbatas.
    content = await file.read(max_bytes + 1)
    if not content:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File kosong.")
    if len(content) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Ukuran {human} melebihi batas {max_bytes // MB} MB.",
        )
    kind = _sniff(content[:16])
    if kind not in allowed:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Format {human} tidak didukung atau file tidak valid. "
            + ("Gunakan MP3/WAV/M4A/OGG." if human == "audio" else "Gunakan PNG/JPG/WEBP/GIF."),
        )
    return content, kind, EXT_BY_KIND[kind]


def _upload(content: bytes, kind: str, ext: str, folder: str) -> str:
    """Unggah ke R2 dengan nama acak + ContentType hasil deteksi server. Return public URL."""
    s3 = _s3_client()
    r2_key = f"{folder}/{uuid.uuid4().hex}.{ext}"
    try:
        s3.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=r2_key,
            Body=content,
            ContentType=kind,
        )
    except Exception as e:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Gagal mengunggah ke penyimpanan: {str(e)}",
        )
    return f"{settings.cloudflare_r2_public_url.rstrip('/')}/{r2_key}"


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    _current_user: UserProfile = Depends(require_admin),
):
    """Upload audio Listening ke R2 (Admin/Super Admin). Maks 50 MB, tervalidasi magic-bytes."""
    try:
        content, kind, ext = await _read_validated(file, MAX_AUDIO_BYTES, AUDIO_KINDS, "audio")
        url = _upload(content, kind, ext, "listening")
    finally:
        await file.close()
    return {"filename": file.filename, "audio_url": url, "success": True}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    _current_user: UserProfile = Depends(require_admin),
):
    """Upload gambar soal/passage ke R2 (Admin/Super Admin). Maks 10 MB, tervalidasi magic-bytes."""
    try:
        content, kind, ext = await _read_validated(file, MAX_IMAGE_BYTES, IMAGE_KINDS, "gambar")
        url = _upload(content, kind, ext, "images")
    finally:
        await file.close()
    return {"filename": file.filename, "image_url": url, "success": True}
