'use client';

import { useEffect, useRef, useState } from 'react';
import { attemptsApi } from '@/features/attempts/api';

// M8.4: proctoring-lite — preview LIVE + ambil FOTO berkala (bukan rekam video)
// lalu unggah best-effort. Kamera diakses di runner (izin sudah diberikan di gate).

interface Args {
  attemptId: string | null;
  enabled: boolean;
  intervalSec: number;
}

export function useCameraProctor({ attemptId, enabled, intervalSec }: Args) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !attemptId) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let firstShot: ReturnType<typeof setTimeout> | null = null;

    const capture = () => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) return;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = Math.round((v.videoHeight / v.videoWidth) * 320) || 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => { if (blob && attemptId) void attemptsApi.uploadCapture(attemptId, blob); },
        'image/jpeg',
        0.6,
      );
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setError(null);
        firstShot = setTimeout(capture, 4000);              // foto awal
        interval = setInterval(capture, Math.max(15, intervalSec) * 1000);
      })
      .catch(() => { if (!stopped) setError('Kamera tidak dapat diakses.'); });

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      if (firstShot) clearTimeout(firstShot);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, attemptId, intervalSec]);

  return { videoRef, error };
}
