'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  can_delete: boolean;
  created_at: string | null;
}

interface ListResponse {
  comments: FeedbackComment[];
  total: number;
}

/**
 * Komentar per item (Fase 3). Memuat saat `itemId` di-set (modal detail dibuka);
 * pembersihan saat item berganti pakai pola reset-saat-render (bukan efek) agar
 * bebas lint cascading-render.
 */
export function useFeedbackComments(itemId: string | null) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedId, setTrackedId] = useState<string | null>(null);

  if (itemId !== trackedId) {
    setTrackedId(itemId);
    setComments([]);
    setIsLoading(!!itemId);
  }

  useEffect(() => {
    if (!itemId) return;
    let active = true;
    api
      .get<ListResponse>(`/api/feedback/${itemId}/comments`)
      .then((d) => { if (active) setComments(d.comments || []); })
      .catch((err) => console.error('Failed to fetch comments:', err))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [itemId]);

  const addComment = useCallback(async (body: string) => {
    if (!itemId) return;
    const created = await api.post<FeedbackComment>(`/api/feedback/${itemId}/comments`, { body });
    setComments((prev) => [...prev, created]);
    return created;
  }, [itemId]);

  const deleteComment = useCallback(async (commentId: string) => {
    await api.delete(`/api/feedback/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return { comments, isLoading, addComment, deleteComment };
}
