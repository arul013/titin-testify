'use client';

import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';

/**
 * PassageView — perender kanonik teks bacaan (Reading) untuk preview & lembar
 * ujian peserta (Pendekatan B):
 *   - Paragraf (dipisah baris kosong), **rata kiri-kanan (justify)** + **indent**
 *     baris pertama tiap paragraf.
 *   - **Pemenggalan baris identik di semua konteks.** Teks selalu ditata pada satu
 *     lebar logis tetap (`canonWidth`), lalu hasilnya di-*scale* mengisi lebar
 *     container. Jadi "kata per baris" terkunci sama di panel detail, preview,
 *     maupun lembar ujian — yang berubah hanya ukuran font (mengecil di panel
 *     sempit). Bonus: selalu mengisi penuh (tanpa whitespace) & tanpa scroll.
 *   - **Nomor baris otomatis** diukur dari `offsetTop` DOM (tak terpengaruh scale),
 *     ditaruh tiap 5 baris.
 *   - Penanda inline: `**tebal**`, `*miring*`, `__garis bawah__`.
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
  /**
   * Lebar logis tata-letak (px). SAMA di semua konteks ⇒ pemenggalan baris identik.
   * Hasil render lalu di-scale mengisi container (font ikut menyesuaikan).
   * Ubah nilai ini untuk menyetel berapa kata per baris.
   */
  canonWidth?: number;
}

export const PassageView: React.FC<PassageViewProps> = ({
  content,
  lineNumbers = true,
  canonWidth = 1100,
}) => {
  const sensorRef = useRef<HTMLDivElement>(null); // sensor lebar (tinggi 0, tak memicu loop)
  const innerRef = useRef<HTMLDivElement>(null); // blok berlebar kanonik (yang di-scale)
  const contentRef = useRef<HTMLDivElement>(null); // blok teks (untuk ukur nomor baris)
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [marks, setMarks] = useState<{ line: number; top: number }[]>([]);

  const paragraphs = (content || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);

  const relayout = useCallback(() => {
    const sensor = sensorRef.current;
    const inner = innerRef.current;
    if (!sensor || !inner) return;

    // 1) scale = lebar tersedia / lebar kanonik → visual selalu mengisi penuh
    const avail = sensor.clientWidth;
    const s = avail > 0 ? avail / canonWidth : 1;
    setScale(s);

    // 2) tinggi wrapper = tinggi logis × scale (transform tak menyusutkan kotak layout)
    setHeight(inner.offsetHeight * s);

    // 3) nomor baris — offsetTop bersifat pra-transform (koordinat logis), aman
    const contentEl = contentRef.current;
    if (!contentEl || !lineNumbers) {
      setMarks([]);
      return;
    }
    const words = contentEl.querySelectorAll<HTMLElement>('[data-w]');
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
  }, [canonWidth, lineNumbers]);

  useLayoutEffect(() => {
    relayout();
  }, [content, relayout]);

  useEffect(() => {
    let active = true;
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => {
      if (active) relayout();
    });
    const ro = new ResizeObserver(() => relayout());
    if (sensorRef.current) ro.observe(sensorRef.current);
    return () => {
      active = false;
      ro.disconnect();
    };
  }, [relayout]);

  return (
    <div className="w-full">
      {/* sensor lebar container */}
      <div ref={sensorRef} className="h-0" aria-hidden />
      {/* wrapper setinggi hasil scale, agar tak ada ruang kosong di bawah */}
      <div style={{ height }} className="overflow-hidden">
        <div
          ref={innerRef}
          style={{ width: canonWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <div className="flex gap-3">
            {lineNumbers && (
              <div className="relative w-6 shrink-0 select-none">
                {marks.map((m) => (
                  <span
                    key={m.line}
                    style={{ top: m.top }}
                    className="absolute right-0 text-xs font-bold text-slate-400"
                  >
                    {m.line}
                  </span>
                ))}
              </div>
            )}
            <div
              ref={contentRef}
              className="relative flex-1 min-w-0 pr-9 text-lg leading-8 tracking-wide text-slate-700 font-sans"
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
      </div>
    </div>
  );
};
