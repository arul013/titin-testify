"""
Learning Nexus CBT — Grup/Kelas Peserta (M5.1)

Cohort peserta yang bisa dipakai ulang lintas ujian.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CreateGroupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    member_ids: list[str] = Field(default_factory=list, description="user_id peserta anggota awal")


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    # Bila diisi → GANTI keseluruhan anggota grup dengan daftar ini (replace).
    member_ids: Optional[list[str]] = None


class GroupMemberResponse(BaseModel):
    user_id: str
    username: Optional[str] = None
    full_name: Optional[str] = None


class GroupResponse(BaseModel):
    id: str
    created_by: str
    name: str
    description: Optional[str] = None
    member_count: int = 0
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GroupDetailResponse(GroupResponse):
    members: list[GroupMemberResponse] = []


class GroupListResponse(BaseModel):
    groups: list[GroupResponse]
    total: int
