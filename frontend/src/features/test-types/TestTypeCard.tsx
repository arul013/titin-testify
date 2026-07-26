'use client';

import { Pencil, Trash2, GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TestType } from './useTestTypes';

interface TestTypeCardProps {
  testType: TestType;
  onEdit: (t: TestType) => void;
  onDelete: (t: TestType) => void;
}

/** Kartu jenis tes aktif — bersih, dengan rincian bagian & aksi. */
export function TestTypeCard({ testType: t, onEdit, onDelete }: TestTypeCardProps) {
  const total = t.skills.reduce((n, s) => n + (s.full_test_count || 0), 0);

  return (
    <Card
      variant="interactive"
      className="p-6 rounded-3xl flex flex-col gap-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start gap-3.5">
        <span className="shrink-0 w-12 h-12 rounded-2xl bg-linear-to-br from-brand-start to-brand-end text-white flex items-center justify-center shadow-sm shadow-brand/20">
          <GraduationCap className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-800 text-lg leading-snug truncate">{t.name}</h3>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.code}</span>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
        </span>
      </div>

      {t.description && (
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 -mt-2">{t.description}</p>
      )}

      {/* Rincian bagian */}
      <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bagian Tes</span>
          <span className="text-xs font-extrabold text-brand">{total} soal</span>
        </div>
        {t.skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada bagian. Klik Ubah untuk menambah.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {t.skills.map((s) => (
              <div key={s.code} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{s.name}</span>
                  {!s.scorable && (
                    <span className="shrink-0 text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                      rubrik
                    </span>
                  )}
                </span>
                <span className="font-bold text-slate-700 tabular-nums shrink-0">{s.full_test_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aksi */}
      <div className="flex items-center gap-2.5 mt-auto">
        <Button
          variant="secondary"
          onClick={() => onEdit(t)}
          leftIcon={<Pencil className="w-4 h-4" />}
          className="flex-1 font-bold"
        >
          Ubah
        </Button>
        {!t.is_builtin && (
          <Button
            variant="danger"
            onClick={() => onDelete(t)}
            leftIcon={<Trash2 className="w-4 h-4" />}
            className="font-bold"
          >
            Hapus
          </Button>
        )}
      </div>
    </Card>
  );
}
