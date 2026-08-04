'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────

export interface GroupMember {
  user_id: string;
  username: string | null;
  full_name: string | null;
}

export interface ParticipantGroup {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  member_count: number;
  creator_name: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ParticipantGroupDetail extends ParticipantGroup {
  members: GroupMember[];
}

interface GroupListResponse {
  groups: ParticipantGroup[];
  total: number;
}

// ─── Hook ────────────────────────────────────────────────────

export function useParticipantGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .request<GroupListResponse>('/api/participant-groups')
      .then((data) => { if (active) setGroups(data.groups || []); })
      .catch((err) => console.error('Failed to fetch groups:', err))
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const getGroup = (id: string) => api.request<ParticipantGroupDetail>(`/api/participant-groups/${id}`);

  const createGroup = async (data: { name: string; description?: string; member_ids?: string[] }) => {
    const res = await api.request<ParticipantGroupDetail>('/api/participant-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    refetch();
    return res;
  };

  const updateGroup = async (
    id: string,
    data: { name?: string; description?: string; member_ids?: string[] },
  ) => {
    const res = await api.request<ParticipantGroupDetail>(`/api/participant-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    refetch();
    return res;
  };

  const deleteGroup = async (id: string) => {
    await api.request(`/api/participant-groups/${id}`, { method: 'DELETE' });
    refetch();
  };

  return { groups, isLoading, refetch, getGroup, createGroup, updateGroup, deleteGroup };
}
