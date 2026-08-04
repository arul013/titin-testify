"""
Learning Nexus CBT — Grup/Kelas Peserta Service (M5.1)

CRUD cohort peserta. Owner-scoped (created_by), super_admin lihat semua.
Semua mutasi dicatat ke audit di layer route.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from postgrest.types import CountMethod

from app.database import get_supabase_admin
from app.models.participant_group import (
    CreateGroupRequest, UpdateGroupRequest,
    GroupResponse, GroupDetailResponse, GroupMemberResponse, GroupListResponse,
)


def _assert_owner(created_by: str, user_id: str, user_role: str) -> None:
    if user_role != "super_admin" and created_by != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak memiliki akses ke grup ini.")


def _valid_member_ids(supabase, ids: list[str]) -> list[str]:
    """Saring ke user_id yang benar-benar ada (cegah FK error karena id basi). Buang duplikat."""
    uniq = list(dict.fromkeys(i for i in ids if i))
    if not uniq:
        return []
    rows = supabase.table("profiles").select("id").in_("id", uniq).execute().data or []
    found = {r["id"] for r in rows}
    return [i for i in uniq if i in found]


def _replace_members(supabase, group_id: str, member_ids: list[str]) -> None:
    supabase.table("participant_group_members").delete().eq("group_id", group_id).execute()
    valid = _valid_member_ids(supabase, member_ids)
    if valid:
        supabase.table("participant_group_members").insert(
            [{"group_id": group_id, "user_id": uid} for uid in valid]
        ).execute()


class ParticipantGroupService:

    @staticmethod
    async def list_groups(user_id: str, user_role: str, search: str = "") -> GroupListResponse:
        supabase = get_supabase_admin()
        query = (
            supabase.table("participant_groups")
            .select("*, profiles!participant_groups_created_by_fkey(full_name)", count=CountMethod.exact)
            .is_("deleted_at", "null")
        )
        if user_role != "super_admin":
            query = query.eq("created_by", user_id)
        if search:
            query = query.ilike("name", f"%{search}%")
        result = query.order("created_at", desc=True).execute()
        rows = result.data or []

        # member_count batch (anti-N+1).
        ids = [g["id"] for g in rows]
        counts: dict[str, int] = {}
        if ids:
            for m in (
                supabase.table("participant_group_members").select("group_id")
                .in_("group_id", ids).execute().data or []
            ):
                counts[m["group_id"]] = counts.get(m["group_id"], 0) + 1

        groups = [
            GroupResponse(
                id=g["id"], created_by=g["created_by"], name=g["name"],
                description=g.get("description"), member_count=counts.get(g["id"], 0),
                creator_name=(g.get("profiles") or {}).get("full_name"),
                created_at=g.get("created_at"), updated_at=g.get("updated_at"),
            )
            for g in rows
        ]
        return GroupListResponse(groups=groups, total=result.count or 0)

    @staticmethod
    async def get_group(group_id: str, user_id: str, user_role: str) -> GroupDetailResponse:
        supabase = get_supabase_admin()
        res = (
            supabase.table("participant_groups")
            .select("*, profiles!participant_groups_created_by_fkey(full_name)")
            .eq("id", group_id).is_("deleted_at", "null").single().execute()
        )
        if not res.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Grup tidak ditemukan.")
        g = res.data
        _assert_owner(g["created_by"], user_id, user_role)

        members = [
            GroupMemberResponse(
                user_id=m["user_id"],
                username=(m.get("profiles") or {}).get("username"),
                full_name=(m.get("profiles") or {}).get("full_name"),
            )
            for m in (
                supabase.table("participant_group_members")
                .select("user_id, profiles!participant_group_members_user_id_fkey(username, full_name)")
                .eq("group_id", group_id).execute().data or []
            )
        ]
        return GroupDetailResponse(
            id=g["id"], created_by=g["created_by"], name=g["name"],
            description=g.get("description"), member_count=len(members),
            creator_name=(g.get("profiles") or {}).get("full_name"),
            created_at=g.get("created_at"), updated_at=g.get("updated_at"),
            members=members,
        )

    @staticmethod
    async def create_group(request: CreateGroupRequest, user_id: str, user_role: str) -> GroupDetailResponse:
        supabase = get_supabase_admin()
        res = supabase.table("participant_groups").insert({
            "created_by": user_id,
            "name": request.name,
            "description": request.description,
        }).execute()
        if not res.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Gagal membuat grup.")
        group_id = res.data[0]["id"]
        if request.member_ids:
            _replace_members(supabase, group_id, request.member_ids)
        return await ParticipantGroupService.get_group(group_id, user_id, user_role)

    @staticmethod
    async def update_group(
        group_id: str, request: UpdateGroupRequest, user_id: str, user_role: str
    ) -> GroupDetailResponse:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("participant_groups").select("created_by")
            .eq("id", group_id).is_("deleted_at", "null").single().execute()
        )
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Grup tidak ditemukan.")
        _assert_owner(existing.data["created_by"], user_id, user_role)

        update: dict[str, Any] = {}
        if request.name is not None:
            update["name"] = request.name
        if request.description is not None:
            update["description"] = request.description
        if update:
            update["updated_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("participant_groups").update(update).eq("id", group_id).execute()

        if request.member_ids is not None:
            _replace_members(supabase, group_id, request.member_ids)

        return await ParticipantGroupService.get_group(group_id, user_id, user_role)

    @staticmethod
    async def delete_group(group_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("participant_groups").select("created_by")
            .eq("id", group_id).is_("deleted_at", "null").single().execute()
        )
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Grup tidak ditemukan.")
        _assert_owner(existing.data["created_by"], user_id, user_role)
        supabase.table("participant_groups").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", group_id).execute()
