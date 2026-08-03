"""
Learning Nexus CBT — Exam Analytics + Export Service (M2.2)

Analitik agregat (distribusi skor + item-analysis) & ekspor CSV. Otorisasi:
pemilik ujian + super_admin (reuse dari exam_results_service). Akses dicatat ke audit.
"""

import csv
import io
import re
from typing import Any

from fastapi import HTTPException, status

from app.database import get_supabase_admin
from app.services.audit_service import AuditService
from app.services.scoring_engine import is_official_itp
from app.services.exam_attempt_service import _parse_dt
from app.services.exam_results_service import _assert_owner, _names_by_user, _exam_scale_unit
from app.models.exam_attempt import SectionResult
from app.models.exam_analytics import (
    ItemStat, ScoreBand, AnalyticsSummary, ExamAnalytics,
)

_SINGLE_CHOICE = {"mcq_single", "true_false_ng"}


def _is_single_choice(t: str | None) -> bool:
    return not t or t in _SINGLE_CHOICE


def _median(vals: list[float]) -> float | None:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else round((s[mid - 1] + s[mid]) / 2, 1)


def _flag(p: float, disc: float | None) -> str | None:
    if disc is not None and disc < 0:
        return "negative"
    if disc is not None and disc < 0.1:
        return "low_discrimination"
    if p <= 0.2:
        return "too_hard"
    if p >= 0.9:
        return "too_easy"
    return None


