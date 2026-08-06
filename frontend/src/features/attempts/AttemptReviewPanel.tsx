'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, AlertTriangle, MinusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { renderExamText } from '@/features/questions/examText';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { SoalPanel } from '@/features/attempts/SoalPanel';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/src/lib/cn';
import { attemptsApi, type AttemptReview, type ReviewQuestion } from '@/features/attempts/api';

const KEYS = ['a', 'b', 'c', 'd'] as const;
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function sectionLabel(section: string): string {
  return SECTION_LABELS[section as ExamSectionId] ?? section;
}

// Section TOEFL ITP: Structure + Written Expression = satu grup tab "Section 2".
const SEC_GROUP_LABEL: Record<string, string> = {
  listening: 'Listening Comprehension',
  structure_we: 'Structure & Written Expression',
  reading: 'Reading Comprehension',
};
const groupKeyOf = (s: string) => (s === 'structure' || s === 'written_expression' ? 'structure_we' : s);
const groupLabelOf = (s: string) => SEC_GROUP_LABEL[groupKeyOf(s)] ?? SECTION_LABELS[s as ExamSectionId] ?? s;

type QState = 'correct' | 'wrong' | 'unanswered' | 'manual';

/** Status satu soal (untuk navigator + filter). Essay/speaking = dinilai manual. */
function questionState(q: ReviewQuestion): QState {
  const t = q.payload.question_type;
  if (q.scoring_mode === 'manual' || t === 'essay' || t === 'speaking') return 'manual';
  let answered: boolean;
  if (t === 'mcq_multi') answered = ((q.answer_json?.selected as string[] | undefined)?.length ?? 0) > 0;
  else if (t === 'fill_blank' || t === 'short_answer') answered = !!(q.answer_json?.text as string | undefined)?.trim();
  else if (t === 'matching') answered = Object.keys((q.answer_json?.pairs as object | undefined) ?? {}).length > 0;
  else if (t === 'ordering') answered = Object.keys((q.answer_json?.positions as object | undefined) ?? {}).length > 0;
  else answered = q.selected_answer != null;
  if (!answered) return 'unanswered';
  return q.is_correct ? 'correct' : 'wrong';
}

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
      )}
    >
      {label}
      <span className="ml-1 tabular-nums opacity-70">({count})</span>
    </button>
  );
}

/** Panel pembahasan per-soal. Default memakai endpoint peserta; `fetcher` bisa
 *  di-override (mis. endpoint admin) — bentuk responsnya kompatibel (punya `questions`). */
