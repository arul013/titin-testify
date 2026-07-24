"""
Learning Nexus CBT — Pydantic Models for Question Bank
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────

class QuestionSection(str, Enum):
    """Question section types matching the CBT exam structure."""
    LISTENING = "listening"
    STRUCTURE = "structure"
    WRITTEN_EXPRESSION = "written_expression"
    READING = "reading"


class QuestionDifficulty(str, Enum):
    """Question difficulty levels."""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ContentStatus(str, Enum):
    """Content publication status."""
    DRAFT = "draft"
    PUBLISHED = "published"


class CorrectAnswer(str, Enum):
    """Valid answer options."""
    A = "a"
    B = "b"
    C = "c"
    D = "d"


# ─── Passage Request Models ──────────────────────────────────────

class CreatePassageRequest(BaseModel):
    """Request body for creating a new question passage."""
    type: QuestionSection = Field(..., description="Passage type")
    content: Optional[str] = Field(None, description="Passage text content")
    audio_url: Optional[str] = Field(None, description="Audio URL for Listening passages")
    image_url: Optional[str] = Field(None, description="Optional image URL for the passage")
    status: ContentStatus = Field(default=ContentStatus.DRAFT, description="Publication status")


class UpdatePassageRequest(BaseModel):
    """Request body for updating a passage."""
    content: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[ContentStatus] = None


# ─── Question Request Models ─────────────────────────────────────

class CreateQuestionRequest(BaseModel):
    """Request body for creating a new question."""
    passage_id: Optional[str] = Field(None, description="Parent passage ID (null for standalone)")
    section: QuestionSection = Field(..., description="Question section type")
    difficulty: QuestionDifficulty = Field(default=QuestionDifficulty.MEDIUM, description="Difficulty level")
    question_text: str = Field(..., min_length=1, description="The question prompt")
    # Boleh kosong bila memakai mode "opsi gambar" (options_image_url).
    option_a: str = Field(default="", description="Option A text")
    option_b: str = Field(default="", description="Option B text")
    option_c: str = Field(default="", description="Option C text")
    option_d: str = Field(default="", description="Option D text")
    correct_answer: CorrectAnswer = Field(..., description="Correct answer (a/b/c/d)")
    explanation: Optional[str] = Field(None, description="Answer explanation")
    image_url: Optional[str] = Field(None, description="Optional image URL for the question stem")
    options_image_url: Optional[str] = Field(None, description="Optional image containing the A/B/C/D choices")
    status: ContentStatus = Field(default=ContentStatus.DRAFT, description="Publication status")
    tags: list[str] = Field(default_factory=list, description="Topic tags")
    sort_order: int = Field(default=0, description="Order within passage group")


class UpdateQuestionRequest(BaseModel):
    """Request body for updating a question."""
    passage_id: Optional[str] = None
    section: Optional[QuestionSection] = None
    difficulty: Optional[QuestionDifficulty] = None
    question_text: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    correct_answer: Optional[CorrectAnswer] = None
    explanation: Optional[str] = None
    image_url: Optional[str] = None
    options_image_url: Optional[str] = None
    status: Optional[ContentStatus] = None
    tags: Optional[list[str]] = None
    sort_order: Optional[int] = None


# ─── Response Models ─────────────────────────────────────────────

class PassageResponse(BaseModel):
    """Passage response model."""
    id: str
    created_by: str
    type: QuestionSection
    content: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    status: ContentStatus
    questions_count: int = 0
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class QuestionResponse(BaseModel):
    """Individual question response model."""
    id: str
    created_by: str
    passage_id: Optional[str] = None
    section: QuestionSection
    difficulty: QuestionDifficulty
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: CorrectAnswer
    explanation: Optional[str] = None
    image_url: Optional[str] = None
    options_image_url: Optional[str] = None
    status: ContentStatus
    tags: list[str] = []
    sort_order: int = 0
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PassageWithQuestionsResponse(BaseModel):
    """Passage response including all child questions."""
    passage: PassageResponse
    questions: list[QuestionResponse] = []


class QuestionListResponse(BaseModel):
    """Paginated question list response."""
    questions: list[QuestionResponse]
    total: int
    page: int
    per_page: int


class PassageListResponse(BaseModel):
    """Paginated passage list response."""
    passages: list[PassageResponse]
    total: int
    page: int
    per_page: int


class QuestionStatsResponse(BaseModel):
    """Question bank statistics."""
    total_questions: int = 0
    total_passages: int = 0
    by_section: dict[str, int] = {}
    by_difficulty: dict[str, int] = {}
    by_status: dict[str, int] = {}


class QuestionMessageResponse(BaseModel):
    """Generic message response for question operations."""
    message: str
    success: bool = True
