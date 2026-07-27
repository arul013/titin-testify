'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTestTypes } from '@/features/test-types/useTestTypes';
import { BankSoalRoom } from './BankSoalRoom';

/**
 * Loader untuk route /bank-soal/[testType]: validasi kode jenis tes (harus aktif),
 * redirect ke gerbang bila tak valid, lalu render ruang Bank Soal.
 */
export function BankSoalRoomPage({ code }: { code: string }) {
  const router = useRouter();
  const { testTypes, isLoading } = useTestTypes();

  const testType = testTypes.find((t) => t.code === code) ?? null;
  const invalid = !isLoading && (!testType || testType.status !== 'active');

  useEffect(() => {
    if (invalid) router.replace('/bank-soal');
  }, [invalid, router]);

  if (isLoading || !testType || testType.status !== 'active') return null;

  return <BankSoalRoom key={testType.code} testType={testType} onBack={() => router.push('/bank-soal')} />;
}
