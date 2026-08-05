'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attemptsApi } from '@/features/attempts/api';

// M7.2: sinkronisasi jawaban tahan-gangguan. Semua autosave lewat sini:
// antrean per-soal (coalesce nilai terbaru) + retry backoff + flush saat `online`
// + cadangan localStorage (selamat dari reload/terputus). Indikator status
// dipakai runner untuk menampilkan "Tersimpan / Menyimpan / Gagal / Luring".

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface PendingItem {
  selected: string | null;
  answerJson?: Record<string, unknown> | null;
}

const LS = (attemptId: string) => `ln_pending_saves_${attemptId}`;
const MAX_BACKOFF = 30_000;

export function useAnswerSync(attemptId: string | null) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const pending = useRef<Map<string, PendingItem>>(new Map());
  const flushing = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoff = useRef(2000);
  // Ref ke flush terbaru → pemanggilan diri (retry/tail) tanpa siklus useCallback.
  const flushRef = useRef<() => void>(() => {});

  const persist = useCallback(() => {
    if (!attemptId) return;
    try {
      const obj: Record<string, PendingItem> = {};
      pending.current.forEach((v, k) => { obj[k] = v; });
      if (Object.keys(obj).length) localStorage.setItem(LS(attemptId), JSON.stringify(obj));
      else localStorage.removeItem(LS(attemptId));
    } catch {
      /* kuota/private mode — abaikan */
    }
  }, [attemptId]);

  const flush = useCallback(async () => {
    if (!attemptId || flushing.current) return;
    setPendingCount(pending.current.size);
    if (pending.current.size === 0) { setStatus('saved'); return; }
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setStatus('offline'); return; }

    flushing.current = true;
    setStatus('saving');
    try {
      for (const eqId of Array.from(pending.current.keys())) {
        const item = pending.current.get(eqId);
        if (!item) continue;
        await attemptsApi.saveAnswer(attemptId, eqId, item.selected, item.answerJson);
        // Hapus hanya bila nilai tak berubah selama in-flight (coalescing via ref-equality).
        if (pending.current.get(eqId) === item) {
          pending.current.delete(eqId);
          setPendingCount(pending.current.size);
          persist();
        }
      }
      backoff.current = 2000;
      setStatus(pending.current.size === 0 ? 'saved' : 'saving');
    } catch {
      setStatus('error');
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => { flushing.current = false; flushRef.current(); }, backoff.current);
      backoff.current = Math.min(backoff.current * 2, MAX_BACKOFF);
      flushing.current = false;
      return;
    }
    flushing.current = false;
    if (pending.current.size > 0) flushRef.current(); // item baru masuk selama flush
  }, [attemptId, persist]);

  // Selalu arahkan flushRef ke flush terbaru (untuk pemanggilan diri).
  useEffect(() => { flushRef.current = () => void flush(); }, [flush]);

  /** Antre & kirim satu jawaban (nilai terbaru menang). */
  const save = useCallback(
    (eqId: string, selected: string | null, answerJson?: Record<string, unknown> | null) => {
      pending.current.set(eqId, { selected, answerJson: answerJson ?? null });
      setPendingCount(pending.current.size);
      persist();
      void flush();
    },
    [flush, persist],
  );

  const retryNow = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    backoff.current = 2000;
    flushing.current = false;
    void flush();
  }, [flush]);

  /** Bersihkan antrean (mis. setelah submit) agar tak retry ke attempt yang sudah selesai. */
  const clear = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    pending.current.clear();
    setPendingCount(0);
    setStatus('saved');
    if (attemptId) {
      try { localStorage.removeItem(LS(attemptId)); } catch { /* abaikan */ }
    }
  }, [attemptId]);

  // Deteksi online/offline.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => { setOnline(true); backoff.current = 2000; flushing.current = false; void flush(); };
    const onOffline = () => { setOnline(false); setStatus('offline'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flush]);

  // Pulihkan antrean tertunda dari localStorage saat attempt siap (selamat dari reload).
  useEffect(() => {
    if (!attemptId) return;
    try {
      const raw = localStorage.getItem(LS(attemptId));
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, PendingItem>;
        Object.entries(obj).forEach(([k, v]) => pending.current.set(k, v));
        if (pending.current.size > 0) void flush();
      }
    } catch {
      /* abaikan */
    }
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, [attemptId, flush]);

  return { save, clear, retryNow, status, pendingCount, online };
}
