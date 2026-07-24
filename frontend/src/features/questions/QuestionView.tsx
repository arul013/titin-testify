'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Music, FileText, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { renderExamText } from './examText';
import { PassageView } from './PassageView';
import type { Question, Passage } from './hooks/useQuestions';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
};

function sectionLabel(section: string): string {
  switch (section) {
    case 'listening':
      return 'Listening Comprehension';
    case 'reading':
      return 'Reading Comprehension';
    case 'structure':
      return 'Structure Section';
    case 'written_expression':
      return 'Written Expression';
    default:
      return section.toUpperCase();
  }
}

interface QuestionViewProps {
  question: Question;
  passage?: Passage | null;
  /** "columns" = 2 kolom (materi | soal); "stacked" = tumpuk (untuk panel sempit). */
  layout?: 'columns' | 'stacked';
  showMeta?: boolean;
  showExplanation?: boolean;
}

/**
 * Tampilan kanonik satu soal "seperti dilihat peserta" — dipakai di Pratinjau,
 * panel preview builder, dan (nanti) lembar ujian Phase 4.
 */
export const QuestionView: React.FC<QuestionViewProps> = ({
  question,
  passage,
  layout = 'columns',
  showMeta = true,
  showExplanation = true,
}) => {
  const gridClass =
    layout === 'columns'
      ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch'
      : 'flex flex-col gap-6';

  // Judul kolom materi menyesuaikan isi: audio → "Audio", teks → "Teks Bacaan".
  const hasAudio = !!passage?.audio_url;
  const materiLabel = !passage
    ? 'Materi Soal'
    : hasAudio
      ? 'Materi Soal (Audio)'
      : 'Materi Soal (Teks Bacaan)';

  return (
    <div className="flex flex-col gap-6">
      {showMeta && (
        <div className="flex flex-wrap gap-2.5 items-center pb-4 border-b border-slate-100">
          <Badge variant="info" className="font-extrabold uppercase text-xs">
            {sectionLabel(question.section)}
          </Badge>
          <Badge
            variant={
              question.difficulty === 'easy'
                ? 'success'
                : question.difficulty === 'medium'
                  ? 'warning'
                  : 'danger'
            }
            className="font-extrabold uppercase text-[10px]"
          >
            Tingkat: {DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
          </Badge>
          <Badge
            variant={question.status === 'published' ? 'success' : 'neutral'}
            className="font-extrabold uppercase text-[10px]"
          >
            {question.status === 'published' ? 'Tayang' : 'Draf'}
          </Badge>
          {question.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className={gridClass}>
        {/* Materi (passage) */}
        <div className="flex flex-col gap-4 bg-slate-50/70 border border-slate-100 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
            {hasAudio ? (
              <Music className="w-4 h-4 text-slate-400" />
            ) : (
              <FileText className="w-4 h-4 text-slate-400" />
            )}
            {materiLabel}
          </h3>

          {passage ? (
            <div className="flex flex-col gap-4 flex-1">
              {passage.audio_url && (
                <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                    <Music className="w-4 h-4 text-indigo-600" />
                    Listening Audio Player
                  </div>
                  <audio src={passage.audio_url} controls className="w-full h-8" />
                </div>
              )}
              {passage.content && (
                <div className="text-slate-700 text-sm leading-loose whitespace-pre-wrap font-sans flex-1 overflow-y-auto max-h-112 bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm">
                  {passage.type === 'reading' ? (
                    <PassageView content={passage.content} width={880} />
                  ) : (
                    renderExamText(passage.content)
                  )}
                </div>
              )}
              {passage.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={passage.image_url}
                  alt="Gambar materi"
                  className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
                />
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs italic flex items-center justify-center h-48 border border-dashed border-slate-200 rounded-xl bg-white">
              Soal ini berdiri sendiri — tidak memakai teks bacaan atau audio bersama.
            </div>
          )}
        </div>

        {/* Pertanyaan & opsi */}
        <div className="flex flex-col gap-5 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            Pertanyaan & Pilihan Jawaban
          </h3>

          <div className="text-slate-800 text-base font-medium leading-relaxed whitespace-pre-wrap">
            {question.question_text ? (
              renderExamText(question.question_text)
            ) : (
              <span className="text-slate-300 italic">Pertanyaan belum diisi…</span>
            )}
          </div>

          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt="Gambar soal"
              className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
            />
          )}

          {question.options_image_url ? (
            /* Mode opsi gambar: satu gambar berisi A/B/C/D + penanda jawaban benar */
            <div className="flex flex-col gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.options_image_url}
                alt="Pilihan jawaban"
                className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
              />
              <div className="flex flex-wrap gap-2">
                {['a', 'b', 'c', 'd'].map((k, i) => {
                  const isCorrect = question.correct_answer === k;
                  return (
                    <div
                      key={k}
                      className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center font-extrabold text-sm ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {['A', 'B', 'C', 'D'][i]}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { key: 'a', val: question.option_a, label: 'A' },
                { key: 'b', val: question.option_b, label: 'B' },
                { key: 'c', val: question.option_c, label: 'C' },
                { key: 'd', val: question.option_d, label: 'D' },
              ].map((opt) => {
                const isCorrect = question.correct_answer === opt.key;
                return (
                  <div
                    key={opt.key}
                    className={`flex items-center gap-3.5 border p-3.5 rounded-xl text-sm font-medium transition-all ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 shadow-sm shadow-emerald-50'
                        : 'border-slate-100 text-slate-600 bg-slate-50/30'
                    }`}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center font-bold text-xs h-7 w-7 rounded-lg border ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-500 text-white'
                          : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="flex-1 leading-normal">
                      {opt.val ? renderExamText(opt.val) : <span className="text-slate-300 italic">—</span>}
                    </span>
                    {isCorrect && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showExplanation && question.explanation && (
        <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-2xl">
          <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Pembahasan Jawaban
          </h4>
          <p className="text-slate-700 text-sm leading-relaxed font-sans font-medium whitespace-pre-wrap">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
