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
  /** M8: jumlah pelanggaran anti-cheat. */
  violation_count?: number;
}

export interface AttemptEventItem {
  type: string;
  detail?: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AttemptIntegrity {
  violation_count: number;
  by_type: Record<string, number>;
  events: AttemptEventItem[];
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
  /** M8: ringkasan integritas (pelanggaran anti-cheat). */
  integrity?: AttemptIntegrity;
}

export interface ItemStat {
  exam_question_id: string;
  position: number;
  section: string;
  question_type: string;
  n_answered: number;
  n_correct: number;
  p_value: number;
  discrimination: number | null;
  flag: 'too_easy' | 'too_hard' | 'low_discrimination' | 'negative' | null;
  correct_answer: string | null;
  option_counts: Record<string, number>;
}

export interface ScoreBand {
  label: string;
  lo: number;
  hi: number;
  count: number;
}

export interface AnalyticsSummary {
  submitted: number;
  avg_score: number | null;
  median_score: number | null;
  highest: number | null;
  lowest: number | null;
  passed_count: number | null;
  pass_rate: number | null;
}

export interface ExamAnalytics {
  exam_id: string;
  title: string;
  scale_unit: string;
  passing_value: number | null;
  summary: AnalyticsSummary;
  distribution: ScoreBand[];
  items: ItemStat[];
}

export const resultsApi = {
  exam: (examId: string) => api.get<AdminResults>(`/api/admin/exams/${examId}/results`),
  review: (attemptId: string) => api.get<AdminAttemptReview>(`/api/admin/attempts/${attemptId}/review`),
  analytics: (examId: string) => api.get<ExamAnalytics>(`/api/admin/exams/${examId}/analytics`),
  reset: (attemptId: string) =>
    api.post<{ message: string; success: boolean }>(`/api/admin/attempts/${attemptId}/reset`, {}),
};

/** Unduh CSV hasil (endpoint ter-autentikasi → fetch dengan token → blob download). */
export async function downloadResultsCsv(examId: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cbt_access_token') : null;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await fetch(`${base}/api/admin/exams/${examId}/results.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Gagal mengunduh CSV.');
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition');
  const name = cd?.match(/filename="?([^"]+)"?/)?.[1] || 'hasil.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
