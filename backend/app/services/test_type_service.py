"""
Learning Nexus CBT — Test Type Service (registry jenis tes + skill)
"""

from fastapi import HTTPException, status
from app.database import get_supabase_admin
from app.models.test_type import (
    CreateTestTypeRequest,
    UpdateTestTypeRequest,
    TestTypeResponse,
    TestTypeListResponse,
    SkillResponse,
)


def _skill_to_response(s: dict) -> SkillResponse:
    return SkillResponse(
        id=s["id"],
        code=s["code"],
        name=s["name"],
        scorable=bool(s.get("scorable", True)),
        full_test_count=s.get("full_test_count") or 0,
        sort_order=s.get("sort_order") or 0,
    )


def _to_response(t: dict, skills: list[dict]) -> TestTypeResponse:
    ordered = sorted(skills, key=lambda s: (s.get("sort_order") or 0, s.get("name") or ""))
    return TestTypeResponse(
        id=t["id"],
        code=t["code"],
        name=t["name"],
        description=t.get("description"),
        status=t["status"],
        allow_custom=bool(t.get("allow_custom", True)),
        sort_order=t.get("sort_order") or 0,
        is_builtin=bool(t.get("is_builtin")),
        skills=[_skill_to_response(s) for s in ordered],
        created_at=t.get("created_at"),
        updated_at=t.get("updated_at"),
    )


def _insert_skills(supabase, test_type_id: str, skills) -> None:
    if not skills:
        return
    rows = [
        {
            "test_type_id": test_type_id,
            "code": s.code,
            "name": s.name,
            "scorable": s.scorable,
            "full_test_count": s.full_test_count,
            "sort_order": s.sort_order,
        }
        for s in skills
    ]
    supabase.table("test_type_skills").insert(rows).execute()


class TestTypeService:
    """CRUD registry jenis tes (admin). Skill dikelola menyatu dengan jenisnya."""

    @staticmethod
    async def list_test_types() -> TestTypeListResponse:
        supabase = get_supabase_admin()
        types = (
            supabase.table("test_types").select("*")
            .order("sort_order").order("name").execute().data or []
        )
        if not types:
            return TestTypeListResponse(test_types=[])
        ids = [t["id"] for t in types]
        skills = (
            supabase.table("test_type_skills").select("*").in_("test_type_id", ids).execute().data or []
        )
        by_type: dict = {}
        for s in skills:
            by_type.setdefault(s["test_type_id"], []).append(s)
        return TestTypeListResponse(
            test_types=[_to_response(t, by_type.get(t["id"], [])) for t in types]
        )

    @staticmethod
    async def get_test_type(test_type_id: str) -> TestTypeResponse:
        supabase = get_supabase_admin()
        t = supabase.table("test_types").select("*").eq("id", test_type_id).execute().data
        if not t:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Jenis tes tidak ditemukan.")
        skills = (
            supabase.table("test_type_skills").select("*").eq("test_type_id", test_type_id).execute().data or []
        )
        return _to_response(t[0], skills)

    @staticmethod
    async def create_test_type(request: CreateTestTypeRequest) -> TestTypeResponse:
        supabase = get_supabase_admin()
        dup = supabase.table("test_types").select("id").eq("code", request.code).execute().data
        if dup:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Kode jenis tes '{request.code}' sudah dipakai.")
        ins = supabase.table("test_types").insert({
            "code": request.code,
            "name": request.name,
            "description": request.description,
            "status": request.status,
            "allow_custom": request.allow_custom,
            "sort_order": request.sort_order,
            "is_builtin": False,
        }).execute()
        if not ins.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Gagal membuat jenis tes.")
        created = ins.data[0]
        _insert_skills(supabase, created["id"], request.skills)
        return await TestTypeService.get_test_type(created["id"])

    @staticmethod
    async def update_test_type(test_type_id: str, request: UpdateTestTypeRequest) -> TestTypeResponse:
        supabase = get_supabase_admin()
        existing = supabase.table("test_types").select("id").eq("id", test_type_id).execute().data
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Jenis tes tidak ditemukan.")

        fields = {
            "name": request.name,
            "description": request.description,
            "status": request.status,
            "allow_custom": request.allow_custom,
            "sort_order": request.sort_order,
        }
        update_data = {k: v for k, v in fields.items() if v is not None}
        if update_data:
            supabase.table("test_types").update(update_data).eq("id", test_type_id).execute()

        # Ganti seluruh skill bila dikirim.
        if request.skills is not None:
            supabase.table("test_type_skills").delete().eq("test_type_id", test_type_id).execute()
            _insert_skills(supabase, test_type_id, request.skills)

        return await TestTypeService.get_test_type(test_type_id)

    @staticmethod
    async def delete_test_type(test_type_id: str) -> None:
        supabase = get_supabase_admin()
        existing = (
            supabase.table("test_types").select("is_builtin, code").eq("id", test_type_id).execute().data
        )
        if not existing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Jenis tes tidak ditemukan.")
        if existing[0].get("is_builtin"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Jenis tes bawaan tidak bisa dihapus.")

        # Jangan hapus bila masih ada soal/ujian memakainya (jaga integritas).
        code = existing[0]["code"]
        used_q = supabase.table("questions").select("id").eq("test_type", code).limit(1).execute().data
        used_e = supabase.table("exams").select("id").eq("test_type", code).limit(1).execute().data
        if used_q or used_e:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Jenis tes masih dipakai oleh soal/ujian. Pindahkan atau hapus dulu yang memakainya.",
            )
        supabase.table("test_types").delete().eq("id", test_type_id).execute()

    # ── Helper untuk modul lain (exam validation, dsb.) ──
    @staticmethod
    def get_skills_by_code(code: str) -> list[dict]:
        """Daftar skill (dict) untuk satu jenis tes berdasarkan code. [] bila tak ada."""
        supabase = get_supabase_admin()
        t = supabase.table("test_types").select("id").eq("code", code).execute().data
        if not t:
            return []
        return (
            supabase.table("test_type_skills").select("*").eq("test_type_id", t[0]["id"]).execute().data or []
        )
