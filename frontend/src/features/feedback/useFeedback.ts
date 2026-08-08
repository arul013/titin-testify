'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Category, Priority, Status } from './taxonomy';

// ─── Types ───────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  created_by: string;
  creator_name: string | null;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  comment_count: number;
  vote_count: number;
  can_manage: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface ListResponse {
  items: FeedbackItem[];
  total: number;
}

export interface FeedbackFilters {
  status: string;
  category: string;
  priority: string;
  search: string;
  sort: string;
}

export interface FeedbackInput {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
}

function buildQuery(f: FeedbackFilters): string {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.category) p.set('category', f.category);
  if (f.priority) p.set('priority', f.priority);
  if (f.search) p.set('q', f.search);
  if (f.sort) p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useFeedback(filters: FeedbackFilters) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const { status, category, priority, search, sort } = filters;

  useEffect(() => {
    if (!user) return;
    let active = true;
    const query = buildQuery({ status, category, priority, search, sort });
    api
      .get<ListResponse>(`/api/feedback${query}`)
      .then((d) => {
        if (!active) return;
        setItems(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((err) => console.error('Failed to fetch feedback:', err))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user, status, category, priority, search, sort, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const createItem = useCallback(async (input: FeedbackInput) => {
    const created = await api.post<FeedbackItem>('/api/feedback', input);
    setRefetchIndex((i) => i + 1);
    return created;
  }, []);

  const updateItem = useCallback(async (id: string, input: FeedbackInput) => {
    const updated = await api.patch<FeedbackItem>(`/api/feedback/${id}`, input);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }, []);

  const updateStatus = useCallback(async (id: string, next: Status) => {
    const updated = await api.patch<FeedbackItem>(`/api/feedback/${id}/status`, { status: next });
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    return updated;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await api.delete(`/api/feedback/${id}`);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const bumpCommentCount = useCallback((id: string, delta: number) => {
    setItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, comment_count: Math.max(0, it.comment_count + delta) } : it,
    ));
  }, []);

  return {
    items, total, isLoading, refetch,
    createItem, updateItem, updateStatus, deleteItem, bumpCommentCount,
  };
}
