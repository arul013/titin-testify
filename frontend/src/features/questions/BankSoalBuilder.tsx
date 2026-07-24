'use client';

import React, { useState, useSyncExternalStore } from 'react';
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

const TAB_EDIT = { id: 'edit', label: 'Editor', icon: <SquarePen /> };
const TAB_SPLIT = { id: 'split', label: 'Split', icon: <Columns2 /> };
const TAB_PREVIEW = { id: 'preview', label: 'Pratinjau', icon: <Eye /> };

// Tinggi tetap: panel scroll internal, halaman tidak ikut scroll.
const PANEL =
  'bg-white border border-slate-100 rounded-2xl p-6 overflow-auto h-[calc(100vh-12rem)] shadow-sm shadow-slate-100/60';

// Layar ≥ lg (1024px)? Split hanya masuk akal bila layar cukup lebar.
function useIsWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(min-width: 1024px)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia('(min-width: 1024px)').matches,
    () => true, // SSR: anggap lebar
  );
}

export const BankSoalBuilder: React.FC<BankSoalBuilderProps> = ({
  title,
  onCancel,
  editor,
  preview,
  defaultView = 'split',
}) => {
  const [view, setView] = useState<BuilderViewMode>(defaultView);
  const isWide = useIsWide();

  // Di layar sempit: Split disembunyikan; bila sedang di Split → jatuh ke Editor.
  const tabs = isWide ? [TAB_EDIT, TAB_SPLIT, TAB_PREVIEW] : [TAB_EDIT, TAB_PREVIEW];
  const effectiveView: BuilderViewMode = !isWide && view === 'split' ? 'edit' : view;

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
        <Tabs tabs={tabs} value={effectiveView} onChange={(id) => setView(id as BuilderViewMode)} />
      </div>

      {/* Body */}
      {effectiveView === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={PANEL}>{editor}</div>
          <div className={PANEL}>{preview('split')}</div>
        </div>
      ) : effectiveView === 'edit' ? (
        <div className={PANEL}>{editor}</div>
      ) : (
        <div className={PANEL}>{preview('preview')}</div>
      )}
    </div>
  );
};
