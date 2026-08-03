'use client';

import React from 'react';
import { cn } from '@/src/lib/cn';

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export interface BubbleItem {
  exam_question_id: string;
  option_count: number; // jumlah bubble (4 MCQ, 3 True/False/NotGiven)
}

interface AnswerBubbleSheetProps {
  sectionLabel: string;
  items: BubbleItem[];            // soal bagian ini, terurut (nomor = index+1)
  answers: Record<string, string | null>;
  currentLocalIdx: number;        // indeks soal aktif dalam bagian ini
  flaggedIds: Set<string>;
  onPick: (localIdx: number, key: string) => void;
  onJump: (localIdx: number) => void;
}

const PER_COL = 20;

export const AnswerBubbleSheet: React.FC<AnswerBubbleSheetProps> = ({
  sectionLabel,
  items,
  answers,
  currentLocalIdx,
  flaggedIds,
  onPick,
  onJump,
}) => {
  const answeredCount = items.filter((it) => !!answers[it.exam_question_id]).length;

  // Pecah jadi kolom-kolom 20 (ala lembar jawaban OMR).
  const columns: BubbleItem[][] = [];
  for (let i = 0; i < items.length; i += PER_COL) {
    columns.push(items.slice(i, i + PER_COL));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">Lembar Jawaban</h2>
        <span className="text-xs font-bold tabular-nums text-slate-400">
          {answeredCount} / {items.length}
        </span>
      </div>
      <p className="mt-0.5 mb-4 text-[11.5px] text-slate-400">
        {sectionLabel} — klik bubble untuk menjawab.
      </p>

      <div className="flex justify-center gap-7">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((it) => {
              const localIdx = ci * PER_COL + col.indexOf(it);
              const number = localIdx + 1;
              const picked = answers[it.exam_question_id] ?? null;
              const isCurrent = localIdx === currentLocalIdx;
              const isFlagged = flaggedIds.has(it.exam_question_id);
              const answered = !!picked;
              const count = Math.min(Math.max(it.option_count, 2), 4);

              return (
                <div
                  key={it.exam_question_id}
                  onClick={() => onJump(localIdx)}
                  className={cn(
                    'grid items-center gap-1.5 rounded-lg px-1.5 py-0.5 cursor-pointer transition-colors',
                    isCurrent ? 'bg-brand/10 ring-[1.5px] ring-inset ring-brand/40' : 'hover:bg-slate-50',
                  )}
                  style={{ gridTemplateColumns: '26px repeat(4, 28px)' }}
                >
                  <div
                    className={cn(
                      'relative pr-1 text-right text-xs font-bold tabular-nums',
                      isCurrent ? 'text-brand' : answered ? 'text-slate-700' : 'text-slate-400',
                    )}
                  >
                    {isFlagged && (
                      <span className="absolute -left-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                    {number}
                  </div>
                  {Array.from({ length: count }).map((_, k) => {
                    const filled = picked === KEYS[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPick(localIdx, KEYS[k]);
                        }}
                        aria-label={`Soal ${number} pilihan ${LETTERS[k]}`}
                        className={cn(
                          'mx-auto flex h-6.5 w-6.5 items-center justify-center rounded-full border-[1.5px] text-[11px] font-bold transition-all',
                          filled
                            ? 'border-brand bg-brand text-white scale-[1.03]'
                            : 'border-slate-300 bg-white text-slate-400 hover:border-brand',
                        )}
                      >
                        {LETTERS[k]}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3.5 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full bg-brand" /> Terjawab
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-full border-[1.5px] border-slate-300" /> Belum
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-brand/10 ring-[1.5px] ring-inset ring-brand/40" /> Soal aktif
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Ditandai
        </span>
      </div>
    </div>
  );
};
