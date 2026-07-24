'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { FileUploader } from '@/components/ui/file-uploader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UnderlineEditor } from './UnderlineEditor';
import { BankSoalBuilder, type BuilderViewMode } from './BankSoalBuilder';
import { QuestionView } from './QuestionView';
import { X, BookOpen, HelpCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
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
  const [section, setSection] = useState(initialData?.section || defaultSection || 'listening');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'medium');
  const [questionText, setQuestionText] = useState(initialData?.question_text || '');
  const [optionA, setOptionA] = useState(initialData?.option_a || '');
  const [optionB, setOptionB] = useState(initialData?.option_b || '');
  const [optionC, setOptionC] = useState(initialData?.option_c || '');
  const [optionD, setOptionD] = useState(initialData?.option_d || '');
  const [correctAnswer, setCorrectAnswer] = useState(initialData?.correct_answer || 'a');
  const [explanation, setExplanation] = useState(initialData?.explanation || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [useImage, setUseImage] = useState(!!initialData?.image_url);
  const [answerFormat, setAnswerFormat] = useState(initialData?.options_image_url ? 'image' : 'text');
  const [optionsImageUrl, setOptionsImageUrl] = useState(initialData?.options_image_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingOptionsImage, setIsUploadingOptionsImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isEditing = !!initialData;
  const answerLabels = ['A', 'B', 'C', 'D'];
  const answerValues = [optionA, optionB, optionC, optionD];

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  /** Validasi manual (pengganti `required` native) — kembalikan map field→pesan. */
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!questionText.trim()) e.questionText = 'Pertanyaan wajib diisi.';
    if (answerFormat === 'text') {
      answerLabels.forEach((label, i) => {
        if (!answerValues[i].trim()) e[`option${label}`] = `Opsi ${label} wajib diisi.`;
      });
    } else if (!optionsImageUrl) {
      e.optionsImage = 'Unggah gambar pilihan jawaban dulu.';
    }
    if (useImage && !imageUrl) e.image = 'Unggah gambar soal, atau matikan opsi gambar.';
    return e;
  };

  // Dirty = ada perubahan dari kondisi awal (untuk guard "buang perubahan?").
  const snapshot = () =>
    JSON.stringify([
      section, difficulty, questionText, optionA, optionB, optionC, optionD,
      correctAnswer, explanation, status, imageUrl, useImage, answerFormat, optionsImageUrl,
    ]);
  const [initialSnapshot] = useState(snapshot);
  const dirty = snapshot() !== initialSnapshot;

  const requestCancel = () => {
    if (dirty) setConfirmDiscard(true);
    else onCancel();
  };

  /** Unggah 1 gambar ke R2, kembalikan URL (atau null bila gagal). */
  const doUploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('File yang diunggah harus berformat gambar (jpg, png, webp, dsb).');
      return null;
    }
    try {
      const storedToken = localStorage.getItem('cbt_access_token');
      const formData = new FormData();
      formData.append('file', file);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/questions/upload-image`, {
        method: 'POST',
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        body: formData,
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || 'Gagal mengunggah gambar ke server.');
      toast.success('Gambar berhasil diunggah.');
      return responseData.image_url as string;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengunggah gambar. Coba lagi, atau hubungi admin bila masalah berlanjut.'));
      return null;
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error('Lengkapi dulu bagian yang ditandai merah.');
      const first = Object.keys(found)[0];
      requestAnimationFrame(() =>
        document
          .getElementById(`qf-${first}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit({
        passage_id: passageId || null,
        section,
        difficulty,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        explanation: explanation || null,
        image_url: imageUrl || null,
        options_image_url: answerFormat === 'image' ? optionsImageUrl || null : null,
        status,
      });
      onCancel();
    } catch {
      // error di-handle parent (toast)
    } finally {
      setIsSubmitting(false);
    }
  };

  const draft: Question = {
    id: initialData?.id ?? 'draft',
    created_by: initialData?.created_by ?? '',
    passage_id: passageId ?? null,
    section,
    difficulty,
    question_text: questionText,
    option_a: optionA,
    option_b: optionB,
    option_c: optionC,
    option_d: optionD,
    correct_answer: correctAnswer,
    explanation: explanation || null,
    image_url: imageUrl || null,
    options_image_url: answerFormat === 'image' ? optionsImageUrl || null : null,
    status,
    tags: initialData?.tags ?? [],
    sort_order: initialData?.sort_order ?? 0,
    creator_name: initialData?.creator_name,
    created_at: '',
    updated_at: '',
  };

  const editor = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Bagian Ujian</label>
          <Select value={section} onChange={(e) => setSection(e.target.value)} disabled={!!passageId}>
            {SECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Tingkat Kesulitan</label>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Question Text */}
      <div id="qf-questionText" className="scroll-mt-4">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
          {section === 'written_expression' ? 'Kalimat Soal' : 'Pertanyaan'}
        </label>
        {section === 'written_expression' ? (
          <UnderlineEditor
            variant="labeled"
            value={questionText}
            onChange={(v) => { setQuestionText(v); clearError('questionText'); }}
            rows={4}
            showPreview={false}
            placeholder="Tulis kalimat, lalu blok kata dan klik Tandai A/B/C/D."
          />
        ) : section === 'reading' ? (
          <UnderlineEditor
            variant="rich"
            value={questionText}
            onChange={(v) => { setQuestionText(v); clearError('questionText'); }}
            rows={3}
            showPreview={false}
            placeholder="Tulis pertanyaan. Blok kata lalu klik Tebal/Miring/Garis bawah bila perlu."
          />
        ) : (
          <Textarea
            rows={3}
            value={questionText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setQuestionText(e.target.value); clearError('questionText'); }}
            placeholder="Tulis pertanyaan di sini..."
            error={errors.questionText}
          />
        )}
        {errors.questionText && section !== 'listening' && section !== 'structure' && (
          <p className="mt-1.5 text-xs text-red-500">{errors.questionText}</p>
        )}
      </div>

      {/* Gambar soal (opsional, via checkbox) */}
      <div id="qf-image" className="scroll-mt-4">
        <Checkbox
          checked={useImage}
          onChange={(v) => {
            setUseImage(v);
            if (!v) {
              setImageUrl('');
              clearError('image');
            }
          }}
          label={
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Soal ini memakai gambar
            </span>
          }
        />
        {useImage && (
          <div className="mt-3">
            {imageUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Gambar soal" className="max-h-48 rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  title="Hapus gambar"
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <FileUploader
                variant="dropzone"
                accept="image/*"
                disabled={isUploadingImage}
                icon={<ImageIcon />}
                label="Klik atau seret gambar ke sini"
                hint="Format jpg, png, webp, dan sejenisnya"
                onFilesSelected={async ([f]) => {
                  setIsUploadingImage(true);
                  const url = await doUploadImage(f);
                  if (url) {
                    setImageUrl(url);
                    clearError('image');
                  }
                  setIsUploadingImage(false);
                }}
                onError={(m) => toast.error(m)}
              />
            )}
            {isUploadingImage && <p className="text-[10px] text-indigo-600 animate-pulse mt-1">Mengunggah gambar...</p>}
            {errors.image && <p className="mt-1.5 text-xs text-red-500">{errors.image}</p>}
          </div>
        )}
      </div>

      {/* Pilihan jawaban — format teks atau gambar */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <label className="text-xs font-bold text-slate-600">Pilihan Jawaban</label>
          <ToggleGroup
            size="sm"
            value={answerFormat}
            onChange={(v) => v && setAnswerFormat(v)}
            options={[
              { value: 'text', label: 'Teks' },
              { value: 'image', label: 'Gambar' },
            ]}
          />
        </div>

        {answerFormat === 'text' ? (
          <>
            <p className="text-[11px] text-slate-400 mb-2">Tandai lingkaran pada jawaban yang benar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['a', 'b', 'c', 'd'].map((key, i) => {
                const setters = [setOptionA, setOptionB, setOptionC, setOptionD];
                const isCorrect = correctAnswer === key;
                return (
                  <div
                    key={key}
                    id={`qf-option${answerLabels[i]}`}
                    className={`scroll-mt-4 rounded-2xl border p-3 transition-colors ${
                      isCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-600">Opsi {answerLabels[i]}</span>
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(key)}
                        className="inline-flex items-center gap-1.5"
                        title="Tandai sebagai jawaban benar"
                      >
                        <span
                          className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isCorrect && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            isCorrect ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {isCorrect ? 'Jawaban benar' : 'Tandai benar'}
                        </span>
                      </button>
                    </div>
                    <Input
                      value={answerValues[i]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setters[i](e.target.value);
                        clearError(`option${answerLabels[i]}`);
                      }}
                      placeholder={`Isi opsi ${answerLabels[i]}...`}
                      error={errors[`option${answerLabels[i]}`]}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div id="qf-optionsImage" className="scroll-mt-4 flex flex-col gap-3">
            <p className="text-[11px] text-slate-400">
              Unggah <strong>satu gambar</strong> yang memuat pilihan A/B/C/D, lalu tandai huruf yang benar.
            </p>
            {optionsImageUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={optionsImageUrl} alt="Gambar pilihan jawaban" className="max-h-60 rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setOptionsImageUrl('')}
                  title="Hapus gambar"
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <FileUploader
                variant="dropzone"
                accept="image/*"
                disabled={isUploadingOptionsImage}
                icon={<ImageIcon />}
                label="Klik atau seret gambar pilihan jawaban ke sini"
                hint="Satu gambar berisi label A/B/C/D"
                onFilesSelected={async ([f]) => {
                  setIsUploadingOptionsImage(true);
                  const url = await doUploadImage(f);
                  if (url) {
                    setOptionsImageUrl(url);
                    clearError('optionsImage');
                  }
                  setIsUploadingOptionsImage(false);
                }}
                onError={(m) => toast.error(m)}
              />
            )}
            {isUploadingOptionsImage && (
              <p className="text-[10px] text-indigo-600 animate-pulse">Mengunggah gambar...</p>
            )}
            {errors.optionsImage && <p className="text-xs text-red-500">{errors.optionsImage}</p>}

            <div>
              <p className="text-[11px] font-bold text-slate-600 mb-1.5">
                Jawaban benar (sesuai label pada gambar):
              </p>
              <div className="flex flex-wrap gap-2">
                {['a', 'b', 'c', 'd'].map((key, i) => {
                  const isCorrect = correctAnswer === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCorrectAnswer(key)}
                      className={`h-10 w-10 rounded-xl border-2 font-extrabold transition-colors ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {answerLabels[i]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <BookOpen className="w-3.5 h-3.5 inline mr-1" />
          Pembahasan (Opsional)
        </label>
        <Textarea
          rows={2}
          value={explanation}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value)}
          placeholder="Penjelasan jawaban benar..."
        />
      </div>

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
            question={draft}
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
