'use client';

import { useParams } from 'next/navigation';
import { SkemaDetail } from '@/features/scoring/SkemaDetail';

export default function Page() {
  const params = useParams<{ testType: string }>();
  if (!params?.testType) return null;
  return <SkemaDetail code={params.testType} />;
}
