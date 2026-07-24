'use client';

import React, { useState } from 'react';
import { ChevronLeft, SquarePen, Columns2, Eye } from 'lucide-react';

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

const MODES: { id: BuilderViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'edit', label: 'Editor', icon: <SquarePen className="w-3.5 h-3.5" /> },
  { id: 'split', label: 'Split', icon: <Columns2 className="w-3.5 h-3.5" /> },
  { id: 'preview', label: 'Pratinjau', icon: <Eye className="w-3.5 h-3.5" /> },
];

const PANEL = 'bg-white border border-slate-100 rounded-2xl p-6 overflow-auto max-h-[calc(100vh-15rem)] shadow-sm shadow-slate-100/60';

export const BankSoalBuilder: React.FC<BankSoalBuilderProps> = ({
  title,
  onCancel,
  editor,
  preview,
  defaultView = 'split',
}) => {
  const [view, setView] = useState<BuilderViewMode>(defaultView);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
          <h2 className="text-lg font-extrabold text-slate-800">{title}</h2>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setView(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                view === m.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
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
