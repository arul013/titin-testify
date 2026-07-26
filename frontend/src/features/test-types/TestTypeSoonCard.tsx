'use client';

import { GraduationCap, Clock } from 'lucide-react';
import type { TestType } from './useTestTypes';

/** Kartu jenis tes "Segera hadir" — kompak, muted, tanpa aksi (belum bisa dipakai). */
export function TestTypeSoonCard({ testType: t }: { testType: TestType }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex items-center gap-4">
      <span className="shrink-0 w-11 h-11 rounded-2xl bg-slate-200/70 text-slate-400 flex items-center justify-center">
        <GraduationCap className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-500 truncate">{t.name}</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.code}</span>
        </div>
        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
          {t.description || 'Jenis tes ini akan segera tersedia.'}
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full">
        <Clock className="w-3 h-3" /> Segera
      </span>
    </div>
  );
}
