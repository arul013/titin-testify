'use client';

import React, { useRef } from 'react';
import { Underline as UnderlineIcon, Bold, Italic, Eraser } from 'lucide-react';
import { Textarea } from '@/components/ui/input';
import { renderExamText } from './examText';

interface UnderlineEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** "labeled" → tombol A/B/C/D menghasilkan `[kata]{A}` (soal Written Expression).
   *  "plain"   → tombol tunggal menghasilkan `__kata__` (garis bawah polos).
   *  "rich"    → tombol Tebal/Miring/Garis bawah (`**`/`*`/`__`) untuk stem Reading. */
  variant?: 'labeled' | 'plain' | 'rich';
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

/**
 * Editor teks dengan tombol "garis bawahi kata terpilih" — pengganti pengetikan
 * markup manual. Pengguna memblok kata di textarea lalu menekan tombol; markup
 * disisipkan otomatis dan live preview menampilkan hasil akhirnya.
 */
export const UnderlineEditor: React.FC<UnderlineEditorProps> = ({
  value,
  onChange,
  variant = 'labeled',
  rows = 4,
  placeholder,
  required,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return; // perlu ada teks yang diblok
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // Kembalikan fokus & posisi kursor setelah state ter-update.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + before.length + selected.length + after.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const richBtn = 'h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors inline-flex items-center gap-1.5';

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
        <span className="text-[11px] font-bold text-slate-500 pl-1">Blok kata lalu klik:</span>
        {variant === 'labeled' ? (
          ['A', 'B', 'C', 'D'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => wrap('[', `]{${l}}`)}
              className="h-7 min-w-9 px-2 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            >
              Tandai {l}
            </button>
          ))
        ) : variant === 'rich' ? (
          <>
            <button type="button" title="Tebal" onClick={() => wrap('**', '**')} className={richBtn}>
              <Bold className="w-3.5 h-3.5" /> Tebal
            </button>
            <button type="button" title="Miring" onClick={() => wrap('*', '*')} className={richBtn}>
              <Italic className="w-3.5 h-3.5" /> Miring
            </button>
            <button type="button" title="Garis bawah" onClick={() => wrap('__', '__')} className={richBtn}>
              <UnderlineIcon className="w-3.5 h-3.5" /> Garis bawah
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => wrap('__', '__')}
            className="h-7 px-3 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors inline-flex items-center gap-1.5"
          >
            <UnderlineIcon className="w-3.5 h-3.5" /> Garis bawahi
          </button>
        )}
        <span className="ml-auto text-[10px] text-slate-400 inline-flex items-center gap-1 pr-1">
          <Eraser className="w-3 h-3" /> Hapus penanda dengan mengedit teks
        </span>
      </div>

      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />

      {/* Live preview */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pratinjau</p>
        <div className="min-h-11 text-sm text-slate-700 leading-loose bg-white border border-slate-100 rounded-xl p-3">
          {value ? (
            renderExamText(value)
          ) : (
            <span className="text-slate-300 italic">Hasil tampilan akan muncul di sini…</span>
          )}
        </div>
      </div>
    </div>
  );
};
