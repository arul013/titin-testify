'use client';

import { useParams } from 'next/navigation';
import { MasukanDetailPage } from '@/features/feedback/MasukanDetailPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  if (!params?.id) return null;
  return <MasukanDetailPage id={params.id} />;
}
