'use client';

import { useState } from 'react';
import { BankSoalRooms } from '@/features/questions/BankSoalRooms';
import { BankSoalRoom } from '@/features/questions/BankSoalRoom';
import type { TestType } from '@/features/test-types/useTestTypes';

/**
 * Bank Soal = gerbang "ruang per jenis tes". Pilih jenis tes dulu (BankSoalRooms),
 * lalu kelola soalnya di ruang terpisah (BankSoalRoom) — soal antar-jenis tak bercampur.
 */
export function BankSoalPage() {
  const [room, setRoom] = useState<TestType | null>(null);

  if (!room) return <BankSoalRooms onSelect={setRoom} />;
  return <BankSoalRoom key={room.code} testType={room} onBack={() => setRoom(null)} />;
}
