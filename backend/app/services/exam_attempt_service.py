"""
Learning Nexus CBT — Exam Attempt Service (Phase 4: peserta mengerjakan ujian)
"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from app.database import get_supabase_admin

logger = logging.getLogger("app.jobs")
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
    SectionTiming,
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


# ─── F1.4b: timing per-bagian (mode berurutan, gaya iBT) ──────────
SECTION_ORDER = ["listening", "structure", "written_expression", "reading"]


def _section_timing_config(supabase, exam_id: str):
    """(order, limits) bila SEMUA bagian bersoal punya batas waktu → mode per-bagian.
    None bila ada bagian tanpa batas (→ pakai timer global biasa)."""
    eqs = (
        supabase.table("exam_questions").select("section, position")
        .eq("exam_id", exam_id).order("position").execute().data or []
    )
    order: list[str] = []
    seen: set = set()
    for e in eqs:  # urutan presentasi = urutan posisi snapshot
        s = e["section"]
        if s not in seen:
            seen.add(s)
            order.append(s)
    if not order:
        return None
    lim_rows = (
        supabase.table("exam_sections").select("section, time_limit_minutes")
        .eq("exam_id", exam_id).execute().data or []
    )
    limmap = {r["section"]: r.get("time_limit_minutes") for r in lim_rows}
    limits: dict[str, int] = {}
    for s in order:
        tl = limmap.get(s)
        if tl is None:
            return None  # ada bagian bersoal tanpa batas → bukan mode per-bagian
        limits[s] = int(tl)
    return order, limits


def _distribute_extra(order: list[str], limits: dict[str, int], extra: int) -> dict[str, int]:
    """M5.2: sebar menit akomodasi prorata ke tiap bagian (sisa ke bagian terdepan).
    Contoh extra=10, 3 bagian → +4,+3,+3."""
    if extra <= 0 or not order:
        return dict(limits)
    base, rem = divmod(extra, len(order))
    return {s: limits[s] + base + (1 if i < rem else 0) for i, s in enumerate(order)}


def _init_section_state(order: list[str], limits: dict[str, int], now: datetime) -> dict:
    first = order[0]
    sections = {s: {"status": "pending"} for s in order}
    sections[first] = {
        "started_at": now.isoformat(),
        "deadline": (now + timedelta(minutes=limits[first])).isoformat(),
        "status": "active",
    }
    return {"mode": "per_section", "order": order, "limits": limits, "current": 0, "sections": sections}


def _advance_expired(state: dict, now: datetime) -> bool:
    """Auto-advance berantai bila deadline bagian aktif lewat. Deterministik:
    bagian berikutnya mulai dari deadline sebelumnya (tanpa bonus waktu). Return True bila berubah."""
    order = state["order"]
    limits = state["limits"]
    sections = state["sections"]
    changed = False
    while state["current"] < len(order):
        cur = order[state["current"]]
        deadline = _parse_dt(sections.get(cur, {}).get("deadline"))
        if deadline is None or now < deadline:
            break
        sections[cur]["status"] = "done"
        state["current"] += 1
        changed = True
        if state["current"] < len(order):
            nxt = order[state["current"]]
            sections[nxt] = {
                "started_at": deadline.isoformat(),
                "deadline": (deadline + timedelta(minutes=limits[nxt])).isoformat(),
                "status": "active",
            }
    return changed


def _section_timing_view(state: dict, now: datetime) -> SectionTiming:
    order = state["order"]
    sections = state["sections"]
    idx = state["current"]
    finished = idx >= len(order)
    current_section = None
    remaining = 0
    if not finished:
        current_section = order[idx]
        deadline = _parse_dt(sections.get(current_section, {}).get("deadline"))
        remaining = max(0, int((deadline - now).total_seconds())) if deadline else 0
    done = [s for s in order if sections.get(s, {}).get("status") == "done"]
    return SectionTiming(
        order=order, limits=state["limits"], current_section=current_section,
        current_remaining_seconds=remaining, done_sections=done, finished=finished,
    )


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
                grading_status=(a.get("grading_status") if a else None) or "not_required",
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

        ep = supabase.table("exam_participants").select("id, extra_minutes").eq("exam_id", exam_id).eq("user_id", user_id).execute()
        if not ep.data:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak terdaftar sebagai peserta ujian ini.")
        extra_minutes = int((ep.data[0] or {}).get("extra_minutes") or 0)  # M5.2 akomodasi

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
        # M5.2 akomodasi: durasi personal +extra; dinding ends_at digeser +extra utk peserta ini.
        deadline = started + timedelta(minutes=exam["duration_minutes"] + extra_minutes)
        if ends:
            wall = ends + timedelta(minutes=extra_minutes)
            if wall < deadline:
                deadline = wall
        remaining = max(0, int((deadline - now).total_seconds()))

        # F1.4b: mode per-bagian (bila semua bagian bersoal punya batas waktu).
        section_timing = None
        cfg = _section_timing_config(supabase, exam_id)
        if cfg:
            order, limits = cfg
            state = attempt.get("section_state")
            if not state or state.get("mode") != "per_section":
                # M5.2: bakukan limit personal (akomodasi disebar prorata) ke section_state.
                state = _init_section_state(order, _distribute_extra(order, limits, extra_minutes), now)
                supabase.table("exam_attempts").update({"section_state": state}).eq("id", attempt["id"]).execute()
            elif _advance_expired(state, now):
                supabase.table("exam_attempts").update({"section_state": state}).eq("id", attempt["id"]).execute()
            section_timing = _section_timing_view(state, now)

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
            section_timing=section_timing,
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
            supabase.table("exam_questions").select("id, section")
            .eq("id", request.exam_question_id).eq("exam_id", attempt["exam_id"]).execute().data
        )
        if not eq:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Soal tidak valid untuk ujian ini.")

        # F1.4b: tolak jawaban untuk bagian yang sudah terkunci (mode per-bagian).
        state = attempt.get("section_state")
        if state and state.get("mode") == "per_section":
            now = datetime.now(timezone.utc)
            if _advance_expired(state, now):
                supabase.table("exam_attempts").update({"section_state": state}).eq("id", attempt_id).execute()
            order = state["order"]
            active = order[state["current"]] if state["current"] < len(order) else None
            if eq[0]["section"] != active:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    "Bagian ini sudah terkunci — waktu bagiannya telah berakhir.",
                )

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

    # ─── F1.4b: maju ke bagian berikutnya (kunci bagian aktif) ─
    @staticmethod
    async def advance_section(attempt_id: str, user_id: str, section: str) -> SectionTiming:
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        if attempt["status"] != "in_progress":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Percobaan tidak sedang berjalan.")
        state = attempt.get("section_state")
        if not state or state.get("mode") != "per_section":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ujian ini tidak memakai timing per-bagian.")

        now = datetime.now(timezone.utc)
        _advance_expired(state, now)  # rapikan dulu bila bagian aktif sudah lewat waktu

        order = state["order"]
        idx = state["current"]
        # Hanya maju bila bagian yang diminta memang bagian aktif (cegah lompat ganda).
        if idx < len(order) and order[idx] == section:
            state["sections"][order[idx]]["status"] = "done"
            state["current"] += 1
            if state["current"] < len(order):
                nxt = order[state["current"]]
                state["sections"][nxt] = {
                    "started_at": now.isoformat(),
                    "deadline": (now + timedelta(minutes=state["limits"][nxt])).isoformat(),
                    "status": "active",
                }
        supabase.table("exam_attempts").update({"section_state": state}).eq("id", attempt_id).execute()
        return _section_timing_view(state, now)

    # ─── Submit + nilai ───────────────────────────────────────
    @staticmethod
    async def submit_attempt(attempt_id: str, user_id: str) -> AttemptResultResponse:
        supabase = get_supabase_admin()
        attempt = ExamAttemptService._load_owned_attempt(supabase, attempt_id, user_id)
        if attempt["status"] == "submitted":
            return await ExamAttemptService.get_result(attempt_id, user_id)

        exam = supabase.table("exams").select("*").eq("id", attempt["exam_id"]).execute().data[0]

        eqs = (
            supabase.table("exam_questions")
            .select("id, section, correct_answer, question_type, answer_json, scoring_mode, max_score")
            .eq("exam_id", attempt["exam_id"]).execute().data or []
        )
        arows = (
            supabase.table("exam_attempt_answers").select("id, exam_question_id, selected_answer, answer_json")
            .eq("attempt_id", attempt_id).execute().data or []
        )
        sel_by_eq = {a["exam_question_id"]: a["selected_answer"] for a in arows}
        ansj_by_eq = {a["exam_question_id"]: a.get("answer_json") for a in arows}
        q_by_id = {q["id"]: q for q in eqs}

        def _is_manual(q: dict) -> bool:
            return (q.get("scoring_mode") or "auto") == "manual"

        # F1.2: ujian dengan item manual (essay/speaking) → skor final ditahan sampai dinilai.
        has_manual = any(_is_manual(q) for q in eqs)

        # Correct-count HANYA untuk item auto (item manual dinilai terpisah oleh penilai).
        per: dict = {}
        for q in eqs:
            if _is_manual(q):
                continue
            is_c = _grade(
                q.get("question_type"), q.get("correct_answer"), q.get("answer_json"),
                sel_by_eq.get(q["id"]), ansj_by_eq.get(q["id"]),
            )
            d = per.setdefault(q["section"], {"total": 0, "correct": 0})
            d["total"] += 1
            if is_c:
                d["correct"] += 1

        # Tandai is_correct + awarded_score/max_score pada baris jawaban — BATCH satu upsert
        # (cegah N+1: dulu satu UPDATE per jawaban). Item auto: awarded = max bila benar, else 0.
        # Item manual: awarded null (menunggu penilai).
        upsert_rows = []
        for a in arows:
            q = q_by_id.get(a["exam_question_id"])
            mx = float(q.get("max_score") or 1) if q else 1.0
            if q and _is_manual(q):
                grade_cols = {"is_correct": None, "awarded_score": None, "max_score": mx}
            else:
                is_c = bool(q) and _grade(
                    q.get("question_type"), q.get("correct_answer"), q.get("answer_json"),
                    a.get("selected_answer"), a.get("answer_json"),
                )
                grade_cols = {"is_correct": is_c, "awarded_score": mx if is_c else 0, "max_score": mx}
            upsert_rows.append({
                "id": a["id"],
                "attempt_id": attempt_id,
                "exam_question_id": a["exam_question_id"],
                "selected_answer": a.get("selected_answer"),
                "answer_json": a.get("answer_json"),
                **grade_cols,
            })
        if upsert_rows:
            supabase.table("exam_attempt_answers").upsert(upsert_rows).execute()

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

        # F1.2: ada item manual → menunggu penilaian; else tak perlu.
        grading_status = "pending" if has_manual else "not_required"

        now = datetime.now(timezone.utc)
        supabase.table("exam_attempts").update({
            "status": "submitted",
            "submitted_at": now.isoformat(),
            "score": score,
            "passed": passed,
            "total_questions": total_q,
            "total_correct": total_c,
            "score_detail": {"scale_unit": scale_unit, "per_section": [ps.model_dump() for ps in per_section]},
            "grading_status": grading_status,
        }).eq("id", attempt_id).execute()

        return AttemptResultResponse(
            attempt_id=attempt_id, exam_id=exam["id"], title=exam["title"], status="submitted",
            score=score, passed=passed, scale_unit=scale_unit,
            total_questions=total_q, total_correct=total_c, passing_value=passing,
            per_section=per_section, submitted_at=now,
            show_review=bool(exam.get("show_review")),
            grading_status=grading_status,
        )

    # ─── F4/M3: auto-expire attempt kedaluwarsa (dipanggil job internal) ─
    @staticmethod
    async def expire_stale_attempts(limit: int = 500) -> dict:
        """Finalisasi attempt `in_progress` yang deadline-nya lewat (reuse submit).
        Deadline = started + durasi, di-clamp ke `ends_at`. Idempotent & best-effort per attempt."""
        supabase = get_supabase_admin()
        now = datetime.now(timezone.utc)
        attempts = (
            supabase.table("exam_attempts").select("id, user_id, exam_id, started_at")
            .eq("status", "in_progress").limit(limit).execute().data or []
        )
        if not attempts:
            return {"checked": 0, "expired": 0}

        exam_ids = list({a["exam_id"] for a in attempts})
        exams = {
            e["id"]: e
            for e in (
                supabase.table("exams").select("id, duration_minutes, ends_at")
                .in_("id", exam_ids).execute().data or []
            )
        }
        # M5.2: akomodasi per-peserta (exam_id, user_id) → extra_minutes.
        extra_map = {
            (p["exam_id"], p["user_id"]): int(p.get("extra_minutes") or 0)
            for p in (
                supabase.table("exam_participants").select("exam_id, user_id, extra_minutes")
                .in_("exam_id", exam_ids).execute().data or []
            )
        }

        expired = 0
        for a in attempts:
            ex = exams.get(a["exam_id"])
            if not ex:
                continue
            extra = extra_map.get((a["exam_id"], a["user_id"]), 0)
            started = _parse_dt(a.get("started_at")) or now
            deadline = started + timedelta(minutes=(ex.get("duration_minutes") or 0) + extra)
            ends = _parse_dt(ex.get("ends_at"))
            if ends:
                wall = ends + timedelta(minutes=extra)
                if wall < deadline:
                    deadline = wall
            if now <= deadline:
                continue
            try:
                await ExamAttemptService.submit_attempt(a["id"], a["user_id"])
                expired += 1
            except Exception as e:  # jangan gagalkan batch karena satu attempt
                logger.warning("auto-expire gagal untuk attempt %s: %s", a["id"], e)
        if expired:
            logger.info("auto-expire: %s/%s attempt difinalisasi", expired, len(attempts))
        return {"checked": len(attempts), "expired": expired}

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
            grading_status=attempt.get("grading_status") or "not_required",
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
            .select("id, position, section, payload, correct_answer, answer_json, question_type, explanation, scoring_mode, max_score")
            .eq("exam_id", attempt["exam_id"]).order("position").execute().data or []
        )
        ans = (
            supabase.table("exam_attempt_answers")
            .select("exam_question_id, selected_answer, answer_json, is_correct, awarded_score, max_score, rubric_scores, feedback")
            .eq("attempt_id", attempt_id).execute().data or []
        )
        sel_by_eq = {a["exam_question_id"]: a for a in ans}

        questions = []
        total_correct = 0
        for q in eqs:
            a = sel_by_eq.get(q["id"])
            selected = a["selected_answer"] if a else None
            ans_json = a.get("answer_json") if a else None
            manual = (q.get("scoring_mode") or "auto") == "manual"
            # Item manual (essay): TAK dinilai auto — skor dari grading (awarded_score).
            is_correct = False if manual else _grade(
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
                scoring_mode=q.get("scoring_mode") or "auto",
                awarded_score=(float(a["awarded_score"]) if a and a.get("awarded_score") is not None else None),
                max_score=(float(a.get("max_score")) if a and a.get("max_score") is not None else (float(q.get("max_score")) if q.get("max_score") is not None else None)),
                rubric_scores=(a.get("rubric_scores") if a else None),
                feedback=(a.get("feedback") if a else None),
            ))

        return AttemptReviewResponse(
            attempt_id=attempt_id,
            exam_id=attempt["exam_id"],
            title=exam["title"],
            total_questions=len(eqs),
            total_correct=total_correct,
            questions=questions,
        )
