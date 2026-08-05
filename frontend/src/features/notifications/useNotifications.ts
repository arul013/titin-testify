'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────

export type NotificationType =
  | 'exam_assigned' | 'exam_opening' | 'exam_closing' | 'result_ready';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string | null;
}

interface ListResponse {
  notifications: AppNotification[];
  unread_count: number;
}

const POLL_MS = 45_000;

// ─── Badge count only (dipakai di Sidebar; polling ringan) ───

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => {
      api
        .get<{ unread_count: number }>('/api/notifications/unread-count')
        .then((d) => { if (active) setCount(d.unread_count || 0); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [user]);

  return count;
}

// ─── Daftar penuh + aksi (dipakai di halaman Notifikasi) ─────

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get<ListResponse>('/api/notifications?limit=50')
      .then((d) => {
        if (!active) return;
        setNotifications(d.notifications || []);
        setUnreadCount(d.unread_count || 0);
      })
      .catch((err) => console.error('Failed to fetch notifications:', err))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const markRead = async (id: string) => {
    await api.post(`/api/notifications/${id}/read`, {});
    setNotifications((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.post('/api/notifications/read-all', {});
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, isLoading, refetch, markRead, markAllRead };
}
