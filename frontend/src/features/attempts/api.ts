import { api } from '@/lib/api';

// ─── Tipe (mirror backend app/models/exam_attempt.py) ────────────────

export type ScheduleState = 'available' | 'upcoming' | 'ended';
export type AttemptStatus = 'none' | 'in_progress' | 'submitted' | 'expired';

export interface MyExamItem {
  exam_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  allow_retake: boolean;
  total_questions: number;
  schedule_state: ScheduleState;
  attempt_status: AttemptStatus;
  attempt_id: string | null;
  score: number | null;
  passed: boolean | null;
  scale_unit: string;
  /** F1.2: status penilaian manual (not_required | pending | complete). */
  grading_status?: string;
  can_start: boolean;
}

export interface MyExamListResponse {
  exams: MyExamItem[];
}

/** Konten render satu soal — TANPA kunci jawaban (dari exam_questions.payload). */
export interface QuestionPayload {
  id?: string;
  section: string;
  difficulty?: string;
  /** F1: tipe soal — runner memilih cara render (default mcq_single). */
  question_type?: string;
  content_json?: Record<string, unknown> | null;
  question_text?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  image_url?: string | null;
  options_image_url?: string | null;
  audio_url?: string | null;
  passage?: {
    type?: string;
    content?: string | null;
    audio_url?: string | null;
    image_url?: string | null;
    image_position?: string | null;
  } | null;
}

export interface AttemptQuestion {
  exam_question_id: string;
  position: number;
  section: string;
  payload: QuestionPayload;
  selected_answer: string | null;
  /** F1: jawaban kompleks (mis. {selected:[…]}) untuk mcq_multi/matching/… */
  answer_json?: Record<string, unknown> | null;
}

/** F1.4b: timing per-bagian (mode berurutan). */
export interface SectionTiming {
  order: string[];
  limits: Record<string, number>;
  current_section: string | null;
  current_remaining_seconds: number;
  done_sections: string[];
  finished: boolean;
}

export interface StartAttemptResponse {
  attempt_id: string;
  exam_id: string;
  title: string;
  duration_minutes: number;
  started_at: string;
  deadline: string;
  remaining_seconds: number;
  allow_retake: boolean;
  questions: AttemptQuestion[];
  /** F1.4b: bila ada → ujian mode per-bagian; runner pakai timer per-bagian. */
  section_timing?: SectionTiming | null;
}

export interface SectionResult {
  section: string;
  total: number;
  correct: number;
  percent: number;
  /** Label tampilan (mis. "Structure & Written Expression" untuk grup gabungan ITP). */
  label?: string | null;
  /** Nilai konversi TOEFL ITP (bila skor resmi); null untuk Nilai 0–100. */
  converted?: number | null;
}

export interface AttemptResult {
  attempt_id: string;
  exam_id: string;
  title: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  scale_unit: string;
  total_questions: number;
  total_correct: number;
  passing_value: number | null;
  per_section: SectionResult[];
  submitted_at: string | null;
  /** Pembahasan & kunci tersedia (exam.show_review) → tampilkan tombol pembahasan. */
  show_review: boolean;
  /** F1.2: status penilaian manual (not_required | pending | complete). */
  grading_status?: string;
}

/** Satu soal pada pembahasan (setelah submit, bila show_review). */
export interface ReviewQuestion {
  exam_question_id: string;
  position: number;
  section: string;
  payload: QuestionPayload;
  correct_answer: string | null;
  selected_answer: string | null;
  answer_json?: Record<string, unknown> | null;      // jawaban peserta (kompleks)
  answer_key_json?: Record<string, unknown> | null;  // kunci kompleks (mis. {correct:[…]})
  is_correct: boolean;
  explanation: string | null;
  // F1.2: penilaian manual (essay) — terisi setelah grading complete.
  scoring_mode?: string | null;
  awarded_score?: number | null;
  max_score?: number | null;
  rubric_scores?: { scores?: { name: string; max_score: number; score: number }[] } | null;
  feedback?: string | null;
}

export interface AttemptReview {
  attempt_id: string;
  exam_id: string;
  title: string;
  total_questions: number;
  total_correct: number;
  questions: ReviewQuestion[];
}

// ─── Panggilan API peserta ───────────────────────────────────────────

export const attemptsApi = {
  listMyExams: () => api.request<MyExamListResponse>('/api/my-exams'),

  start: (examId: string) =>
    api.request<StartAttemptResponse>(`/api/my-exams/${examId}/start`, { method: 'POST' }),

  saveAnswer: (
    attemptId: string,
    examQuestionId: string,
    selected: string | null,
    answerJson?: Record<string, unknown> | null,
  ) =>
    api.request<{ success: boolean }>(`/api/attempts/${attemptId}/answer`, {
      method: 'PUT',
      body: JSON.stringify({
        exam_question_id: examQuestionId,
        selected_answer: selected,
        answer_json: answerJson ?? null,
      }),
    }),

  submit: (attemptId: string) =>
    api.request<AttemptResult>(`/api/attempts/${attemptId}/submit`, { method: 'POST' }),

  /** F1.4b: kunci bagian aktif & maju ke bagian berikutnya. */
  advance: (attemptId: string, section: string) =>
    api.request<SectionTiming>(`/api/attempts/${attemptId}/advance`, {
      method: 'POST',
      body: JSON.stringify({ section }),
    }),

  result: (attemptId: string) =>
    api.request<AttemptResult>(`/api/attempts/${attemptId}/result`),

  review: (attemptId: string) =>
    api.request<AttemptReview>(`/api/attempts/${attemptId}/review`),
};
