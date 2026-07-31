'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface RubricCriterion {
  name: string;
  max_score: number;
  descriptors?: string | null;
}

export interface Rubric {
  id: string;
  created_by: string | null;
  test_type: string | null;
  name: string;
  description: string | null;
  criteria: RubricCriterion[];
  max_total: number;
  is_builtin: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface RubricPayload {
  name: string;
  description?: string | null;
  test_type?: string | null;
  criteria: RubricCriterion[];
  status?: string;
}

export function useRubrics() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .request<{ rubrics: Rubric[] }>('/api/rubrics')
      .then((data) => {
        if (active) {
          setRubrics(data.rubrics || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat rubrik');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const createRubric = async (payload: RubricPayload) => {
    const res = await api.post<Rubric>('/api/rubrics', payload);
    refetch();
    return res;
  };

  const updateRubric = async (id: string, payload: Partial<RubricPayload>) => {
    const res = await api.put<Rubric>(`/api/rubrics/${id}`, payload);
    refetch();
    return res;
  };

  const deleteRubric = async (id: string) => {
    await api.delete(`/api/rubrics/${id}`);
    refetch();
  };

  return { rubrics, isLoading, error, refetch, createRubric, updateRubric, deleteRubric };
}