class ExamAnalyticsService:

    @staticmethod
    async def analytics(exam_id: str, current_user: Any, request: Any) -> ExamAnalytics:
        supabase = get_supabase_admin()
        user_id, user_role = current_user.id, current_user.role.value

        er = (
            supabase.table("exams")
            .select("id, title, created_by, test_type, exam_mode, passing_value")
            .eq("id", exam_id).is_("deleted_at", "null").execute().data
        )
        if not er:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ujian tidak ditemukan.")
        exam = er[0]
        _assert_owner(exam, user_id, user_role)
        scale_unit = _exam_scale_unit(exam)
        passing = exam.get("passing_value")

        attempts = (
            supabase.table("exam_attempts")
            .select("id, user_id, score, passed, total_correct, grading_status")
            .eq("exam_id", exam_id).eq("status", "submitted").execute().data or []
        )
        n = len(attempts)

        summary = AnalyticsSummary(submitted=0)
        distribution: list[ScoreBand] = []
        items: list[ItemStat] = []

        if n > 0:
            # Ranking (daya beda) pakai jumlah benar auto — tersedia untuk semua submitted.
            ranked = sorted(attempts, key=lambda a: a.get("total_correct") or 0, reverse=True)
            group_size = max(1, round(0.27 * n)) if n >= 6 else 0
            upper_ids = {a["id"] for a in ranked[:group_size]} if group_size else set()
            lower_ids = {a["id"] for a in ranked[-group_size:]} if group_size else set()

            # Skor final (bukan menunggu penilaian) → ringkasan & distribusi.
            final = [float(a["score"]) for a in attempts if a.get("grading_status") != "pending" and a.get("score") is not None]
            passed_count = sum(
                1 for a in attempts
                if a.get("grading_status") != "pending" and a.get("score") is not None and a.get("passed")
            )
            summary = AnalyticsSummary(
                submitted=len(final),
                avg_score=round(sum(final) / len(final), 1) if final else None,
                median_score=_median(final),
                highest=max(final) if final else None,
                lowest=min(final) if final else None,
                passed_count=passed_count if final else None,
                pass_rate=round(passed_count / len(final) * 100, 1) if final else None,
            )
            distribution = _distribution(final, scale_unit)

            # Item analysis (hanya soal auto).
            eqs = (
                supabase.table("exam_questions")
                .select("id, position, section, question_type, correct_answer, scoring_mode")
                .eq("exam_id", exam_id).order("position").execute().data or []
            )
            auto_eqs = [q for q in eqs if (q.get("scoring_mode") or "auto") != "manual"]

            attempt_ids = [a["id"] for a in attempts]
            answers = (
                supabase.table("exam_attempt_answers")
                .select("attempt_id, exam_question_id, is_correct, selected_answer")
                .in_("attempt_id", attempt_ids).execute().data or []
            )
            by_q: dict = {}
            for r in answers:
                by_q.setdefault(r["exam_question_id"], []).append(r)

            for q in auto_eqs:
                rows = by_q.get(q["id"], [])
                graded = [r for r in rows if r.get("is_correct") is not None]
                n_answered = len(graded)
                n_correct = sum(1 for r in graded if r["is_correct"])
                p = round(n_correct / n, 3) if n else 0.0

                disc = None
                if group_size:
                    cu = sum(1 for r in rows if r["attempt_id"] in upper_ids and r.get("is_correct"))
                    cl = sum(1 for r in rows if r["attempt_id"] in lower_ids and r.get("is_correct"))
                    disc = round((cu - cl) / group_size, 3)

                opt_counts: dict = {}
                if _is_single_choice(q.get("question_type")):
                    for r in rows:
                        k = r.get("selected_answer")
                        if k:
                            opt_counts[k] = opt_counts.get(k, 0) + 1

                items.append(ItemStat(
                    exam_question_id=q["id"],
                    position=q["position"],
                    section=q["section"],
                    question_type=q.get("question_type") or "mcq_single",
                    n_answered=n_answered,
                    n_correct=n_correct,
                    p_value=p,
                    discrimination=disc,
                    flag=_flag(p, disc),
                    correct_answer=q.get("correct_answer"),
                    option_counts=opt_counts,
                ))

        AuditService.log_action(
            request, current_user,
            action="exam.analytics.view", entity_type="exam", entity_id=exam_id,
            summary=f"Lihat analitik ujian '{exam['title']}' ({n} percobaan)",
        )

        return ExamAnalytics(
            exam_id=exam_id, title=exam["title"], scale_unit=scale_unit,
            passing_value=passing, summary=summary, distribution=distribution, items=items,
        )

    @staticmethod
    async def results_csv(exam_id: str, current_user: Any, request: Any) -> tuple[str, str]:
        supabase = get_supabase_admin()
        user_id, user_role = current_user.id, current_user.role.value

        er = supabase.table("exams").select("id, title, created_by").eq("id", exam_id).is_("deleted_at", "null").execute().data
        if not er:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ujian tidak ditemukan.")
        exam = er[0]
        _assert_owner(exam, user_id, user_role)

        attempts = (
            supabase.table("exam_attempts").select("*")
            .eq("exam_id", exam_id).order("submitted_at", desc=True).execute().data or []
        )
        names = _names_by_user(supabase, [a["user_id"] for a in attempts])

        buf = io.StringIO()
        buf.write("﻿")  # BOM → Excel baca UTF-8
        w = csv.writer(buf)
        w.writerow(["Nama", "Status", "Skor", "Lulus", "Benar", "Total Soal", "Rincian Bagian", "Waktu Kumpul"])

        def _status_label(a: dict) -> str:
            if a["status"] != "submitted":
                return "Mengerjakan"
            return "Menunggu Penilaian" if a.get("grading_status") == "pending" else "Selesai"

        for a in attempts:
            detail = a.get("score_detail") or {}
            per = [SectionResult(**ps) for ps in detail.get("per_section", [])]
            rincian = "; ".join(f"{s.label or s.section} {s.correct}/{s.total}" for s in per)
            final = a["status"] == "submitted" and a.get("grading_status") != "pending"
            submitted = _parse_dt(a.get("submitted_at"))
            w.writerow([
                names.get(a["user_id"]) or "Peserta",
                _status_label(a),
                (round(a["score"]) if final and a.get("score") is not None else ""),
                ("" if not final or a.get("passed") is None else ("Ya" if a.get("passed") else "Tidak")),
                a.get("total_correct") or 0,
                a.get("total_questions") or 0,
                rincian,
                submitted.strftime("%Y-%m-%d %H:%M") if submitted else "",
            ])

        AuditService.log_action(
            request, current_user,
            action="exam.results.export", entity_type="exam", entity_id=exam_id,
            summary=f"Ekspor CSV hasil ujian '{exam['title']}' ({len(attempts)} baris)",
        )

        slug = re.sub(r"[^a-zA-Z0-9]+", "-", exam["title"]).strip("-").lower() or "ujian"
        return buf.getvalue(), f"hasil-{slug}.csv"


def _distribution(scores: list[float], scale_unit: str) -> list[ScoreBand]:
    if not scores:
        return []
    if scale_unit == "toefl_itp":
        lo_all, hi_all, bands = 217.0, 677.0, 8
    elif scale_unit == "percent" or scale_unit == "nilai":
        lo_all, hi_all, bands = 0.0, 100.0, 10
    else:
        lo_all, hi_all, bands = min(scores), max(scores) or 1, 8
    width = (hi_all - lo_all) / bands if bands else 1
    out: list[ScoreBand] = []
    for i in range(bands):
        lo = lo_all + i * width
        hi = lo_all + (i + 1) * width
        last = i == bands - 1
        count = sum(1 for s in scores if (lo <= s <= hi if last else lo <= s < hi))
        out.append(ScoreBand(label=f"{round(lo)}–{round(hi)}", lo=round(lo, 1), hi=round(hi, 1), count=count))
    return out
