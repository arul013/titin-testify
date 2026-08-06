"""
Learning Nexus CBT — Pydantic Models for Exam Builder (Manajemen Ujian)
"""

from pydantic import BaseModel, Field, model_validator, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

from app.models.question import QuestionSection

_VALID_EXAM_MODE = {"full", "custom"}


class ExamStatus(str, Enum):
    """Siklus hidup ujian (khusus exam, terpisah dari ContentStatus soal)."""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"        # ujian selesai/ditutup — read-only, tak bisa dibuka ulang
    ARCHIVED = "archived"    # diarsipkan — tersembunyi dari daftar aktif


# ─── Anti-cheat (M8) ─────────────────────────────────────────────

class CameraCaptureConfig(BaseModel):
    """M8.4: kamera capture berkala (foto, bukan rekam video)."""
    enabled: bool = False
    interval_sec: int = Field(default=60, ge=15, le=600)


class AntiCheatConfig(BaseModel):
    """Config anti-cheat per-ujian (opt-in). Disimpan sebagai JSONB `exams.anti_cheat`."""
    track_focus: bool = False            # catat pindah-tab/blur
    on_focus_loss: str = "warn"          # "warn" | "submit"
    focus_strikes: int = Field(default=1, ge=1, le=10)  # jml pelanggaran sebelum aksi "submit"
    require_fullscreen: bool = False     # paksa fullscreen + deteksi keluar
    block_copy_paste: bool = False       # blokir copy/cut/paste/klik-kanan (seleksi tetap boleh)
    detect_multi_screen: bool = False    # deteksi layar ganda saat mulai (Window Management API)
    single_session: bool = False         # M8.2 (belum ditegakkan)
    max_violations: int = Field(default=0, ge=0, le=100)  # M8.3
    camera_capture: CameraCaptureConfig = Field(default_factory=CameraCaptureConfig)  # M8.4

    @field_validator("on_focus_loss")
    @classmethod
    def _focus_action(cls, v: str) -> str:
        if v not in ("warn", "submit"):
            raise ValueError("on_focus_loss harus 'warn' atau 'submit'.")
        return v

    @property
    def enabled(self) -> bool:
        return any([
            self.track_focus, self.require_fullscreen, self.block_copy_paste,
            self.detect_multi_screen, self.single_session,
        ])


# ─── Nested input models ─────────────────────────────────────────

class ExamSectionInput(BaseModel):
    """Komposisi satu section dalam paket ujian."""
    section: QuestionSection = Field(..., description="Bagian ujian (TOEFL)")
    target_count: int = Field(..., ge=1, description="Target jumlah soal untuk section ini")
    weight: Optional[float] = Field(None, gt=0, description="Bobot opsional (default: setara)")
    # F1.4b: batas waktu per-bagian (menit). Bila diisi di semua bagian → mode ujian
    # per-bagian berurutan (timer per-bagian, tak bisa mundur). Null → ikut timer global.
    time_limit_minutes: Optional[int] = Field(None, ge=1, description="Batas waktu bagian (menit); null = ikut durasi global")


class ExamPoolUnitInput(BaseModel):
    """Satu unit pool. Kombinasi valid:
    - passage_id saja        → materi UTUH (semua soal anaknya).
    - question_id saja       → soal tunggal (standalone).
    - passage_id+question_id → SATU soal spesifik di dalam materi (subset).
    """
    passage_id: Optional[str] = None
    question_id: Optional[str] = None

    @model_validator(mode="after")
    def _at_least_one(self) -> "ExamPoolUnitInput":
        if not self.passage_id and not self.question_id:
            raise ValueError("Setiap unit pool harus mengisi passage_id dan/atau question_id.")
        return self


# ─── Request models ──────────────────────────────────────────────

