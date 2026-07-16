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

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.section) params.set('section', filters.section);
      if (filters?.difficulty) params.set('difficulty', filters.difficulty);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      params.set('page', String(filters?.page || 1));
      params.set('per_page', String(filters?.perPage || 20));

      const data = (await api.request(`/api/questions?${params.toString()}`)) as any;
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters?.section, filters?.difficulty, filters?.status, filters?.search, filters?.page, filters?.perPage]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const createQuestion = async (data: Record<string, unknown>) => {
    const res = await api.request('/api/questions', { method: 'POST', body: JSON.stringify(data) });
    await fetchQuestions();
    return res;
  };

  const updateQuestion = async (id: string, data: Record<string, unknown>) => {
    const res = await api.request(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchQuestions();
    return res;
  };

  const deleteQuestion = async (id: string) => {
    await api.request(`/api/questions/${id}`, { method: 'DELETE' });
    await fetchQuestions();
  };

  return { questions, total, isLoading, fetchQuestions, createQuestion, updateQuestion, deleteQuestion };
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

  const fetchPassages = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      params.set('page', String(filters?.page || 1));
      params.set('per_page', String(filters?.perPage || 20));

      const data = (await api.request(`/api/passages?${params.toString()}`)) as any;
      setPassages(data.passages || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch passages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters?.type, filters?.status, filters?.search, filters?.page, filters?.perPage]);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages]);

  const createPassage = async (data: Record<string, unknown>) => {
    const res = await api.request('/api/passages', { method: 'POST', body: JSON.stringify(data) });
    await fetchPassages();
    return res;
  };

  const updatePassage = async (id: string, data: Record<string, unknown>) => {
    const res = await api.request(`/api/passages/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchPassages();
    return res;
  };

  const deletePassage = async (id: string) => {
    await api.request(`/api/passages/${id}`, { method: 'DELETE' });
    await fetchPassages();
  };

  return { passages, total, isLoading, fetchPassages, createPassage, updatePassage, deletePassage };
}

// ─── Passage Detail Hook ─────────────────────────────────────

export function usePassageDetail(passageId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<PassageWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!user || !passageId) return;
    setIsLoading(true);
    try {
      const res = (await api.request(`/api/passages/${passageId}`)) as any;
      setData(res);
    } catch (err) {
      console.error('Failed to fetch passage detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, passageId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, isLoading, refetch: fetchDetail };
}

// ─── Stats Hook ──────────────────────────────────────────────

export function useQuestionStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = (await api.request('/api/questions/stats')) as any;
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}
