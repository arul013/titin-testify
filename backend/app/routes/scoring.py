"""
Learning Nexus CBT — Scoring Routes (kalkulator referensi)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.models.user import UserProfile
from app.dependencies import require_admin
from app.services.scoring_engine import score_toefl_itp

router = APIRouter(prefix="/api/scoring", tags=["Scoring"])


class ItpPreviewRequest(BaseModel):
    listening: int = Field(0, ge=0, le=50)
    structure_we: int = Field(0, ge=0, le=40)
    reading: int = Field(0, ge=0, le=50)


class ItpConverted(BaseModel):
    listening: int
    structure_we: int
    reading: int


class ItpPreviewResponse(BaseModel):
    score: int
    converted: ItpConverted


@router.post("/toefl-itp", response_model=ItpPreviewResponse)
async def preview_toefl_itp(
    req: ItpPreviewRequest,
    _current_user: UserProfile = Depends(require_admin),
):
    """Kalkulator skor TOEFL ITP: jumlah benar per grup → konversi + skor akhir."""
    r = score_toefl_itp(req.listening, req.structure_we, req.reading)
    return ItpPreviewResponse(score=r["score"], converted=ItpConverted(**r["converted"]))
