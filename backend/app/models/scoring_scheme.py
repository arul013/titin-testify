"""
Learning Nexus CBT — Pydantic Models for Scoring Schemes (Skema Penilaian)
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class SchemeFamily(str, Enum):
    STANDARD = "standard"   # tabel resmi (TOEFL ITP, IELTS) — angka terverifikasi
    CUSTOM = "custom"       # berbasis % benar


# ─── Request models ──────────────────────────────────────────

class CreateSchemeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    family: SchemeFamily = Field(default=SchemeFamily.CUSTOM)
    test_type: str = Field(default="custom", description="'custom' | 'toefl_itp' | 'ielts' | ...")
    config: dict[str, Any] = Field(default_factory=dict)


class UpdateSchemeRequest(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None


# ─── Response models ─────────────────────────────────────────

class SchemeResponse(BaseModel):
    id: str
    created_by: Optional[str] = None
    name: str
    family: str
    test_type: str
    config: dict[str, Any] = {}
    is_builtin: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SchemeListResponse(BaseModel):
    schemes: list[SchemeResponse] = []


class SchemeMessageResponse(BaseModel):
    message: str
    success: bool = True


# ─── Score calculator (alat "Hitung Skor") ───────────────────

class SectionScoreInput(BaseModel):
    section: str
    total: int = Field(ge=0, description="Jumlah soal bagian ini")
    correct: int = Field(ge=0, description="Jumlah benar bagian ini")


class ComputeScoreRequest(BaseModel):
    scheme_id: str
    sections: list[SectionScoreInput] = Field(default_factory=list)
    passing_value: Optional[float] = Field(default=None, description="Ambang lulus dalam skala skema (opsional)")


class SectionScoreResult(BaseModel):
    section: str
    total: int
    correct: int
    percent: float


class ComputeScoreResponse(BaseModel):
    total_questions: int
    total_correct: int
    score: float
    scale_unit: str                 # 'percent' | 'toefl_itp' | 'ielts_band'
    passed: Optional[bool] = None
    per_section: list[SectionScoreResult] = []
    detail: Optional[str] = None
