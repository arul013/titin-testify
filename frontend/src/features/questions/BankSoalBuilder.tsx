'use client';

import React, { useState } from 'react';
import { ChevronLeft, SquarePen, Columns2, Eye } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';

export type BuilderViewMode = 'edit' | 'split' | 'preview';

interface BankSoalBuilderProps {
  title: string;
  onCancel: () => void;
  /** Panel editor (kiri). */
  editor: React.ReactNode;
  /** Panel preview (kanan) — fungsi agar bisa menyesuaikan layout dgn mode. */
  preview: (mode: BuilderViewMode) => React.ReactNode;
  defaultView?: BuilderViewMode;
}

const VIEW_TABS = [
  { id: 'edit', label: 'Editor', icon: <SquarePen /> },
  { id: 'split', label: 'Split', icon: <Columns2 /> },
  { id: 'preview', label: 'Pratinjau', icon: <Eye /> },
];

// Tinggi tetap: panel scroll internal, halaman tidak ikut scroll.
// (memperhitungkan: top-nav + PageHeader + breadcrumb + baris judul/tabs + padding)
const PANEL =
  'bg-white border border-slate-100 rounded-2xl p-6 overflow-auto h-[calc(100vh-14rem)] shadow-sm shadow-slate-100/60';

export const BankSoalBuilder: React.FC<BankSoalBuilderProps> = ({
  title,
  onCancel,
  editor,
  preview,
  defaultView = 'split',
}) => {
  const [view, setView] = useState<BuilderViewMode>(defaultView);

  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb / back — berdiri sendiri */}
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali ke Bank Soal
      </button>

      {/* Baris judul + toggle tampilan */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
        <Tabs tabs={VIEW_TABS} value={view} onChange={(id) => setView(id as BuilderViewMode)} />
      </div>

      {/* Body */}
      {view === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={PANEL}>{editor}</div>
          <div className={PANEL}>{preview('split')}</div>
        </div>
      ) : view === 'edit' ? (
        <div className={PANEL}>{editor}</div>
      ) : (
        <div className={PANEL}>{preview('preview')}</div>
      )}
    </div>
  );
};
