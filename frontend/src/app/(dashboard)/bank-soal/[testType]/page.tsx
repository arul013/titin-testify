'use client';

import { useParams } from 'next/navigation';
import { BankSoalRoomPage } from '@/features/questions/BankSoalRoomPage';

export default function Page() {
  const params = useParams<{ testType: string }>();
  if (!params?.testType) return null;
  return <BankSoalRoomPage code={params.testType} />;
}
