'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { FeedbackItem, FeedbackInput } from './useFeedback';
import type { Status } from './taxonomy';

interface VoteResponse {
  voted: boolean;
  vote_count: number;
}

/** Muat & kelola SATU item (halaman detail `/masukan/[id]`). */
export function useFeedbackDetail(id: string) {
  const { user } = useAuth();
  const [item, setItem] = useState<FeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get<FeedbackItem>(`/api/feedback/${id}`)
      .then((d) => { if (active) setItem(d); })
      .catch(() => { if (active) setNotFound(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user, id]);

  const save = useCallback(async (input: FeedbackInput) => {
    const updated = await api.patch<FeedbackItem>(`/api/feedback/${id}`, input);
    setItem(updated);
    return updated;
  }, [id]);

  const changeStatus = useCallback(async (status: Status) => {
    const updated = await api.patch<FeedbackItem>(`/api/feedback/${id}/status`, { status });
    setItem(updated);
    return updated;
  }, [id]);

  const remove = useCallback(async () => {
    await api.delete(`/api/feedback/${id}`);
  }, [id]);

  const toggleVote = useCallback(async (voted: boolean) => {
    const res = voted
      ? await api.delete<VoteResponse>(`/api/feedback/${id}/vote`)
      : await api.post<VoteResponse>(`/api/feedback/${id}/vote`, {});
    setItem((prev) => (prev ? { ...prev, has_voted: res.voted, vote_count: res.vote_count } : prev));
  }, [id]);

  const bumpCommentCount = useCallback((delta: number) => {
    setItem((prev) => (prev ? { ...prev, comment_count: Math.max(0, prev.comment_count + delta) } : prev));
  }, []);

  return { item, isLoading, notFound, save, changeStatus, remove, toggleVote, bumpCommentCount };
}
