'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_SECTIONS, SECTION_LABELS, type ExamSectionId } from '../hooks/useExams';

interface StepCompositionProps {
  counts: Partial<Record<ExamSectionId, number>>;
  onToggle: (section: ExamSectionId, enabled: boolean) => void;
  onCountChange: (section: ExamSectionId, count: number) => void;
}

export const StepComposition: React.FC<StepCompositionProps> = ({
  counts,
  onToggle,
  onCountChange,
}) => {
  const total = ALL_SECTIONS.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Pilih bagian yang diujikan dan target jumlah soal per bagian. Boleh hanya satu bagian
        (mis. &ldquo;10 soal Structure saja&rdquo;).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ALL_SECTIONS.map((section) => {
          const enabled = counts[section] !== undefined;
          return (
            <div
              key={section}
              className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'
              }`}
            >
              <Checkbox
                checked={enabled}
                onChange={(v) => onToggle(section, v)}
                label={SECTION_LABELS[section]}
              />
              {enabled && (
                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    inputMode="numeric"
                    value={String(counts[section] ?? 1)}
                    onChange={(e) => {
                      const d = e.target.value.replace(/[^0-9]/g, '');
                      onCountChange(section, d === '' ? 1 : Math.max(1, Number(d)));
                    }}
                    className="w-24 text-center"
                  />
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
          Karena satu materi (audio/bacaan) bisa berisi beberapa soal yang tak dipisah, total soal
          aktual saat ujian bisa sedikit berbeda dari target. Ketersediaan stok soal akan divalidasi
          saat menayangkan ujian.
        </span>
      </div>
    </div>
  );
};
