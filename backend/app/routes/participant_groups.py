"""
Learning Nexus CBT — Grup/Kelas Peserta Routes (M5.1)
"""

from fastapi import APIRouter, Depends, Query, Request

from app.models.participant_group import (
    CreateGroupRequest, UpdateGroupRequest,
    GroupDetailResponse, GroupListResponse,
)
from app.models.user import UserProfile
from app.services.participant_group_service import ParticipantGroupService
from app.services.audit_service import AuditService
from app.dependencies import require_admin

router = APIRouter(tags=["Participant Groups"])


@router.get("/api/participant-groups", response_model=GroupListResponse)
async def list_groups(
    search: str = Query("", description="Cari nama grup"),
    current_user: UserProfile = Depends(require_admin),
):
    """Daftar grup peserta (owner atau super_admin)."""
    return await ParticipantGroupService.list_groups(
        current_user.id, current_user.role.value, search=search,
    )


@router.get("/api/participant-groups/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Detail grup + anggotanya."""
    return await ParticipantGroupService.get_group(group_id, current_user.id, current_user.role.value)


@router.post("/api/participant-groups", response_model=GroupDetailResponse, status_code=201)
async def create_group(
    request: CreateGroupRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Buat grup peserta baru."""
    result = await ParticipantGroupService.create_group(request, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="participant_group.create", entity_type="participant_group",
        entity_id=result.id, summary=f"Buat grup '{result.name}' ({result.member_count} anggota)",
    )
    return result


@router.put("/api/participant-groups/{group_id}", response_model=GroupDetailResponse)
async def update_group(
    group_id: str,
    request: UpdateGroupRequest,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Ubah nama/deskripsi grup dan/atau ganti keseluruhan anggota."""
    result = await ParticipantGroupService.update_group(group_id, request, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="participant_group.update", entity_type="participant_group",
        entity_id=group_id, summary=f"Perbarui grup '{result.name}' ({result.member_count} anggota)",
    )
    return result


@router.delete("/api/participant-groups/{group_id}")
async def delete_group(
    group_id: str,
    http_request: Request,
    current_user: UserProfile = Depends(require_admin),
):
    """Hapus grup (soft-delete)."""
    await ParticipantGroupService.delete_group(group_id, current_user.id, current_user.role.value)
    AuditService.log_action(
        http_request, current_user, action="participant_group.delete", entity_type="participant_group",
        entity_id=group_id, summary="Hapus grup peserta (soft-delete)",
    )
    return {"message": "Grup dihapus.", "success": True}
