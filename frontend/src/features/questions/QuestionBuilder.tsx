'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BankSoalBuilder, type BuilderViewMode } from './BankSoalBuilder';
import { QuestionView } from './QuestionView';
import { QuestionFields } from './QuestionFields';
import { useQuestionForm } from './useQuestionForm';
import { Trash2 } from 'lucide-react';
import type { Question, Passage } from './hooks/useQuestions';

interface QuestionBuilderProps {
  initialData?: Question | null;
  passageId?: string | null;
  defaultSection?: string;
  /** Passage terkait (untuk konteks preview bila soal berada di dalam materi). */
  passage?: Passage | null;
  /** Materi masih dimuat (edit soal dari daftar) → preview tampil skeleton. */
  passageLoading?: boolean;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

const SECTION_OPTIONS = [
  { value: 'listening', label: 'Listening' },
  { value: 'structure', label: 'Structure' },
  { value: 'written_expression', label: 'Written Expression' },
  { value: 'reading', label: 'Reading' },
];
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'published', label: 'Tayang' },
];

export const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  initialData,
  passageId,
  defaultSection,
  passage,
  passageLoading = false,
  onCancel,
  onSubmit,
}) => {
  const form = useQuestionForm({ initialData, passageId, defaultSection });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isEditing = form.isEditing;

  const requestCancel = () => {
    if (form.dirty) setConfirmDiscard(true);
    else onCancel();
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.submitValidate('qf')) return;
    setIsSubmitting(true);
    try {
      await onSubmit(form.buildPayload());
      onCancel();
    } catch {
      // error di-handle parent (toast)
    } finally {
      setIsSubmitting(false);
    }
  };

  const editor = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Bagian Ujian</label>
          <Select value={form.section} onChange={(e) => form.setSection(e.target.value)} disabled={!!passageId}>
            {SECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
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

      <QuestionFields form={form} idPrefix="qf" />

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button type="button" variant="ghost" onClick={requestCancel}>Batal</Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEditing ? 'Simpan Perubahan' : 'Tambah Soal'}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <BankSoalBuilder
        title={isEditing ? 'Edit Soal' : 'Buat Soal'}
        onCancel={requestCancel}
        editor={editor}
        preview={(mode: BuilderViewMode) => (
          <QuestionView
            question={form.buildDraft()}
            passage={passage ?? null}
            passageLoading={passageLoading}
            layout={mode === 'preview' ? 'columns' : 'stacked'}
          />
        )}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Buang perubahan?"
        icon={<Trash2 className="w-4 h-4" />}
        confirmLabel="Ya, buang"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        onConfirm={onCancel}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Ada perubahan yang belum disimpan. Kalau keluar sekarang, perubahan itu akan hilang.
        </p>
      </ConfirmDialog>
    </>
  );
};
