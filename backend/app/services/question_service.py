"""
Learning Nexus CBT — Question Bank Service
"""

import json
from fastapi import HTTPException, status
from postgrest.types import CountMethod
from app.database import get_supabase_admin
from app.models.question import (
    CreatePassageRequest,
    UpdatePassageRequest,
    CreateQuestionRequest,
    UpdateQuestionRequest,
    PassageResponse,
    QuestionResponse,
    PassageWithQuestionsResponse,
    QuestionListResponse,
    PassageListResponse,
    QuestionStatsResponse,
)


class QuestionService:
    """Service layer for Question Bank operations."""

    # ─── Passage CRUD ─────────────────────────────────────────

    @staticmethod
    async def create_passage(request: CreatePassageRequest, user_id: str) -> PassageResponse:
        """Create a new question passage."""
        supabase = get_supabase_admin()

        data = {
            "created_by": user_id,
            "type": request.type.value,
            "content": request.content,
            "audio_url": request.audio_url,
            "image_url": request.image_url,
            "status": request.status.value,
        }

        result = supabase.table("question_passages").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat passage baru.",
            )

        p = result.data[0]
        return PassageResponse(
            id=p["id"],
            created_by=p["created_by"],
            type=p["type"],
            content=p.get("content"),
            audio_url=p.get("audio_url"),
            image_url=p.get("image_url"),
            status=p["status"],
            questions_count=0,
            created_at=p.get("created_at"),
            updated_at=p.get("updated_at"),
        )

    @staticmethod
    async def list_passages(
        user_id: str,
        user_role: str,
        page: int = 1,
        per_page: int = 20,
        type_filter: str | None = None,
        status_filter: str | None = None,
        search: str = "",
    ) -> PassageListResponse:
        """List passages with pagination and filters."""
        supabase = get_supabase_admin()

        query = supabase.table("question_passages").select("*, profiles!question_passages_created_by_fkey(full_name)", count=CountMethod.exact)

        # Data isolation: Admin sees own, Super Admin sees all
        if user_role != "super_admin":
            query = query.eq("created_by", user_id)

        if type_filter:
            query = query.eq("type", type_filter)
        if status_filter:
            query = query.eq("status", status_filter)
        if search:
            query = query.ilike("content", f"%{search}%")

        # Pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)

        result = query.execute()

        passages = []
        for p in result.data or []:
            # Count child questions for each passage
            q_count = supabase.table("questions").select("id", count=CountMethod.exact).eq("passage_id", p["id"]).execute()

            creator_name = None
            if p.get("profiles"):
                creator_name = p["profiles"].get("full_name")

            passages.append(PassageResponse(
                id=p["id"],
                created_by=p["created_by"],
                type=p["type"],
                content=p.get("content"),
                audio_url=p.get("audio_url"),
            image_url=p.get("image_url"),
                status=p["status"],
                questions_count=q_count.count or 0,
                creator_name=creator_name,
                created_at=p.get("created_at"),
                updated_at=p.get("updated_at"),
            ))

        return PassageListResponse(
            passages=passages,
            total=result.count or 0,
            page=page,
            per_page=per_page,
        )

    @staticmethod
    async def get_passage_with_questions(passage_id: str, user_id: str, user_role: str) -> PassageWithQuestionsResponse:
        """Get a passage with all its child questions."""
        supabase = get_supabase_admin()

        # Fetch passage
        p_result = supabase.table("question_passages").select("*, profiles!question_passages_created_by_fkey(full_name)").eq("id", passage_id).single().execute()

        if not p_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passage tidak ditemukan.",
            )

        p = p_result.data

        # Data isolation check
        if user_role != "super_admin" and p["created_by"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki akses ke passage ini.",
            )

        # Fetch child questions
        q_result = (
            supabase.table("questions")
            .select("*")
            .eq("passage_id", passage_id)
            .order("sort_order")
            .execute()
        )

        creator_name = None
        if p.get("profiles"):
            creator_name = p["profiles"].get("full_name")

        passage = PassageResponse(
            id=p["id"],
            created_by=p["created_by"],
            type=p["type"],
            content=p.get("content"),
            audio_url=p.get("audio_url"),
            image_url=p.get("image_url"),
            status=p["status"],
            questions_count=len(q_result.data or []),
            creator_name=creator_name,
            created_at=p.get("created_at"),
            updated_at=p.get("updated_at"),
        )

        questions = []
        for q in q_result.data or []:
            questions.append(QuestionResponse(
                id=q["id"],
                created_by=q["created_by"],
                passage_id=q.get("passage_id"),
                section=q["section"],
                difficulty=q["difficulty"],
                question_text=q["question_text"],
                option_a=q["option_a"],
                option_b=q["option_b"],
                option_c=q["option_c"],
                option_d=q["option_d"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                image_url=q.get("image_url"),
                status=q["status"],
                tags=q.get("tags", []),
                sort_order=q.get("sort_order", 0),
                created_at=q.get("created_at"),
                updated_at=q.get("updated_at"),
            ))

        return PassageWithQuestionsResponse(passage=passage, questions=questions)

    @staticmethod
    async def update_passage(passage_id: str, request: UpdatePassageRequest, user_id: str, user_role: str) -> PassageResponse:
        """Update a passage."""
        supabase = get_supabase_admin()

        # Check ownership
        existing = supabase.table("question_passages").select("created_by").eq("id", passage_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage tidak ditemukan.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke passage ini.")

        update_data = {}
        if request.content is not None:
            update_data["content"] = request.content
        if request.audio_url is not None:
            update_data["audio_url"] = request.audio_url
        if request.image_url is not None:
            update_data["image_url"] = request.image_url
        if request.status is not None:
            update_data["status"] = request.status.value

        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data yang diubah.")

        result = supabase.table("question_passages").update(update_data).eq("id", passage_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage tidak ditemukan.")

        p = result.data[0]
        q_count = supabase.table("questions").select("id", count=CountMethod.exact).eq("passage_id", p["id"]).execute()

        return PassageResponse(
            id=p["id"],
            created_by=p["created_by"],
            type=p["type"],
            content=p.get("content"),
            audio_url=p.get("audio_url"),
            image_url=p.get("image_url"),
            status=p["status"],
            questions_count=q_count.count or 0,
            created_at=p.get("created_at"),
            updated_at=p.get("updated_at"),
        )

    @staticmethod
    async def delete_passage(passage_id: str, user_id: str, user_role: str) -> None:
        """Delete a passage and all its child questions (CASCADE)."""
        supabase = get_supabase_admin()

        existing = supabase.table("question_passages").select("created_by").eq("id", passage_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage tidak ditemukan.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke passage ini.")

        supabase.table("question_passages").delete().eq("id", passage_id).execute()

    # ─── Question CRUD ────────────────────────────────────────

    @staticmethod
    async def create_question(request: CreateQuestionRequest, user_id: str) -> QuestionResponse:
        """Create a new question."""
        supabase = get_supabase_admin()

        # If passage_id is provided, verify it exists and belongs to the user
        if request.passage_id:
            passage = supabase.table("question_passages").select("created_by, type").eq("id", request.passage_id).single().execute()
            if not passage.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passage induk tidak ditemukan.")

        data = {
            "created_by": user_id,
            "passage_id": request.passage_id,
            "section": request.section.value,
            "difficulty": request.difficulty.value,
            "question_text": request.question_text,
            "option_a": request.option_a,
            "option_b": request.option_b,
            "option_c": request.option_c,
            "option_d": request.option_d,
            "correct_answer": request.correct_answer.value,
            "explanation": request.explanation,
            "image_url": request.image_url,
            "status": request.status.value,
            "tags": request.tags,
            "sort_order": request.sort_order,
        }

        result = supabase.table("questions").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gagal membuat soal baru.",
            )

        q = result.data[0]
        return QuestionResponse(
            id=q["id"],
            created_by=q["created_by"],
            passage_id=q.get("passage_id"),
            section=q["section"],
            difficulty=q["difficulty"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation"),
            image_url=q.get("image_url"),
            status=q["status"],
            tags=q.get("tags", []),
            sort_order=q.get("sort_order", 0),
            created_at=q.get("created_at"),
            updated_at=q.get("updated_at"),
        )

    @staticmethod
    async def list_questions(
        user_id: str,
        user_role: str,
        page: int = 1,
        per_page: int = 20,
        section_filter: str | None = None,
        difficulty_filter: str | None = None,
        status_filter: str | None = None,
        passage_id: str | None = None,
        search: str = "",
    ) -> QuestionListResponse:
        """List questions with pagination and filters."""
        supabase = get_supabase_admin()

        query = supabase.table("questions").select("*, profiles!questions_created_by_fkey(full_name)", count=CountMethod.exact)

        # Data isolation
        if user_role != "super_admin":
            query = query.eq("created_by", user_id)

        if section_filter:
            query = query.eq("section", section_filter)
        if difficulty_filter:
            query = query.eq("difficulty", difficulty_filter)
        if status_filter:
            query = query.eq("status", status_filter)
        if passage_id:
            query = query.eq("passage_id", passage_id)
        if search:
            query = query.ilike("question_text", f"%{search}%")

        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)

        result = query.execute()

        questions = []
        for q in result.data or []:
            creator_name = None
            if q.get("profiles"):
                creator_name = q["profiles"].get("full_name")

            questions.append(QuestionResponse(
                id=q["id"],
                created_by=q["created_by"],
                passage_id=q.get("passage_id"),
                section=q["section"],
                difficulty=q["difficulty"],
                question_text=q["question_text"],
                option_a=q["option_a"],
                option_b=q["option_b"],
                option_c=q["option_c"],
                option_d=q["option_d"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                image_url=q.get("image_url"),
                status=q["status"],
                tags=q.get("tags", []),
                sort_order=q.get("sort_order", 0),
                creator_name=creator_name,
                created_at=q.get("created_at"),
                updated_at=q.get("updated_at"),
            ))

        return QuestionListResponse(
            questions=questions,
            total=result.count or 0,
            page=page,
            per_page=per_page,
        )

    @staticmethod
    async def get_question(question_id: str, user_id: str, user_role: str) -> QuestionResponse:
        """Get a single question by ID."""
        supabase = get_supabase_admin()

        result = supabase.table("questions").select("*, profiles!questions_created_by_fkey(full_name)").eq("id", question_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Soal tidak ditemukan.")

        q = result.data

        if user_role != "super_admin" and q["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke soal ini.")

        creator_name = None
        if q.get("profiles"):
            creator_name = q["profiles"].get("full_name")

        return QuestionResponse(
            id=q["id"],
            created_by=q["created_by"],
            passage_id=q.get("passage_id"),
            section=q["section"],
            difficulty=q["difficulty"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation"),
            image_url=q.get("image_url"),
            status=q["status"],
            tags=q.get("tags", []),
            sort_order=q.get("sort_order", 0),
            creator_name=creator_name,
            created_at=q.get("created_at"),
            updated_at=q.get("updated_at"),
        )

    @staticmethod
    async def update_question(question_id: str, request: UpdateQuestionRequest, user_id: str, user_role: str) -> QuestionResponse:
        """Update a question."""
        supabase = get_supabase_admin()

        existing = supabase.table("questions").select("created_by").eq("id", question_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Soal tidak ditemukan.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke soal ini.")

        update_data = {}
        field_map = {
            "passage_id": request.passage_id,
            "section": request.section.value if request.section else None,
            "difficulty": request.difficulty.value if request.difficulty else None,
            "question_text": request.question_text,
            "option_a": request.option_a,
            "option_b": request.option_b,
            "option_c": request.option_c,
            "option_d": request.option_d,
            "correct_answer": request.correct_answer.value if request.correct_answer else None,
            "explanation": request.explanation,
            "image_url": request.image_url,
            "status": request.status.value if request.status else None,
            "tags": request.tags,
            "sort_order": request.sort_order,
        }

        for key, value in field_map.items():
            if value is not None:
                update_data[key] = value

        if not update_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada data yang diubah.")

        result = supabase.table("questions").update(update_data).eq("id", question_id).execute()

        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Soal tidak ditemukan.")

        q = result.data[0]
        return QuestionResponse(
            id=q["id"],
            created_by=q["created_by"],
            passage_id=q.get("passage_id"),
            section=q["section"],
            difficulty=q["difficulty"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation"),
            image_url=q.get("image_url"),
            status=q["status"],
            tags=q.get("tags", []),
            sort_order=q.get("sort_order", 0),
            created_at=q.get("created_at"),
            updated_at=q.get("updated_at"),
        )

    @staticmethod
    async def delete_question(question_id: str, user_id: str, user_role: str) -> None:
        """Delete a question."""
        supabase = get_supabase_admin()

        existing = supabase.table("questions").select("created_by").eq("id", question_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Soal tidak ditemukan.")
        if user_role != "super_admin" and existing.data["created_by"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Anda tidak memiliki akses ke soal ini.")

        supabase.table("questions").delete().eq("id", question_id).execute()

    # ─── Statistics ───────────────────────────────────────────

    @staticmethod
    async def get_stats(user_id: str, user_role: str) -> QuestionStatsResponse:
        """Get question bank statistics for the current user."""
        supabase = get_supabase_admin()

        # Build base query filter
        def filtered_query(table: str):
            q = supabase.table(table).select("id", count=CountMethod.exact)
            if user_role != "super_admin":
                q = q.eq("created_by", user_id)
            return q

        total_questions = filtered_query("questions").execute().count or 0
        total_passages = filtered_query("question_passages").execute().count or 0

        # By section
        by_section = {}
        for section in ["listening", "structure", "written_expression", "reading"]:
            count = filtered_query("questions").eq("section", section).execute().count or 0
            by_section[section] = count

        # By difficulty
        by_difficulty = {}
        for diff in ["easy", "medium", "hard"]:
            count = filtered_query("questions").eq("difficulty", diff).execute().count or 0
            by_difficulty[diff] = count

        # By status
        by_status = {}
        for st in ["draft", "published"]:
            count = filtered_query("questions").eq("status", st).execute().count or 0
            by_status[st] = count

        return QuestionStatsResponse(
            total_questions=total_questions,
            total_passages=total_passages,
            by_section=by_section,
            by_difficulty=by_difficulty,
            by_status=by_status,
        )
