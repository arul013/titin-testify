'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────

export type ExamStatus = 'draft' | 'published';
export type ExamSectionId = 'listening' | 'structure' | 'written_expression' | 'reading';

export const SECTION_LABELS: Record<ExamSectionId, string> = {
  listening: 'Listening',
  structure: 'Structure',
  written_expression: 'Written Expression',
  reading: 'Reading',
};

export const ALL_SECTIONS: ExamSectionId[] = [
  'listening',
  'structure',
  'written_expression',
  'reading',
];

export interface ExamSection {
  section: ExamSectionId;
  target_count: number;
  weight: number | null;
}

export interface ExamParticipant {
  user_id: string;
  username: string | null;
  full_name: string | null;
}

export interface ExamPoolUnit {
  passage_id: string | null;
  question_id: string | null;
}

export interface Exam {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_grade: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  allow_retake: boolean;
  status: ExamStatus;
  starts_at: string | null;
  ends_at: string | null;
  creator_name: string | null;
  sections: ExamSection[];
  participants_count: number;
  total_target: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExamDetail extends Exam {
  participants: ExamParticipant[];
  pool_units: ExamPoolUnit[];
}

interface ExamListResponse {
  exams: Exam[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Hook ────────────────────────────────────────────────────

export function useExams(filters?: {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const status = filters?.status;
  const search = filters?.search;
  const page = filters?.page;
  const perPage = filters?.perPage;

  useEffect(() => {
    if (!user) return;
    let active = true;

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page || 1));
    params.set('per_page', String(perPage || 20));

    api
      .request<ExamListResponse>(`/api/exams?${params.toString()}`)
      .then((data) => {
        if (!active) return;
        setExams(data.exams || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error('Failed to fetch exams:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, status, search, page, perPage, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const getExam = (id: string) => api.request<ExamDetail>(`/api/exams/${id}`);

  const createExam = async (data: Record<string, unknown>) => {
    const res = await api.request<ExamDetail>('/api/exams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    refetch();
    return res;
  };

  const updateExam = async (id: string, data: Record<string, unknown>) => {
    const res = await api.request<ExamDetail>(`/api/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    refetch();
    return res;
  };

  const deleteExam = async (id: string) => {
    await api.request(`/api/exams/${id}`, { method: 'DELETE' });
    refetch();
  };

  return { exams, total, isLoading, refetch, getExam, createExam, updateExam, deleteExam };
}
