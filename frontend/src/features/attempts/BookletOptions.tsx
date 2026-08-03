'use client';

import React from 'react';
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
 *  jawabannya di lembar jawaban (bubble) sebelah kanan (ala OMR).
 *
 *  Written Expression: pilihan A–D ada di dalam kalimat soal (bagian bergaris),
 *  jadi tak perlu daftar opsi terpisah → tak dirender. */
export const BookletOptions: React.FC<{ q: QuestionPayload }> = ({ q }) => {
  // WE tanpa gambar opsi: opsi = bagian bergaris pada soal → tak ada daftar opsi.
  if (q.section === 'written_expression' && !q.options_image_url) return null;

  // Opsi berupa gambar (satu gambar berisi A/B/C/D).
  if (q.options_image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={q.options_image_url}
        alt="Pilihan jawaban"
        className="max-w-full rounded-2xl border border-slate-200 shadow-sm"
      />
    );
  }

  const opts = optionsFor(q);
  return (
    <ol className="flex flex-col gap-2.5 list-none m-0 p-0">
      {opts.map((o) => (
        <li
          key={o.key}
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[15px] text-slate-600"
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
  );
};
