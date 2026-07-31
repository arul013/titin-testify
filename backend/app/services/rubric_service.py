"""
Learning Nexus CBT — Rubric Service (Penilaian Manual F1.2)

Pustaka rubrik reusable untuk grading manual (essay; nanti speaking).
Pola authz: bawaan (is_builtin) + milik sendiri untuk admin; super_admin semua.
Rubrik bawaan tak bisa diubah/hapus. Soft-delete via deleted_at.
"""

from fastapi import HTTPException, status
from app.database import get_supabase_admin
from app.models.rubric import (
    CreateRubricRequest,
    UpdateRubricRequest,
    RubricResponse,
    RubricListResponse,
    RubricCriterion,
)


def _criteria_from(raw) -> list[RubricCriterion]:
    out: list[RubricCriterion] = []
    for c in (raw or []):
        try:
            out.append(RubricCriterion(
                name=c.get("name", ""),
                max_score=float(c.get("max_score") or 0),
                descriptors=c.get("descriptors"),
            ))
        except Exception:
            continue
    return out


def _to_response(r: dict) -> RubricResponse:
    return RubricResponse(
        id=r["id"],
        created_by=r.get("created_by"),
        test_type=r.get("test_type"),
        name=r["name"],
        description=r.get("description"),
        criteria=_criteria_from(r.get("criteria")),
        max_total=float(r.get("max_total") or 0),
        is_builtin=bool(r.get("is_builtin")),
        status=r.get("status") or "published",
        created_at=r.get("created_at"),
        updated_at=r.get("updated_at"),
    )


def _compute_max_total(criteria: list[RubricCriterion]) -> float:
    return round(sum(c.max_score for c in criteria), 4)


def _criteria_to_json(criteria: list[RubricCriterion]) -> list[dict]:
    return [
        {"name": c.name, "max_score": c.max_score, "descriptors": c.descriptors}
        for c in criteria
    ]


class RubricService:
    """CRUD pustaka rubrik penilaian manual."""

    @staticmethod
    async def list_rubrics(user_id: str, user_role: str) -> RubricListResponse:
        supabase = get_supabase_admin()
        query = supabase.table("rubrics").select("*").is_("deleted_at", "null")
        if user_role != "super_admin":
            query = query.or_(f"is_builtin.eq.true,created_by.eq.{user_id}")
        result = query.order("is_builtin", desc=True).order("created_at", desc=False).execute()
        return RubricListResponse(rubrics=[_to_response(r) for r in (result.data or [])])

    @staticmethod
    async def get_rubric(rubric_id: str) -> dict:
        supabase = get_supabase_admin()
        result = (
            supabase.table("rubrics").select("*")
            .eq("id", rubric_id).is_("deleted_at", "null").single().execute()
        )
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan.")
        return result.data

    @staticmethod
    async def create_rubric(request: CreateRubricRequest, user_id: str) -> RubricResponse:
        supabase = get_supabase_admin()
        data = {
            "created_by": user_id,
            "test_type": request.test_type,
            "name": request.name,
            "description": request.description,
            "criteria": _criteria_to_json(request.criteria),
            "max_total": _compute_max_total(request.criteria),
            "is_builtin": False,
            "status": request.status or "published",
        }
        result = supabase.table("rubrics").insert(data).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat rubrik.",
            )
        return _to_response(result.data[0])

    @staticmethod
    async def update_rubric(rubric_id: str, request: UpdateRubricRequest, user_id: str, user_role: str) -> RubricResponse:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("rubrics").select("created_by, is_builtin")
            .eq("id", rubric_id).is_("deleted_at", "null").single().execute()
        )
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan.")
        if existing.data.get("is_builtin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rubrik bawaan tidak bisa diubah.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke rubrik ini.")

        update_data: dict = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.test_type is not None:
            update_data["test_type"] = request.test_type or None
        if request.status is not None:
            update_data["status"] = request.status
        if request.criteria is not None:
            update_data["criteria"] = _criteria_to_json(request.criteria)
            update_data["max_total"] = _compute_max_total(request.criteria)
        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data yang diubah.")
        update_data["updated_by"] = user_id

        result = supabase.table("rubrics").update(update_data).eq("id", rubric_id).execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan.")
        return _to_response(result.data[0])

    @staticmethod
    async def delete_rubric(rubric_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("rubrics").select("created_by, is_builtin")
            .eq("id", rubric_id).is_("deleted_at", "null").single().execute()
        )
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rubrik tidak ditemukan.")
        if existing.data.get("is_builtin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rubrik bawaan tidak bisa dihapus.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke rubrik ini.")
        from datetime import datetime, timezone
        supabase.table("rubrics").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat(), "updated_by": user_id}
        ).eq("id", rubric_id).execute()
