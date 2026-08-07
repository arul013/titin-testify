'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Music, FileText, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { renderExamText } from './examText';
import { PassageView } from './PassageView';
import { ExamAudioPlayer } from '@/features/attempts/ExamAudioPlayer';
import { SkeletonText } from '@/components/ui/skeleton';
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
  /** Materi sedang dimuat (mis. saat edit soal dari daftar) → tampilkan skeleton. */
  passageLoading?: boolean;
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
  passageLoading = false,
}) => {
  const gridClass =
    layout === 'columns'
      ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch'
      : 'flex flex-col gap-6';

  const isTFNG = question.question_type === 'true_false_ng';
  const isMulti = question.question_type === 'mcq_multi';
  const isFill = question.question_type === 'fill_blank' || question.question_type === 'short_answer';
  const isMatching = question.question_type === 'matching';
  const isOrdering = question.question_type === 'ordering';
  const isEssay = question.question_type === 'essay';
  const isWE = !isTFNG && !isMulti && !isFill && !isMatching && !isOrdering && !isEssay && question.section === 'written_expression';
  const isListening = question.section === 'listening';

  // Audio soal berdiri sendiri (Listening standalone) — bila tak ada materi bersama.
  const standaloneAudio = !passage ? question.audio_url || '' : '';

  // Judul kolom materi menyesuaikan isi: audio → "Audio", teks → "Teks Bacaan".
  const hasAudio = !!passage?.audio_url || !!standaloneAudio;
  const materiLabel = passage
    ? passage.audio_url
      ? 'Materi Soal (Audio)'
      : 'Materi Soal (Teks Bacaan)'
    : standaloneAudio
      ? 'Materi Soal (Audio)'
      : 'Materi Soal';

  // Teks & gambar materi (urutannya ditentukan passage.image_position).
  const passageTextNode = passage?.content ? (
    <div
      key="text"
      className="text-slate-700 text-sm leading-loose whitespace-pre-wrap font-sans flex-1 overflow-y-auto max-h-112 bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm"
    >
      {passage.type === 'reading' ? (
        <PassageView content={passage.content} />
      ) : (
        renderExamText(passage.content)
      )}
    </div>
  ) : null;
  const passageImageNode = passage?.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key="img"
      src={passage.image_url}
      alt="Gambar materi"
      className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
    />
  ) : null;

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
                <ExamAudioPlayer src={passage.audio_url} label="Listening Audio Player" />
              )}
              {(passage.image_position === 'above'
                ? [passageImageNode, passageTextNode]
                : [passageTextNode, passageImageNode])}
            </div>
          ) : standaloneAudio ? (
            <ExamAudioPlayer src={standaloneAudio} label="Listening Audio Player" />
          ) : passageLoading ? (
            <div className="flex-1 bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm">
              <SkeletonText lines={6} />
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

          {isListening ? (
            <p className="text-sm text-slate-500 italic">
              Dengarkan audio, lalu pilih jawaban yang paling tepat.
            </p>
          ) : (
            <div className="text-slate-800 text-base font-medium leading-relaxed whitespace-pre-wrap">
              {question.question_text ? (
                renderExamText(question.question_text)
              ) : (
                <span className="text-slate-300 italic">
                  {isWE ? 'Kalimat belum diisi…' : 'Pertanyaan belum diisi…'}
                </span>
              )}
            </div>
          )}

          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.image_url}
              alt="Gambar soal"
              className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
            />
          )}

          {isWE ? (
            /* Written Expression: opsi = 4 kata berlabel di kalimat; tampilkan penanda label benar */
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
          ) : isOrdering ? (
            /* ordering: langkah dalam urutan benar */
            <div className="flex flex-col gap-2">
              {((question.content_json?.items as string[] | undefined) ?? [])
                .map((text, i) => ({
                  text,
                  pos: Number(((question.answer_json?.positions as Record<string, string> | undefined) ?? {})[String(i)] ?? 0),
                }))
                .sort((a, b) => a.pos - b.pos)
                .map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm">
                    <span className="shrink-0 font-bold text-emerald-700">{it.pos || '—'}.</span>
                    <span className="flex-1 font-medium text-slate-700">
                      {it.text ? renderExamText(it.text) : '—'}
                    </span>
                  </div>
                ))}
            </div>
          ) : isMatching ? (
            /* matching: item kiri → opsi kanan yang benar */
            <div className="flex flex-col gap-2">
              {((question.content_json?.left as string[] | undefined) ?? []).map((leftText, i) => {
                const key = ((question.answer_json?.pairs as Record<string, string> | undefined) ?? {})[String(i)];
                const right = (question.content_json?.right as string[] | undefined) ?? [];
                const rt = key ? right['abcdefgh'.indexOf(key)] : undefined;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm">
                    <span className="flex-1 font-medium text-slate-700">
                      {i + 1}. {leftText ? renderExamText(leftText) : '—'}
                    </span>
                    <span className="shrink-0 font-bold text-emerald-700">
                      → {key ? `${key.toUpperCase()}. ${rt ?? ''}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : isFill ? (
            /* fill_blank: tampilkan daftar jawaban yang diterima */
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
              <span className="text-xs font-bold uppercase text-emerald-700">Jawaban diterima</span>
              <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                {((question.answer_json?.accept as string[] | undefined) ?? []).join(' · ') || '—'}
              </p>
            </div>
          ) : isMulti ? (
            /* mcq_multi: opsi jumlah-variabel dari content_json, tandai himpunan benar */
            <div className="flex flex-col gap-3">
              {((question.content_json?.options as string[] | undefined) ?? []).map((text, i) => {
                const key = 'abcdefgh'[i];
                const isCorrect = ((question.answer_json?.correct as string[] | undefined) ?? []).includes(key);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3.5 border p-3.5 rounded-xl text-sm font-medium transition-all ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 shadow-sm shadow-emerald-50'
                        : 'border-slate-100 text-slate-600 bg-slate-50/30'
                    }`}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center font-bold text-xs h-7 w-7 rounded-lg border ${
                        isCorrect ? 'border-emerald-300 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {'ABCDEFGH'[i]}
                    </span>
                    <span className="flex-1 leading-normal">
                      {text ? renderExamText(text) : <span className="text-slate-300 italic">—</span>}
                    </span>
                    {isCorrect && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : isEssay ? (
            /* essay: dinilai manual — tampilkan area jawaban + catatan rubrik */
            <div className="flex flex-col gap-2.5">
              {(question.content_json?.word_limit as string | undefined) && (
                <p className="text-xs font-bold text-brand uppercase">
                  {question.content_json?.word_limit as string}
                </p>
              )}
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-400 italic min-h-24 flex items-center">
                Peserta mengetik jawaban esai di sini…
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2 w-fit">
                <BookOpen className="w-3.5 h-3.5" />
                Dinilai manual oleh penilai berdasarkan rubrik
              </div>
            </div>
          ) : isTFNG ? (
            /* True/False/Not Given: opsi tetap, tandai jawaban benar */
            <div className="flex flex-col gap-3">
              {[{ key: 'a', val: 'True' }, { key: 'b', val: 'False' }, { key: 'c', val: 'Not Given' }].map((opt) => {
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
                    <span className="flex-1 leading-normal">{opt.val}</span>
                    {isCorrect && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : question.options_image_url ? (
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
