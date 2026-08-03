import { api } from '@/lib/api';
import type { AttemptReview, SectionResult } from '@/features/attempts/api';

export interface AdminAttemptRow {
  attempt_id: string;
  user_id: string;
  participant_name: string | null;
  status: string; // in_progress | submitted
  grading_status: string; // not_required | pending | complete
  score: number | null;
  passed: boolean | null;
  scale_unit: string;
  total_questions: number;
  total_correct: number;
  per_section: SectionResult[];
  started_at: string | null;
  submitted_at: string | null;
}

export interface AdminResultsSummary {
  participants_total: number;
  attempts_total: number;
  submitted: number;
  in_progress: number;
  pending_grading: number;
  avg_score: number | null;
  passed_count: number | null;
  highest: number | null;
  lowest: number | null;
}

export interface AdminResults {
  exam_id: string;
  title: string;
  scale_unit: string;
  passing_value: number | null;
  show_review: boolean;
  summary: AdminResultsSummary;
  attempts: AdminAttemptRow[];
}

/** Superset dari AttemptReview (punya `questions`) + info peserta/skor. */
export interface AdminAttemptReview extends AttemptReview {
  participant_name: string | null;
  status: string;
  grading_status: string;
  score: number | null;
  passed: boolean | null;
  scale_unit: string;
  passing_value: number | null;
  per_section: SectionResult[];
  submitted_at: string | null;
}

export const resultsApi = {
  exam: (examId: string) => api.get<AdminResults>(`/api/admin/exams/${examId}/results`),
  review: (attemptId: string) => api.get<AdminAttemptReview>(`/api/admin/attempts/${attemptId}/review`),
};
