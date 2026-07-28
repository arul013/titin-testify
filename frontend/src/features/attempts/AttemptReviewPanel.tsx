'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, AlertTriangle, MinusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { renderExamText } from '@/features/questions/examText';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { SoalPanel } from '@/features/attempts/SoalPanel';
import { attemptsApi, type AttemptReview, type ReviewQuestion } from '@/features/attempts/api';

const KEYS = ['a', 'b', 'c', 'd'] as const;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function sectionLabel(section: string): string {
  return SECTION_LABELS[section as ExamSectionId] ?? section;
}

/** Panel pembahasan: dimuat lazy saat peserta membuka. */
export function AttemptReviewPanel({ attemptId }: { attemptId: string }) {
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    attemptsApi
      .review(attemptId)
      .then((res) => active && setReview(res))
      .catch(
        (err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat pembahasan'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <Card key={i} className="rounded-3xl p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="mb-3 h-20 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">Gagal memuat pembahasan</h3>
        <p className="text-sm text-slate-500">{error}</p>
      </Card>
    );
  }

  if (!review || review.questions.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {review.questions.map((q, i) => (
        <ReviewCard key={q.exam_question_id} q={q} number={i + 1} />
      ))}
    </div>
  );
}

function ReviewCard({ q, number }: { q: ReviewQuestion; number: number }) {
  const letterMode = q.section === 'written_expression' || !!q.payload.options_image_url;
  const answered = q.selected_answer != null;

  const optVal = (k: string) =>
    ({ a: q.payload.option_a, b: q.payload.option_b, c: q.payload.option_c, d: q.payload.option_d })[
      k
    ] ?? null;

  return (
    <Card className="rounded-3xl border-slate-100 bg-white p-6 shadow-md shadow-slate-100/60 md:p-7">
      {/* Header soal */}
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
            {number}
          </span>
          <span className="text-xs font-bold tracking-wide text-slate-400 uppercase">
            {sectionLabel(q.section)}
          </span>
        </div>
        {q.is_correct ? (
          <Badge variant="success">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Benar
            </span>
          </Badge>
        ) : answered ? (
          <Badge variant="danger">
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5" /> Salah
            </span>
          </Badge>
        ) : (
          <Badge variant="neutral">
            <span className="flex items-center gap-1">
              <MinusCircle className="h-3.5 w-3.5" /> Tidak Dijawab
            </span>
          </Badge>
        )}
      </div>

      {/* Materi + pertanyaan (renderer sama seperti saat ujian) */}
      <SoalPanel q={q.payload} />

      {/* Opsi dengan tanda kunci / jawaban peserta */}
      <div className="mt-5">
        {q.payload.options_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.payload.options_image_url}
            alt="Pilihan jawaban"
            className="mb-3 max-w-full rounded-2xl border border-slate-200 shadow-sm"
          />
        )}

        <div className={letterMode ? 'grid grid-cols-4 gap-2.5' : 'flex flex-col gap-2.5'}>
          {KEYS.map((k, i) => {
            const isCorrect = q.correct_answer === k;
            const isPicked = q.selected_answer === k;
            const wrongPick = isPicked && !isCorrect;

            const tone = isCorrect
              ? 'border-emerald-300 bg-emerald-50'
              : wrongPick
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white';
            const chipTone = isCorrect
              ? 'border-emerald-400 bg-emerald-500 text-white'
              : wrongPick
                ? 'border-rose-400 bg-rose-500 text-white'
                : 'border-slate-200 bg-white text-slate-500';

            return (
              <div
                key={k}
                className={[
                  'flex items-center rounded-2xl border-2 p-3.5 text-left text-[15px]',
                  letterMode ? 'justify-center' : 'gap-3.5',
                  tone,
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold',
                    chipTone,
                  ].join(' ')}
                >
                  {LETTERS[i]}
                </span>
                {!letterMode && (
                  <span className="flex-1 leading-normal text-slate-700">
                    {optVal(k) ? (
                      renderExamText(optVal(k)!)
                    ) : (
                      <span className="text-slate-300 italic">—</span>
                    )}
                  </span>
                )}
                {isCorrect && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                )}
                {wrongPick && <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
              </div>
            );
          })}
        </div>

        {/* Keterangan jawaban peserta */}
        <p className="mt-3 text-xs text-slate-500">
          {answered ? (
            <>
              Jawabanmu:{' '}
              <span className={q.is_correct ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                {(q.selected_answer ?? '').toUpperCase()}
              </span>
              {' · '}Kunci:{' '}
              <span className="font-bold text-emerald-600">
                {(q.correct_answer ?? '—').toUpperCase()}
              </span>
            </>
          ) : (
            <>
              Tidak dijawab · Kunci:{' '}
              <span className="font-bold text-emerald-600">
                {(q.correct_answer ?? '—').toUpperCase()}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Pembahasan */}
      {q.explanation && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-amber-700 uppercase">
            <Lightbulb className="h-4 w-4" />
            Pembahasan
          </div>
          <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700">
            {renderExamText(q.explanation)}
          </div>
        </div>
      )}
    </Card>
  );
}
