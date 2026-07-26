'use client';

import { useParams } from 'next/navigation';
import { ExamRunner } from '@/features/attempts/ExamRunner';

export default function KerjakanUjianPage() {
  const params = useParams<{ examId: string }>();
  const examId = params?.examId;

  if (!examId) return null;
  return <ExamRunner examId={examId} />;
}
