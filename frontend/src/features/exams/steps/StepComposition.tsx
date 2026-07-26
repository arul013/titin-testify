'use client';

import React from 'react';
import { Info, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExamMode } from '../hooks/useExams';

interface SkillItem {
  code: string;
  name: string;
  full_test_count: number;
  scorable?: boolean;
}

interface StepCompositionProps {
  skills: SkillItem[];
  mode: ExamMode;
  counts: Record<string, number>;
  onToggle: (section: string, enabled: boolean) => void;
  onCountChange: (section: string, count: number) => void;
}

export const StepComposition: React.FC<StepCompositionProps> = ({
  skills,
  mode,
  counts,
  onToggle,
  onCountChange,
}) => {
  const isFull = mode === 'full';

  const total = isFull
    ? skills.reduce((sum, s) => sum + (s.full_test_count || 0), 0)
    : skills.reduce((sum, s) => sum + (counts[s.code] ?? 0), 0);

  if (skills.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        Jenis tes ini belum punya skill. Tambahkan skill di menu <strong>Jenis Ujian</strong> dulu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        {isFull ? (
          <>
            Komposisi <strong>full test</strong> ini <strong>terkunci</strong> mengikuti preset jenis tes.
            Jumlah soal per bagian tidak dapat diubah.
          </>
        ) : (
          <>
            Komposisi sudah terisi mengikuti standar jenis tes — <strong>silakan ubah bila perlu</strong>.
            Boleh hanya satu bagian (mis. &ldquo;10 soal Structure saja&rdquo;), atau matikan bagian
            yang tak dipakai.
          </>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {skills.map((s) => {
          const enabled = isFull || counts[s.code] !== undefined;
          const count = isFull ? s.full_test_count : (counts[s.code] ?? 1);
          return (
            <div
              key={s.code}
              className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'
              }`}
            >
              {isFull ? (
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  {s.name}
                  {s.scorable === false && (
                    <span className="text-[10px] font-bold text-amber-500 uppercase">rubrik</span>
                  )}
                </span>
              ) : (
                <Checkbox
                  checked={enabled}
                  onChange={(v) => onToggle(s.code, v)}
                  label={s.name}
                />
              )}

              {enabled && (
                <div className="flex items-center gap-2 shrink-0">
                  {isFull ? (
                    <span className="w-24 text-center font-extrabold text-indigo-700 tabular-nums">
                      {count}
                    </span>
                  ) : (
                    <Input
                      inputMode="numeric"
                      value={String(count)}
                      onChange={(e) => {
                        const d = e.target.value.replace(/[^0-9]/g, '');
                        onCountChange(s.code, d === '' ? 1 : Math.max(1, Number(d)));
                      }}
                      className="w-24 text-center"
                    />
                  )}
                  <span className="text-xs font-medium text-slate-500">soal</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
        <span className="text-sm font-bold text-slate-600">Total target</span>
        <span className="text-lg font-extrabold text-indigo-700">{total} soal</span>
      </div>

      <div className="flex gap-2 p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed">
        <Info className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          {isFull
            ? 'Tes standar butuh jumlah soal TEPAT sesuai preset. Pastikan stok soal di Bank Soal cukup untuk tiap bagian saat menayangkan.'
            : 'Karena satu materi (audio/bacaan) bisa berisi beberapa soal yang tak dipisah, total soal aktual saat ujian bisa sedikit berbeda dari target. Ketersediaan stok akan divalidasi saat menayangkan.'}
        </span>
      </div>
    </div>
  );
};
