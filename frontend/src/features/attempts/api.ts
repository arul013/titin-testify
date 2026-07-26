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
}

// ─── Panggilan API peserta ───────────────────────────────────────────

export const attemptsApi = {
  listMyExams: () => api.request<MyExamListResponse>('/api/my-exams'),

  start: (examId: string) =>
    api.request<StartAttemptResponse>(`/api/my-exams/${examId}/start`, { method: 'POST' }),

  saveAnswer: (attemptId: string, examQuestionId: string, selected: string | null) =>
    api.request<{ success: boolean }>(`/api/attempts/${attemptId}/answer`, {
      method: 'PUT',
      body: JSON.stringify({ exam_question_id: examQuestionId, selected_answer: selected }),
    }),

  submit: (attemptId: string) =>
    api.request<AttemptResult>(`/api/attempts/${attemptId}/submit`, { method: 'POST' }),

  result: (attemptId: string) =>
    api.request<AttemptResult>(`/api/attempts/${attemptId}/result`),
};
