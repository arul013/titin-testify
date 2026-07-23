"""
Learning Nexus CBT — Exam Builder Service (Manajemen Ujian)
"""

from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from postgrest.types import CountMethod
from app.database import get_supabase_admin
from app.models.exam import (
    CreateExamRequest,
    UpdateExamRequest,
    ExamResponse,
    ExamDetailResponse,
    ExamListResponse,
    ExamSectionResponse,
    ExamParticipantResponse,
    ExamPoolUnitResponse,
    SectionAvailability,
    PoolPreviewResponse,
    PoolPreviewRequest,
)

SECTION_LABELS = {
    "listening": "Listening",
    "structure": "Structure",
    "written_expression": "Written Expression",
    "reading": "Reading",
}


class ExamService:
    """Service layer untuk Exam Builder (authoring paket ujian)."""

    # ─── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _iso(dt):
        return dt.isoformat() if dt is not None else None

    @staticmethod
    def _assert_owner(existing_created_by: str, user_id: str, user_role: str) -> None:
        if user_role != "super_admin" and existing_created_by != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke paket ujian ini.",
            )

    @staticmethod
    def _validate_participants(supabase, participant_ids: list[str]) -> list[str]:
        """Pastikan semua id adalah akun peserta yang valid. Kembalikan list unik."""
        ids = list(dict.fromkeys(participant_ids))  # dedupe, jaga urutan
        if not ids:
            return []
        res = supabase.table("profiles").select("id, role").in_("id", ids).execute()
        found = {r["id"]: r["role"] for r in (res.data or [])}
        for pid in ids:
            if pid not in found:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Peserta tidak ditemukan: {pid}")
            if found[pid] != "peserta":
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Hanya akun peserta yang bisa ditandai sebagai peserta ujian.",
                )
        return ids

    @staticmethod
    def _insert_children(supabase, exam_id: str, request) -> None:
        """Insert sections/participants/pool_units untuk sebuah exam."""
        sections = getattr(request, "sections", None) or []
        if sections:
            supabase.table("exam_sections").insert([
                {
                    "exam_id": exam_id,
                    "section": s.section.value,
                    "target_count": s.target_count,
                    "weight": s.weight,
                }
                for s in sections
            ]).execute()

        participant_ids = ExamService._validate_participants(
            supabase, getattr(request, "participant_ids", None) or []
        )
        if participant_ids:
            supabase.table("exam_participants").insert([
                {"exam_id": exam_id, "user_id": uid} for uid in participant_ids
            ]).execute()

        pool_units = getattr(request, "pool_units", None) or []
        if pool_units:
            supabase.table("exam_pool_units").insert([
                {"exam_id": exam_id, "passage_id": u.passage_id, "question_id": u.question_id}
                for u in pool_units
            ]).execute()

    # ─── Create ───────────────────────────────────────────────

    @staticmethod
    async def create_exam(request: CreateExamRequest, user_id: str) -> ExamDetailResponse:
        supabase = get_supabase_admin()

        data = {
            "created_by": user_id,
            "title": request.title,
            "description": request.description,
            "duration_minutes": request.duration_minutes,
            "passing_grade": request.passing_grade,
            "shuffle_questions": request.shuffle_questions,
            "shuffle_options": request.shuffle_options,
            "allow_retake": request.allow_retake,
            "status": request.status.value,
            "starts_at": ExamService._iso(request.starts_at),
            "ends_at": ExamService._iso(request.ends_at),
        }

        result = supabase.table("exams").insert(data).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat paket ujian.",
            )

        exam_id = result.data[0]["id"]
        ExamService._insert_children(supabase, exam_id, request)

        return await ExamService.get_exam(exam_id, user_id, "super_admin")  # owner baru saja membuat

    # ─── List ─────────────────────────────────────────────────

    @staticmethod
    async def list_exams(
        user_id: str,
        user_role: str,
        page: int = 1,
        per_page: int = 20,
        status_filter: str | None = None,
        search: str = "",
    ) -> ExamListResponse:
        supabase = get_supabase_admin()

        query = supabase.table("exams").select(
            "*, profiles!exams_created_by_fkey(full_name)", count=CountMethod.exact
        )
        if user_role != "super_admin":
            query = query.eq("created_by", user_id)
        if status_filter:
            query = query.eq("status", status_filter)
        if search:
            query = query.ilike("title", f"%{search}%")

        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        result = query.execute()

        exams = [ExamService._build_summary(supabase, e) for e in (result.data or [])]

        return ExamListResponse(
            exams=exams,
            total=result.count or 0,
            page=page,
            per_page=per_page,
        )

    # ─── Get detail ───────────────────────────────────────────

    @staticmethod
    async def get_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        supabase = get_supabase_admin()

        res = supabase.table("exams").select(
            "*, profiles!exams_created_by_fkey(full_name)"
        ).eq("id", exam_id).single().execute()
        if not res.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")

        e = res.data
        ExamService._assert_owner(e["created_by"], user_id, user_role)

        summary = ExamService._build_summary(supabase, e)

        participants_res = supabase.table("exam_participants").select(
            "user_id, profiles!exam_participants_user_id_fkey(username, full_name)"
        ).eq("exam_id", exam_id).execute()
        participants = [
            ExamParticipantResponse(
                user_id=p["user_id"],
                username=(p.get("profiles") or {}).get("username"),
                full_name=(p.get("profiles") or {}).get("full_name"),
            )
            for p in (participants_res.data or [])
        ]

        units_res = supabase.table("exam_pool_units").select(
            "passage_id, question_id"
        ).eq("exam_id", exam_id).execute()
        pool_units = [
            ExamPoolUnitResponse(passage_id=u.get("passage_id"), question_id=u.get("question_id"))
            for u in (units_res.data or [])
        ]

        return ExamDetailResponse(
            **summary.model_dump(),
            participants=participants,
            pool_units=pool_units,
        )

    # ─── Update ───────────────────────────────────────────────

    @staticmethod
    async def update_exam(
        exam_id: str, request: UpdateExamRequest, user_id: str, user_role: str
    ) -> ExamDetailResponse:
        supabase = get_supabase_admin()

        existing = supabase.table("exams").select("created_by").eq("id", exam_id).single().execute()
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")
        ExamService._assert_owner(existing.data["created_by"], user_id, user_role)

        # Scalar fields (hanya yang diisi; pola sama seperti QuestionService)
        update_data = {}
        scalar_map = {
            "title": request.title,
            "description": request.description,
            "duration_minutes": request.duration_minutes,
            "passing_grade": request.passing_grade,
            "shuffle_questions": request.shuffle_questions,
            "shuffle_options": request.shuffle_options,
            "allow_retake": request.allow_retake,
            "status": request.status.value if request.status else None,
            "starts_at": ExamService._iso(request.starts_at),
            "ends_at": ExamService._iso(request.ends_at),
        }
        for key, value in scalar_map.items():
            if value is not None:
                update_data[key] = value

        if update_data:
            supabase.table("exams").update(update_data).eq("id", exam_id).execute()

        # List fields: bila diisi → replace keseluruhan
        if request.sections is not None:
            supabase.table("exam_sections").delete().eq("exam_id", exam_id).execute()
            if request.sections:
                supabase.table("exam_sections").insert([
                    {
                        "exam_id": exam_id,
                        "section": s.section.value,
                        "target_count": s.target_count,
                        "weight": s.weight,
                    }
                    for s in request.sections
                ]).execute()

        if request.participant_ids is not None:
            ids = ExamService._validate_participants(supabase, request.participant_ids)
            supabase.table("exam_participants").delete().eq("exam_id", exam_id).execute()
            if ids:
                supabase.table("exam_participants").insert([
                    {"exam_id": exam_id, "user_id": uid} for uid in ids
                ]).execute()

        if request.pool_units is not None:
            supabase.table("exam_pool_units").delete().eq("exam_id", exam_id).execute()
            if request.pool_units:
                supabase.table("exam_pool_units").insert([
                    {"exam_id": exam_id, "passage_id": u.passage_id, "question_id": u.question_id}
                    for u in request.pool_units
                ]).execute()

        return await ExamService.get_exam(exam_id, user_id, user_role)

    # ─── Delete ───────────────────────────────────────────────

    @staticmethod
    async def delete_exam(exam_id: str, user_id: str, user_role: str) -> None:
        supabase = get_supabase_admin()
        existing = supabase.table("exams").select("created_by").eq("id", exam_id).single().execute()
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")
        ExamService._assert_owner(existing.data["created_by"], user_id, user_role)
        supabase.table("exams").delete().eq("id", exam_id).execute()

    # ─── Ketersediaan stok & publish ──────────────────────────

    @staticmethod
    def _resolve_pool_by_section(supabase, pool_units) -> dict:
        """Kelompokkan pool unit per section (resolve section dari passage/question)."""
        passage_ids = [u.passage_id for u in pool_units if u.passage_id]
        question_ids = [u.question_id for u in pool_units if u.question_id]
        ptype, qsec = {}, {}
        if passage_ids:
            r = supabase.table("question_passages").select("id, type").in_("id", passage_ids).execute()
            ptype = {x["id"]: x["type"] for x in (r.data or [])}
        if question_ids:
            r = supabase.table("questions").select("id, section").in_("id", question_ids).execute()
            qsec = {x["id"]: x["section"] for x in (r.data or [])}
        grouped: dict = {}
        for u in pool_units:
            if u.passage_id and u.passage_id in ptype:
                grouped.setdefault(ptype[u.passage_id], {"passages": [], "questions": []})["passages"].append(u.passage_id)
            elif u.question_id and u.question_id in qsec:
                grouped.setdefault(qsec[u.question_id], {"passages": [], "questions": []})["questions"].append(u.question_id)
        return grouped

    @staticmethod
    def _availability(supabase, user_id: str, user_role: str, sections, pool_units) -> list[SectionAvailability]:
        """Hitung stok soal Tayang per section (menghormati pool & kepemilikan)."""
        grouped = ExamService._resolve_pool_by_section(supabase, pool_units)

        def owned(q):
            return q if user_role == "super_admin" else q.eq("created_by", user_id)

        result = []
        for s in sections:
            sec = s.section.value if hasattr(s.section, "value") else s.section
            target = s.target_count
            g = grouped.get(sec)

            if g and (g["passages"] or g["questions"]):
                avail_q = 0
                if g["passages"]:
                    avail_q += owned(
                        supabase.table("questions").select("id", count=CountMethod.exact)
                        .in_("passage_id", g["passages"]).eq("status", "published")
                    ).execute().count or 0
                if g["questions"]:
                    avail_q += owned(
                        supabase.table("questions").select("id", count=CountMethod.exact)
                        .in_("id", g["questions"]).eq("status", "published")
                    ).execute().count or 0
                avail_u = len(g["passages"]) + len(g["questions"])
            else:
                avail_q = owned(
                    supabase.table("questions").select("id", count=CountMethod.exact)
                    .eq("section", sec).eq("status", "published")
                ).execute().count or 0
                passages_u = owned(
                    supabase.table("question_passages").select("id", count=CountMethod.exact)
                    .eq("type", sec).eq("status", "published")
                ).execute().count or 0
                standalone_u = owned(
                    supabase.table("questions").select("id", count=CountMethod.exact)
                    .eq("section", sec).eq("status", "published").is_("passage_id", "null")
                ).execute().count or 0
                avail_u = passages_u + standalone_u

            result.append(SectionAvailability(
                section=sec,
                target_count=target,
                available_units=avail_u,
                available_questions=avail_q,
                enough=avail_q >= target,
            ))
        return result

    @staticmethod
    async def pool_preview(request: PoolPreviewRequest, user_id: str, user_role: str) -> PoolPreviewResponse:
        supabase = get_supabase_admin()
        return PoolPreviewResponse(
            sections=ExamService._availability(supabase, user_id, user_role, request.sections, request.pool_units)
        )

    @staticmethod
    async def publish_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Validasi lengkap lalu set status 'published'."""
        supabase = get_supabase_admin()
        detail = await ExamService.get_exam(exam_id, user_id, user_role)  # + cek kepemilikan

        active = [s for s in detail.sections if s.target_count > 0]
        if not active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Tambahkan minimal satu bagian dengan jumlah soal sebelum menayangkan.")

        if not detail.participants:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Tambahkan minimal satu peserta sebelum menayangkan.")

        # Stok soal Tayang
        avail = ExamService._availability(supabase, user_id, user_role, active, detail.pool_units)
        short = [a for a in avail if not a.enough]
        if short:
            msgs = [
                f"{SECTION_LABELS.get(a.section.value, a.section.value)} (butuh {a.target_count}, tersedia {a.available_questions})"
                for a in short
            ]
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Stok soal Tayang belum cukup: " + "; ".join(msgs) + ".")

        # Jadwal + safety net 5 menit (bila dijadwalkan)
        if detail.starts_at:
            now = datetime.now(timezone.utc)
            starts = detail.starts_at
            if starts.tzinfo is None:
                starts = starts.replace(tzinfo=timezone.utc)
            if detail.ends_at:
                ends = detail.ends_at
                if ends.tzinfo is None:
                    ends = ends.replace(tzinfo=timezone.utc)
                if ends <= starts:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                        "Jadwal selesai harus setelah waktu mulai.")
            if starts < now - timedelta(minutes=5):
                raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                    "Waktu mulai sudah lewat lebih dari 5 menit. Perbarui jadwal atau matikan penjadwalan.")

        supabase.table("exams").update({"status": "published"}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    @staticmethod
    async def unpublish_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Kembalikan paket ujian ke status 'draft'."""
        supabase = get_supabase_admin()
        existing = supabase.table("exams").select("created_by").eq("id", exam_id).single().execute()
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")
        ExamService._assert_owner(existing.data["created_by"], user_id, user_role)
        supabase.table("exams").update({"status": "draft"}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    # ─── Response builders ────────────────────────────────────

    @staticmethod
    def _build_summary(supabase, e: dict) -> ExamResponse:
        """Bangun ExamResponse (dengan sections, total_target, participants_count)."""
        sections_res = supabase.table("exam_sections").select(
            "section, target_count, weight"
        ).eq("exam_id", e["id"]).order("section").execute()
        sections = [
            ExamSectionResponse(section=s["section"], target_count=s["target_count"], weight=s.get("weight"))
            for s in (sections_res.data or [])
        ]

        participants_count = (
            supabase.table("exam_participants").select("id", count=CountMethod.exact)
            .eq("exam_id", e["id"]).execute().count or 0
        )

        creator_name = None
        if e.get("profiles"):
            creator_name = e["profiles"].get("full_name")

        return ExamResponse(
            id=e["id"],
            created_by=e["created_by"],
            title=e["title"],
            description=e.get("description"),
            duration_minutes=e["duration_minutes"],
            passing_grade=e.get("passing_grade"),
            shuffle_questions=e.get("shuffle_questions", False),
            shuffle_options=e.get("shuffle_options", False),
            allow_retake=e.get("allow_retake", False),
            status=e["status"],
            starts_at=e.get("starts_at"),
            ends_at=e.get("ends_at"),
            creator_name=creator_name,
            sections=sections,
            participants_count=participants_count,
            total_target=sum(s.target_count for s in sections),
            created_at=e.get("created_at"),
            updated_at=e.get("updated_at"),
        )
