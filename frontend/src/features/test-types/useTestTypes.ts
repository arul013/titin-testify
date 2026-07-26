'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export type TestTypeStatus = 'active' | 'soon' | 'disabled';

export interface TestTypeSkill {
  id?: string;
  code: string;
  name: string;
  scorable: boolean;
  full_test_count: number;
  sort_order: number;
}

export interface TestType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: TestTypeStatus;
  allow_custom: boolean;
  sort_order: number;
  is_builtin: boolean;
  skills: TestTypeSkill[];
  created_at?: string;
  updated_at?: string;
}

export interface TestTypePayload {
  code?: string;
  name: string;
  description?: string | null;
  status: TestTypeStatus;
  allow_custom: boolean;
  sort_order: number;
  skills: TestTypeSkill[];
}

export function useTestTypes() {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .request<{ test_types: TestType[] }>('/api/test-types')
      .then((data) => {
        if (active) {
          setTestTypes(data.test_types || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat jenis tes');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  const createTestType = async (payload: TestTypePayload) => {
    const res = await api.request<TestType>('/api/test-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    refetch();
    return res;
  };

  const updateTestType = async (id: string, payload: Partial<TestTypePayload>) => {
    const res = await api.request<TestType>(`/api/test-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    refetch();
    return res;
  };

  const deleteTestType = async (id: string) => {
    await api.request(`/api/test-types/${id}`, { method: 'DELETE' });
    refetch();
  };

  return { testTypes, isLoading, error, refetch, createTestType, updateTestType, deleteTestType };
}
