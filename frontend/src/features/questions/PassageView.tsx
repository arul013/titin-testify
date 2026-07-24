'use client';

import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

/**
 * PassageView — perender kanonik teks bacaan (Reading) untuk preview & lembar
 * ujian peserta (Pendekatan B):
 *   - Paragraf (dipisah baris kosong), **rata kiri-kanan (justify)** + **indent**
 *     baris pertama tiap paragraf (via CSS; baris terakhir paragraf tidak ikut
 *     ter-justify — default browser).
 *   - **Nomor baris otomatis** dihitung dari pembungkusan teks pada **lebar tetap**
 *     (diukur dari DOM), ditaruh tiap 5 baris di gutter kiri.
 *   - Penanda inline: `**tebal**`, `*miring*`, `__garis bawah__`.
 *
 * Lebar dikunci (default 600px) supaya nomor baris konsisten antara sisi admin
 * (preview) dan peserta.
 */

const TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
const BOLD = /^\*\*([^*]+)\*\*$/;
const UND = /^__([^_]+)__$/;
const ITAL = /^\*([^*]+)\*$/;

const UNDERLINE_CLS = 'underline decoration-2 decoration-indigo-600/70 font-semibold text-slate-800';

function styleFor(part: string): { text: string; cls: string } {
  let m = part.match(BOLD);
  if (m) return { text: m[1], cls: 'font-bold text-indigo-600' };
  m = part.match(UND);
  if (m) return { text: m[1], cls: UNDERLINE_CLS };
  m = part.match(ITAL);
  if (m) return { text: m[1], cls: 'italic' };
  return { text: part, cls: '' };
}

/** Render isi satu paragraf: tiap kata jadi <span data-w> (agar bisa diukur). */
function renderParagraph(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let key = 0;
  for (const part of text.split(TOKEN)) {
    if (!part) continue;
    const { text: t, cls } = styleFor(part);
    for (const piece of t.split(/(\s+)/)) {
      if (piece === '') continue;
      if (/^\s+$/.test(piece)) {
        nodes.push(<React.Fragment key={key++}> </React.Fragment>);
      } else {
        nodes.push(
          <span key={key++} data-w className={cls || undefined}>
            {piece}
          </span>,
        );
      }
    }
  }
  return nodes;
}

interface PassageViewProps {
  content: string;
  lineNumbers?: boolean;
  /** Lebar tetap area teks (px). Dikunci agar nomor baris konsisten. */
  width?: number;
}

export const PassageView: React.FC<PassageViewProps> = ({
  content,
  lineNumbers = true,
  width = 780,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<{ line: number; top: number }[]>([]);

  const paragraphs = (content || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);

  const measure = useCallback(() => {
    const el = contentRef.current;
    if (!el || !lineNumbers) {
      setMarks([]);
      return;
    }
    const words = el.querySelectorAll<HTMLElement>('[data-w]');
    const result: { line: number; top: number }[] = [];
    let lineCount = 0;
    let lastTop = -Infinity;
    words.forEach((w) => {
      const t = w.offsetTop;
      if (t - lastTop > 3) {
        lineCount += 1;
        lastTop = t;
        if (lineCount % 5 === 0) result.push({ line: lineCount, top: t });
      }
    });
    setMarks(result);
  }, [lineNumbers]);

  useLayoutEffect(() => {
    measure();
  }, [content, width, measure]);

  useEffect(() => {
    let active = true;
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => {
      if (active) measure();
    });
    const ro = new ResizeObserver(() => measure());
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      active = false;
      ro.disconnect();
    };
  }, [measure]);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3">
        {lineNumbers && (
          <div className="relative w-6 shrink-0 select-none">
            {marks.map((m) => (
              <span
                key={m.line}
                style={{ top: m.top }}
                className="absolute right-0 text-[11px] font-bold text-slate-400"
              >
                {m.line}
              </span>
            ))}
          </div>
        )}
        <div
          ref={contentRef}
          className="relative shrink-0 text-[15px] leading-8 text-slate-700 font-sans"
          style={{ width }}
        >
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={i ? 'mt-3' : ''}
              style={{ textAlign: 'justify', textIndent: '1.6em' }}
            >
              {renderParagraph(p)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