class CreateExamRequest(BaseModel):
    """Request body untuk membuat paket ujian."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: int = Field(..., ge=1, description="Total waktu (menit)")
    test_type: str = Field(default="itp", description="Jenis tes (test_types.code)")
    exam_mode: str = Field(default="custom", description="'full' (preset terkunci + eksak) | 'custom' (bebas + toleran)")
    show_review: bool = Field(default=False, description="Tampilkan pembahasan & kunci ke peserta setelah selesai")
    scoring_scheme_id: Optional[str] = Field(None, description="Skema penilaian yang dipakai")
    passing_value: Optional[float] = Field(None, ge=0, description="Nilai kelulusan dalam skala skema (opsional)")
    allow_retake: bool = False
    status: ExamStatus = Field(default=ExamStatus.DRAFT)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    sections: list[ExamSectionInput] = Field(default_factory=list)
    participant_ids: list[str] = Field(default_factory=list)
    pool_units: list[ExamPoolUnitInput] = Field(default_factory=list)
    anti_cheat: Optional[AntiCheatConfig] = None

    @field_validator("exam_mode")
    @classmethod
    def _mode(cls, v: str) -> str:
        if v not in _VALID_EXAM_MODE:
            raise ValueError("exam_mode harus 'full' atau 'custom'.")
        return v

    @model_validator(mode="after")
    def _schedule_valid(self) -> "CreateExamRequest":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Tanggal selesai harus setelah tanggal mulai.")
        return self


class UpdateExamRequest(BaseModel):
    """Request body untuk memperbarui paket ujian.

    Field list (sections/participant_ids/pool_units) bila diisi akan
    MENGGANTI keseluruhan (replace), bila None dibiarkan apa adanya.
    """
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    test_type: Optional[str] = None
    exam_mode: Optional[str] = None
    show_review: Optional[bool] = None
    scoring_scheme_id: Optional[str] = None
    passing_value: Optional[float] = Field(None, ge=0)
    allow_retake: Optional[bool] = None
    status: Optional[ExamStatus] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    sections: Optional[list[ExamSectionInput]] = None
    participant_ids: Optional[list[str]] = None
    pool_units: Optional[list[ExamPoolUnitInput]] = None
    anti_cheat: Optional[AntiCheatConfig] = None
    # Optimistic concurrency: versi yang dilihat klien. Bila diisi & beda dg server → 409.
    version: Optional[int] = None


# ─── Response models ─────────────────────────────────────────────

class ExamSectionResponse(BaseModel):
    section: QuestionSection
    target_count: int
    weight: Optional[float] = None
    time_limit_minutes: Optional[int] = None


class ExamParticipantResponse(BaseModel):
    user_id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    # M5.2: menit tambahan (akomodasi) untuk peserta ini pada ujian ini.
    extra_minutes: int = 0


class SetParticipantExtraRequest(BaseModel):
    """Set menit tambahan (akomodasi) satu peserta pada satu ujian."""
    extra_minutes: int = Field(..., ge=0, le=600, description="Menit tambahan (0–600)")


class ExamPoolUnitResponse(BaseModel):
    passage_id: Optional[str] = None
    question_id: Optional[str] = None


class ExamResponse(BaseModel):
    """Ringkasan paket ujian (untuk list)."""
    id: str
    created_by: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    test_type: str = "itp"
    exam_mode: str = "custom"
    show_review: bool = False
    scoring_scheme_id: Optional[str] = None
    passing_value: Optional[float] = None
    allow_retake: bool = False
    status: ExamStatus
    version: int = 1
    # M4: resep template (dikecualikan dari daftar ujian aktif).
    is_template: bool = False
    # M8: config anti-cheat per-ujian.
    anti_cheat: AntiCheatConfig = Field(default_factory=AntiCheatConfig)
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    creator_name: Optional[str] = None
    sections: list[ExamSectionResponse] = []
    participants_count: int = 0
    attempts_count: int = 0
    total_target: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ExamDetailResponse(ExamResponse):
    """Detail lengkap paket ujian (untuk halaman edit)."""
    participants: list[ExamParticipantResponse] = []
    pool_units: list[ExamPoolUnitResponse] = []


class ExamListResponse(BaseModel):
    exams: list[ExamResponse]
    total: int
    page: int
    per_page: int


class ExamMessageResponse(BaseModel):
    message: str
    success: bool = True


# ─── Pool preview (ketersediaan stok soal per section) ───────────

class PoolPreviewRequest(BaseModel):
    """Cek ketersediaan stok soal untuk komposisi + pool tertentu (stateless)."""
    sections: list[ExamSectionInput] = Field(default_factory=list)
    pool_units: list[ExamPoolUnitInput] = Field(default_factory=list)


class SectionAvailability(BaseModel):
    section: QuestionSection
    target_count: int
    available_units: int
    available_questions: int
    enough: bool


class PoolPreviewResponse(BaseModel):
    sections: list[SectionAvailability]
