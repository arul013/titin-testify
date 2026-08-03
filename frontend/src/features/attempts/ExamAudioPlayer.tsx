'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Headphones } from 'lucide-react';

function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Pemutar audio soal — kontrol kustom (bukan native): play/pause + progress + waktu. */
export const ExamAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current;
    if (!a || !dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * dur;
    setCur(a.currentTime);
  };

  const pct = dur > 0 ? (cur / dur) * 100 : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
        <Headphones className="w-4 h-4" />
        Audio Soal
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Jeda audio' : 'Putar audio'}
          className="shrink-0 grid h-11 w-11 place-items-center rounded-full bg-brand text-white shadow-sm shadow-brand/25 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-3">
          <div
            onClick={seek}
            className="group relative h-2 flex-1 cursor-pointer rounded-full bg-slate-200"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand"
              style={{ width: `${pct}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-brand bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
              style={{ left: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
            {fmt(cur)} <span className="text-slate-300">/</span> {fmt(dur)}
          </span>
        </div>
      </div>

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCur(ref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDur(ref.current?.duration ?? 0)}
      />
    </div>
  );
};
