'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { CATEGORY_META, PRIORITY_META, STATUS_META } from './taxonomy';
import type { FeedbackItem } from './useFeedback';

function relTime(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Ubah teks bertanda → plain untuk cuplikan kartu. */
function toPlain(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')       // gambar
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Props {
  item: FeedbackItem;
  onOpen: (item: FeedbackItem) => void;
  onToggleVote: (id: string, voted: boolean) => Promise<unknown>;
}

export const FeedbackCard: React.FC<Props> = ({ item, onOpen, onToggleVote }) => {
  const cat = CATEGORY_META[item.category];
  const prio = PRIORITY_META[item.priority];
  const st = STATUS_META[item.status];
  const snippet = toPlain(item.description);
  const [voting, setVoting] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation(); // jangan buka detail saat menekan tombol dukung
    setVoting(true);
    try {
      await onToggleVote(item.id, item.has_voted);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memperbarui suara.'));
    } finally {
      setVoting(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); }
      }}
      className="group w-full cursor-pointer text-left bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Badge variant={cat.variant}>{cat.emoji} {cat.label}</Badge>
            <Badge variant={prio.variant}>{prio.label}</Badge>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-brand transition-colors">
            {item.title}
          </h3>
          {snippet && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{snippet}</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <User className="w-3 h-3" /> {item.creator_name || 'Admin'}
            </span>
            <span>{relTime(item.created_at)}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {item.comment_count}
            </span>
            <button
              type="button"
              onClick={handleVote}
              disabled={voting}
              aria-pressed={item.has_voted}
              title={item.has_voted ? 'Batalkan dukungan' : 'Dukung'}
              className={
                'ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ' +
                (item.has_voted
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-brand/40 hover:text-brand')
              }
            >
              <ThumbsUp className={`w-3 h-3 ${item.has_voted ? 'fill-white/30' : ''}`} /> {item.vote_count}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
