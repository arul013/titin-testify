"""
Learning Nexus CBT — Pydantic Models for Rubrics (Penilaian Manual F1.2)
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RubricCriterion(BaseModel):
    """Satu kriteria rubrik (mis. IELTS Writing: 'Task Achievement' maks 9)."""
    name: str = Field(..., min_length=1, max_length=200)
    max_score: float = Field(..., gt=0, description="Skor maksimum kriteria ini")
    descriptors: Optional[str] = Field(None, description="Deskripsi/band descriptor (opsional)")


class CreateRubricRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    test_type: Optional[str] = Field(None, description="Jenis tes pemilik (null = umum/lintas)")
    criteria: list[RubricCriterion] = Field(..., min_length=1)
    status: str = Field(default="published", description="draft | published")


class UpdateRubricRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    test_type: Optional[str] = None
    criteria: Optional[list[RubricCriterion]] = None
    status: Optional[str] = None


class RubricResponse(BaseModel):
    id: str
    created_by: Optional[str] = None
    test_type: Optional[str] = None
    name: str
    description: Optional[str] = None
    criteria: list[RubricCriterion] = []
    max_total: float = 0
    is_builtin: bool = False
    status: str = "published"
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RubricListResponse(BaseModel):
    rubrics: list[RubricResponse] = []


class RubricMessageResponse(BaseModel):
    message: str
    success: bool = True
