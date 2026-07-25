'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Layers } from 'lucide-react';
import { QuestionCard } from './QuestionCard';
import { BankSoalTableSkeleton } from './BankSoalTableSkeleton';
import type { Question, Passage } from './hooks/useQuestions';

interface MateriQuestionsEditorProps {
  passage: Passage;
  questions: Question[];
  isLoading: boolean;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onPreview: (q: Question) => void;
}

/**
 * Editor inline multi-soal untuk satu materi (Paket B). Soal ditampilkan sebagai
 * kartu bernomor berurutan (`sort_order`) supaya urutan sinkron dengan audio/passage.
 */
export const MateriQuestionsEditor: React.FC<MateriQuestionsEditorProps> = ({
  passage,
  questions,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  onPreview,
}) => {
  // Draft kartu baru (belum tersimpan) — sekadar penanda; state tiap kartu di dalam kartu.
  const [drafts, setDrafts] = useState<string[]>([]);

  const sorted = [...questions].sort(
    (a, b) => a.sort_order - b.sort_order || (a.created_at < b.created_at ? -1 : 1),
  );

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= sorted.length) return;
    const ids = sorted.map((q) => q.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    onReorder(ids);
  };

  const addDraft = () => setDrafts((d) => [...d, `d${Date.now()}`]);
  const removeDraft = (key: string) => setDrafts((d) => d.filter((k) => k !== key));

  const total = sorted.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Daftar Soal dalam Materi Ini ({total})
        </h3>
        <p className="text-[11px] text-slate-400">Urutan kartu = urutan soal di audio/passage.</p>
      </div>

      {isLoading ? (
        <BankSoalTableSkeleton rows={3} />
      ) : (
        <>
          {total === 0 && drafts.length === 0 && (
            <div className="text-slate-400 text-xs italic flex items-center justify-center h-24 border border-dashed border-slate-200 rounded-2xl bg-slate-50/40">
              Belum ada soal. Klik &ldquo;Tambah Soal&rdquo; untuk mulai — soal akan berurutan sesuai audio.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {sorted.map((q, i) => (
              <QuestionCard
                key={q.id}
                cardKey={`q-${q.id}`}
                number={i + 1}
                question={q}
                passageId={passage.id}
                section={passage.type}
                isFirst={i === 0}
                isLast={i === total - 1}
                onSave={(payload) => onUpdate(q.id, payload)}
                onDelete={() => onDelete(q.id)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
                onPreview={onPreview}
              />
            ))}

            {drafts.map((key, di) => (
              <QuestionCard
                key={key}
                cardKey={key}
                number={total + di + 1}
                question={null}
                passageId={passage.id}
                section={passage.type}
                isFirst={false}
                isLast
                onSave={async (payload) => {
                  await onCreate(payload);
                  removeDraft(key);
                }}
                onDelete={async () => removeDraft(key)}
                onRemoveDraft={() => removeDraft(key)}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                onPreview={onPreview}
              />
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={addDraft} className="self-start" leftIcon={<Plus className="w-4 h-4" />}>
            Tambah Soal
          </Button>
        </>
      )}
    </div>
  );
};
