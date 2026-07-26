'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { QuestionFields } from './QuestionFields';
import { useQuestionForm } from './useQuestionForm';
import { ChevronDown, ChevronUp, Trash2, Eye, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import type { Question } from './hooks/useQuestions';

interface QuestionCardProps {
  /** Prefix id anchor unik & stabil per kartu. */
  cardKey: string;
  number: number;
  question: Question | null; // null = draft baru (belum tersimpan)
  passageId: string;
  section: string; // tipe materi
  isFirst: boolean;
  isLast: boolean;
  /** create (draft) / update (existing) — pemanggil yang menentukan. */
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>; // hapus soal tersimpan
  onRemoveDraft?: () => void; // buang draft belum tersimpan
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPreview: (q: Question) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'published', label: 'Tayang' },
];

/** Ringkasan singkat teks soal (buang penanda) untuk header saat collapse. */
function summarize(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\[([^\]]+)\]\{[A-Da-d]\}/g, '$1')
    .trim();
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  cardKey,
  number,
  question,
  passageId,
  section,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onRemoveDraft,
  onMoveUp,
  onMoveDown,
  onPreview,
}) => {
  const isDraft = !question;
  const form = useQuestionForm({ initialData: question, passageId, defaultSection: section });
  const [expanded, setExpanded] = useState(isDraft);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const unsaved = isDraft || form.dirty;

  const handleSave = async () => {
    if (!form.submitValidate(cardKey)) {
      setExpanded(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form.buildPayload(), sort_order: number - 1 });
      form.markSaved();
      if (!isDraft) setExpanded(false); // draft akan di-unmount oleh parent
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan soal.'));
    } finally {
      setSaving(false);
    }
  };

  const summary = summarize(form.questionText) || (form.isListening ? 'Soal Listening (pertanyaan di audio)' : 'Soal belum diisi…');

  return (
    <div
      id={`card-${cardKey}`}
      className={`scroll-mt-4 rounded-2xl border bg-white transition-colors ${
        unsaved ? 'border-indigo-300 shadow-sm shadow-indigo-100/50' : 'border-slate-200'
      }`}
    >
      {/* Header kartu */}
      <div className="flex items-center gap-3 p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-extrabold">
          {number}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-semibold text-slate-700 truncate">{summary}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Jawaban benar: {String(form.correctAnswer).toUpperCase()}
            {unsaved && <span className="text-indigo-600"> · belum disimpan</span>}
          </p>
        </button>

        {/* Status Tayang/Draf */}
        <Badge
          variant={form.status === 'published' ? 'success' : 'neutral'}
          className="text-[10px] font-bold uppercase shrink-0"
        >
          {form.status === 'published' ? 'Tayang' : 'Draf'}
        </Badge>

        {/* Reorder (soal tersimpan saja) */}
        {!isDraft && (
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              title="Naikkan urutan"
              className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              title="Turunkan urutan"
              className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isDraft && (
          <button
            type="button"
            onClick={() => onPreview(question)}
            title="Pratinjau soal"
            className="p-1.5 shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => (isDraft ? onRemoveDraft?.() : setConfirmDel(true))}
          title="Hapus soal"
          className="p-1.5 shrink-0 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          title={expanded ? 'Tutup' : 'Buka'}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Body kartu */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Tingkat Kesulitan</label>
              <Select value={form.difficulty} onChange={(e) => form.setDifficulty(e.target.value)}>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
              <Select value={form.status} onChange={(e) => form.setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <QuestionFields form={form} idPrefix={cardKey} />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {isDraft && (
              <Button type="button" variant="ghost" onClick={() => onRemoveDraft?.()}>
                Batal
              </Button>
            )}
            <Button type="button" variant="primary" onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
              {isDraft ? 'Tambahkan Soal' : 'Simpan Soal'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="Hapus Soal Ini?"
        icon={<Trash2 className="w-4 h-4" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        onConfirm={async () => {
          try {
            await onDelete();
            setConfirmDel(false);
          } catch (err) {
            toast.error(getErrorMessage(err, 'Gagal menghapus soal.'));
          }
        }}
      >
        <p className="text-sm text-slate-600 leading-relaxed">Soal ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.</p>
      </ConfirmDialog>
    </div>
  );
};
