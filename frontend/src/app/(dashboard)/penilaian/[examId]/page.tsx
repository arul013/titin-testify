'use client';

import { useParams } from 'next/navigation';
import { GradingAttemptsPage } from '@/features/grading/GradingAttemptsPage';

export default function Page() {
  const params = useParams<{ examId: string }>();
  if (!params?.examId) return null;
  return <GradingAttemptsPage examId={params.examId} />;
}
