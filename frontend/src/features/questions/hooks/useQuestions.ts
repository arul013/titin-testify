'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────

export interface Question {
  id: string;
  created_by: string;
  passage_id: string | null;
  section: string;
  difficulty: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  image_url: string | null;
  options_image_url: string | null;
  status: string;
  tags: string[];
  sort_order: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Passage {
  id: string;
  created_by: string;
  type: string;
  content: string | null;
  audio_url: string | null;
  image_url: string | null;
  status: string;
  questions_count: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionStats {
  total_questions: number;
  total_passages: number;
  by_section: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_status: Record<string, number>;
}

export interface PassageWithQuestions {
  passage: Passage;
  questions: Question[];
}

interface QuestionListResponse {
  questions: Question[];
  total: number;
}

interface PassageListResponse {
  passages: Passage[];
  total: number;
}

// ─── Question Hooks ──────────────────────────────────────────

export function useQuestions(filters?: {
  section?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  // Ambil nilai primitif agar dependency effect stabil & spesifik.
  const section = filters?.section;
  const difficulty = filters?.difficulty;
  const status = filters?.status;
  const search = filters?.search;
  const page = filters?.page;
  const perPage = filters?.perPage;

  useEffect(() => {
    if (!user) return;
    let active = true;

    const params = new URLSearchParams();
    if (section) params.set('section', section);
    if (difficulty) params.set('difficulty', difficulty);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page || 1));
    params.set('per_page', String(perPage || 20));

    api
      .request<QuestionListResponse>(`/api/questions?${params.toString()}`)
      .then((data) => {
        if (!active) return;
        setQuestions(data.questions || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error('Failed to fetch questions:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, section, difficulty, status, search, page, perPage, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const createQuestion = async (data: Record<string, unknown>) => {
    const res = await api.request('/api/questions', { method: 'POST', body: JSON.stringify(data) });
    refetch();
    return res;
  };

  const updateQuestion = async (id: string, data: Record<string, unknown>) => {
    const res = await api.request(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    refetch();
    return res;
  };

  const deleteQuestion = async (id: string) => {
    await api.request(`/api/questions/${id}`, { method: 'DELETE' });
    refetch();
  };

  return { questions, total, isLoading, refetch, createQuestion, updateQuestion, deleteQuestion };
}

// ─── Passage Hooks ───────────────────────────────────────────

export function usePassages(filters?: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) {
  const { user } = useAuth();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const type = filters?.type;
  const status = filters?.status;
  const search = filters?.search;
  const page = filters?.page;
  const perPage = filters?.perPage;

  useEffect(() => {
    if (!user) return;
    let active = true;

    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    params.set('page', String(page || 1));
    params.set('per_page', String(perPage || 20));

    api
      .request<PassageListResponse>(`/api/passages?${params.toString()}`)
      .then((data) => {
        if (!active) return;
        setPassages(data.passages || []);
        setTotal(data.total || 0);
      })
      .catch((err) => console.error('Failed to fetch passages:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, type, status, search, page, perPage, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const createPassage = async (data: Record<string, unknown>) => {
    const res = await api.request('/api/passages', { method: 'POST', body: JSON.stringify(data) });
    refetch();
    return res;
  };

  const updatePassage = async (id: string, data: Record<string, unknown>) => {
    const res = await api.request(`/api/passages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    refetch();
    return res;
  };

  const deletePassage = async (id: string) => {
    await api.request(`/api/passages/${id}`, { method: 'DELETE' });
    refetch();
  };

  return { passages, total, isLoading, refetch, createPassage, updatePassage, deletePassage };
}

// ─── Passage Detail Hook ─────────────────────────────────────

export function usePassageDetail(passageId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<PassageWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    if (!user || !passageId) return;
    let active = true;

    api
      .request<PassageWithQuestions>(`/api/passages/${passageId}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => console.error('Failed to fetch passage detail:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, passageId, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  return { data, isLoading, refetch };
}

// ─── Stats Hook ──────────────────────────────────────────────

export function useQuestionStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    api
      .request<QuestionStats>('/api/questions/stats')
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => console.error('Failed to fetch stats:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  return { stats, isLoading, refetch };
}
