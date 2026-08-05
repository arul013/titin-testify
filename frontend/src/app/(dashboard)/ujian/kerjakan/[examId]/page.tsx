'use client';

import { useParams } from 'next/navigation';
import { PreExamGate } from '@/features/attempts/PreExamGate';

export default function KerjakanUjianPage() {
  const params = useParams<{ examId: string }>();
  const examId = params?.examId;

  if (!examId) return null;
  return <PreExamGate examId={examId} />;
}
