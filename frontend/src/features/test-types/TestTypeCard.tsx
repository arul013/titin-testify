'use client';

import { Pencil, Trash2, Lock, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TestType, TestTypeStatus } from './useTestTypes';

const STATUS_META: Record<TestTypeStatus, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  active: { label: 'Aktif', variant: 'success' },
  soon: { label: 'Soon', variant: 'warning' },
  disabled: { label: 'Nonaktif', variant: 'neutral' },
};

interface TestTypeCardProps {
  testType: TestType;
  onEdit: (t: TestType) => void;
  onDelete: (t: TestType) => void;
}

/** Kartu ringkas satu jenis tes (nama, status, skill, aksi). */
export function TestTypeCard({ testType: t, onEdit, onDelete }: TestTypeCardProps) {
  const meta = STATUS_META[t.status];
  const full = t.skills.reduce((n, s) => n + (s.full_test_count || 0), 0);

  return (
    <Card className="p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-800 text-lg leading-snug">{t.name}</h3>
            <Badge variant="info" className="text-[10px] font-bold uppercase">
              {t.code}
            </Badge>
          </div>
          {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
        </div>
        <Badge variant={meta.variant} className="text-[10px] font-bold shrink-0">
          {meta.label}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {t.skills.length === 0 ? (
          <span className="text-xs text-slate-400 italic">Belum ada skill</span>
        ) : (
          t.skills.map((s) => (
            <span
              key={s.code}
              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg"
            >
              {s.name}
              <span className="text-brand font-bold">{s.full_test_count}</span>
              {!s.scorable && <span className="text-amber-500">·rubrik</span>}
            </span>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1.5">
          <ListChecks className="w-4 h-4" /> {t.skills.length} skill
        </span>
        <span>·</span>
        <span>
          Full test: <strong className="text-slate-600">{full}</strong> soal
        </span>
        {t.allow_custom && (
          <>
            <span>·</span>
            <span>Custom ✓</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button
          variant="secondary"
          onClick={() => onEdit(t)}
          leftIcon={<Pencil className="w-4 h-4" />}
          className="flex-1 font-bold"
        >
          Ubah
        </Button>
        {t.is_builtin ? (
          <span
            title="Jenis bawaan tidak bisa dihapus"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
          >
            <Lock className="w-4 h-4" /> Bawaan
          </span>
        ) : (
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
