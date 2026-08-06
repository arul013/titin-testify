"""
Learning Nexus CBT — Manual Grading Service (F1.2.1)

Penilai = admin pemilik ujian + super_admin. Menilai item manual (essay) per
attempt; saat semua item manual sebuah attempt ter-nilai → recompute skor final
berbasis poin (Σawarded/Σmax) + grading_status='complete'.
"""

from datetime import datetime, timezone
from fastapi import HTTPException, status

from app.database import get_supabase_admin
from app.models.grading import (
    PendingExamItem,
    PendingExamList,
    PendingAttemptItem,
    PendingAttemptList,
    GradingCriterion,
    GradingAnswerItem,
    GradingAttemptDetail,
    SubmitGradeRequest,
    GradeResultResponse,
)


def _parse_dt(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except Exception:
        return None


def _is_manual(q: dict) -> bool:
    return (q.get("scoring_mode") or "auto") == "manual"


class GradingService:
    """Antrean + penilaian manual esai."""

    # ─── Authz ────────────────────────────────────────────
    @staticmethod
    def _assert_can_grade(exam: dict, user_id: str, user_role: str) -> None:
        if user_role == "super_admin":
            return
        if exam.get("created_by") != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda bukan pemilik ujian ini.")

    @staticmethod
    def _names_by_user(supabase, user_ids: list[str]) -> dict:
        if not user_ids:
            return {}
        rows = (
            supabase.table("profiles").select("id, full_name, username")
            .in_("id", list(set(user_ids))).execute().data or []
        )
        return {r["id"]: (r.get("full_name") or r.get("username")) for r in rows}

    # ─── Antrean: ujian dengan attempt menunggu ───────────
    @staticmethod
    async def list_pending(user_id: str, user_role: str) -> PendingExamList:
        supabase = get_supabase_admin()
        # Semua attempt terkumpul yang menyangkut penilaian manual.
        subs = (
            supabase.table("exam_attempts").select("exam_id, grading_status")
            .eq("status", "submitted").in_("grading_status", ["pending", "complete"])
            .execute().data or []
        )
        if not subs:
            return PendingExamList(exams=[])
        exam_ids = list({s["exam_id"] for s in subs})
        exams = (
            supabase.table("exams").select("id, title, created_by")
            .in_("id", exam_ids).is_("deleted_at", "null").execute().data or []
        )
        owned = {e["id"]: e for e in exams if user_role == "super_admin" or e.get("created_by") == user_id}

        agg: dict = {}
        for s in subs:
            if s["exam_id"] not in owned:
                continue
            a = agg.setdefault(s["exam_id"], {"pending": 0, "total": 0})
            a["total"] += 1
            if s["grading_status"] == "pending":
                a["pending"] += 1

        items = [
            PendingExamItem(
                exam_id=eid, title=owned[eid]["title"],
                pending_count=a["pending"], total_submitted=a["total"],
            )
            for eid, a in agg.items() if a["pending"] > 0
        ]
        items.sort(key=lambda x: x.pending_count, reverse=True)
        return PendingExamList(exams=items)

    # ─── Antrean: attempt menunggu utk satu ujian ─────────
    @staticmethod
    async def list_exam_attempts(exam_id: str, user_id: str, user_role: str) -> PendingAttemptList:
        supabase = get_supabase_admin()
        exam = supabase.table("exams").select("id, title, created_by").eq("id", exam_id).execute().data
        if not exam:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ujian tidak ditemukan.")
        exam = exam[0]
        GradingService._assert_can_grade(exam, user_id, user_role)

        # Item manual pada ujian ini (id → untuk hitung progress).
        eqs = (
            supabase.table("exam_questions").select("id, scoring_mode")
            .eq("exam_id", exam_id).execute().data or []
        )
        manual_qids = {q["id"] for q in eqs if _is_manual(q)}

        attempts = (
            supabase.table("exam_attempts").select("id, user_id, submitted_at")
            .eq("exam_id", exam_id).eq("status", "submitted").eq("grading_status", "pending")
            .order("submitted_at", desc=False).execute().data or []
        )
        if not attempts:
            return PendingAttemptList(exam_id=exam_id, title=exam["title"], attempts=[])

        attempt_ids = [a["id"] for a in attempts]
        arows = (
            supabase.table("exam_attempt_answers").select("attempt_id, exam_question_id, graded_at")
            .in_("attempt_id", attempt_ids).execute().data or []
        )
        graded_by_attempt: dict = {}
        for r in arows:
            if r["exam_question_id"] in manual_qids and r.get("graded_at"):
                graded_by_attempt[r["attempt_id"]] = graded_by_attempt.get(r["attempt_id"], 0) + 1

        names = GradingService._names_by_user(supabase, [a["user_id"] for a in attempts])
        items = [
            PendingAttemptItem(
                attempt_id=a["id"], user_id=a["user_id"],
                participant_name=names.get(a["user_id"]),
                submitted_at=_parse_dt(a.get("submitted_at")),
                manual_total=len(manual_qids),
                manual_graded=graded_by_attempt.get(a["id"], 0),
            )
            for a in attempts
        ]
        return PendingAttemptList(exam_id=exam_id, title=exam["title"], attempts=items)

    # ─── Detail penilaian satu attempt ────────────────────
    @staticmethod
    async def get_attempt_detail(attempt_id: str, user_id: str, user_role: str) -> GradingAttemptDetail:
        supabase = get_supabase_admin()
        ar = supabase.table("exam_attempts").select("*").eq("id", attempt_id).execute().data
        if not ar:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Percobaan tidak ditemukan.")
        attempt = ar[0]
        exam = supabase.table("exams").select("id, title, created_by").eq("id", attempt["exam_id"]).execute().data[0]
        GradingService._assert_can_grade(exam, user_id, user_role)

        eqs = (
            supabase.table("exam_questions")
            .select("id, position, section, payload, scoring_mode, max_score, rubric_json")
            .eq("exam_id", attempt["exam_id"]).order("position").execute().data or []
        )
        manual_eqs = [q for q in eqs if _is_manual(q)]
        manual_ids = [q["id"] for q in manual_eqs]

        arows = (
            supabase.table("exam_attempt_answers")
            .select("id, exam_question_id, answer_json, awarded_score, rubric_scores, feedback, graded_at")
            .eq("attempt_id", attempt_id).in_("exam_question_id", manual_ids or ["_none_"]).execute().data or []
        )
        row_by_eq = {r["exam_question_id"]: r for r in arows}

        answers: list[GradingAnswerItem] = []
        for q in manual_eqs:
            rub = q.get("rubric_json") or {}
            crits = rub.get("criteria") or []
            row = row_by_eq.get(q["id"])
            saved_scores = {}
            if row and row.get("rubric_scores"):
                for sc in (row["rubric_scores"].get("scores") or []):
                    saved_scores[sc.get("name")] = sc.get("score")
            criteria = [
                GradingCriterion(
                    name=c.get("name", ""),
                    max_score=float(c.get("max_score") or 0),
                    descriptors=c.get("descriptors"),
                    score=saved_scores.get(c.get("name")),
                )
                for c in crits
            ]
            text = ""
            audio_url = None
            if row and isinstance(row.get("answer_json"), dict):
                text = row["answer_json"].get("text") or ""
                audio_url = row["answer_json"].get("audio_url")
            answers.append(GradingAnswerItem(
                answer_id=row["id"] if row else None,
                exam_question_id=q["id"],
                position=q["position"],
                section=q["section"],
                payload=q.get("payload") or {},
                participant_text=text,
                participant_audio_url=audio_url,
                rubric_name=rub.get("name"),
                criteria=criteria,
                max_score=float(q.get("max_score") or rub.get("max_total") or 0),
                awarded_score=(float(row["awarded_score"]) if row and row.get("awarded_score") is not None else None),
                feedback=(row.get("feedback") if row else None),
                graded=bool(row and row.get("graded_at")),
            ))

        names = GradingService._names_by_user(supabase, [attempt["user_id"]])
        return GradingAttemptDetail(
            attempt_id=attempt_id, exam_id=attempt["exam_id"], title=exam["title"],
            participant_name=names.get(attempt["user_id"]),
            submitted_at=_parse_dt(attempt.get("submitted_at")),
            grading_status=attempt.get("grading_status") or "pending",
            answers=answers,
        )

    # ─── Simpan skor satu jawaban + recompute ─────────────
    @staticmethod
    async def submit_grade(
        attempt_id: str, answer_id: str, request: SubmitGradeRequest, user_id: str, user_role: str
    ) -> GradeResultResponse:
        supabase = get_supabase_admin()
        ar = supabase.table("exam_attempts").select("*").eq("id", attempt_id).execute().data
        if not ar:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Percobaan tidak ditemukan.")
        attempt = ar[0]
        exam = supabase.table("exams").select("*").eq("id", attempt["exam_id"]).execute().data[0]
        GradingService._assert_can_grade(exam, user_id, user_role)

        row = (
            supabase.table("exam_attempt_answers").select("id, attempt_id, exam_question_id")
            .eq("id", answer_id).execute().data
        )
        if not row or row[0]["attempt_id"] != attempt_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Jawaban tidak ditemukan pada percobaan ini.")
        eq = (
            supabase.table("exam_questions").select("id, scoring_mode, max_score, rubric_json")
            .eq("id", row[0]["exam_question_id"]).execute().data[0]
        )
        if not _is_manual(eq):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Soal ini dinilai otomatis, bukan manual.")

        rub = eq.get("rubric_json") or {}
        crits = rub.get("criteria") or []
        if len(request.scores) != len(crits):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Jumlah skor tidak sesuai jumlah kriteria rubrik.")
        scores_detail = []
        awarded = 0.0
        for c, sc in zip(crits, request.scores):
            mx = float(c.get("max_score") or 0)
            if sc < 0 or sc > mx:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Skor '{c.get('name')}' harus antara 0 dan {mx}.")
            awarded += float(sc)
            scores_detail.append({"name": c.get("name"), "max_score": mx, "score": float(sc)})

        max_total = float(eq.get("max_score") or rub.get("max_total") or 0)
        now = datetime.now(timezone.utc)
        supabase.table("exam_attempt_answers").update({
            "awarded_score": round(awarded, 4),
            "max_score": max_total,
            "rubric_scores": {"scores": scores_detail},
            "feedback": (request.feedback or None),
            "graded_by": user_id,
            "graded_at": now.isoformat(),
            "is_correct": None,
        }).eq("id", answer_id).execute()

        grading_status, final_score, passed = GradingService._recompute_and_maybe_complete(
            supabase, attempt, exam
        )
        return GradeResultResponse(
            answer_id=answer_id, awarded_score=round(awarded, 4),
            grading_status=grading_status, attempt_score=final_score, attempt_passed=passed,
        )

    @staticmethod
    def _recompute_and_maybe_complete(supabase, attempt: dict, exam: dict):
        """Bila semua item manual (yang dijawab) sudah dinilai → skor final poin + complete."""
        attempt_id = attempt["id"]
        eqs = (
            supabase.table("exam_questions").select("id, scoring_mode, max_score")
            .eq("exam_id", attempt["exam_id"]).execute().data or []
        )
        manual_ids = {q["id"] for q in eqs if _is_manual(q)}
        arows = (
            supabase.table("exam_attempt_answers")
            .select("exam_question_id, awarded_score, graded_at")
            .eq("attempt_id", attempt_id).execute().data or []
        )
        # Item manual yang DIJAWAB tapi belum dinilai → masih pending.
        still_pending = any(
            r["exam_question_id"] in manual_ids and not r.get("graded_at") for r in arows
        )
        if still_pending:
            return "pending", None, None

        sigma_max = sum(float(q.get("max_score") or 1) for q in eqs)
        sigma_awarded = sum(float(r.get("awarded_score") or 0) for r in arows)
        score = round(sigma_awarded / sigma_max * 100, 1) if sigma_max > 0 else 0.0
        passing = exam.get("passing_value")
        passed = (score >= passing) if passing is not None else None

        detail = attempt.get("score_detail") or {}
        detail["scale_unit"] = "nilai"
        detail["points"] = {"awarded": round(sigma_awarded, 2), "max": round(sigma_max, 2)}
        supabase.table("exam_attempts").update({
            "score": score,
            "passed": passed,
            "grading_status": "complete",
            "score_detail": detail,
        }).eq("id", attempt_id).execute()

        # M6: penilaian manual selesai → skor final → beri tahu peserta.
        from app.services.notification_service import NotificationService
        NotificationService.notify(
            [attempt["user_id"]], "result_ready",
            f"Hasil ujian tersedia: {exam.get('title') or 'Ujian'}",
            body="Penilaian selesai. Skor dan rincian jawaban sudah bisa dilihat di Riwayat.",
            entity_type="attempt", entity_id=attempt_id,
        )
        return "complete", score, passed
