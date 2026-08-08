'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';

// ─── Konstanta idle-timeout (klien) ──────────────────────────
const IDLE_LIMIT = 30 * 60 * 1000; // 30 menit tanpa aktivitas → logout
const WARN_BEFORE = 60 * 1000;     // munculkan modal saat sisa ≤ 60 dtk
const HEARTBEAT_THROTTLE = 60 * 1000;
const ACTIVITY_THROTTLE = 20 * 1000;
const CHECK_INTERVAL = 5000;
// `cbt_exam_active` disimpan sebagai TIMESTAMP yang di-refresh berkala oleh
// ExamRunner (~tiap 30 dtk). Dianggap "ujian aktif" hanya bila masih segar →
// bila tab ujian mati tanpa cleanup, flag jadi basi & tak menyandera sesi.
const EXAM_FLAG_TTL = 90 * 1000;

const LS_LAST = 'cbt_last_activity';
const LS_EXAM = 'cbt_exam_active';

const nowMs = () => Date.now();

function readLast(): number {
  const v = Number(localStorage.getItem(LS_LAST));
  return Number.isFinite(v) && v > 0 ? v : nowMs();
}
function writeLast(t: number) {
  localStorage.setItem(LS_LAST, String(t));
}
function examActive(): boolean {
  const v = Number(localStorage.getItem(LS_EXAM));
  return Number.isFinite(v) && v > 0 && nowMs() - v < EXAM_FLAG_TTL;
}

/**
 * Idle-timeout berbasis WALL-CLOCK (tahan sleep/tab-close): bandingkan
 * `now - lastActivity`. Aktivitas → update timestamp + heartbeat (throttle).
 * Saat sisa ≤ 60 dtk → `warningSeconds` diisi (modal). Habis → `onLogout`.
 * Saat ujian aktif (`cbt_exam_active`) → sesi dijaga (tak pernah warn/logout).
 *
 * `enabled` = ada user login. Semua setState terjadi di callback event/interval
 * (bukan di badan efek) → bebas lint react-compiler.
 */
export function useIdleTimeout(enabled: boolean, onLogout: () => void) {
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);

  const lastHeartbeat = useRef(0);
  const lastActivityWrite = useRef(0);
  const loggingOut = useRef(false);
  const onLogoutRef = useRef(onLogout);

  // Jaga referensi logout terbaru tanpa memicu ulang efek utama.
  useEffect(() => { onLogoutRef.current = onLogout; }, [onLogout]);

  const sendHeartbeat = useCallback(() => {
    const t = nowMs();
    if (t - lastHeartbeat.current < HEARTBEAT_THROTTLE) return;
    lastHeartbeat.current = t;
    api.post('/api/auth/heartbeat', {}).catch(() => {});
  }, []);

  const markActivity = useCallback(() => {
    const t = nowMs();
    if (t - lastActivityWrite.current < ACTIVITY_THROTTLE) return;
    lastActivityWrite.current = t;
    writeLast(t);
    sendHeartbeat();
  }, [sendHeartbeat]);

  const staySignedIn = useCallback(() => {
    const t = nowMs();
    writeLast(t);
    lastActivityWrite.current = t;
    lastHeartbeat.current = 0; // paksa heartbeat sekali
    sendHeartbeat();
    setWarningSeconds(null);
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!enabled) return;

    // Seed HANYA bila belum ada catatan. Sesi yang dipulihkan dari localStorage
    // tetap memakai timestamp lamanya → idle lintas-reload tetap terdeteksi.
    // (Login yang me-reset timestamp = now, lihat useAuth.login.)
    if (!localStorage.getItem(LS_LAST)) writeLast(nowMs());
    lastActivityWrite.current = nowMs();

    const onActivity = () => markActivity();

    const evaluate = () => {
      if (loggingOut.current) return;

      // Mode ujian: jaga sesi hidup, jangan pernah peringatkan/keluarkan.
      if (examActive()) {
        const t = nowMs();
        writeLast(t);
        sendHeartbeat();
        setWarningSeconds((prev) => (prev === null ? prev : null));
        return;
      }

      const remaining = IDLE_LIMIT - (nowMs() - readLast());
      if (remaining <= 0) {
        loggingOut.current = true;
        setWarningSeconds(null);
        onLogoutRef.current();
        return;
      }
      if (remaining <= WARN_BEFORE) {
        setWarningSeconds(Math.max(1, Math.ceil(remaining / 1000)));
      } else {
        setWarningSeconds((prev) => (prev === null ? prev : null));
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') evaluate();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_LAST) evaluate();
    };

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', evaluate);
    window.addEventListener('online', evaluate);
    window.addEventListener('storage', onStorage);
    const intervalId = window.setInterval(evaluate, CHECK_INTERVAL);
    // Evaluasi awal di luar badan efek (mis. reload setelah lama idle) — defer agar
    // tak memanggil setState sinkron dalam efek.
    const kickId = window.setTimeout(evaluate, 0);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', evaluate);
      window.removeEventListener('online', evaluate);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(intervalId);
      window.clearTimeout(kickId);
    };
  }, [enabled, markActivity, sendHeartbeat]);

  return { warningSeconds, staySignedIn };
}
