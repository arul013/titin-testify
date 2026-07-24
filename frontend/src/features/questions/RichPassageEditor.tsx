'use client';

import React, { useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Textarea } from '@/components/ui/input';

interface RichPassageEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  /** Textarea mengisi tinggi container (flex-1) — untuk tab Editor halaman-penuh. */
  fill?: boolean;
}

/**
 * Editor teks bacaan (Reading): toolbar Bold/Italic/Underline (blok kata → klik).
 * Pratinjau (dengan nomor baris) ditampilkan di panel preview builder via
 * `PassageView`, jadi editor ini murni area menulis.
 */
export const RichPassageEditor: React.FC<RichPassageEditorProps> = ({
  value,
  onChange,
  rows = 12,
  placeholder,
  fill = false,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return; // perlu ada teks yang diblok
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + marker.length + selected.length + marker.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const tools = [
    { icon: <Bold className="w-3.5 h-3.5" />, label: 'Tebal', marker: '**' },
    { icon: <Italic className="w-3.5 h-3.5" />, label: 'Miring', marker: '*' },
    { icon: <Underline className="w-3.5 h-3.5" />, label: 'Garis bawah', marker: '__' },
  ];

  return (
    <div className={`flex flex-col gap-2 ${fill ? 'h-full min-h-0' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
        <span className="text-[11px] font-bold text-slate-500 pl-1">Blok kata lalu klik:</span>
        {tools.map((t) => (
          <button
            key={t.marker}
            type="button"
            onClick={() => wrap(t.marker)}
            title={t.label}
            className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors inline-flex items-center gap-1.5"
          >
            {t.icon} {t.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400 pr-1">
          Pisahkan paragraf dengan satu baris kosong
        </span>
      </div>

      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        containerClassName={
          fill
            ? 'flex-1 min-h-0 flex flex-col [&>.group]:flex-1 [&>.group]:min-h-0 [&>.group]:flex [&>.group]:flex-col'
            : undefined
        }
        className={`font-mono text-[13px] leading-relaxed ${fill ? 'h-full min-h-0 resize-none' : ''}`}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />
    </div>
  );
};
