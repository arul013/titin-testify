"""
Learning Nexus CBT — Exam Attempt Service (Phase 4: peserta mengerjakan ujian)
"""

from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from app.database import get_supabase_admin
from app.models.exam_attempt import (
    MyExamItem,
    MyExamListResponse,
    AttemptQuestion,
    StartAttemptResponse,
    SaveAnswerRequest,
    SectionResult,
    AttemptResultResponse,
    AttemptReviewQuestion,
    AttemptReviewResponse,
)
from app.services.scoring_engine import compute_exam_score, is_official_itp


def _parse_dt(v) -> datetime | None:
    if not v:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _grade(qtype: str | None, correct_answer, answer_key_json, selected_answer, answer_json) -> bool:
    """Nilai satu jawaban auto-scored per tipe soal (True = benar penuh).

    - mcq_multi: himpunan pilihan peserta HARUS sama persis dengan kunci ({correct:[…]}).
    - essay/speaking: dinilai MANUAL — bukan auto (selalu False di sini; skor diisi penilai).
    - default (mcq_single/true_false_ng/…): single-choice, selected == correct_answer.
    """
    if qtype in ("essay", "speaking"):
        return False
    if qtype == "mcq_multi":
        key = answer_key_json.get("correct") if isinstance(answer_key_json, dict) else None
        got = answer_json.get("selected") if isinstance(answer_json, dict) else None
        if not key:
            return False
        return {str(x) for x in (got or [])} == {str(x) for x in key}
    if qtype in ("fill_blank", "short_answer"):
        accepted = answer_key_json.get("accept") if isinstance(answer_key_json, dict) else None
        got = answer_json.get("text") if isinstance(answer_json, dict) else None
        if not accepted or not got:
            return False

        def _norm(s):  # rapikan spasi + case-insensitive (standar completion)
            return " ".join(str(s).strip().lower().split())

        return _norm(got) in {_norm(a) for a in accepted}
    if qtype == "matching":
        key = answer_key_json.get("pairs") if isinstance(answer_key_json, dict) else None
        got = answer_json.get("pairs") if isinstance(answer_json, dict) else None
        if not key:
            return False
        got = got or {}
        return all(str(got.get(str(k), "")) == str(v) for k, v in key.items())
    if qtype == "ordering":
        key = answer_key_json.get("positions") if isinstance(answer_key_json, dict) else None
        got = answer_json.get("positions") if isinstance(answer_json, dict) else None
        if not key:
            return False
        got = got or {}
        return all(str(got.get(str(k), "")) == str(v) for k, v in key.items())
    return selected_answer is not None and selected_answer == correct_answer


