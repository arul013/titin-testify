"""
Learning Nexus CBT — Audio Upload Route (Cloudflare R2)
"""

import os
import uuid
import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from app.config import get_settings
from app.models.user import UserProfile
from app.dependencies import require_admin

router = APIRouter(prefix="/api/questions", tags=["Question Bank Uploader"])
settings = get_settings()


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    _current_user: UserProfile = Depends(require_admin),
):
    """Upload listening audio file to Cloudflare R2.
    
    Access restricted to Admin & Super Admin.
    """
    # 1. Validate file type
    if not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File yang diunggah harus berformat audio (mp3, wav, m4a, dsb).",
        )

    # 2. Check configuration
    if not all([
        settings.cloudflare_r2_endpoint,
        settings.cloudflare_r2_access_key_id,
        settings.cloudflare_r2_secret_access_key,
        settings.cloudflare_r2_bucket_name,
        settings.cloudflare_r2_public_url,
    ]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Penyimpanan Cloudflare R2 belum dikonfigurasi di backend (.env).",
        )

    # 3. Generate unique filename
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    r2_key = f"listening/{unique_filename}"

    # 4. Initialize boto3 S3 Client for Cloudflare R2
    try:
        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.cloudflare_r2_endpoint,
            aws_access_key_id=settings.cloudflare_r2_access_key_id,
            aws_secret_access_key=settings.cloudflare_r2_secret_access_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menginisialisasi penyimpanan Cloudflare R2: {str(e)}",
        )

    # 5. Read file content and upload
    try:
        file_content = await file.read()
        
        # Upload using put_object
        s3_client.put_object(
            Bucket=settings.cloudflare_r2_bucket_name,
            Key=r2_key,
            Body=file_content,
            ContentType=file.content_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengunggah file ke Cloudflare R2: {str(e)}",
        )
    finally:
        await file.close()

    # 6. Return CDN / Public URL
    public_url = f"{settings.cloudflare_r2_public_url.rstrip('/')}/{r2_key}"
    
    return {
        "filename": file.filename,
        "audio_url": public_url,
        "success": True
    }
