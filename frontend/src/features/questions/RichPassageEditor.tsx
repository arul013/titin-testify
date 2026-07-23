'use client';

import React, { useRef } from 'react';
import { Bold, Italic, Underline } from 'lucide-react';
import { Textarea } from '@/components/ui/input';
import { renderPassageLines } from './examText';

interface RichPassageEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

/**
 * Editor teks bacaan (Reading): toolbar Bold/Italic/Underline (blok kata → klik)
 * + live preview dengan NOMOR BARIS. Baris ditentukan oleh line-break (Enter)
 * yang kamu ketik — persis seperti sumber; nomor tampil tiap 5 baris.
 */
export const RichPassageEditor: React.FC<RichPassageEditorProps> = ({
  value,
  onChange,
  rows = 12,
  placeholder,
  required,
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
    <div className="flex flex-col gap-2">
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
          Tekan Enter untuk pindah baris (menentukan nomor baris)
        </span>
      </div>

      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        placeholder={placeholder}
        required={required}
        className="font-mono text-[13px] leading-relaxed"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      />

      {/* Live preview dengan nomor baris */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Pratinjau (nomor baris otomatis tiap 5 baris)
        </p>
        <div className="min-h-16 max-h-72 overflow-y-auto text-sm text-slate-700 bg-white border border-slate-100 rounded-xl p-3">
          {value ? (
            renderPassageLines(value)
          ) : (
            <span className="text-slate-300 italic">Hasil tampilan akan muncul di sini…</span>
          )}
        </div>
      </div>
    </div>
  );
};
