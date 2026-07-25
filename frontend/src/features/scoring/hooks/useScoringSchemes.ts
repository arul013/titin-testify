'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ScoringScheme {
  id: string;
  created_by: string | null;
  name: string;
  family: string; // 'standard' | 'custom'
  test_type: string;
  config: Record<string, unknown>;
  is_builtin: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SectionScoreInput {
  section: string;
  total: number;
  correct: number;
}

export interface ComputeResult {
  total_questions: number;
  total_correct: number;
  score: number;
  scale_unit: string; // 'percent' | 'toefl_itp' | 'ielts_band'
  passed: boolean | null;
  per_section: { section: string; total: number; correct: number; percent: number }[];
  detail?: string | null;
}

const CUSTOM_PERCENT_CONFIG = {
  type: 'percentage',
  weighting: 'equal',
  passing_unit: 'percent',
  scale: { min: 0, max: 100 },
};

export function useScoringSchemes() {
  const [schemes, setSchemes] = useState<ScoringScheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .request<{ schemes: ScoringScheme[] }>('/api/scoring-schemes')
      .then((data) => {
        if (active) setSchemes(data.schemes || []);
      })
      .catch((err) => console.error('Error fetching scoring schemes:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  /** Buat skema custom persentase (bagian setara). */
  const createScheme = async (name: string) => {
    await api.request<ScoringScheme>('/api/scoring-schemes', {
      method: 'POST',
      body: JSON.stringify({
        name,
        family: 'custom',
        test_type: 'custom',
        config: CUSTOM_PERCENT_CONFIG,
      }),
    });
    refetch();
  };

  const renameScheme = async (id: string, name: string) => {
    await api.request<ScoringScheme>(`/api/scoring-schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
    refetch();
  };

  const deleteScheme = async (id: string) => {
    await api.request(`/api/scoring-schemes/${id}`, { method: 'DELETE' });
    refetch();
  };

  const computeScore = async (
    schemeId: string,
    sections: SectionScoreInput[],
    passingValue: number | null,
  ): Promise<ComputeResult> => {
    return api.request<ComputeResult>('/api/scoring-schemes/compute', {
      method: 'POST',
      body: JSON.stringify({
        scheme_id: schemeId,
        sections,
        passing_value: passingValue,
      }),
    });
  };

  return { schemes, isLoading, refetch, createScheme, renameScheme, deleteScheme, computeScore };
}
