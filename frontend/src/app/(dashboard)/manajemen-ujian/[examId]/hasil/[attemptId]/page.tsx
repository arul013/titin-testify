'use client';

import { useParams } from 'next/navigation';
import { AdminAttemptReviewPage } from '@/features/results/AdminAttemptReviewPage';

export default function Page() {
  const params = useParams<{ examId: string; attemptId: string }>();
  if (!params?.examId || !params?.attemptId) return null;
  return <AdminAttemptReviewPage examId={params.examId} attemptId={params.attemptId} />;
}
