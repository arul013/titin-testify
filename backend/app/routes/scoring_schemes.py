"""
Learning Nexus CBT — Scoring Scheme Routes (Skema Penilaian)
"""

from fastapi import APIRouter, Depends

from app.models.scoring_scheme import (
    CreateSchemeRequest,
    UpdateSchemeRequest,
    SchemeResponse,
    SchemeListResponse,
    SchemeMessageResponse,
    ComputeScoreRequest,
    ComputeScoreResponse,
)
from app.models.user import UserProfile
from app.services.scoring_scheme_service import ScoringSchemeService
from app.dependencies import require_admin

router = APIRouter(prefix="/api/scoring-schemes", tags=["Scoring Schemes"])


@router.get("", response_model=SchemeListResponse)
async def list_schemes(current_user: UserProfile = Depends(require_admin)):
    """Daftar skema penilaian (bawaan + milik sendiri)."""
    return await ScoringSchemeService.list_schemes(current_user.id, current_user.role.value)


@router.post("", response_model=SchemeResponse, status_code=201)
async def create_scheme(
    request: CreateSchemeRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat skema penilaian custom."""
    return await ScoringSchemeService.create_scheme(request, current_user.id)


@router.post("/compute", response_model=ComputeScoreResponse)
async def compute_score(
    request: ComputeScoreRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Alat 'Hitung Skor' — input jumlah soal & benar per bagian → skor menurut skema."""
    return await ScoringSchemeService.compute_score(request)


@router.put("/{scheme_id}", response_model=SchemeResponse)
async def update_scheme(
    scheme_id: str,
    request: UpdateSchemeRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Ubah skema custom (nama/config)."""
    return await ScoringSchemeService.update_scheme(scheme_id, request, current_user.id, current_user.role.value)


@router.delete("/{scheme_id}", response_model=SchemeMessageResponse)
async def delete_scheme(
    scheme_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus skema custom."""
    await ScoringSchemeService.delete_scheme(scheme_id, current_user.id, current_user.role.value)
    return SchemeMessageResponse(message="Skema penilaian berhasil dihapus.")
