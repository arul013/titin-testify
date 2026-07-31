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

const TFNG_LABELS: Record<string, string> = { a: 'True', b: 'False', c: 'Not Given' };

const MULTI_KEYS = 'abcdefgh';

function ReviewCard({ q, number }: { q: ReviewQuestion; number: number }) {
  const isTFNG = q.payload.question_type === 'true_false_ng';
  const isMulti = q.payload.question_type === 'mcq_multi';
  const isFill = q.payload.question_type === 'fill_blank' || q.payload.question_type === 'short_answer';
  const isMatching = q.payload.question_type === 'matching';
  const isOrdering = q.payload.question_type === 'ordering';
  const isEssay = q.payload.question_type === 'essay';
  const letterMode =
    !isTFNG && !isMulti && !isFill && !isMatching && !isOrdering && !isEssay && (q.section === 'written_expression' || !!q.payload.options_image_url);
  const optKeys = isTFNG ? (['a', 'b', 'c'] as const) : KEYS;

  // fill_blank/short_answer: jawaban teks peserta vs daftar jawaban diterima
  const fillText = (q.answer_json?.text as string | undefined) ?? '';
  const fillAccept = (q.answer_key_json?.accept as string[] | undefined) ?? [];

  // essay: jawaban teks peserta (dinilai manual)
  const essayText = (q.answer_json?.text as string | undefined) ?? '';

  // matching: pasangan peserta vs kunci
  const matchLeft = (q.payload.content_json?.left as string[] | undefined) ?? [];
  const matchRight = (q.payload.content_json?.right as string[] | undefined) ?? [];
  const gotPairs = (q.answer_json?.pairs as Record<string, string> | undefined) ?? {};
  const keyPairs = (q.answer_key_json?.pairs as Record<string, string> | undefined) ?? {};
  const rightText = (k: string) => matchRight[MULTI_KEYS.indexOf(k)];

  // ordering: item + posisi peserta vs benar
  const orderItems = (q.payload.content_json?.items as string[] | undefined) ?? [];
  const gotPos = (q.answer_json?.positions as Record<string, string> | undefined) ?? {};
  const keyPos = (q.answer_key_json?.positions as Record<string, string> | undefined) ?? {};

  // mcq_multi: himpunan pilihan peserta vs kunci (keys 'a','b',…)
  const pickedSet = ((q.answer_json?.selected as string[] | undefined) ?? []).map(String);
  const correctSet = ((q.answer_key_json?.correct as string[] | undefined) ?? []).map(String);
  const multiOptions = ((q.payload.content_json?.options as string[] | undefined) ?? []).map(
    (text, i) => ({ key: MULTI_KEYS[i], label: MULTI_KEYS[i].toUpperCase(), text }),
  );
  const answered = isMulti
    ? pickedSet.length > 0
    : isFill
      ? !!fillText.trim()
      : isEssay
        ? !!essayText.trim()
        : isMatching
          ? Object.keys(gotPairs).length > 0
          : isOrdering
            ? Object.keys(gotPos).length > 0
            : q.selected_answer != null;

  const optVal = (k: string) =>
    isTFNG
      ? (TFNG_LABELS[k] ?? null)
      : (({ a: q.payload.option_a, b: q.payload.option_b, c: q.payload.option_c, d: q.payload.option_d })[
          k
        ] ?? null);

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
        {isEssay ? (
          <Badge variant="info">
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" /> Dinilai Manual
            </span>
          </Badge>
        ) : q.is_correct ? (
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

        {isOrdering ? (
          <div className="flex flex-col gap-2">
            {orderItems.map((itemText, i) => {
              const got = gotPos[String(i)];
              const correct = keyPos[String(i)];
              const ok = !!got && String(got) === String(correct);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-3 text-sm ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}
                >
                  <span className="flex-1 font-medium text-slate-700">
                    {itemText ? renderExamText(itemText) : '—'}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    Kamu:{' '}
                    <b className={ok ? 'text-emerald-600' : 'text-rose-600'}>{got ?? '—'}</b>
                    {!ok && <> · Benar: <b className="text-emerald-600">{correct ?? '—'}</b></>}
                  </span>
                </div>
              );
            })}
          </div>
        ) : isMatching ? (
          <div className="flex flex-col gap-2">
            {matchLeft.map((leftText, i) => {
              const gotKey = gotPairs[String(i)];
              const correctKey = keyPairs[String(i)];
              const ok = !!gotKey && gotKey === correctKey;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border-2 p-3 ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}
                >
                  <p className="text-sm font-medium text-slate-700">
                    {i + 1}. {leftText ? renderExamText(leftText) : '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Jawabanmu:{' '}
                    <span className={ok ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                      {gotKey ? `${gotKey.toUpperCase()}. ${rightText(gotKey) ?? ''}` : '—'}
                    </span>
                    {!ok && (
                      <>
                        {' · '}Kunci:{' '}
                        <span className="font-bold text-emerald-600">
                          {correctKey ? `${correctKey.toUpperCase()}. ${rightText(correctKey) ?? ''}` : '—'}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ) : isEssay ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-3.5">
              <span className="text-xs font-bold text-slate-400 uppercase">Jawaban esaimu</span>
              <p className={`mt-1 text-[15px] whitespace-pre-wrap leading-relaxed ${answered ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                {essayText.trim() || 'Tidak dijawab'}
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <Lightbulb className="h-3.5 w-3.5" />
              Jawaban esai dinilai manual oleh penilai berdasarkan rubrik.
            </p>
          </div>
        ) : isFill ? (
          <div className="flex flex-col gap-2">
            <div
              className={`rounded-2xl border-2 p-3.5 text-[15px] ${
                q.is_correct ? 'border-emerald-300 bg-emerald-50' : answered ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="text-xs font-bold text-slate-400 uppercase">Jawabanmu</span>
              <p className={`font-semibold ${q.is_correct ? 'text-emerald-700' : answered ? 'text-rose-600' : 'text-slate-400 italic'}`}>
                {fillText.trim() || 'Tidak dijawab'}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Jawaban diterima:{' '}
              <span className="font-bold text-emerald-600">{fillAccept.join(' · ') || '—'}</span>
            </p>
          </div>
        ) : isMulti ? (
          <div className="flex flex-col gap-2.5">
            {multiOptions.map((opt) => {
              const isCorrect = correctSet.includes(opt.key);
              const isPicked = pickedSet.includes(opt.key);
              const wrongPick = isPicked && !isCorrect;
              const tone = isCorrect
                ? 'border-emerald-300 bg-emerald-50'
                : wrongPick
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-slate-200 bg-white';
              return (
                <div key={opt.key} className={`flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-[15px] ${tone}`}>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold ${
                      isCorrect
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : wrongPick
                          ? 'border-rose-400 bg-rose-500 text-white'
                          : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="flex-1 leading-normal text-slate-700">
                    {opt.text ? renderExamText(opt.text) : <span className="text-slate-300 italic">—</span>}
                  </span>
                  {isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                  {wrongPick && <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
                </div>
              );
            })}
            <p className="mt-1 text-xs text-slate-500">
              Pilihanmu:{' '}
              <span className={q.is_correct ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
                {pickedSet.map((k) => k.toUpperCase()).join(', ') || '—'}
              </span>
              {' · '}Kunci:{' '}
              <span className="font-bold text-emerald-600">
                {correctSet.map((k) => k.toUpperCase()).join(', ') || '—'}
              </span>
            </p>
          </div>
        ) : (
        <>
        <div className={letterMode ? 'grid grid-cols-4 gap-2.5' : 'flex flex-col gap-2.5'}>
          {optKeys.map((k, i) => {
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
        </>
        )}
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
