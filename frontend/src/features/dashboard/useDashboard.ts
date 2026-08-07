'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface DashboardSummary {
  role: string;
  exams: { total: number; published: number; draft: number; closed: number; archived: number };
  questions: { total: number; published: number };
  passages_total: number;
  participants_total: number;
  groups_total: number;
  pending_grading: number;
  flagged_attempts: number;
  active_exams: {
    exam_id: string;
    title: string;
    participants: number;
    submitted: number;
    avg_score: number | null;
  }[];
  users?: { total: number; admins: number; participants: number; active: number; inactive: number } | null;
  audit_recent?: { actor_name: string | null; action: string; summary: string | null; created_at: string | null }[];
}

export function useDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .request<DashboardSummary>('/api/dashboard/summary')
      .then((res) => { if (active) setData(res); })
      .catch((err) => console.error('Failed to fetch dashboard:', err))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user]);

  return { data, isLoading };
}
