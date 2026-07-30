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

  result: (attemptId: string) =>
    api.request<AttemptResult>(`/api/attempts/${attemptId}/result`),

  review: (attemptId: string) =>
    api.request<AttemptReview>(`/api/attempts/${attemptId}/review`),
};
