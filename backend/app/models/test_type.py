"""
Learning Nexus CBT — Pydantic Models for Test Types (multi-jenis-tes)
"""

import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

_VALID_STATUS = {"active", "soon", "disabled"}


class SkillInput(BaseModel):
    code: str = Field(..., max_length=40)
    name: str = Field(..., max_length=120)
    scorable: bool = True
    full_test_count: int = 0
    sort_order: int = 0

    @field_validator("code")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.fullmatch(r"[a-z0-9_]+", v):
            raise ValueError("Kode skill hanya boleh huruf kecil, angka, dan garis bawah.")
        return v


class SkillResponse(SkillInput):
    id: str


class CreateTestTypeRequest(BaseModel):
    code: str = Field(..., max_length=30)
    name: str = Field(..., max_length=120)
    description: Optional[str] = None
    status: str = "active"
    allow_custom: bool = True
    sort_order: int = 0
    skills: list[SkillInput] = []

    @field_validator("code")
    @classmethod
    def _slug(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.fullmatch(r"[a-z0-9_]+", v):
            raise ValueError("Kode jenis tes hanya boleh huruf kecil, angka, dan garis bawah.")
        return v

    @field_validator("status")
    @classmethod
    def _status(cls, v: str) -> str:
        if v not in _VALID_STATUS:
            raise ValueError(f"Status harus salah satu dari: {', '.join(sorted(_VALID_STATUS))}.")
        return v


class UpdateTestTypeRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = None
    status: Optional[str] = None
    allow_custom: Optional[bool] = None
    sort_order: Optional[int] = None
    # Bila diisi → GANTI seluruh daftar skill jenis ini.
    skills: Optional[list[SkillInput]] = None

    @field_validator("status")
    @classmethod
    def _status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_STATUS:
            raise ValueError(f"Status harus salah satu dari: {', '.join(sorted(_VALID_STATUS))}.")
        return v


class TestTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    status: str
    allow_custom: bool = True
    sort_order: int = 0
    is_builtin: bool = False
    skills: list[SkillResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TestTypeListResponse(BaseModel):
    test_types: list[TestTypeResponse] = []


class TestTypeMessageResponse(BaseModel):
    message: str
