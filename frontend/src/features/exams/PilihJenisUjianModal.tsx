'use client';

import { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, Sparkles, Lock, ClipboardCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestTypes, type TestType } from '@/features/test-types/useTestTypes';
import type { ExamMode } from '@/features/exams/hooks/useExams';

interface PilihJenisUjianModalProps {
  open: boolean;
  onClose: () => void;
  onChoose: (testType: TestType, mode: ExamMode) => void;
}

/** Modal 2-tingkat: pilih jenis tes (full) atau Custom → pilih tes basis. */
export function PilihJenisUjianModal({ open, onClose, onChoose }: PilihJenisUjianModalProps) {
  const { testTypes, isLoading } = useTestTypes();
  const [level, setLevel] = useState<'type' | 'custom'>('type');

  const sorted = [...testTypes].sort((a, b) => a.sort_order - b.sort_order);
  const customBases = sorted.filter((t) => t.status === 'active' && t.allow_custom);

  const close = () => {
    setLevel('type');
    onClose();
  };

  const TypeCard = ({
    t,
    disabled,
    onClick,
    hint,
  }: {
    t: TestType;
    disabled?: boolean;
    onClick?: () => void;
    hint?: string;
  }) => {
    const full = t.skills.reduce((n, s) => n + (s.full_test_count || 0), 0);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`group text-left rounded-2xl border-2 p-5 transition-all ${
          disabled
            ? 'border-slate-100 bg-slate-50/50 opacity-70 cursor-not-allowed'
            : 'border-slate-200 bg-white hover:border-brand hover:shadow-md hover:shadow-brand/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-extrabold text-slate-800 text-base">{t.name}</span>
          {t.status === 'soon' ? (
            <Badge variant="warning" className="text-[10px] font-bold">
              Soon
            </Badge>
          ) : disabled ? (
            <Lock className="w-4 h-4 text-slate-300" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors" />
          )}
        </div>
        {t.description && <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>}
        {hint ? (
          <p className="text-[11px] text-slate-400 mt-2">{hint}</p>
        ) : (
          full > 0 && (
            <p className="text-[11px] text-slate-400 mt-2">
              Full test: <strong className="text-slate-600">{full}</strong> soal
            </p>
          )
        )}
      </button>
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={level === 'type' ? 'Pilih Jenis Ujian' : 'Custom Berbasis Tes Apa?'}
      icon={<ClipboardCheck className="w-5 h-5 text-brand" />}
      size="2xl"
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : level === 'type' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Pilih tes standar untuk <strong>full test</strong> (komposisi terkunci), atau{' '}
            <strong>Custom</strong> untuk menyusun sendiri.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sorted.map((t) => (
              <TypeCard
                key={t.id}
                t={t}
                disabled={t.status !== 'active'}
                onClick={t.status === 'active' ? () => onChoose(t, 'full') : undefined}
              />
            ))}
            {/* Kartu Custom */}
            <button
              type="button"
              onClick={() => setLevel('custom')}
              className="group text-left rounded-2xl border-2 border-dashed border-brand/40 bg-brand/5 p-5 transition-all hover:border-brand hover:bg-brand/10"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-extrabold text-brand text-base flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Custom
                </span>
                <ChevronRight className="w-4 h-4 text-brand/50 group-hover:text-brand transition-colors" />
              </div>
              <p className="text-xs text-slate-500">
                Susun komposisi bebas berbasis salah satu jenis tes (skor persentase).
              </p>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setLevel('type')}
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-brand transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali pilih jenis
          </button>
          {customBases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
              <Layers className="w-8 h-8" />
              <p className="text-sm">Belum ada jenis tes yang mengizinkan mode Custom.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customBases.map((t) => (
                <TypeCard
                  key={t.id}
                  t={t}
                  hint={`${t.skills.length} skill · komposisi bebas`}
                  onClick={() => onChoose(t, 'custom')}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
