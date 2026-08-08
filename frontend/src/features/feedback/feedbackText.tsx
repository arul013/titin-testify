import React from 'react';

/**
 * Perender deskripsi Masukan & Perbaikan — AMAN (React node, bukan innerHTML)
 * sehingga bebas XSS meski isi disimpan apa adanya.
 *
 * Blok:
 *   - baris kosong         → pemisah paragraf
 *   - `- teks` / `* teks`  → butir daftar (dikelompokkan jadi <ul>)
 *   - `![alt](url)`        → gambar (hanya URL http/https)
 *   - selain itu           → paragraf
 * Inline: `**tebal**`, `*miring*`, `__garis bawah__`.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
const BOLD = /^\*\*([^*]+)\*\*$/;
const UNDERLINE = /^__([^_]+)__$/;
const ITALIC = /^\*([^*]+)\*$/;
const IMAGE = /^!\[([^\]]*)\]\((\S+)\)$/;
const LIST_ITEM = /^[-*]\s+(.*)$/;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    const key = `${keyBase}-${i}`;
    let m = part.match(BOLD);
    if (m) return <strong key={key} className="font-bold text-slate-900">{m[1]}</strong>;
    m = part.match(UNDERLINE);
    if (m) return <span key={key} className="underline decoration-2 decoration-brand/60">{m[1]}</span>;
    m = part.match(ITALIC);
    if (m) return <em key={key} className="italic">{m[1]}</em>;
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function renderFeedbackText(text: string): React.ReactNode {
  if (!text || !text.trim()) {
    return <p className="text-sm italic text-slate-400">Tidak ada deskripsi.</p>;
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 text-sm text-slate-700">
        {items.map((li, i) => (
          <li key={i}>{renderInline(li, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const listItem = line.match(LIST_ITEM);
    if (listItem) {
      list.push(listItem[1]);
      return;
    }
    flushList();

    if (!line) return; // baris kosong = jeda paragraf

    const img = line.match(IMAGE);
    if (img && isSafeUrl(img[2])) {
      blocks.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`img-${idx}`}
          src={img[2]}
          alt={img[1] || 'Lampiran'}
          className="max-w-full rounded-xl border border-slate-200 shadow-sm"
        />,
      );
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-sm leading-relaxed text-slate-700">
        {renderInline(line, `p-${idx}`)}
      </p>,
    );
  });

  flushList();
  return <div className="flex flex-col gap-2.5">{blocks}</div>;
}
