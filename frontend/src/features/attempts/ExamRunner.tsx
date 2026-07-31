'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Send, Loader2, AlertTriangle, ArrowLeft, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/src/lib/cn';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { attemptsApi, type StartAttemptResponse } from './api';
import { SoalPanel } from './SoalPanel';
import { AnswerSheet, type PaletteItem } from './AnswerSheet';

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
  const [text, setText] = useState<Record<string, string>>({}); // fill_blank/short_answer: jawaban teks
  const textTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pairs, setPairs] = useState<Record<string, Record<string, string>>>({}); // matching: leftIdx→rightKey
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // ── Timer countdown + auto-submit ──
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

  const persistFlags = (next: Set<string>) => {
    if (!attemptId) return;
    try {
      localStorage.setItem(flagsKey(attemptId), JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const questions = data?.questions ?? [];
  const q = questions[current];

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

  // fill_blank: ketik jawaban (autosave debounce 400ms; flush saat blur / pindah soal).
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
    if (t === 'fill_blank' || t === 'short_answer') return !!text[x.exam_question_id]?.trim();
    if (t === 'matching' || t === 'ordering') return Object.keys(pairs[x.exam_question_id] ?? {}).length > 0;
    return !!answers[x.exam_question_id];
  };
  const answeredCount = questions.filter(isAnswered).length;
  const unanswered = questions.length - answeredCount;
  const palette: PaletteItem[] = questions.map((x) => ({
    answered: isAnswered(x),
    flagged: flags.has(x.exam_question_id),
  }));

  const timerColor =
    remaining <= 60 ? 'text-red-600 bg-red-50 border-red-200' :
    remaining <= 300 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-slate-700 bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-extrabold text-slate-800 text-sm md:text-base truncate">{data.title}</h1>
          <p className="text-xs text-brand font-bold uppercase tracking-wide">
            {SECTION_LABELS[q.section as ExamSectionId] ?? q.section} · Soal {current + 1}/{questions.length}
          </p>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 font-mono font-extrabold text-lg md:text-xl px-3.5 py-1.5 rounded-xl border tabular-nums',
            timerColor,
          )}
        >
          <Clock className="w-5 h-5" />
          {fmtClock(remaining)}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ListChecks className="w-4 h-4 text-brand" />
            {answeredCount}/{questions.length} terjawab
          </span>
          <Button
            variant="primary"
            onClick={() => { flushText(); setShowConfirm(true); }}
            className="font-bold flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Kumpulkan
          </Button>
        </div>
      </header>

      {/* ── Body: kiri Soal · kanan Lembar Jawaban ── */}
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
              Masih ada <span className="font-bold text-amber-600">{unanswered} soal belum dijawab</span>.
              Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
            </p>
          ) : (
            <p>Semua soal sudah terjawab. Setelah dikumpulkan, jawaban tidak dapat diubah lagi.</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};
