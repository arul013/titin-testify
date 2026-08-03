"""
Learning Nexus CBT — Admin Exam Results Service (M2.1)

Hasil ujian sisi admin. Otorisasi: PEMILIK ujian (created_by) + super_admin.
Setiap akses (data performa peserta = sensitif) dicatat ke audit_events.
"""

from typing import Any
from fastapi import HTTPException, status
from postgrest.types import CountMethod

from app.database import get_supabase_admin
from app.services.audit_service import AuditService
from app.services.scoring_engine import is_official_itp
# Reuse penilai auto + parser tanggal dari alur peserta (hindari duplikasi).
from app.services.exam_attempt_service import _grade, _parse_dt
from app.models.exam_attempt import SectionResult, AttemptReviewQuestion
from app.models.exam_results import (
    AdminAttemptRow,
    AdminResultsSummary,
    AdminResultsResponse,
    AdminAttemptReviewResponse,
)


def _assert_owner(exam: dict, user_id: str, user_role: str) -> None:
    if user_role == "super_admin":
        return
    if exam.get("created_by") != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda bukan pemilik ujian ini.")


def _names_by_user(supabase, user_ids: list[str]) -> dict:
    ids = [u for u in set(user_ids) if u]
    if not ids:
        return {}
    rows = supabase.table("profiles").select("id, full_name, username").in_("id", ids).execute().data or []
    return {r["id"]: (r.get("full_name") or r.get("username")) for r in rows}


def _exam_scale_unit(exam: dict) -> str:
    return "toefl_itp" if is_official_itp(exam.get("test_type", "itp"), exam.get("exam_mode", "custom")) else "nilai"


