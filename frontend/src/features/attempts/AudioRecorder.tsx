'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  /** URL audio tersimpan (jawaban saat ini). */
  audioUrl?: string | null;
  /** Unggah blob rekaman → kembalikan URL publik. */
  onUpload: (blob: Blob) => Promise<string>;
  /** Dipanggil dengan URL setelah unggah sukses (disimpan sebagai jawaban). */
  onChange: (url: string) => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** F1.3: rekam jawaban speaking → unggah → simpan URL. Bisa rekam ulang sebelum submit. */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({ audioUrl, onUpload, onChange }) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setUploading(true);
        try {
          const url = await onUpload(blob);
          onChange(url);
        } catch {
          setError('Gagal mengunggah rekaman. Coba rekam ulang.');
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Mikrofon tidak dapat diakses. Izinkan akses mikrofon.');
    }
  };

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500">Rekam jawabanmu (audio):</p>

      {recording ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Merekam · {fmt(seconds)}
          </span>
          <Button variant="danger" className="font-bold" leftIcon={<Square className="h-4 w-4" />} onClick={stop}>
            Berhenti
          </Button>
        </div>
      ) : uploading ? (
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Mengunggah rekaman…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full" preload="none">
              <track kind="captions" />
            </audio>
          )}
          <Button
            variant={audioUrl ? 'secondary' : 'primary'}
            className="font-bold self-start"
            leftIcon={audioUrl ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            onClick={start}
          >
            {audioUrl ? 'Rekam Ulang' : 'Mulai Merekam'}
          </Button>
        </div>
      )}

      {error && (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      <p className="text-[11px] text-slate-400">Jawaban speaking dinilai manual oleh penilai setelah ujian.</p>
    </div>
  );
};
