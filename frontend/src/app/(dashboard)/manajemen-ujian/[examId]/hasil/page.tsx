'use client';

import { useParams } from 'next/navigation';
import { ExamResultsPage } from '@/features/results/ExamResultsPage';

export default function Page() {
  const params = useParams<{ examId: string }>();
  if (!params?.examId) return null;
  return <ExamResultsPage examId={params.examId} />;
}
