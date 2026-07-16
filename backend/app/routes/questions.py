"""
Learning Nexus CBT — Question Bank Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
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
    QuestionMessageResponse,
)
from app.models.user import UserProfile
from app.services.question_service import QuestionService
from app.dependencies import require_admin

router = APIRouter(tags=["Question Bank"])


# ─── Passage Endpoints ───────────────────────────────────────────

@router.get("/api/passages", response_model=PassageListResponse)
async def list_passages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by passage type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: str = Query("", description="Search in passage content"),
    current_user: UserProfile = Depends(require_admin),
):
    """List passages with pagination and filters (admin only)."""
    return await QuestionService.list_passages(
        user_id=current_user.id,
        user_role=current_user.role.value,
        page=page,
        per_page=per_page,
        type_filter=type,
        status_filter=status,
        search=search,
    )


@router.post("/api/passages", response_model=PassageResponse, status_code=201)
async def create_passage(
    request: CreatePassageRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Create a new question passage (admin only)."""
    return await QuestionService.create_passage(request, current_user.id)


@router.get("/api/passages/{passage_id}", response_model=PassageWithQuestionsResponse)
async def get_passage(
    passage_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Get a passage with all its child questions (admin only)."""
    return await QuestionService.get_passage_with_questions(
        passage_id, current_user.id, current_user.role.value
    )


@router.put("/api/passages/{passage_id}", response_model=PassageResponse)
async def update_passage(
    passage_id: str,
    request: UpdatePassageRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Update a passage (owner or super_admin only)."""
    return await QuestionService.update_passage(
        passage_id, request, current_user.id, current_user.role.value
    )


@router.delete("/api/passages/{passage_id}", response_model=QuestionMessageResponse)
async def delete_passage(
    passage_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Delete a passage and all child questions (owner or super_admin only)."""
    await QuestionService.delete_passage(
        passage_id, current_user.id, current_user.role.value
    )
    return QuestionMessageResponse(message="Passage dan semua soal terkait berhasil dihapus.")


# ─── Question Endpoints ──────────────────────────────────────────

@router.get("/api/questions/stats", response_model=QuestionStatsResponse)
async def get_question_stats(
    current_user: UserProfile = Depends(require_admin),
):
    """Get question bank statistics (admin only)."""
    return await QuestionService.get_stats(current_user.id, current_user.role.value)


@router.get("/api/questions", response_model=QuestionListResponse)
async def list_questions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    section: Optional[str] = Query(None, description="Filter by section"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    status: Optional[str] = Query(None, description="Filter by status"),
    passage_id: Optional[str] = Query(None, description="Filter by passage"),
    search: str = Query("", description="Search in question text"),
    current_user: UserProfile = Depends(require_admin),
):
    """List questions with pagination and filters (admin only)."""
    return await QuestionService.list_questions(
        user_id=current_user.id,
        user_role=current_user.role.value,
        page=page,
        per_page=per_page,
        section_filter=section,
        difficulty_filter=difficulty,
        status_filter=status,
        passage_id=passage_id,
        search=search,
    )


@router.post("/api/questions", response_model=QuestionResponse, status_code=201)
async def create_question(
    request: CreateQuestionRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Create a new question (admin only)."""
    return await QuestionService.create_question(request, current_user.id)


@router.get("/api/questions/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Get a single question by ID (admin only)."""
    return await QuestionService.get_question(
        question_id, current_user.id, current_user.role.value
    )


@router.put("/api/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str,
    request: UpdateQuestionRequest,
    current_user: UserProfile = Depends(require_admin),
):
    """Update a question (owner or super_admin only)."""
    return await QuestionService.update_question(
        question_id, request, current_user.id, current_user.role.value
    )


@router.delete("/api/questions/{question_id}", response_model=QuestionMessageResponse)
async def delete_question(
    question_id: str,
    current_user: UserProfile = Depends(require_admin),
):
    """Delete a question (owner or super_admin only)."""
    await QuestionService.delete_question(
        question_id, current_user.id, current_user.role.value
    )
    return QuestionMessageResponse(message="Soal berhasil dihapus.")