class ExamResultsService:
    """Daftar hasil + rincian per-soal (admin)."""

    @staticmethod
    async def list_results(exam_id: str, current_user: Any, request: Any) -> AdminResultsResponse:
        supabase = get_supabase_admin()
        user_id, user_role = current_user.id, current_user.role.value

        er = (
            supabase.table("exams")
            .select("id, title, created_by, test_type, exam_mode, passing_value, show_review")
            .eq("id", exam_id).is_("deleted_at", "null").execute().data
        )
        if not er:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ujian tidak ditemukan.")
        exam = er[0]
        _assert_owner(exam, user_id, user_role)

        attempts = (
            supabase.table("exam_attempts").select("*")
            .eq("exam_id", exam_id).order("submitted_at", desc=True).execute().data or []
        )
        names = _names_by_user(supabase, [a["user_id"] for a in attempts])
        scale_unit = _exam_scale_unit(exam)

        rows: list[AdminAttemptRow] = []
        scores: list[float] = []
        passed_count = 0
        submitted = in_progress = pending = 0

        for a in attempts:
            detail = a.get("score_detail") or {}
            per = [SectionResult(**ps) for ps in detail.get("per_section", [])]
            st = a["status"]
            gs = a.get("grading_status") or "not_required"
            if st == "submitted":
                submitted += 1
            else:
                in_progress += 1
            if gs == "pending":
                pending += 1

            rows.append(AdminAttemptRow(
                attempt_id=a["id"],
                user_id=a["user_id"],
                participant_name=names.get(a["user_id"]),
                status=st,
                grading_status=gs,
                score=a.get("score"),
                passed=a.get("passed"),
                scale_unit=detail.get("scale_unit") or scale_unit,
                total_questions=a.get("total_questions") or 0,
                total_correct=a.get("total_correct") or 0,
                per_section=per,
                started_at=_parse_dt(a.get("started_at")),
                submitted_at=_parse_dt(a.get("submitted_at")),
            ))

            # Ringkasan skor hanya dari attempt SELESAI & sudah final (bukan pending penilaian).
            if st == "submitted" and gs != "pending" and a.get("score") is not None:
                scores.append(float(a["score"]))
                if a.get("passed"):
                    passed_count += 1

        participants_total = (
            supabase.table("exam_participants").select("id", count=CountMethod.exact)
            .eq("exam_id", exam_id).execute().count or 0
        )

        summary = AdminResultsSummary(
            participants_total=participants_total,
            attempts_total=len(attempts),
            submitted=submitted,
            in_progress=in_progress,
            pending_grading=pending,
            avg_score=round(sum(scores) / len(scores), 1) if scores else None,
            passed_count=passed_count if scores else None,
            highest=max(scores) if scores else None,
            lowest=min(scores) if scores else None,
        )

        AuditService.log_action(
            request, current_user,
            action="exam.results.view", entity_type="exam", entity_id=exam_id,
            summary=f"Lihat hasil ujian '{exam['title']}' ({len(attempts)} percobaan)",
        )

        return AdminResultsResponse(
            exam_id=exam_id,
            title=exam["title"],
            scale_unit=scale_unit,
            passing_value=exam.get("passing_value"),
            show_review=bool(exam.get("show_review")),
            summary=summary,
            attempts=rows,
        )

    @staticmethod
    async def admin_review(attempt_id: str, current_user: Any, request: Any) -> AdminAttemptReviewResponse:
        supabase = get_supabase_admin()
        user_id, user_role = current_user.id, current_user.role.value

        ar = supabase.table("exam_attempts").select("*").eq("id", attempt_id).execute().data
        if not ar:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Percobaan tidak ditemukan.")
        attempt = ar[0]
        exam = (
            supabase.table("exams").select("id, title, created_by, test_type, exam_mode, passing_value")
            .eq("id", attempt["exam_id"]).execute().data[0]
        )
        _assert_owner(exam, user_id, user_role)

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
        by = {a["exam_question_id"]: a for a in ans}

        questions: list[AttemptReviewQuestion] = []
        for q in eqs:
            a = by.get(q["id"])
            selected = a["selected_answer"] if a else None
            ans_json = a.get("answer_json") if a else None
            manual = (q.get("scoring_mode") or "auto") == "manual"
            is_correct = False if manual else _grade(
                q.get("question_type"), q.get("correct_answer"), q.get("answer_json"), selected, ans_json,
            )
            questions.append(AttemptReviewQuestion(
                exam_question_id=q["id"],
                position=q["position"],
                section=q["section"],
                payload=q["payload"],
                correct_answer=q.get("correct_answer"),
                selected_answer=selected,
                answer_json=ans_json,
                answer_key_json=q.get("answer_json"),
                is_correct=is_correct,
                explanation=q.get("explanation"),
                scoring_mode=q.get("scoring_mode") or "auto",
                awarded_score=(float(a["awarded_score"]) if a and a.get("awarded_score") is not None else None),
                max_score=(float(a["max_score"]) if a and a.get("max_score") is not None else (float(q["max_score"]) if q.get("max_score") is not None else None)),
                rubric_scores=(a.get("rubric_scores") if a else None),
                feedback=(a.get("feedback") if a else None),
            ))

        detail = attempt.get("score_detail") or {}
        per = [SectionResult(**ps) for ps in detail.get("per_section", [])]
        names = _names_by_user(supabase, [attempt["user_id"]])

        AuditService.log_action(
            request, current_user,
            action="attempt.review.view", entity_type="attempt", entity_id=attempt_id,
            summary=f"Lihat rincian jawaban peserta pada '{exam['title']}'",
        )

        return AdminAttemptReviewResponse(
            attempt_id=attempt_id,
            exam_id=attempt["exam_id"],
            title=exam["title"],
            participant_name=names.get(attempt["user_id"]),
            status=attempt["status"],
            grading_status=attempt.get("grading_status") or "not_required",
            score=attempt.get("score"),
            passed=attempt.get("passed"),
            scale_unit=detail.get("scale_unit") or _exam_scale_unit(exam),
            passing_value=exam.get("passing_value"),
            total_questions=attempt.get("total_questions") or 0,
            total_correct=attempt.get("total_correct") or 0,
            per_section=per,
            submitted_at=_parse_dt(attempt.get("submitted_at")),
            questions=questions,
        )
