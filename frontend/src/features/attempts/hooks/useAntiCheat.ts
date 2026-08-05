'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { attemptsApi, type AntiCheatConfig } from '@/features/attempts/api';

// M8.1: deteksi perilaku (pindah tab/blur, keluar fullscreen, copy/paste diblok)
// + peringatan + auto-submit setelah N peringatan. Pelaporan best-effort (batch).
// Server otoritatif; hook ini hanya mendeteksi & melapor + memicu submit klien.

interface Args {
  attemptId: string | null;
  config?: AntiCheatConfig;
  active: boolean;            // hanya jalan saat ujian berlangsung
  onAutoSubmit: () => void;   // doSubmit runner
}

const MICRO_BLUR_MS = 400;   // abaikan blur super singkat (fokus dialog dsb.)

export function useAntiCheat({ attemptId, config, active, onAutoSubmit }: Args) {
  const trackFocus = !!config?.track_focus;
  const requireFullscreen = !!config?.require_fullscreen;
  const blockCopyPaste = !!config?.block_copy_paste;
  const focusAction = config?.on_focus_loss ?? 'warn';
  const focusStrikes = config?.focus_strikes ?? 1;
  const enabled = active && !!attemptId && (trackFocus || requireFullscreen || blockCopyPaste);

  const [warning, setWarning] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  );

  const strikes = useRef(0);
  const awayAt = useRef<number | null>(null);
  const queue = useRef<{ type: string; detail?: Record<string, unknown> }[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCopyAt = useRef(0);
  const submitRef = useRef(onAutoSubmit);
  useEffect(() => { submitRef.current = onAutoSubmit; }, [onAutoSubmit]);

  const flush = useCallback(() => {
    if (!attemptId || queue.current.length === 0) return;
    const batch = queue.current.splice(0, queue.current.length);
    attemptsApi
      .reportEvents(attemptId, batch)
      .then((res) => { if (res.auto_submit) submitRef.current(); })
      .catch(() => { /* best-effort */ });
  }, [attemptId]);

  const report = useCallback((type: string, detail?: Record<string, unknown>) => {
    queue.current.push({ type, detail });
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 700);
  }, [flush]);

  // Satu "strike" (fokus hilang / keluar fullscreen) → peringatan atau auto-submit.
  const registerStrike = useCallback((warnMsg: string) => {
    strikes.current += 1;
    if (focusAction === 'submit' && strikes.current > focusStrikes) {
      setWarning('Pelanggaran berulang terdeteksi. Ujian dikumpulkan otomatis.');
      flush();
      submitRef.current();
    } else {
      setWarning(warnMsg);
    }
  }, [focusAction, focusStrikes, flush]);

  // ── Fokus / pindah tab ──
  useEffect(() => {
    if (!enabled || !trackFocus) return;
    const away = () => { if (awayAt.current == null) awayAt.current = Date.now(); };
    const back = () => {
      if (awayAt.current == null) return;
      const ms = Date.now() - awayAt.current;
      awayAt.current = null;
      if (ms < MICRO_BLUR_MS) return;
      report('focus_lost', { away_ms: ms });
      registerStrike(
        focusAction === 'submit'
          ? 'Kamu terdeteksi meninggalkan layar ujian. Pelanggaran berikutnya akan mengumpulkan ujian otomatis.'
          : 'Kamu terdeteksi meninggalkan layar ujian. Aktivitas ini dicatat.',
      );
    };
    const vis = () => { if (document.hidden) away(); else back(); };
    window.addEventListener('blur', away);
    window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('blur', away);
      window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [enabled, trackFocus, focusAction, report, registerStrike]);

  // ── Blokir copy / cut / paste / klik-kanan (seleksi teks tetap boleh) ──
  useEffect(() => {
    if (!enabled || !blockCopyPaste) return;
    const mk = (type: string) => (e: Event) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastCopyAt.current > 1000) { lastCopyAt.current = now; report(type); }
    };
    const onCopy = mk('copy_blocked');
    const onCut = mk('copy_blocked');
    const onPaste = mk('paste_blocked');
    const onCtx = mk('contextmenu_blocked');
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onCtx);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onCtx);
    };
  }, [enabled, blockCopyPaste, report]);

  // ── Fullscreen: pantau keluar (masuk lewat tombol/gesture di banner) ──
  useEffect(() => {
    if (!enabled || !requireFullscreen) return;
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        report('fullscreen_exit');
        registerStrike('Kamu keluar dari mode layar penuh. Kembali ke layar penuh untuk melanjutkan.');
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [enabled, requireFullscreen, report, registerStrike]);

  // Flush sisa antrean saat unmount.
  useEffect(() => () => { if (flushTimer.current) clearTimeout(flushTimer.current); }, []);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const needFullscreen = enabled && requireFullscreen && !isFullscreen;

  return {
    warning,
    dismissWarning: useCallback(() => setWarning(null), []),
    needFullscreen,
    enterFullscreen,
  };
}
