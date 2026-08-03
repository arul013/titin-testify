'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { renderExamText } from '@/features/questions/examText';
import type { QuestionPayload } from './api';

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

const TFNG = ['True', 'False', 'Not Given'];

export interface BookletOption {
  key: string;
  label: string;
  text: string | null;
}

/** Daftar opsi (key + label + teks) untuk satu soal single-choice — dipakai
 *  booklet (display) & lembar jawaban (jumlah bubble). */
export function optionsFor(q: QuestionPayload): BookletOption[] {
  if (q.question_type === 'true_false_ng') {
    return TFNG.map((t, i) => ({ key: KEYS[i], label: LETTERS[i], text: t }));
  }
  return [
    { key: 'a', label: 'A', text: q.option_a ?? null },
    { key: 'b', label: 'B', text: q.option_b ?? null },
    { key: 'c', label: 'C', text: q.option_c ?? null },
    { key: 'd', label: 'D', text: q.option_d ?? null },
  ];
}

/** Opsi jawaban di panel kiri (BUKU SOAL) — hanya untuk DIBACA. Peserta menandai
 *  jawabannya di lembar jawaban (bubble) sebelah kanan (ala OMR). */
export const BookletOptions: React.FC<{ q: QuestionPayload }> = ({ q }) => {
  const opts = optionsFor(q);
  // Written Expression / opsi-gambar: jawaban = huruf A–D (teks opsi tak terpisah).
  const letterMode = q.section === 'written_expression' || !!q.options_image_url;

  return (
    <div className="flex flex-col gap-3">
      {q.options_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={q.options_image_url}
          alt="Pilihan jawaban"
          className="max-w-full rounded-2xl border border-slate-200 shadow-sm"
        />
      )}

      {letterMode ? (
        <div className="flex flex-wrap gap-2.5">
          {['a', 'b', 'c', 'd'].map((_, i) => (
            <div
              key={i}
              className="h-11 w-11 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center font-extrabold text-slate-500"
            >
              {LETTERS[i]}
            </div>
          ))}
        </div>
      ) : (
        <ol className="flex flex-col gap-2 list-none m-0 p-0">
          {opts.map((o) => (
            <li
              key={o.key}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[15px] text-slate-600"
            >
              <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-xs font-extrabold text-slate-500">
                {o.label}
              </span>
              <span className="flex-1 leading-normal">
                {o.text ? renderExamText(o.text) : <span className="text-slate-300 italic">—</span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-2.5 text-[12.5px] font-semibold text-brand w-fit">
        <ArrowRight className="w-4 h-4 shrink-0" />
        Tandai jawabanmu pada lembar jawaban di kanan
      </div>
    </div>
  );
};