class ExamAttemptService:
    """Alur peserta: daftar ujian, mulai/lanjut, autosave, submit + nilai, hasil."""

    # ─── Daftar ujian peserta ─────────────────────────────────
    @staticmethod
    async def list_my_exams(user_id: str) -> MyExamListResponse:
        supabase = get_supabase_admin()
        ep = supabase.table("exam_participants").select("exam_id").eq("user_id", user_id).execute()
        exam_ids = [x["exam_id"] for x in (ep.data or [])]
        if not exam_ids:
            return MyExamListResponse(exams=[])

        exams = (
            supabase.table("exams").select("*").in_("id", exam_ids).eq("status", "published")
            .is_("deleted_at", "null")
            .order("created_at", desc=True).execute().data or []
        )
        if not exams:
            return MyExamListResponse(exams=[])
        live_ids = [e["id"] for e in exams]

        # Percobaan terbaru per ujian
        attempts = (
            supabase.table("exam_attempts").select("*").eq("user_id", user_id).in_("exam_id", live_ids)
            .order("created_at", desc=True).execute().data or []
        )
        latest: dict = {}
        for a in attempts:
            latest.setdefault(a["exam_id"], a)

        # Jumlah soal per ujian
        eqs = supabase.table("exam_questions").select("exam_id").in_("exam_id", live_ids).execute().data or []
        qcount: dict = {}
        for r in eqs:
            qcount[r["exam_id"]] = qcount.get(r["exam_id"], 0) + 1

        now = datetime.now(timezone.utc)
        items = []
        for e in exams:
            starts = _parse_dt(e.get("starts_at"))
            ends = _parse_dt(e.get("ends_at"))
            if starts and now < starts:
                sched = "upcoming"
            elif ends and now > ends:
                sched = "ended"
            else:
                sched = "available"

            a = latest.get(e["id"])
            a_status = a["status"] if a else "none"
            allow_retake = bool(e.get("allow_retake"))
            can_start = sched == "available" and not (a_status == "submitted" and not allow_retake)

            items.append(MyExamItem(
                exam_id=e["id"],
                title=e["title"],
                description=e.get("description"),
                duration_minutes=e["duration_minutes"],
                starts_at=starts,
                ends_at=ends,
                allow_retake=allow_retake,
                total_questions=qcount.get(e["id"], 0),
                schedule_state=sched,
                attempt_status=a_status,
                attempt_id=a["id"] if a else None,
                score=a.get("score") if a else None,
                passed=a.get("passed") if a else None,
                scale_unit=(
                    "toefl_itp"
                    if is_official_itp(e.get("test_type", "itp"), e.get("exam_mode", "custom"))
                    else "nilai"
                ),
                can_start=can_start,
            ))
        return MyExamListResponse(exams=items)

    # ─── Mulai / lanjut percobaan ─────────────────────────────
    @staticmethod
    async def start_attempt(exam_id: str, user_id: str) -> StartAttemptResponse:
        supabase = get_supabase_admin()

        ep = supabase.table("exam_participants").select("id").eq("exam_id", exam_id).eq("user_id", user_id).execute()
        if not ep.data:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak terdaftar sebagai peserta ujian ini.")

        er = supabase.table("exams").select("*").eq("id", exam_id).is_("deleted_at", "null").execute().data
        exam = er[0] if er else None
        if not exam or exam.get("status") != "published":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ujian tidak tersedia.")

        now = datetime.now(timezone.utc)
        starts = _parse_dt(exam.get("starts_at"))
        ends = _parse_dt(exam.get("ends_at"))
        if starts and now < starts:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ujian belum dimulai.")

        existing = (
            supabase.table("exam_attempts").select("*").eq("exam_id", exam_id).eq("user_id", user_id)
            .order("created_at", desc=True).execute().data or []
        )
        attempt = next((a for a in existing if a["status"] == "in_progress"), None)
        if not attempt:
            # Percobaan BARU tak boleh dimulai setelah jendela ujian berakhir.
            # (Percobaan yang SUDAH berjalan tetap boleh dilanjutkan agar bisa submit;
            #  deadline-nya di-clamp ke ends_at di bawah → sisa waktu 0.)
            if ends and now > ends:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ujian sudah berakhir.")
            submitted = next((a for a in existing if a["status"] == "submitted"), None)
            if submitted and not exam.get("allow_retake"):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Anda sudah menyelesaikan ujian ini.")
            ins = supabase.table("exam_attempts").insert({
                "exam_id": exam_id, "user_id": user_id, "status": "in_progress",
            }).execute()
            attempt = ins.data[0]

        # Soal (payload SAJA — tanpa correct_answer) + jawaban tersimpan
        eqs = (
            supabase.table("exam_questions").select("id, position, section, payload")
            .eq("exam_id", exam_id).order("position").execute().data or []
        )
        ans = (
            supabase.table("exam_attempt_answers").select("exam_question_id, selected_answer, answer_json")
            .eq("attempt_id", attempt["id"]).execute().data or []
        )
        ans_map = {a["exam_question_id"]: a["selected_answer"] for a in ans}
        ansj_map = {a["exam_question_id"]: a.get("answer_json") for a in ans}
        questions = [
            AttemptQuestion(
                exam_question_id=q["id"], position=q["position"], section=q["section"],
                payload=q["payload"], selected_answer=ans_map.get(q["id"]),
                answer_json=ansj_map.get(q["id"]),
            )
            for q in eqs
        ]

        started = _parse_dt(attempt["started_at"]) or now
        deadline = started + timedelta(minutes=exam["duration_minutes"])
        # ends_at = dinding keras: jendela ujian menutup untuk semua, termasuk yang sedang jalan.
        if ends and ends < deadline:
            deadline = ends
        remaining = max(0, int((deadline - now).total_seconds()))

        return StartAttemptResponse(
            attempt_id=attempt["id"],
            exam_id=exam_id,
            title=exam["title"],
            duration_minutes=exam["duration_minutes"],
            started_at=started,
            deadline=deadline,
            remaining_seconds=remaining,
            allow_retake=bool(exam.get("allow_retake")),
            questions=questions,
        )

    @staticmethod
    def _load_owned_attempt(supabase, attempt_id: str, user_id: str) -> dict:
        ar = supabase.table("exam_attempts").select("*").eq("id", attempt_id).execute().data
        attempt = ar[0] if ar else None
        if not attempt:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Percobaan tidak ditemukan.")
        if attempt["user_id"] != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Bukan percobaan Anda.")
        return attempt

    # ─── Autosave jawaban ─────────────────────────────────────
    @staticmethod
    async def save_answer(attempt_id: str, user_id: str, request: SaveAnswerRequest) -> None:
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        if attempt["status"] != "in_progress":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ujian sudah dikumpulkan.")

        sel = request.selected_answer
        if sel is not None and sel not in ("a", "b", "c", "d"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pilihan jawaban tidak valid.")

        eq = (
            supabase.table("exam_questions").select("id")
            .eq("id", request.exam_question_id).eq("exam_id", attempt["exam_id"]).execute().data
        )
        if not eq:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Soal tidak valid untuk ujian ini.")

        # Simpan single-choice (selected_answer) ATAU jawaban kompleks (answer_json).
        payload = {"selected_answer": sel, "answer_json": request.answer_json}
        existing = (
            supabase.table("exam_attempt_answers").select("id")
            .eq("attempt_id", attempt_id).eq("exam_question_id", request.exam_question_id).execute().data
        )
        if existing:
            supabase.table("exam_attempt_answers").update(payload).eq("id", existing[0]["id"]).execute()
        else:
            supabase.table("exam_attempt_answers").insert({
                "attempt_id": attempt_id, "exam_question_id": request.exam_question_id, **payload,
            }).execute()

    # ─── Submit + nilai ───────────────────────────────────────
    @staticmethod
    async def submit_attempt(attempt_id: str, user_id: str) -> AttemptResultResponse:
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        if attempt["status"] == "submitted":
            return await ExamAttemptService.get_result(attempt_id, user_id)

        exam = supabase.table("exams").select("*").eq("id", attempt["exam_id"]).execute().data[0]

        eqs = (
            supabase.table("exam_questions").select("id, section, correct_answer, question_type, answer_json")
            .eq("exam_id", attempt["exam_id"]).execute().data or []
        )
        arows = (
            supabase.table("exam_attempt_answers").select("id, exam_question_id, selected_answer, answer_json")
            .eq("attempt_id", attempt_id).execute().data or []
        )
        sel_by_eq = {a["exam_question_id"]: a["selected_answer"] for a in arows}
        ansj_by_eq = {a["exam_question_id"]: a.get("answer_json") for a in arows}
        q_by_id = {q["id"]: q for q in eqs}

        per: dict = {}
        for q in eqs:
            is_c = _grade(
                q.get("question_type"), q.get("correct_answer"), q.get("answer_json"),
                sel_by_eq.get(q["id"]), ansj_by_eq.get(q["id"]),
            )
            d = per.setdefault(q["section"], {"total": 0, "correct": 0})
            d["total"] += 1
            if is_c:
                d["correct"] += 1

        # Tandai is_correct pada baris jawaban yang ada
        for a in arows:
            q = q_by_id.get(a["exam_question_id"])
            is_c = bool(q) and _grade(
                q.get("question_type"), q.get("correct_answer"), q.get("answer_json"),
                a.get("selected_answer"), a.get("answer_json"),
            )
            supabase.table("exam_attempt_answers").update({"is_correct": is_c}).eq("id", a["id"]).execute()

        passing = exam.get("passing_value")
        # Skor otomatis berdasarkan jenis tes + mode (TOEFL ITP resmi / Nilai 0–100).
        comp = compute_exam_score(
            test_type=exam.get("test_type", "itp"),
            exam_mode=exam.get("exam_mode", "custom"),
            per_section=[{"section": k, "total": v["total"], "correct": v["correct"]} for k, v in per.items()],
            passing_value=passing,
        )
        score = comp["score"]
        passed = comp["passed"]
        scale_unit = comp["scale_unit"]
        total_q = comp["total_questions"]
        total_c = comp["total_correct"]
        per_section = [SectionResult(**g) for g in comp["groups"]]

        now = datetime.now(timezone.utc)
        supabase.table("exam_attempts").update({
            "status": "submitted",
            "submitted_at": now.isoformat(),
            "score": score,
            "passed": passed,
            "total_questions": total_q,
            "total_correct": total_c,
            "score_detail": {"scale_unit": scale_unit, "per_section": [ps.model_dump() for ps in per_section]},
        }).eq("id", attempt_id).execute()

        return AttemptResultResponse(
            attempt_id=attempt_id, exam_id=exam["id"], title=exam["title"], status="submitted",
            score=score, passed=passed, scale_unit=scale_unit,
            total_questions=total_q, total_correct=total_c, passing_value=passing,
            per_section=per_section, submitted_at=now,
            show_review=bool(exam.get("show_review")),
        )

    # ─── Hasil ────────────────────────────────────────────────
    @staticmethod
    async def get_result(attempt_id: str, user_id: str) -> AttemptResultResponse:
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        exam = supabase.table("exams").select("title, passing_value, show_review").eq("id", attempt["exam_id"]).execute().data[0]
        detail = attempt.get("score_detail") or {}
        per_section = [SectionResult(**ps) for ps in detail.get("per_section", [])]
        return AttemptResultResponse(
            attempt_id=attempt_id, exam_id=attempt["exam_id"], title=exam["title"], status=attempt["status"],
            score=attempt.get("score"), passed=attempt.get("passed"),
            scale_unit=detail.get("scale_unit", "nilai"),
            total_questions=attempt.get("total_questions") or 0,
            total_correct=attempt.get("total_correct") or 0,
            passing_value=exam.get("passing_value"),
            per_section=per_section,
            submitted_at=_parse_dt(attempt.get("submitted_at")),
            show_review=bool(exam.get("show_review")),
        )

    # ─── Review / Pembahasan ──────────────────────────────────
    @staticmethod
    async def review_attempt(attempt_id: str, user_id: str) -> AttemptReviewResponse:
        """Pembahasan per soal. Hanya untuk attempt SUBMITTED & ujian show_review=true."""
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        if attempt["status"] != "submitted":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pembahasan hanya tersedia setelah ujian dikumpulkan.")

        exam = supabase.table("exams").select("title, show_review").eq("id", attempt["exam_id"]).execute().data[0]
        if not exam.get("show_review"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Pembahasan tidak tersedia untuk ujian ini.")

        eqs = (
            supabase.table("exam_questions")
            .select("id, position, section, payload, correct_answer, answer_json, question_type, explanation")
            .eq("exam_id", attempt["exam_id"]).order("position").execute().data or []
        )
        ans = (
            supabase.table("exam_attempt_answers").select("exam_question_id, selected_answer, answer_json, is_correct")
            .eq("attempt_id", attempt_id).execute().data or []
        )
        sel_by_eq = {a["exam_question_id"]: a for a in ans}

        questions = []
        total_correct = 0
        for q in eqs:
            a = sel_by_eq.get(q["id"])
            selected = a["selected_answer"] if a else None
            ans_json = a.get("answer_json") if a else None
            is_correct = _grade(
                q.get("question_type"), q.get("correct_answer"), q.get("answer_json"),
                selected, ans_json,
            )
            if is_correct:
                total_correct += 1
            questions.append(AttemptReviewQuestion(
                exam_question_id=q["id"],
                position=q["position"],
                section=q["section"],
                payload=q["payload"],
                correct_answer=q["correct_answer"],
                selected_answer=selected,
                answer_json=ans_json,
                answer_key_json=q.get("answer_json"),
                is_correct=is_correct,
                explanation=q.get("explanation"),
            ))

        return AttemptReviewResponse(
            attempt_id=attempt_id,
            exam_id=attempt["exam_id"],
            title=exam["title"],
            total_questions=len(eqs),
            total_correct=total_correct,
            questions=questions,
        )
