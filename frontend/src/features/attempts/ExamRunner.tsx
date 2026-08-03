'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Send, Loader2, AlertTriangle, ArrowLeft, ListChecks, ArrowRightCircle, Lock, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/src/lib/cn';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { attemptsApi, type StartAttemptResponse, type SectionTiming } from './api';
import { SoalPanel } from './SoalPanel';
import { AnswerSheet, type PaletteItem } from './AnswerSheet';
import { BookletOptions, optionsFor } from './BookletOptions';
import { AnswerBubbleSheet, type BubbleItem } from './AnswerBubbleSheet';

// Tipe single-choice (pakai selected_answer a/b/c/d) → layout lembar-jawaban OMR.
const SINGLE_CHOICE = new Set(['mcq_single', 'true_false_ng']);
const isSingleChoice = (t?: string) => !t || SINGLE_CHOICE.has(t);

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const flagsKey = (attemptId: string) => `ln_attempt_flags_${attemptId}`;

export const ExamRunner: React.FC<{ examId: string }> = ({ examId }) => {
  const router = useRouter();

  const [data, setData] = useState<StartAttemptResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({}); // mcq_multi: himpunan opsi terpilih
  const [text, setText] = useState<Record<string, string>>({}); // fill_blank/short_answer/essay: jawaban teks
  const textTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pairs, setPairs] = useState<Record<string, Record<string, string>>>({}); // matching: leftIdx→rightKey
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // F1.4b: timing per-bagian (mode berurutan). Null → 1 timer global (perilaku lama).
  const [sectionTiming, setSectionTiming] = useState<SectionTiming | null>(null);
  const [sectionEndAt, setSectionEndAt] = useState<number | null>(null);
  const [sectionRemaining, setSectionRemaining] = useState(0);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const submittedRef = useRef(false);

  // ── Mulai / lanjut percobaan ──
  useEffect(() => {
    let active = true;
    attemptsApi
      .start(examId)
      .then((res) => {
        if (!active) return;
        setData(res);
        const init: Record<string, string | null> = {};
        const initMulti: Record<string, string[]> = {};
        const initText: Record<string, string> = {};
        const initPairs: Record<string, Record<string, string>> = {};
        res.questions.forEach((q) => {
          init[q.exam_question_id] = q.selected_answer;
          const aj = q.answer_json as
            | { selected?: string[]; text?: string; pairs?: Record<string, string>; positions?: Record<string, string> }
            | null;
          if (Array.isArray(aj?.selected)) initMulti[q.exam_question_id] = aj.selected;
          if (typeof aj?.text === 'string') initText[q.exam_question_id] = aj.text;
          if (aj?.pairs && typeof aj.pairs === 'object') initPairs[q.exam_question_id] = aj.pairs;
          if (aj?.positions && typeof aj.positions === 'object') initPairs[q.exam_question_id] = aj.positions;
        });
        setAnswers(init);
        setMulti(initMulti);
        setText(initText);
        setPairs(initPairs);
        setEndAt(Date.now() + res.remaining_seconds * 1000);
        setRemaining(res.remaining_seconds);
        if (res.section_timing) {
          setSectionTiming(res.section_timing);
          setSectionEndAt(Date.now() + res.section_timing.current_remaining_seconds * 1000);
          setSectionRemaining(res.section_timing.current_remaining_seconds);
        }
        try {
          const raw = localStorage.getItem(flagsKey(res.attempt_id));
          if (raw) setFlags(new Set(JSON.parse(raw) as string[]));
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Gagal memuat ujian');
      });
    return () => {
      active = false;
    };
  }, [examId]);

  const attemptId = data?.attempt_id ?? null;

  // ── Submit (dipakai manual & auto) ──
  const doSubmit = useCallback(async () => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await attemptsApi.submit(attemptId);
      try {
        localStorage.removeItem(flagsKey(attemptId));
      } catch {
        /* ignore */
      }
      router.replace(`/ujian/hasil/${attemptId}`);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setLoadError(err instanceof Error ? err.message : 'Gagal mengumpulkan ujian');
    }
  }, [attemptId, router]);

  const perSection = !!sectionTiming;
  const order = sectionTiming?.order ?? [];
  const activeSection = sectionTiming?.current_section ?? null;
  const sectionIndex = activeSection ? order.indexOf(activeSection) : -1;
  const isLastSection = perSection && order.length > 0 && activeSection === order[order.length - 1];

  const allQuestions = data?.questions ?? [];
  const questions = perSection ? allQuestions.filter((x) => x.section === activeSection) : allQuestions;
  const q = questions[current];

  // ── Maju ke bagian berikutnya (kunci bagian aktif) ──
  const doAdvance = useCallback(
    async (section: string) => {
      if (!attemptId || submittedRef.current) return;
      // flush teks tertunda bagian ini
      Object.keys(textTimers.current).forEach((eqId) => {
        clearTimeout(textTimers.current[eqId]);
        delete textTimers.current[eqId];
      });
      setAdvancing(true);
      try {
        const res = await attemptsApi.advance(attemptId, section);
        setSectionTiming(res);
        setCurrent(0);
        if (!res.finished) {
          setSectionEndAt(Date.now() + res.current_remaining_seconds * 1000);
          setSectionRemaining(res.current_remaining_seconds);
        }
      } catch (err) {
        console.warn('advance gagal', err);
      } finally {
        setAdvancing(false);
      }
    },
    [attemptId],
  );

  // Semua bagian selesai (waktu habis) → kumpulkan otomatis (defer keluar dari body efek).
  useEffect(() => {
    if (!sectionTiming?.finished) return;
    const t = setTimeout(() => void doSubmit(), 0);
    return () => clearTimeout(t);
  }, [sectionTiming, doSubmit]);

  // ── Timer global (dinding keras / mode tanpa per-bagian) ──
  useEffect(() => {
    if (endAt === null) return;
    const tick = () => {
      const left = Math.round((endAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        void doSubmit();
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, doSubmit]);

  // ── Timer per-bagian ──
  useEffect(() => {
    if (!perSection || sectionEndAt === null) return;
    const tick = () => {
      const left = Math.round((sectionEndAt - Date.now()) / 1000);
      setSectionRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        if (activeSection) void doAdvance(activeSection); // habis → kunci & lanjut (bagian terakhir → finished → submit)
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [perSection, sectionEndAt, activeSection, doAdvance]);

  const persistFlags = (next: Set<string>) => {
    if (!attemptId) return;
    try {
      localStorage.setItem(flagsKey(attemptId), JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const handleSelect = (key: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    setAnswers((prev) => ({ ...prev, [eqId]: key }));
    void attemptsApi.saveAnswer(attemptId, eqId, key).catch((e) => console.warn('autosave gagal', e));
  };

  // mcq_multi: toggle satu opsi (hormati batas "pilih N" dari content_json.choose).
  const handleMultiToggle = (key: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    const choose = (q.payload.content_json as { choose?: number } | null | undefined)?.choose;
    const cur = multi[eqId] ?? [];
    let next: string[];
    if (cur.includes(key)) {
      next = cur.filter((k) => k !== key);
    } else {
      if (choose && cur.length >= choose) return; // sudah mencapai jumlah maksimal
      next = [...cur, key];
    }
    setMulti((prev) => ({ ...prev, [eqId]: next }));
    void attemptsApi
      .saveAnswer(attemptId, eqId, null, { selected: next })
      .catch((e) => console.warn('autosave gagal', e));
  };

  // fill_blank/essay: ketik jawaban (autosave debounce 400ms; flush saat blur / pindah soal).
  const saveText = (eqId: string, value: string) =>
    void attemptsApi.saveAnswer(attemptId!, eqId, null, { text: value }).catch((e) => console.warn('autosave gagal', e));
  const handleTextChange = (value: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    setText((prev) => ({ ...prev, [eqId]: value }));
    if (textTimers.current[eqId]) clearTimeout(textTimers.current[eqId]);
    textTimers.current[eqId] = setTimeout(() => saveText(eqId, value), 400);
  };
  const flushText = () => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    if (textTimers.current[eqId]) {
      clearTimeout(textTimers.current[eqId]);
      delete textTimers.current[eqId];
      saveText(eqId, text[eqId] ?? '');
    }
  };

  // matching: item kiri(index) → opsi kanan(key). ordering: item(index) → posisi.
  const handlePairChange = (leftIdx: number, rightKey: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    const nextPairs = { ...(pairs[eqId] ?? {}), [String(leftIdx)]: rightKey };
    setPairs((prev) => ({ ...prev, [eqId]: nextPairs }));
    const body = q.payload.question_type === 'ordering' ? { positions: nextPairs } : { pairs: nextPairs };
    void attemptsApi.saveAnswer(attemptId, eqId, null, body).catch((e) => console.warn('autosave gagal', e));
  };

  const toggleFlag = () => {
    if (!q) return;
    const eqId = q.exam_question_id;
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(eqId)) next.delete(eqId);
      else next.add(eqId);
      persistFlags(next);
      return next;
    });
  };

  // ── Loading / error ──
  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">Tidak dapat memulai ujian</h2>
          <p className="text-sm text-slate-500">{loadError}</p>
          <Button
            variant="secondary"
            onClick={() => router.replace('/ujian')}
            className="font-bold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Ujian
          </Button>
        </div>
      </div>
    );
  }

  if (!data || !q) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Menyiapkan ujian…</p>
        </div>
      </div>
    );
  }

  const isAnswered = (x: (typeof questions)[number]) => {
    const t = x.payload.question_type;
    if (t === 'mcq_multi') return (multi[x.exam_question_id]?.length ?? 0) > 0;
    if (t === 'fill_blank' || t === 'short_answer' || t === 'essay') return !!text[x.exam_question_id]?.trim();
    if (t === 'matching' || t === 'ordering') return Object.keys(pairs[x.exam_question_id] ?? {}).length > 0;
    return !!answers[x.exam_question_id];
  };
  const answeredCount = questions.filter(isAnswered).length;
  const unanswered = questions.length - answeredCount;
  const palette: PaletteItem[] = questions.map((x) => ({
    answered: isAnswered(x),
    flagged: flags.has(x.exam_question_id),
  }));

  const shownRemaining = perSection ? sectionRemaining : remaining;
  const timerColor =
    shownRemaining <= 60 ? 'text-red-600 bg-red-50 border-red-200' :
    shownRemaining <= 300 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-slate-700 bg-slate-50 border-slate-200';

  const activeLabel = activeSection
    ? SECTION_LABELS[activeSection as ExamSectionId] ?? activeSection
    : SECTION_LABELS[q.section as ExamSectionId] ?? q.section;

  // ── Mode OMR (buku soal + lembar jawaban bubble) — untuk ujian single-choice/ITP ──
  const omrMode = allQuestions.length > 0 && allQuestions.every((x) => isSingleChoice(x.payload.question_type));
  // Lembar jawaban dibatasi ke BAGIAN aktif (nomor per-bagian, ala ITP).
  const sheetQuestions = questions.filter((x) => x.section === q.section);
  const bubbleItems: BubbleItem[] = sheetQuestions.map((x) => ({
    exam_question_id: x.exam_question_id,
    option_count: optionsFor(x.payload).length,
  }));
  const currentLocalIdx = sheetQuestions.findIndex((x) => x.exam_question_id === q.exam_question_id);
  const flagged = flags.has(q.exam_question_id);

  const jumpToEq = (eqId: string) => {
    flushText();
    const gi = questions.findIndex((x) => x.exam_question_id === eqId);
    if (gi >= 0) setCurrent(gi);
  };
  const bubblePick = (localIdx: number, key: string) => {
    const target = sheetQuestions[localIdx];
    if (!target || !attemptId || submittedRef.current) return;
    const eqId = target.exam_question_id;
    setAnswers((prev) => ({ ...prev, [eqId]: key }));
    void attemptsApi.saveAnswer(attemptId, eqId, key).catch((e) => console.warn('autosave gagal', e));
    jumpToEq(eqId);
  };
  const bubbleJump = (localIdx: number) => {
    const target = sheetQuestions[localIdx];
    if (target) jumpToEq(target.exam_question_id);
  };
  const goPrev = () => { flushText(); setCurrent((i) => Math.max(0, i - 1)); };
  const goNext = () => { flushText(); setCurrent((i) => Math.min(questions.length - 1, i + 1)); };

  return (
    <div className={cn('fixed inset-0 z-50 flex flex-col', omrMode ? 'bg-white' : 'bg-slate-100')}>
      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-extrabold text-slate-800 text-sm md:text-base truncate">{data.title}</h1>
          <p className="text-xs text-brand font-bold uppercase tracking-wide">
            {perSection ? (
              <>
                {activeLabel} · Bagian {sectionIndex + 1}/{order.length} · Soal {current + 1}/{questions.length}
              </>
            ) : (
              <>
                {activeLabel} · Soal {current + 1}/{questions.length}
              </>
            )}
          </p>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 font-mono font-extrabold text-lg md:text-xl px-3.5 py-1.5 rounded-xl border tabular-nums',
            timerColor,
          )}
        >
          <Clock className="w-5 h-5" />
          {fmtClock(shownRemaining)}
          {perSection && <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wide opacity-70">bagian</span>}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ListChecks className="w-4 h-4 text-brand" />
            {answeredCount}/{questions.length} terjawab
          </span>
          {perSection && !isLastSection ? (
            <Button
              variant="primary"
              onClick={() => { flushText(); setShowAdvanceConfirm(true); }}
              loading={advancing}
              className="font-bold flex items-center gap-2"
            >
              <ArrowRightCircle className="w-4 h-4" />
              Selesai & Lanjut
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => { flushText(); setShowConfirm(true); }}
              className="font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Kumpulkan
            </Button>
          )}
        </div>
      </header>

      {/* Bilah bagian (mode per-bagian) */}
      {perSection && (
        <div className="shrink-0 bg-white/70 border-b border-slate-200 px-4 md:px-6 py-2 flex items-center gap-2 overflow-x-auto">
          {order.map((s, i) => {
            const done = sectionTiming?.done_sections.includes(s);
            const isActive = s === activeSection;
            return (
              <span
                key={s}
                className={cn(
                  'inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap',
                  isActive
                    ? 'border-brand bg-brand/10 text-brand'
                    : done
                      ? 'border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-slate-100 bg-white text-slate-400',
                )}
              >
                {done && <Lock className="w-3 h-3" />}
                {i + 1}. {SECTION_LABELS[s as ExamSectionId] ?? s}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Body ── */}
      {omrMode ? (
        /* Layout OMR: kiri BUKU SOAL (opsi display-only) · kanan LEMBAR JAWABAN (bubble) */
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
          <main className="min-h-0 overflow-y-auto p-5 md:p-8">
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand px-2.5 text-sm font-extrabold tabular-nums text-white">
                  {currentLocalIdx + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Soal {currentLocalIdx + 1} dari {sheetQuestions.length} · {activeLabel}
                </span>
              </div>

              <SoalPanel q={q.payload} />
              <BookletOptions q={q.payload} />

              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="secondary"
                  onClick={goPrev}
                  disabled={current === 0}
                  className="flex-1 font-bold flex items-center justify-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </Button>
                <button
                  type="button"
                  onClick={toggleFlag}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition-colors',
                    flagged
                      ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  <Flag className={cn('w-3.5 h-3.5', flagged && 'fill-amber-400 text-amber-500')} />
                  {flagged ? 'Ditandai' : 'Tandai'}
                </button>
                <Button
                  variant="secondary"
                  onClick={goNext}
                  disabled={current === questions.length - 1}
                  className="flex-1 font-bold flex items-center justify-center gap-1.5"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto overflow-x-hidden bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 md:p-6">
            <AnswerBubbleSheet
              sectionLabel={activeLabel}
              items={bubbleItems}
              answers={answers}
              currentLocalIdx={currentLocalIdx}
              flaggedIds={flags}
              onPick={bubblePick}
              onJump={bubbleJump}
            />
          </aside>
        </div>
      ) : (
        /* Layout lama (tipe non-MCQ: essay/matching/isian/…): panel jawaban inline + peta soal */
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)]">
          <main className="min-h-0 overflow-y-auto p-5 md:p-8">
            <div className="max-w-3xl mx-auto lg:mx-0">
              <SoalPanel q={q.payload} />
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 md:p-6">
            <AnswerSheet
              q={q.payload}
              number={current + 1}
              selected={answers[q.exam_question_id] ?? null}
              onSelect={handleSelect}
              multiSelected={multi[q.exam_question_id] ?? []}
              onMultiToggle={handleMultiToggle}
              textValue={text[q.exam_question_id] ?? ''}
              onTextChange={handleTextChange}
              onTextBlur={flushText}
              pairs={pairs[q.exam_question_id] ?? {}}
              onPairChange={handlePairChange}
              flagged={flags.has(q.exam_question_id)}
              onToggleFlag={toggleFlag}
              palette={palette}
              currentIndex={current}
              onJump={(i) => { flushText(); setCurrent(i); }}
              onPrev={() => { flushText(); setCurrent((i) => Math.max(0, i - 1)); }}
              onNext={() => { flushText(); setCurrent((i) => Math.min(questions.length - 1, i + 1)); }}
            />
          </aside>
        </div>
      )}

      {/* ── Konfirmasi lanjut bagian (mode per-bagian) ── */}
      <ConfirmDialog
        open={showAdvanceConfirm}
        onClose={() => setShowAdvanceConfirm(false)}
        title="Selesai & Lanjut ke Bagian Berikutnya?"
        icon={<ArrowRightCircle className="w-5 h-5 text-brand" />}
        confirmLabel="Ya, Lanjut"
        confirmIcon={<ArrowRightCircle className="w-4 h-4" />}
        loading={advancing}
        onConfirm={() => {
          setShowAdvanceConfirm(false);
          if (activeSection) void doAdvance(activeSection);
        }}
      >
        <div className="text-sm text-slate-600 leading-relaxed">
          {unanswered > 0 ? (
            <p>
              Masih ada <span className="font-bold text-amber-600">{unanswered} soal belum dijawab</span> di
              bagian ini. Setelah lanjut, bagian ini <span className="font-bold">terkunci</span> dan tidak
              bisa dibuka lagi. Sisa waktu bagian ini <span className="font-bold">hangus</span>.
            </p>
          ) : (
            <p>
              Bagian ini akan <span className="font-bold">terkunci</span> dan tidak bisa dibuka lagi. Sisa
              waktunya hangus, lalu timer bagian berikutnya dimulai.
            </p>
          )}
        </div>
      </ConfirmDialog>

      {/* ── Konfirmasi kumpulkan ── */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Kumpulkan Ujian?"
        icon={<Send className="w-5 h-5 text-brand" />}
        confirmLabel="Ya, Kumpulkan"
        confirmIcon={<Send className="w-4 h-4" />}
        loading={submitting}
        onConfirm={() => {
          setShowConfirm(false);
          void doSubmit();
        }}
      >
        <div className="text-sm text-slate-600 leading-relaxed">
          {unanswered > 0 ? (
            <p>
              Masih ada <span className="font-bold text-amber-600">{unanswered} soal belum dijawab</span>
              {perSection ? ' di bagian ini' : ''}. Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
            </p>
          ) : (
            <p>
              {perSection ? 'Bagian terakhir selesai. ' : 'Semua soal sudah terjawab. '}
              Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};
