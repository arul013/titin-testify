'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface PendingExam {
  exam_id: string;
  title: string;
  pending_count: number;
  total_submitted: number;
}

export interface PendingAttempt {
  attempt_id: string;
  user_id: string;
  participant_name: string | null;
  submitted_at: string | null;
  manual_total: number;
  manual_graded: number;
}

export interface GradingCriterion {
  name: string;
  max_score: number;
  descriptors?: string | null;
  score?: number | null;
}

export interface GradingAnswer {
  answer_id: string | null;
  exam_question_id: string;
  position: number;
  section: string;
  payload: Record<string, unknown>;
  participant_text: string;
  /** F1.3: jawaban speaking (audio) — penilai memutar rekaman. */
  participant_audio_url?: string | null;
  rubric_name: string | null;
  criteria: GradingCriterion[];
  max_score: number;
  awarded_score: number | null;
  feedback: string | null;
  graded: boolean;
}

export interface GradingAttemptDetail {
  attempt_id: string;
  exam_id: string;
  title: string;
  participant_name: string | null;
  submitted_at: string | null;
  grading_status: string;
  answers: GradingAnswer[];
}

export interface GradeResult {
  success: boolean;
  answer_id: string;
  awarded_score: number;
  grading_status: string;
  attempt_score: number | null;
  attempt_passed: boolean | null;
}

/** Daftar ujian dengan attempt menunggu penilaian. */
export function usePendingExams() {
  const [exams, setExams] = useState<PendingExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ exams: PendingExam[] }>('/api/grading/pending')
      .then((d) => active && (setExams(d.exams || []), setError(null)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Gagal memuat antrean penilaian'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { exams, isLoading, error };
}

/** Attempt menunggu penilaian untuk satu ujian. */
export function useExamAttempts(examId: string) {
  const [data, setData] = useState<{ exam_id: string; title: string; attempts: PendingAttempt[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ exam_id: string; title: string; attempts: PendingAttempt[] }>(`/api/grading/exams/${examId}/attempts`)
      .then((d) => active && (setData(d), setError(null)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Gagal memuat daftar peserta'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [examId]);

  return { data, isLoading, error };
}

/** Detail penilaian satu attempt (+ aksi simpan skor). */
export function useAttemptGrading(attemptId: string) {
  const [detail, setDetail] = useState<GradingAttemptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get<GradingAttemptDetail>(`/api/grading/attempts/${attemptId}`)
      .then((d) => active && (setDetail(d), setError(null)))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Gagal memuat detail penilaian'))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const submitGrade = useCallback(
    async (answerId: string, scores: number[], feedback: string) => {
      const res = await api.post<GradeResult>(
        `/api/grading/attempts/${attemptId}/answers/${answerId}`,
        { scores, feedback: feedback || null },
      );
      return res;
    },
    [attemptId],
  );

  return { detail, isLoading, error, refetch, submitGrade };
}
