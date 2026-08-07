"""
Learning Nexus CBT — Dashboard Service (Admin & Super Admin)

Agregasi ringkasan dashboard, role-aware: admin → data miliknya (`created_by`),
super_admin → seluruh sistem + blok pengguna & audit. Detail: docs/Dashboard_plan.md.
"""

from typing import Any

from postgrest.types import CountMethod

from app.database import get_supabase_admin
from app.services.exam_attempt_service import _parse_dt
from app.models.dashboard import (
    DashboardSummary, ExamCounts, QuestionCounts, ActiveExam, UserCounts, AuditItem,
)


class DashboardService:

    @staticmethod
    async def summary(current_user: Any) -> DashboardSummary:
        supabase = get_supabase_admin()
        user_id = current_user.id
        is_super = current_user.role.value == "super_admin"

        def scoped(q):
            """Filter created_by utk admin; super_admin lihat semua."""
            return q if is_super else q.eq("created_by", user_id)

        # ── Ujian (aktif, bukan template) per status ──
        exam_rows = (
            scoped(
                supabase.table("exams").select("id, status")
                .is_("deleted_at", "null").eq("is_template", False)
            ).execute().data or []
        )
        exam_ids = [e["id"] for e in exam_rows]
        by_status = {"draft": 0, "published": 0, "closed": 0, "archived": 0}
        for e in exam_rows:
            if e["status"] in by_status:
                by_status[e["status"]] += 1
        exams = ExamCounts(total=len(exam_rows), **by_status)

        # ── Bank Soal ──
        q_total = scoped(supabase.table("questions").select("id", count=CountMethod.exact)).execute().count or 0
        q_pub = scoped(
            supabase.table("questions").select("id", count=CountMethod.exact).eq("status", "published")
        ).execute().count or 0
        passages_total = scoped(
            supabase.table("question_passages").select("id", count=CountMethod.exact)
        ).execute().count or 0

        # ── Peserta unik + grup ──
        participants_total = 0
        if exam_ids:
            prows = (
                supabase.table("exam_participants").select("user_id")
                .in_("exam_id", exam_ids).execute().data or []
            )
            participants_total = len({r["user_id"] for r in prows})
        groups_total = scoped(
            supabase.table("participant_groups").select("id", count=CountMethod.exact).is_("deleted_at", "null")
        ).execute().count or 0

        # ── Menunggu penilaian + pelanggaran integritas ──
        pending_grading = flagged_attempts = 0
        if exam_ids:
            pending_grading = (
                supabase.table("exam_attempts").select("id", count=CountMethod.exact)
                .in_("exam_id", exam_ids).eq("status", "submitted").eq("grading_status", "pending")
                .is_("reset_at", "null").execute().count or 0
            )
            flagged_attempts = (
                supabase.table("exam_attempts").select("id", count=CountMethod.exact)
                .in_("exam_id", exam_ids).gt("violation_count", 0).is_("reset_at", "null")
                .execute().count or 0
            )

        # ── Ujian aktif (Tayang) teratas + jumlah submit + rata-rata ──
        pub_rows = (
            scoped(
                supabase.table("exams").select("id, title")
                .is_("deleted_at", "null").eq("is_template", False).eq("status", "published")
                .order("created_at", desc=True).limit(5)
            ).execute().data or []
        )
        active_exams: list[ActiveExam] = []
        pub_ids = [e["id"] for e in pub_rows]
        if pub_ids:
            part_by: dict = {}
            for r in (supabase.table("exam_participants").select("exam_id").in_("exam_id", pub_ids).execute().data or []):
                part_by[r["exam_id"]] = part_by.get(r["exam_id"], 0) + 1
            sub_by: dict = {}
            score_by: dict = {}
            att = (
                supabase.table("exam_attempts").select("exam_id, status, score, grading_status")
                .in_("exam_id", pub_ids).is_("reset_at", "null").execute().data or []
            )
            for a in att:
                if a["status"] == "submitted":
                    sub_by[a["exam_id"]] = sub_by.get(a["exam_id"], 0) + 1
                    if a.get("grading_status") != "pending" and a.get("score") is not None:
                        score_by.setdefault(a["exam_id"], []).append(float(a["score"]))
            for e in pub_rows:
                scores = score_by.get(e["id"], [])
                active_exams.append(ActiveExam(
                    exam_id=e["id"], title=e["title"],
                    participants=part_by.get(e["id"], 0),
                    submitted=sub_by.get(e["id"], 0),
                    avg_score=round(sum(scores) / len(scores), 1) if scores else None,
                ))

        # ── Super Admin: pengguna + audit ──
        users = None
        audit_recent: list[AuditItem] = []
        if is_super:
            prof = supabase.table("profiles").select("role, is_active").execute().data or []
            admins = sum(1 for p in prof if p.get("role") in ("admin", "super_admin"))
            participants = sum(1 for p in prof if p.get("role") == "peserta")
            active = sum(1 for p in prof if p.get("is_active"))
            users = UserCounts(
                total=len(prof), admins=admins, participants=participants,
                active=active, inactive=len(prof) - active,
            )

            arows = (
                supabase.table("audit_events").select("actor_id, action, summary, created_at")
                .order("created_at", desc=True).limit(10).execute().data or []
            )
            actor_ids = list({r["actor_id"] for r in arows if r.get("actor_id")})
            names: dict = {}
            if actor_ids:
                for pr in (supabase.table("profiles").select("id, full_name").in_("id", actor_ids).execute().data or []):
                    names[pr["id"]] = pr.get("full_name")
            audit_recent = [
                AuditItem(
                    actor_name=names.get(r.get("actor_id")),
                    action=r["action"], summary=r.get("summary"),
                    created_at=_parse_dt(r.get("created_at")),
                )
                for r in arows
            ]

        return DashboardSummary(
            role=current_user.role.value,
            exams=exams,
            questions=QuestionCounts(total=q_total, published=q_pub),
            passages_total=passages_total,
            participants_total=participants_total,
            groups_total=groups_total,
            pending_grading=pending_grading,
            flagged_attempts=flagged_attempts,
            active_exams=active_exams,
            users=users,
            audit_recent=audit_recent,
        )
