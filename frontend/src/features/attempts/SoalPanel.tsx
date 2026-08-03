'use client';

import React from 'react';
import { Music, FileText } from 'lucide-react';
import { renderExamText } from '@/features/questions/examText';
import { PassageView } from '@/features/questions/PassageView';
import { ExamAudioPlayer } from './ExamAudioPlayer';
import type { QuestionPayload } from './api';

interface SoalPanelProps {
  q: QuestionPayload;
  /** Rentang soal yang berbagi materi ini, mis. "Questions 1–10" (reading). */
  groupLabel?: string | null;
}

/** Panel kiri "Soal": materi (audio/passage/gambar) + pertanyaan/kalimat. */
export const SoalPanel: React.FC<SoalPanelProps> = ({ q, groupLabel }) => {
  const passage = q.passage || null;
  const standaloneAudio = !passage ? q.audio_url || '' : '';
  const isListening = q.section === 'listening';
  const isReading = passage?.type === 'reading';

  const passageText = passage?.content ? (
    <div
      key="text"
      className={
        isReading
          ? 'font-serif text-slate-800 text-[16.5px] leading-[1.95] whitespace-pre-wrap bg-white border border-slate-200 p-6 rounded-2xl shadow-sm'
          : 'text-slate-700 text-[15px] leading-loose whitespace-pre-wrap bg-white border border-slate-200 p-5 rounded-2xl shadow-sm'
      }
    >
      {isReading ? <PassageView content={passage.content} /> : renderExamText(passage.content)}
    </div>
  ) : null;

  const passageImage = passage?.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key="img"
      src={passage.image_url}
      alt="Gambar materi"
      className="max-w-full rounded-2xl border border-slate-200 shadow-sm"
    />
  ) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Materi */}
      {passage ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              {passage.audio_url ? <Music className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {passage.audio_url ? 'Materi (Audio)' : 'Materi (Teks Bacaan)'}
            </div>
            {groupLabel && (
              <span className="shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-extrabold text-brand">
                {groupLabel}
              </span>
            )}
          </div>
          {passage.audio_url && <ExamAudioPlayer src={passage.audio_url} />}
          {passage.image_position === 'above'
            ? [passageImage, passageText]
            : [passageText, passageImage]}
        </div>
      ) : standaloneAudio ? (
        <ExamAudioPlayer src={standaloneAudio} />
      ) : null}

      {/* Pertanyaan/kalimat */}
      <div className="flex flex-col gap-3">
        {!isListening && q.question_text && (
          <div className="text-slate-800 text-lg font-medium leading-relaxed whitespace-pre-wrap">
            {renderExamText(q.question_text)}
          </div>
        )}

        {q.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.image_url}
            alt="Gambar soal"
            className="max-w-full rounded-2xl border border-slate-200 shadow-sm"
          />
        )}
      </div>
    </div>
  );
};
