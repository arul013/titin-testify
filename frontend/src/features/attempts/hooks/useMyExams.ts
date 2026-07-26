'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { attemptsApi, type MyExamItem } from '../api';

/** Daftar ujian yang ditugaskan ke peserta + status percobaan. */
export function useMyExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<MyExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    attemptsApi
      .listMyExams()
      .then((data) => {
        if (!active) return;
        setExams(data.exams || []);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Gagal memuat ujian');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, refetchIndex]);

  const refetch = useCallback(() => setRefetchIndex((i) => i + 1), []);

  return { exams, isLoading, error, refetch };
}
