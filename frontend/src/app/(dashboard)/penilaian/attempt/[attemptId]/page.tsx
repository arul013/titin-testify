'use client';

import { useParams } from 'next/navigation';
import { GradingDetailPage } from '@/features/grading/GradingDetailPage';

export default function Page() {
  const params = useParams<{ attemptId: string }>();
  if (!params?.attemptId) return null;
  return <GradingDetailPage attemptId={params.attemptId} />;
}
