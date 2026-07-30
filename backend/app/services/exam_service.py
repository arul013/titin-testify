"""
Learning Nexus CBT — Exam Builder Service (Manajemen Ujian)
"""

import random
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
    def _parse_dt(v):
        """Parse timestamp DB (str/datetime) → datetime aware (UTC)."""
        if v is None:
            return None
        if isinstance(v, datetime):
            return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    @staticmethod
    def _has_attempts(supabase, exam_id: str) -> bool:
        """True bila ujian sudah pernah dikerjakan (ada percobaan apa pun)."""
        r = (
            supabase.table("exam_attempts").select("id", count=CountMethod.exact)
            .eq("exam_id", exam_id).execute()
        )
        return (r.count or 0) > 0

    @staticmethod
    def _fetch_owned(supabase, exam_id: str, user_id: str, user_role: str, columns: str = "created_by, status"):
        """Ambil satu ujian aktif (belum di-soft-delete) + cek kepemilikan."""
        res = (
            supabase.table("exams").select(columns)
            .eq("id", exam_id).is_("deleted_at", "null").single().execute()
        )
        if not res.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")
        ExamService._assert_owner(res.data["created_by"], user_id, user_role)
        return res.data

    @staticmethod
    def _guard_locked_update(supabase, exam_id: str, existing: dict, request: UpdateExamRequest) -> None:
        """Ujian sudah ada percobaan: hanya boleh perpanjang `ends_at`, tambah peserta,
        edit judul/deskripsi/show_review. Field lain terkunci (integritas ujian berjalan)."""
        locked = {
            "durasi": request.duration_minutes,
            "jenis tes": request.test_type,
            "mode ujian": request.exam_mode,
            "skema penilaian": request.scoring_scheme_id,
            "nilai kelulusan": request.passing_value,
            "izin ulang": request.allow_retake,
            "waktu mulai": request.starts_at,
            "komposisi": request.sections,
            "sumber soal": request.pool_units,
            "status": request.status,
        }
        violated = [label for label, val in locked.items() if val is not None]
        if violated:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Ujian sudah dikerjakan peserta; tak bisa mengubah: "
                + ", ".join(violated)
                + ". Kamu hanya bisa memperpanjang waktu & menambah peserta, "
                "atau Duplikat untuk ujian baru.",
            )

        # ends_at: hanya boleh diperpanjang (tak mundur ke masa lalu / tak lebih awal dari sebelumnya)
        if request.ends_at is not None:
            now = datetime.now(timezone.utc)
            new_ends = ExamService._parse_dt(request.ends_at)
            if new_ends and new_ends < now:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Waktu selesai tak boleh dimundurkan ke masa lalu saat ujian sudah dikerjakan.",
                )
            old_ends = ExamService._parse_dt(existing.get("ends_at"))
            if old_ends and new_ends and new_ends < old_ends:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Saat sudah ada percobaan, waktu selesai hanya boleh diperpanjang.",
                )

        # participant_ids: hanya boleh menambah (tak boleh menghapus yang sudah terdaftar)
        if request.participant_ids is not None:
            cur = (
                supabase.table("exam_participants").select("user_id")
                .eq("exam_id", exam_id).execute().data or []
            )
            removed = {c["user_id"] for c in cur} - set(request.participant_ids)
            if removed:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Peserta yang sudah terdaftar tak boleh dihapus saat ujian sudah dikerjakan.",
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
            "test_type": request.test_type,
            "exam_mode": request.exam_mode,
            "show_review": request.show_review,
            "scoring_scheme_id": request.scoring_scheme_id,
            "passing_value": request.passing_value,
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
        ).is_("deleted_at", "null")
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
        ).eq("id", exam_id).is_("deleted_at", "null").single().execute()
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

        existing = ExamService._fetch_owned(
            supabase, exam_id, user_id, user_role,
            columns="created_by, version, status, ends_at",
        )

        # Optimistic concurrency: tolak bila versi klien tertinggal (ada yang mengubah lebih dulu).
        current_version = existing.get("version") or 1
        if request.version is not None and request.version != current_version:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Ujian telah diubah oleh sesi lain. Muat ulang halaman lalu coba lagi.",
            )

        # ── Guard siklus hidup ──
        if existing["status"] in ("closed", "archived"):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Ujian sudah ditutup/diarsipkan sehingga tak bisa diubah. "
                "Duplikat untuk membuat ujian baru.",
            )
        # Ujian yang sudah dikerjakan → hanya boleh perpanjang waktu + tambah peserta.
        if ExamService._has_attempts(supabase, exam_id):
            ExamService._guard_locked_update(supabase, exam_id, existing, request)

        # Scalar fields (hanya yang diisi; pola sama seperti QuestionService)
        update_data = {}
        scalar_map = {
            "title": request.title,
            "description": request.description,
            "duration_minutes": request.duration_minutes,
            "test_type": request.test_type,
            "exam_mode": request.exam_mode,
            "show_review": request.show_review,
            "scoring_scheme_id": request.scoring_scheme_id,
            "passing_value": request.passing_value,
            "allow_retake": request.allow_retake,
            "status": request.status.value if request.status else None,
            "starts_at": ExamService._iso(request.starts_at),
            "ends_at": ExamService._iso(request.ends_at),
        }
        for key, value in scalar_map.items():
            if value is not None:
                update_data[key] = value

        # Selalu naikkan versi & catat aktor tiap update (optimistic locking + jejak).
        update_data["version"] = current_version + 1
        update_data["updated_by"] = user_id
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
        existing = supabase.table("exams").select("created_by").eq("id", exam_id).is_("deleted_at", "null").single().execute()
        if not existing.data:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paket ujian tidak ditemukan.")
        ExamService._assert_owner(existing.data["created_by"], user_id, user_role)
        # Soft-delete: simpan data historis (audit), sembunyikan dari daftar aktif.
        supabase.table("exams").update({
            "deleted_at": ExamService._iso(datetime.now(timezone.utc)),
            "updated_by": user_id,
        }).eq("id", exam_id).execute()

    # ─── Ketersediaan stok & publish ──────────────────────────

    @staticmethod
    def _resolve_pool_by_section(supabase, pool_units) -> dict:
        """Kelompokkan pool unit per section. Struktur per section:
        {passages: [pid utuh], questions: [qid standalone], partials: {pid: [qid subset]}}.
        """
        passage_ids = [u.passage_id for u in pool_units if u.passage_id]
        # question_id standalone = yang TANPA passage_id (subset materi pakai passage type).
        question_ids = [u.question_id for u in pool_units if u.question_id and not u.passage_id]
        ptype, qsec = {}, {}
        if passage_ids:
            r = supabase.table("question_passages").select("id, type").in_("id", passage_ids).execute()
            ptype = {x["id"]: x["type"] for x in (r.data or [])}
        if question_ids:
            r = supabase.table("questions").select("id, section").in_("id", question_ids).execute()
            qsec = {x["id"]: x["section"] for x in (r.data or [])}

        grouped: dict = {}

        def bucket(sec):
            return grouped.setdefault(sec, {"passages": [], "questions": [], "partials": {}})

        for u in pool_units:
            if u.passage_id and u.question_id:
                sec = ptype.get(u.passage_id)
                if sec:
                    bucket(sec)["partials"].setdefault(u.passage_id, []).append(u.question_id)
            elif u.passage_id:
                sec = ptype.get(u.passage_id)
                if sec:
                    bucket(sec)["passages"].append(u.passage_id)
            elif u.question_id:
                sec = qsec.get(u.question_id)
                if sec:
                    bucket(sec)["questions"].append(u.question_id)
        return grouped

    @staticmethod
    def _availability(supabase, user_id: str, user_role: str, sections, pool_units, test_type: str | None = None) -> list[SectionAvailability]:
        """Hitung stok soal Tayang per section (menghormati pool, kepemilikan, jenis tes)."""
        grouped = ExamService._resolve_pool_by_section(supabase, pool_units)

        def owned(q):
            q = q if user_role == "super_admin" else q.eq("created_by", user_id)
            return q.eq("test_type", test_type) if test_type else q

        result = []
        for s in sections:
            sec = s.section.value if hasattr(s.section, "value") else s.section
            target = s.target_count
            g = grouped.get(sec)

            if g and (g["passages"] or g["questions"] or g.get("partials")):
                avail_q = 0
                if g["passages"]:
                    avail_q += owned(
                        supabase.table("questions").select("id", count=CountMethod.exact)
                        .in_("passage_id", g["passages"]).eq("status", "published")
                    ).execute().count or 0
                # Subset materi (lewati materi yang juga dipilih utuh)
                partials = g.get("partials", {})
                partial_pids = [pid for pid in partials if pid not in g["passages"]]
                partial_qids = [qid for pid in partial_pids for qid in partials[pid]]
                if partial_qids:
                    avail_q += owned(
                        supabase.table("questions").select("id", count=CountMethod.exact)
                        .in_("id", partial_qids).eq("status", "published")
                    ).execute().count or 0
                if g["questions"]:
                    avail_q += owned(
                        supabase.table("questions").select("id", count=CountMethod.exact)
                        .in_("id", g["questions"]).eq("status", "published")
                    ).execute().count or 0
                avail_u = len(g["passages"]) + len(partial_pids) + len(g["questions"])
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

    # ─── Rakit & bekukan snapshot soal (P4.1) ─────────────────
    # Urutan bagian baku TOEFL: L → S → WE → R. Materi = unit utuh (semua soal anaknya).
    _SECTION_ORDER = ["listening", "structure", "written_expression", "reading"]

    @staticmethod
    def _question_payload(q: dict, passage: dict | None) -> dict:
        """Snapshot konten render peserta — TANPA kunci jawaban & pembahasan."""
        payload = {
            "id": q["id"],
            "section": q["section"],
            "difficulty": q.get("difficulty"),
            "question_text": q.get("question_text") or "",
            "option_a": q.get("option_a") or "",
            "option_b": q.get("option_b") or "",
            "option_c": q.get("option_c") or "",
            "option_d": q.get("option_d") or "",
            "image_url": q.get("image_url"),
            "options_image_url": q.get("options_image_url"),
            "audio_url": q.get("audio_url"),
            "passage": None,
        }
        if passage:
            payload["passage"] = {
                "type": passage.get("type"),
                "content": passage.get("content"),
                "audio_url": passage.get("audio_url"),
                "image_url": passage.get("image_url"),
                "image_position": passage.get("image_position") or "below",
            }
        return payload

    @staticmethod
    def _units_for_section(supabase, sec: str, g: dict | None, user_id: str, user_role: str, test_type: str | None = None) -> list:
        """Kembalikan daftar unit terurut; tiap unit = (passage|None, [question rows Tayang])."""
        def owned(q):
            q = q if user_role == "super_admin" else q.eq("created_by", user_id)
            return q.eq("test_type", test_type) if test_type else q

        partials: dict = {}
        if g and (g["passages"] or g["questions"] or g.get("partials")):
            explicit = True
            passage_ids = g["passages"]
            question_ids = g["questions"]
            partials = g.get("partials", {})
        else:
            explicit = False
            pr = owned(
                supabase.table("question_passages").select("id").eq("type", sec).eq("status", "published").order("created_at")
            ).execute()
            passage_ids = [x["id"] for x in (pr.data or [])]
            qr = owned(
                supabase.table("questions").select("id").eq("section", sec).eq("status", "published").is_("passage_id", "null").order("created_at")
            ).execute()
            question_ids = [x["id"] for x in (qr.data or [])]

        units = []
        # Materi UTUH (semua soal anaknya)
        for pid in passage_ids:
            prow = supabase.table("question_passages").select("*").eq("id", pid).execute().data
            if not prow:
                continue
            qrows = (
                supabase.table("questions").select("*")
                .eq("passage_id", pid).eq("status", "published").order("sort_order")
                .execute().data or []
            )
            if qrows:
                units.append((prow[0], qrows))
        # Materi SUBSET (hanya soal terpilih) — lewati bila materi juga dipilih utuh
        for pid, qids in partials.items():
            if pid in passage_ids or not qids:
                continue
            prow = supabase.table("question_passages").select("*").eq("id", pid).execute().data
            if not prow:
                continue
            qrows = (
                supabase.table("questions").select("*")
                .in_("id", qids).eq("status", "published").order("sort_order")
                .execute().data or []
            )
            if qrows:
                units.append((prow[0], qrows))
        # Soal tunggal (standalone)
        for qid in question_ids:
            qrow = supabase.table("questions").select("*").eq("id", qid).eq("status", "published").execute().data
            if qrow:
                units.append((None, [qrow[0]]))

        # Default (pool kosong) → ACAK urutan unit agar soal terpilih acak saat publish
        # (dibekukan sekali ke snapshot; tetap sama untuk semua peserta). Pilihan eksplisit
        # user tetap stabil (hormati urutan pilihannya).
        if not explicit:
            random.shuffle(units)
        return units

    @staticmethod
    def _assemble_and_freeze(supabase, exam_id: str, sections, pool_units, user_id: str, user_role: str, test_type: str | None = None) -> None:
        """Susun soal deterministik → simpan snapshot ke exam_questions. Dipanggil saat publish."""
        grouped = ExamService._resolve_pool_by_section(supabase, pool_units)
        targets = {}
        for s in sections:
            sec = s.section.value if hasattr(s.section, "value") else s.section
            targets[sec] = s.target_count

        rows = []
        position = 0
        for sec in ExamService._SECTION_ORDER:
            if sec not in targets:
                continue
            target = targets[sec]
            units = ExamService._units_for_section(supabase, sec, grouped.get(sec), user_id, user_role, test_type)
            count = 0
            for passage, qrows in units:
                if count >= target:
                    break
                for q in qrows:
                    position += 1
                    rows.append({
                        "exam_id": exam_id,
                        "section": sec,
                        "position": position,
                        "source_question_id": q["id"],
                        "correct_answer": q["correct_answer"],
                        # Pembahasan dibekukan (denormalisasi); dibuka hanya di endpoint review.
                        "explanation": q.get("explanation"),
                        "payload": ExamService._question_payload(q, passage),
                    })
                    count += 1

        # Bangun ulang snapshot (aman: hanya bila belum ada percobaan — dijaga di publish_exam).
        supabase.table("exam_questions").delete().eq("exam_id", exam_id).execute()
        if rows:
            supabase.table("exam_questions").insert(rows).execute()

    @staticmethod
    async def publish_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Validasi lengkap lalu set status 'published'."""
        supabase = get_supabase_admin()
        detail = await ExamService.get_exam(exam_id, user_id, user_role)  # + cek kepemilikan

        if detail.status.value in ("closed", "archived"):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Ujian sudah ditutup/diarsipkan sehingga tak bisa ditayangkan. "
                "Duplikat untuk membuat ujian baru.",
            )

        active = [s for s in detail.sections if s.target_count > 0]
        if not active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Tambahkan minimal satu bagian dengan jumlah soal sebelum menayangkan.")

        if not detail.participants:
            raise HTTPException(status.HTTP_400_BAD_REQUEST,
                                "Tambahkan minimal satu peserta sebelum menayangkan.")

        # Stok soal Tayang (dibatasi jenis tes ujian)
        avail = ExamService._availability(supabase, user_id, user_role, active, detail.pool_units, detail.test_type)
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

        # Bekukan snapshot soal — hanya bila belum ada percobaan (jaga integritas ujian yang sudah dikerjakan).
        attempts = supabase.table("exam_attempts").select("id", count=CountMethod.exact).eq("exam_id", exam_id).execute()
        fresh_snapshot = (attempts.count or 0) == 0
        if fresh_snapshot:
            ExamService._assemble_and_freeze(supabase, exam_id, active, detail.pool_units, user_id, user_role, detail.test_type)

        # Validasi EKSAK (tes standar / mode 'full'): jumlah soal terakit per bagian HARUS tepat = target.
        if detail.exam_mode == "full":
            eq_rows = supabase.table("exam_questions").select("section").eq("exam_id", exam_id).execute().data or []
            per_sec: dict = {}
            for r in eq_rows:
                per_sec[r["section"]] = per_sec.get(r["section"], 0) + 1
            mismatches = [
                f"{SECTION_LABELS.get(s.section.value, s.section.value)} (butuh tepat {s.target_count}, terakit {per_sec.get(s.section.value, 0)})"
                for s in active
                if per_sec.get(s.section.value, 0) != s.target_count
            ]
            if mismatches:
                if fresh_snapshot:  # batalkan snapshot tak valid yang baru dibuat
                    supabase.table("exam_questions").delete().eq("exam_id", exam_id).execute()
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Tes standar butuh jumlah soal TEPAT per bagian: " + "; ".join(mismatches)
                    + ". Sesuaikan pilihan Sumber Soal agar pas.",
                )

        supabase.table("exams").update({"status": "published"}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    @staticmethod
    async def unpublish_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Kembalikan paket ujian ke status 'draft' (hanya bila belum ada percobaan)."""
        supabase = get_supabase_admin()
        existing = ExamService._fetch_owned(supabase, exam_id, user_id, user_role)
        if existing["status"] in ("closed", "archived"):
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "Ujian sudah ditutup/diarsipkan. Duplikat untuk membuat ujian baru.")
        if ExamService._has_attempts(supabase, exam_id):
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "Ujian sudah dikerjakan peserta sehingga tak bisa dikembalikan ke Draf. "
                                "Duplikat untuk membuat ujian baru.")
        supabase.table("exams").update({"status": "draft", "updated_by": user_id}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    # ─── Transisi siklus hidup: close / archive / duplicate ───

    @staticmethod
    async def close_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Tutup ujian Tayang → 'closed' (read-only, tak bisa dibuka ulang)."""
        supabase = get_supabase_admin()
        existing = ExamService._fetch_owned(supabase, exam_id, user_id, user_role)
        if existing["status"] != "published":
            raise HTTPException(status.HTTP_409_CONFLICT,
                                "Hanya ujian Tayang yang bisa ditutup.")
        supabase.table("exams").update({"status": "closed", "updated_by": user_id}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    @staticmethod
    async def archive_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Arsipkan ujian (dari draft/published/closed) → 'archived'."""
        supabase = get_supabase_admin()
        existing = ExamService._fetch_owned(supabase, exam_id, user_id, user_role)
        if existing["status"] == "archived":
            raise HTTPException(status.HTTP_409_CONFLICT, "Ujian sudah diarsipkan.")
        supabase.table("exams").update({"status": "archived", "updated_by": user_id}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    @staticmethod
    async def unarchive_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Keluarkan dari arsip. Kembali ke 'closed' bila sudah ada percobaan, selain itu 'draft'."""
        supabase = get_supabase_admin()
        existing = ExamService._fetch_owned(supabase, exam_id, user_id, user_role)
        if existing["status"] != "archived":
            raise HTTPException(status.HTTP_409_CONFLICT, "Ujian tidak sedang diarsipkan.")
        target = "closed" if ExamService._has_attempts(supabase, exam_id) else "draft"
        supabase.table("exams").update({"status": target, "updated_by": user_id}).eq("id", exam_id).execute()
        return await ExamService.get_exam(exam_id, user_id, user_role)

    @staticmethod
    async def duplicate_exam(exam_id: str, user_id: str, user_role: str) -> ExamDetailResponse:
        """Kloning ujian jadi Draf baru (tanpa jadwal/snapshot/percobaan)."""
        supabase = get_supabase_admin()
        src = await ExamService.get_exam(exam_id, user_id, user_role)  # + cek kepemilikan

        title = (src.title + " (Salinan)")[:200]
        new = supabase.table("exams").insert({
            "created_by": user_id,
            "title": title,
            "description": src.description,
            "duration_minutes": src.duration_minutes,
            "test_type": src.test_type,
            "exam_mode": src.exam_mode,
            "show_review": src.show_review,
            "scoring_scheme_id": src.scoring_scheme_id,
            "passing_value": src.passing_value,
            "allow_retake": src.allow_retake,
            "status": "draft",       # selalu mulai sebagai Draf
            "starts_at": None,       # jadwal dikosongkan (ujian baru)
            "ends_at": None,
        }).execute()
        if not new.data:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Gagal menduplikat ujian.")
        new_id = new.data[0]["id"]

        if src.sections:
            supabase.table("exam_sections").insert([
                {"exam_id": new_id, "section": s.section.value, "target_count": s.target_count, "weight": s.weight}
                for s in src.sections
            ]).execute()
        if src.participants:
            supabase.table("exam_participants").insert([
                {"exam_id": new_id, "user_id": p.user_id} for p in src.participants
            ]).execute()
        if src.pool_units:
            supabase.table("exam_pool_units").insert([
                {"exam_id": new_id, "passage_id": u.passage_id, "question_id": u.question_id}
                for u in src.pool_units
            ]).execute()

        return await ExamService.get_exam(new_id, user_id, user_role)

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
        attempts_count = (
            supabase.table("exam_attempts").select("id", count=CountMethod.exact)
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
            test_type=e.get("test_type", "itp"),
            exam_mode=e.get("exam_mode", "custom"),
            show_review=e.get("show_review", False),
            scoring_scheme_id=e.get("scoring_scheme_id"),
            passing_value=e.get("passing_value"),
            allow_retake=e.get("allow_retake", False),
            status=e["status"],
            version=e.get("version", 1),
            starts_at=e.get("starts_at"),
            ends_at=e.get("ends_at"),
            creator_name=creator_name,
            sections=sections,
            participants_count=participants_count,
            attempts_count=attempts_count,
            total_target=sum(s.target_count for s in sections),
            created_at=e.get("created_at"),
            updated_at=e.get("updated_at"),
        )
