'use client';

import React from 'react';
import { Music, FileText, Headphones } from 'lucide-react';
import { renderExamText } from '@/features/questions/examText';
import { PassageView } from '@/features/questions/PassageView';
import type { QuestionPayload } from './api';

const AudioPlayer: React.FC<{ src: string }> = ({ src }) => (
  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-2.5">
    <div className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wide">
      <Headphones className="w-4 h-4" />
      Audio Soal
    </div>
    <audio src={src} controls className="w-full" />
  </div>
);

/** Panel kiri "Soal": materi (audio/passage/gambar) + pertanyaan/kalimat. */
export const SoalPanel: React.FC<{ q: QuestionPayload }> = ({ q }) => {
  const passage = q.passage || null;
  const standaloneAudio = !passage ? q.audio_url || '' : '';
  const isListening = q.section === 'listening';

  const passageText = passage?.content ? (
    <div
      key="text"
      className="text-slate-700 text-[15px] leading-loose whitespace-pre-wrap bg-white border border-slate-200 p-5 rounded-2xl shadow-sm"
    >
      {passage.type === 'reading' ? (
        <PassageView content={passage.content} />
      ) : (
        renderExamText(passage.content)
      )}
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            {passage.audio_url ? <Music className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {passage.audio_url ? 'Materi (Audio)' : 'Materi (Teks Bacaan)'}
          </div>
          {passage.audio_url && <AudioPlayer src={passage.audio_url} />}
          {passage.image_position === 'above'
            ? [passageImage, passageText]
            : [passageText, passageImage]}
        </div>
      ) : standaloneAudio ? (
        <AudioPlayer src={standaloneAudio} />
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
