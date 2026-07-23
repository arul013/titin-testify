import React from 'react';

/**
 * Perender teks ujian bersama untuk format Written Expression.
 *
 * Mendukung dua penanda:
 *   - `[kata]{A}` → garis bawah BERLABEL (huruf A/B/C/D di bawah kata) — untuk soal WE.
 *   - `__kata__`  → garis bawah POLOS — untuk menandai bagian pada teks materi.
 *
 * Dipakai oleh editor (live preview) dan QuestionPreview agar tampilan konsisten.
 */

const TOKEN = /(\[[^\]]+\]\{[A-Da-d]\}|__[^_]+__)/g;
const LABELED = /^\[([^\]]+)\]\{([A-Da-d])\}$/;
const PLAIN = /^__([^_]+)__$/;

const UNDERLINE = 'underline decoration-2 decoration-indigo-600/70 font-semibold text-slate-800';

export function renderExamText(text: string): React.ReactNode {
  if (!text) return '';

  return text.split(TOKEN).map((part, i) => {
    const labeled = part.match(LABELED);
    if (labeled) {
      const word = labeled[1];
      const letter = labeled[2].toUpperCase();
      return (
        <span key={i} className="inline-flex flex-col items-center mx-1 align-top">
          <span className={UNDERLINE}>{word}</span>
          <span className="text-[10px] font-extrabold text-indigo-600 select-none leading-none mt-1">
            {letter}
          </span>
        </span>
      );
    }

    const plain = part.match(PLAIN);
    if (plain) {
      return (
        <span key={i} className={UNDERLINE}>
          {plain[1]}
        </span>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
