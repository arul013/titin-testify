import React from 'react';

/**
 * Perender teks ujian bersama (rich text bertanda).
 *
 * Penanda inline yang didukung:
 *   - `**tebal**`      → bold
 *   - `*miring*`       → italic
 *   - `__garis__`      → underline (juga dipakai materi Written Expression)
 *   - `[kata]{A}`      → underline BERLABEL A/B/C/D (khusus Written Expression)
 *
 * `renderExamText` → render inline (stem, opsi, materi non-reading).
 * Materi Reading dirender oleh `PassageView` (auto-wrap + nomor baris terukur).
 */

// Urutan alternasi penting: labeled → bold (**) → underline (__) → italic (*).
const TOKEN = /(\[[^\]]+\]\{[A-Da-d]\}|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
const LABELED = /^\[([^\]]+)\]\{([A-Da-d])\}$/;
const BOLD = /^\*\*([^*]+)\*\*$/;
const UNDERLINE_RE = /^__([^_]+)__$/;
const ITALIC = /^\*([^*]+)\*$/;

const UNDERLINE = 'underline decoration-2 decoration-indigo-600/70 font-semibold text-slate-800';

/** Render satu potongan teks inline menjadi node dengan format. */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;

    const labeled = part.match(LABELED);
    if (labeled) {
      return (
        <span key={i} className="inline-flex flex-col items-center mx-1 align-top">
          <span className={UNDERLINE}>{labeled[1]}</span>
          <span className="text-[10px] font-extrabold text-indigo-600 select-none leading-none mt-1">
            {labeled[2].toUpperCase()}
          </span>
        </span>
      );
    }

    const bold = part.match(BOLD);
    if (bold) {
      return (
        <strong key={i} className="font-bold text-indigo-600">
          {bold[1]}
        </strong>
      );
    }

    const underline = part.match(UNDERLINE_RE);
    if (underline) {
      return (
        <span key={i} className={UNDERLINE}>
          {underline[1]}
        </span>
      );
    }

    const italic = part.match(ITALIC);
    if (italic) {
      return (
        <em key={i} className="italic">
          {italic[1]}
        </em>
      );
    }

    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function renderExamText(text: string): React.ReactNode {
  if (!text) return '';
  return renderInline(text);
}
