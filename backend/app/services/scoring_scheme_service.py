"""
Learning Nexus CBT — Scoring Scheme Service (Skema Penilaian)
"""

from fastapi import HTTPException, status
from app.database import get_supabase_admin
from app.models.scoring_scheme import (
    CreateSchemeRequest,
    UpdateSchemeRequest,
    SchemeResponse,
    SchemeListResponse,
    ComputeScoreRequest,
    ComputeScoreResponse,
    SectionScoreResult,
)


def _to_response(s: dict) -> SchemeResponse:
    return SchemeResponse(
        id=s["id"],
        created_by=s.get("created_by"),
        name=s["name"],
        family=s["family"],
        test_type=s["test_type"],
        config=s.get("config") or {},
        is_builtin=bool(s.get("is_builtin")),
        created_at=s.get("created_at"),
        updated_at=s.get("updated_at"),
    )


class ScoringSchemeService:
    """CRUD skema penilaian + kalkulator skor."""

    @staticmethod
    async def list_schemes(user_id: str, user_role: str) -> SchemeListResponse:
        supabase = get_supabase_admin()
        query = supabase.table("scoring_schemes").select("*")
        # Admin: bawaan + milik sendiri. Super admin: semua.
        if user_role != "super_admin":
            query = query.or_(f"is_builtin.eq.true,created_by.eq.{user_id}")
        result = query.order("is_builtin", desc=True).order("created_at", desc=False).execute()
        return SchemeListResponse(schemes=[_to_response(s) for s in (result.data or [])])

    @staticmethod
    async def get_scheme(scheme_id: str) -> dict:
        supabase = get_supabase_admin()
        result = supabase.table("scoring_schemes").select("*").eq("id", scheme_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skema penilaian tidak ditemukan.")
        return result.data

    @staticmethod
    async def create_scheme(request: CreateSchemeRequest, user_id: str) -> SchemeResponse:
        supabase = get_supabase_admin()
        data = {
            "created_by": user_id,
            "name": request.name,
            "family": request.family.value,
            "test_type": request.test_type,
            "config": request.config,
            "is_builtin": False,
        }
        result = supabase.table("scoring_schemes").insert(data).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat skema penilaian.",
            )
        return _to_response(result.data[0])

    @staticmethod
    async def update_scheme(scheme_id: str, request: UpdateSchemeRequest, user_id: str, user_role: str) -> SchemeResponse:
        supabase = get_supabase_admin()
        existing = supabase.table("scoring_schemes").select("created_by, is_builtin").eq("id", scheme_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skema penilaian tidak ditemukan.")
        if existing.data.get("is_builtin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Skema bawaan tidak bisa diubah.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke skema ini.")

        update_data: dict = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.config is not None:
            update_data["config"] = request.config
        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data yang diubah.")

        result = supabase.table("scoring_schemes").update(update_data).eq("id", scheme_id).execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skema penilaian tidak ditemukan.")
        return _to_response(result.data[0])

    @staticmethod
    async def delete_scheme(scheme_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        existing = supabase.table("scoring_schemes").select("created_by, is_builtin").eq("id", scheme_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skema penilaian tidak ditemukan.")
        if existing.data.get("is_builtin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Skema bawaan tidak bisa dihapus.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke skema ini.")
        supabase.table("scoring_schemes").delete().eq("id", scheme_id).execute()

    @staticmethod
    async def compute_score(request: ComputeScoreRequest) -> ComputeScoreResponse:
        scheme = await ScoringSchemeService.get_scheme(request.scheme_id)
        config = scheme.get("config") or {}
        family = scheme.get("family")
        score_type = config.get("type")

        per_section: list[SectionScoreResult] = []
        total_q = 0
        total_c = 0
        for s in request.sections:
            correct = min(s.correct, s.total)  # jaga-jaga: benar tak boleh > total
            pct = round(correct / s.total * 100, 1) if s.total > 0 else 0.0
            per_section.append(SectionScoreResult(section=s.section, total=s.total, correct=correct, percent=pct))
            total_q += s.total
            total_c += correct

        # Keluarga "custom" / tipe persentase → skor = % benar (bagian setara).
        if family == "custom" or score_type == "percentage":
            score = round(total_c / total_q * 100, 1) if total_q > 0 else 0.0
            passed = None
            if request.passing_value is not None:
                passed = score >= request.passing_value
            return ComputeScoreResponse(
                total_questions=total_q,
                total_correct=total_c,
                score=score,
                scale_unit="percent",
                passed=passed,
                per_section=per_section,
                detail=None,
            )

        # Skema standar (TOEFL ITP / IELTS) — butuh tabel konversi resmi (belum tersedia).
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skema resmi belum siap: tabel konversi resmi belum tersedia. Sementara gunakan skema Persentase.",
        )