export function AttemptReviewPanel({
  attemptId,
  fetcher,
  data,
}: {
  attemptId: string;
  fetcher?: (id: string) => Promise<AttemptReview>;
  /** Data pra-muat (mis. dari induk) → panel tak fetch lagi (hindari fetch/audit ganda). */
  data?: AttemptReview | null;
}) {
  const [fetched, setFetched] = useState<AttemptReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!data);
  const [activeTab, setActiveTab] = useState('');
  const [filter, setFilter] = useState<'all' | 'wrong' | 'empty'>('all');

  useEffect(() => {
    if (data) return; // data disuplai induk → tak perlu fetch
    let active = true;
    (fetcher ?? attemptsApi.review)(attemptId)
      .then((res) => active && setFetched(res))
      .catch(
        (err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat pembahasan'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId, fetcher, data]);

  const review = data ?? fetched;

  if (!data && loading) {
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

  // Kelompokkan per-section (Structure+WE = satu grup) → tab.
  const order: string[] = [];
  review.questions.forEach((q) => {
    const k = groupKeyOf(q.section);
    if (!order.includes(k)) order.push(k);
  });
  const groups = order.map((k) => {
    const qs = review.questions.filter((q) => groupKeyOf(q.section) === k);
    return {
      key: k,
      label: groupLabelOf(qs[0].section),
      correct: qs.filter((q) => questionState(q) === 'correct').length,
      total: qs.length,
      questions: qs,
    };
  });

  const activeKey = groups.some((g) => g.key === activeTab) ? activeTab : groups[0].key;
  const activeGroup = groups.find((g) => g.key === activeKey) ?? groups[0];

  const numbered = activeGroup.questions.map((q, i) => ({ q, num: i + 1 }));
  const wrongCount = numbered.filter(({ q }) => questionState(q) === 'wrong').length;
  const emptyCount = numbered.filter(({ q }) => questionState(q) === 'unanswered').length;
  const visible = numbered.filter(({ q }) => {
    if (filter === 'all') return true;
    const st = questionState(q);
    return filter === 'wrong' ? st === 'wrong' : st === 'unanswered';
  });

  const jumpTo = (eqId: string) => {
    setFilter('all');
    requestAnimationFrame(() => {
      document.getElementById(`rev-${eqId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const NAV_TONE: Record<QState, string> = {
    correct: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    wrong: 'border-rose-300 bg-rose-50 text-rose-700',
    unanswered: 'border-slate-200 bg-white text-slate-400',
    manual: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Tab per-section (bila lebih dari satu bagian) */}
      {groups.length > 1 && (
        <div className="overflow-x-auto">
          <Tabs
            value={activeKey}
            onChange={(id) => { setActiveTab(id); setFilter('all'); }}
            tabs={groups.map((g) => ({
              id: g.key,
              label: (
                <span className="whitespace-nowrap">
                  {g.label} <span className="opacity-70 tabular-nums">· {g.correct}/{g.total}</span>
                </span>
              ),
            }))}
          />
        </div>
      )}

      {/* Filter + navigator nomor */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Semua" count={numbered.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterChip label="Salah" count={wrongCount} active={filter === 'wrong'} onClick={() => setFilter('wrong')} />
          <FilterChip label="Tak dijawab" count={emptyCount} active={filter === 'empty'} onClick={() => setFilter('empty')} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {numbered.map(({ q, num }) => (
            <button
              key={q.exam_question_id}
              type="button"
              onClick={() => jumpTo(q.exam_question_id)}
              title={`Soal ${num}`}
              className={cn(
                'h-7 w-7 rounded-lg border text-[11px] font-bold tabular-nums transition-transform hover:scale-105',
                NAV_TONE[questionState(q)],
              )}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" /> Benar</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-rose-300 bg-rose-50" /> Salah</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-slate-200 bg-white" /> Tak dijawab</span>
          {numbered.some(({ q }) => questionState(q) === 'manual') && (
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded border border-indigo-200 bg-indigo-50" /> Dinilai manual</span>
          )}
        </div>
      </div>

      {/* Kartu soal (terfilter) */}
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {filter === 'wrong' ? 'Tidak ada jawaban yang salah di bagian ini. 🎉' : 'Tidak ada soal yang belum dijawab di bagian ini.'}
        </p>
      ) : (
        visible.map(({ q, num }) => (
          <div id={`rev-${q.exam_question_id}`} key={q.exam_question_id} className="scroll-mt-4">
            <ReviewCard q={q} number={num} />
          </div>
        ))
      )}
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
  const isSpeaking = q.payload.question_type === 'speaking';
  const speakingAudio = (q.answer_json?.audio_url as string | undefined) ?? '';
  const letterMode =
    !isTFNG && !isMulti && !isFill && !isMatching && !isOrdering && !isEssay && !isSpeaking && (q.section === 'written_expression' || !!q.payload.options_image_url);
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
      : isSpeaking
        ? !!speakingAudio
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
        {isEssay || isSpeaking ? (
          q.awarded_score != null ? (
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Nilai {q.awarded_score}
                {q.max_score != null && `/${q.max_score}`}
              </span>
            </Badge>
          ) : (
            <Badge variant="info">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" /> Menunggu Penilaian
              </span>
            </Badge>
          )
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
        ) : isEssay || isSpeaking ? (
          <div className="flex flex-col gap-2.5">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-3.5">
              <span className="text-xs font-bold text-slate-400 uppercase">
                {isSpeaking ? 'Jawaban speaking-mu' : 'Jawaban esaimu'}
              </span>
              {isSpeaking ? (
                speakingAudio ? (
                  <audio controls src={speakingAudio} className="mt-2 w-full" preload="none">
                    <track kind="captions" />
                  </audio>
                ) : (
                  <p className="mt-1 text-[15px] italic text-slate-400">Tidak dijawab</p>
                )
              ) : (
                <p className={`mt-1 text-[15px] whitespace-pre-wrap leading-relaxed ${answered ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                  {essayText.trim() || 'Tidak dijawab'}
                </p>
              )}
            </div>
            {q.awarded_score != null ? (
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase">Skor Penilaian</span>
                  <span className="text-sm font-extrabold text-emerald-700 tabular-nums">
                    {q.awarded_score}{q.max_score != null && ` / ${q.max_score}`}
                  </span>
                </div>
                {(q.rubric_scores?.scores?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-1">
                    {q.rubric_scores!.scores!.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                        <span>{s.name}</span>
                        <span className="font-bold tabular-nums">{s.score} / {s.max_score}</span>
                      </div>
                    ))}
                  </div>
                )}
                {q.feedback && (
                  <div className="mt-1 border-t border-emerald-200/60 pt-2">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase">Feedback penilai</span>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">{q.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
                <Lightbulb className="h-3.5 w-3.5" />
                {isSpeaking
                  ? 'Jawaban speaking dinilai manual oleh penilai berdasarkan rubrik.'
                  : 'Jawaban esai dinilai manual oleh penilai berdasarkan rubrik.'}
              </p>
            )}
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
