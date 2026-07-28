'use client';

import { useEffect, useRef, useState } from 'react';

export interface Countdown {
  /** Sisa milidetik menuju target (0 bila sudah lewat). */
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** true saat target sudah tercapai/lewat. */
  done: boolean;
}

function compute(targetMs: number): Countdown {
  const total = Math.max(0, targetMs - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds, done: total <= 0 };
}

/**
 * Hitung mundur live menuju `targetIso`. Berdetak tiap detik.
 * `onDone` dipanggil sekali saat mencapai nol (mis. untuk refetch daftar ujian).
 * Mengembalikan `null` bila tak ada target.
 */
export function useCountdown(targetIso: string | null, onDone?: () => void): Countdown | null {
  const targetMs = targetIso ? new Date(targetIso).getTime() : null;
  // `tick` hanya memicu render ulang tiap detik; nilai countdown diturunkan saat render.
  const [, setTick] = useState(0);

  // Simpan callback terbaru tanpa memicu ulang efek detak.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (targetMs == null) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const cd = targetMs != null ? compute(targetMs) : null;

  // Picu onDone sekali saat mencapai nol (efek → aman dari render).
  useEffect(() => {
    if (targetMs != null && Date.now() >= targetMs && !firedRef.current) {
      firedRef.current = true;
      onDoneRef.current?.();
    }
  });

  return cd;
}
