"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ListChecks,
  ArrowRightCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Type,
  Contrast,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/src/lib/cn";
import { useAnswerSync } from "./hooks/useAnswerSync";
import { useAntiCheat } from "./hooks/useAntiCheat";
import {
  SECTION_LABELS,
  type ExamSectionId,
} from "@/features/exams/hooks/useExams";
import {
  attemptsApi,
  type StartAttemptResponse,
  type SectionTiming,
} from "./api";
import { SoalPanel } from "./SoalPanel";
import { AnswerSheet, type PaletteItem } from "./AnswerSheet";
import { BookletOptions, optionsFor } from "./BookletOptions";
import { AnswerBubbleSheet, type BubbleItem } from "./AnswerBubbleSheet";

// Tipe single-choice (pakai selected_answer a/b/c/d) → layout lembar-jawaban OMR.
const SINGLE_CHOICE = new Set(["mcq_single", "true_false_ng"]);
const isSingleChoice = (t?: string) => !t || SINGLE_CHOICE.has(t);

// Section TOEFL ITP: Structure + Written Expression = SATU "Section 2".
const SEC_GROUP_LABEL: Record<string, string> = {
  listening: "Listening Comprehension",
  structure_we: "Structure & Written Expression",
  reading: "Reading Comprehension",
};
const groupKey = (s: string) =>
  s === "structure" || s === "written_expression" ? "structure_we" : s;
const groupLabel = (s: string) =>
  SEC_GROUP_LABEL[groupKey(s)] ?? SECTION_LABELS[s as ExamSectionId] ?? s;

// Tanda-tangan materi → kelompokkan soal yang berbagi passage yang sama (reading "Questions X–Y").
// Pakai ID passage (andal); fallback ke isi bacaan untuk snapshot lama tanpa id.
const passageSig = (x: {
  payload: {
    passage?: {
      id?: string | null;
      content?: string | null;
      audio_url?: string | null;
      image_url?: string | null;
    } | null;
  };
}) => {
  const p = x.payload.passage;
  if (!p) return null;
  if (p.id) return `id:${p.id}`;
  return `${p.content ?? ""}¦${p.audio_url ?? ""}¦${p.image_url ?? ""}`;
};

// Petunjuk bagian (ditampilkan sekali di awal tiap section, ala ETS).
const SECTION_DIRECTIONS: Record<string, string> = {
  listening:
    "Bagian ini menguji kemampuanmu memahami percakapan dan ceramah dalam bahasa Inggris. Dengarkan tiap audio dengan saksama, lalu tandai jawaban yang paling tepat pada lembar jawaban di sebelah kanan.",
  structure_we:
    "Bagian ini menguji penguasaan tata bahasa. Pada tipe Structure, lengkapi kalimat rumpang dengan pilihan yang tepat. Pada tipe Written Expression, temukan satu bagian bergaris (A/B/C/D) yang keliru secara tata bahasa. Tandai jawabanmu pada lembar jawaban.",
  reading:
    "Bagian ini menguji pemahaman bacaan. Baca tiap teks dengan cermat, lalu jawab pertanyaan berdasarkan isi bacaan tersebut. Tandai jawabanmu pada lembar jawaban.",
};

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

const flagsKey = (attemptId: string) => `ln_attempt_flags_${attemptId}`;

// M7.3 Aksesibilitas: skala teks (tingkat) + preferensi tersimpan.
const FONT_STEPS = [0.9, 1, 1.15, 1.3];
const PREFS_KEY = "ln_exam_prefs";
function loadPrefs(): { idx: number; hc: boolean } {
  if (typeof window === "undefined") return { idx: 1, hc: false };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { idx?: number; hc?: boolean };
      return {
        idx: Math.max(0, Math.min(FONT_STEPS.length - 1, p.idx ?? 1)),
        hc: !!p.hc,
      };
    }
  } catch {
    /* abaikan */
  }
  return { idx: 1, hc: false };
}

export const ExamRunner: React.FC<{ examId: string }> = ({ examId }) => {
  const router = useRouter();

  const [data, setData] = useState<StartAttemptResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({}); // mcq_multi: himpunan opsi terpilih
  const [text, setText] = useState<Record<string, string>>({}); // fill_blank/short_answer/essay: jawaban teks
  const textTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pairs, setPairs] = useState<Record<string, Record<string, string>>>(
    {},
  ); // matching: leftIdx→rightKey
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // F1.4b: timing per-bagian (mode berurutan). Null → 1 timer global (perilaku lama).
  const [sectionTiming, setSectionTiming] = useState<SectionTiming | null>(
    null,
  );
  const [sectionEndAt, setSectionEndAt] = useState<number | null>(null);
  const [sectionRemaining, setSectionRemaining] = useState(0);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  // A: petunjuk bagian yang sudah ditutup peserta (per kelompok section).
  const [seenSections, setSeenSections] = useState<Set<string>>(new Set());

  const submittedRef = useRef(false);

  // M7.3: preferensi aksesibilitas (skala teks + kontras tinggi), tersimpan lokal.
  const [scaleIdx, setScaleIdx] = useState<number>(() => loadPrefs().idx);
  const [highContrast, setHighContrast] = useState<boolean>(
    () => loadPrefs().hc,
  );
  const [a11yOpen, setA11yOpen] = useState(false);
  const fontScale = FONT_STEPS[scaleIdx];
  const zoomStyle = { zoom: String(fontScale) } as React.CSSProperties;

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({ idx: scaleIdx, hc: highContrast }),
      );
    } catch {
      /* abaikan */
    }
  }, [scaleIdx, highContrast]);

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
          const aj = q.answer_json as {
            selected?: string[];
            text?: string;
            pairs?: Record<string, string>;
            positions?: Record<string, string>;
          } | null;
          if (Array.isArray(aj?.selected))
            initMulti[q.exam_question_id] = aj.selected;
          if (typeof aj?.text === "string")
            initText[q.exam_question_id] = aj.text;
          if (aj?.pairs && typeof aj.pairs === "object")
            initPairs[q.exam_question_id] = aj.pairs;
          if (aj?.positions && typeof aj.positions === "object")
            initPairs[q.exam_question_id] = aj.positions;
        });
        setAnswers(init);
        setMulti(initMulti);
        setText(initText);
        setPairs(initPairs);
        setEndAt(Date.now() + res.remaining_seconds * 1000);
        setRemaining(res.remaining_seconds);
        if (res.section_timing) {
          setSectionTiming(res.section_timing);
          setSectionEndAt(
            Date.now() + res.section_timing.current_remaining_seconds * 1000,
          );
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
        if (active)
          setLoadError(
            err instanceof Error ? err.message : "Gagal memuat ujian",
          );
      });
    return () => {
      active = false;
    };
  }, [examId]);

  const attemptId = data?.attempt_id ?? null;

  // M7.2: sinkronisasi jawaban tahan-gangguan (indikator + retry + offline).
  const sync = useAnswerSync(attemptId);
  const { save: syncSave, clear: syncClear } = sync;

  // ── Submit (dipakai manual & auto) ──
  const doSubmit = useCallback(async () => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      syncClear(); // hentikan retry ke attempt yang akan selesai
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
      setLoadError(
        err instanceof Error ? err.message : "Gagal mengumpulkan ujian",
      );
    }
  }, [attemptId, router, syncClear]);

  // M8.1: deteksi anti-cheat (fokus/copy-paste/fullscreen) + peringatan + auto-submit.
  const antiCheat = useAntiCheat({
    attemptId,
    config: data?.anti_cheat,
    active: !!data,
    onAutoSubmit: doSubmit,
  });

  const perSection = !!sectionTiming;
  const order = sectionTiming?.order ?? [];
  const activeSection = sectionTiming?.current_section ?? null;
  const sectionIndex = activeSection ? order.indexOf(activeSection) : -1;
  const isLastSection =
    perSection && order.length > 0 && activeSection === order[order.length - 1];

  const allQuestions = data?.questions ?? [];
  const questions = perSection
    ? allQuestions.filter((x) => x.section === activeSection)
    : allQuestions;
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
        console.warn("advance gagal", err);
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
    syncSave(eqId, key);
  };

  // mcq_multi: toggle satu opsi (hormati batas "pilih N" dari content_json.choose).
  const handleMultiToggle = (key: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    const choose = (
      q.payload.content_json as { choose?: number } | null | undefined
    )?.choose;
    const cur = multi[eqId] ?? [];
    let next: string[];
    if (cur.includes(key)) {
      next = cur.filter((k) => k !== key);
    } else {
      if (choose && cur.length >= choose) return; // sudah mencapai jumlah maksimal
      next = [...cur, key];
    }
    setMulti((prev) => ({ ...prev, [eqId]: next }));
    syncSave(eqId, null, { selected: next });
  };

  // fill_blank/essay: ketik jawaban (autosave debounce 400ms; flush saat blur / pindah soal).
  const saveText = (eqId: string, value: string) =>
    syncSave(eqId, null, { text: value });
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
      saveText(eqId, text[eqId] ?? "");
    }
  };

  // matching: item kiri(index) → opsi kanan(key). ordering: item(index) → posisi.
  const handlePairChange = (leftIdx: number, rightKey: string) => {
    if (!q || !attemptId || submittedRef.current) return;
    const eqId = q.exam_question_id;
    const nextPairs = { ...(pairs[eqId] ?? {}), [String(leftIdx)]: rightKey };
    setPairs((prev) => ({ ...prev, [eqId]: nextPairs }));
    const body =
      q.payload.question_type === "ordering"
        ? { positions: nextPairs }
        : { pairs: nextPairs };
    syncSave(eqId, null, body);
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
          <h2 className="text-lg font-extrabold text-slate-800">
            Tidak dapat memulai ujian
          </h2>
          <p className="text-sm text-slate-500">{loadError}</p>
          <Button
            variant="secondary"
            onClick={() => router.replace("/ujian")}
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
    if (t === "mcq_multi") return (multi[x.exam_question_id]?.length ?? 0) > 0;
    if (t === "fill_blank" || t === "short_answer" || t === "essay")
      return !!text[x.exam_question_id]?.trim();
    if (t === "matching" || t === "ordering")
      return Object.keys(pairs[x.exam_question_id] ?? {}).length > 0;
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
    shownRemaining <= 60
      ? "text-red-600 bg-red-50 border-red-200"
      : shownRemaining <= 300
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-slate-700 bg-slate-50 border-slate-200";

  const activeLabel = activeSection
    ? (SECTION_LABELS[activeSection as ExamSectionId] ?? activeSection)
    : (SECTION_LABELS[q.section as ExamSectionId] ?? q.section);

  // M7.2: indikator status simpan + kondisi koneksi.
  const offlineState = !sync.online || sync.status === "offline";
  const savePill = offlineState
    ? {
        icon: <CloudOff className="w-3.5 h-3.5" />,
        text: "Luring",
        cls: "text-slate-500 bg-slate-100 border-slate-200",
      }
    : sync.status === "saving"
      ? {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          text: "Menyimpan…",
          cls: "text-slate-500 bg-slate-50 border-slate-200",
        }
      : sync.status === "error"
        ? {
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            text: "Gagal menyimpan",
            cls: "text-amber-700 bg-amber-50 border-amber-200",
          }
        : {
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            text: "Tersimpan",
            cls: "text-emerald-600 bg-emerald-50 border-emerald-200",
          };
  const showConnBanner = offlineState || sync.status === "error";

  // ── Mode OMR (buku soal + lembar jawaban bubble) — untuk ujian single-choice/ITP ──
  const omrMode =
    allQuestions.length > 0 &&
    allQuestions.every((x) => isSingleChoice(x.payload.question_type));
  // Section aktif (Structure+WE = satu Section 2). Nomor section = urutan kemunculan bagian.
  const gKey = groupKey(q.section);
  const sheetQuestions = questions.filter((x) => groupKey(x.section) === gKey);
  const groupedLabel = groupLabel(q.section);
  const presentGroups: string[] = [];
  allQuestions.forEach((x) => {
    const k = groupKey(x.section);
    if (!presentGroups.includes(k)) presentGroups.push(k);
  });
  const sectionNo = presentGroups.indexOf(gKey) + 1;
  const totalGroups = presentGroups.length;
  const bubbleItems: BubbleItem[] = sheetQuestions.map((x) => ({
    exam_question_id: x.exam_question_id,
    option_count: optionsFor(x.payload).length,
  }));
  const currentLocalIdx = sheetQuestions.findIndex(
    (x) => x.exam_question_id === q.exam_question_id,
  );
  const flagged = flags.has(q.exam_question_id);

  // D: rentang soal yang berbagi materi ini (reading "Questions X–Y").
  const curSig = passageSig(q);
  let grpStart = currentLocalIdx;
  let grpEnd = currentLocalIdx;
  if (curSig && currentLocalIdx >= 0) {
    while (grpStart > 0 && passageSig(sheetQuestions[grpStart - 1]) === curSig)
      grpStart--;
    while (
      grpEnd < sheetQuestions.length - 1 &&
      passageSig(sheetQuestions[grpEnd + 1]) === curSig
    )
      grpEnd++;
  }
  const passageGroupLabel =
    curSig && grpEnd > grpStart
      ? `Questions ${grpStart + 1}–${grpEnd + 1}`
      : null;

  // A: tampilkan petunjuk saat masuk section baru (belum ditutup).
  const showDirections = omrMode && sectionNo > 0 && !seenSections.has(gKey);
  const dismissDirections = () =>
    setSeenSections((prev) => new Set(prev).add(gKey));

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
    syncSave(eqId, key);
    jumpToEq(eqId);
  };
  const bubbleJump = (localIdx: number) => {
    const target = sheetQuestions[localIdx];
    if (target) jumpToEq(target.exam_question_id);
  };
  const goPrev = () => {
    flushText();
    setCurrent((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    flushText();
    setCurrent((i) => Math.min(questions.length - 1, i + 1));
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        omrMode ? "bg-white" : "bg-slate-100",
        highContrast && "exam-hc",
      )}
    >
      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 md:px-7 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* kiri: judul + section */}
        <div className="min-w-0">
          <h1 className="font-extrabold text-slate-800 text-sm md:text-[15px] truncate leading-tight">
            {data.title}
          </h1>
          <p className="text-[11px] md:text-xs text-brand font-bold mt-0.5 truncate">
            {omrMode && sectionNo ? (
              <>
                Section {sectionNo}
                <span className="text-slate-300 font-normal mx-1.5">·</span>
                {groupedLabel}
              </>
            ) : perSection ? (
              <>
                {activeLabel}
                <span className="text-slate-300 font-normal mx-1.5">·</span>
                Bagian {sectionIndex + 1}/{order.length}
              </>
            ) : (
              activeLabel
            )}
          </p>
        </div>

        {/* tengah: timer */}
        <div
          className={cn(
            "justify-self-center flex items-center gap-2.5 font-extrabold text-lg md:text-xl px-4 py-1.5 rounded-full border tabular-nums",
            timerColor,
          )}
        >
          <Clock className="w-4.5 h-4.5" />
          {fmtClock(shownRemaining)}
          {perSection && (
            <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-widest opacity-60">
              / bagian
            </span>
          )}
        </div>

        {/* kanan: progres + aksi */}
        <div className="justify-self-end flex items-center gap-3 md:gap-4">
          {/* M7.3: kontrol aksesibilitas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setA11yOpen((v) => !v)}
              title="Aksesibilitas — ukuran teks & kontras"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl border transition-colors",
                a11yOpen || highContrast || scaleIdx !== 1
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50",
              )}
            >
              <Type className="h-4.5 w-4.5" />
            </button>
            {a11yOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setA11yOpen(false)}
                />
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Ukuran teks
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setScaleIdx((i) => Math.max(0, i - 1))}
                      disabled={scaleIdx === 0}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-sm font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      A<span className="text-[10px]">−</span>
                    </button>
                    <span className="text-sm font-bold tabular-nums text-slate-700">
                      {Math.round(fontScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setScaleIdx((i) =>
                          Math.min(FONT_STEPS.length - 1, i + 1),
                        )
                      }
                      disabled={scaleIdx === FONT_STEPS.length - 1}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-base font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      A<span className="text-xs">+</span>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      <Contrast className="h-4 w-4" /> Kontras tinggi
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={highContrast}
                      onClick={() => setHighContrast((v) => !v)}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        highContrast ? "bg-brand" : "bg-slate-200",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          highContrast ? "left-5.5" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap",
              savePill.cls,
            )}
          >
            {savePill.icon}
            <span className="hidden md:inline">{savePill.text}</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-400 tabular-nums">
            <ListChecks className="w-4 h-4 text-brand/70" />
            {answeredCount}/{questions.length}
          </span>
          {perSection && !isLastSection ? (
            <Button
              variant="primary"
              onClick={() => {
                flushText();
                setShowAdvanceConfirm(true);
              }}
              loading={advancing}
              className="font-bold flex items-center gap-2"
            >
              <ArrowRightCircle className="w-4 h-4" />
              Selesai & Lanjut
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                flushText();
                setShowConfirm(true);
              }}
              className="font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Kumpulkan
            </Button>
          )}
        </div>
      </header>

      {/* M7.2: banner konektivitas — jawaban aman, tersimpan otomatis saat online */}
      {showConnBanner && (
        <div
          className={cn(
            "shrink-0 flex items-center justify-center gap-2.5 px-4 py-2 text-xs font-bold",
            offlineState
              ? "bg-slate-800 text-white"
              : "bg-amber-50 text-amber-800 border-b border-amber-200",
          )}
        >
          {offlineState ? (
            <CloudOff className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-center">
            {offlineState
              ? "Koneksi terputus — jawabanmu aman & akan tersimpan otomatis saat kembali online."
              : "Sebagian jawaban belum tersimpan ke server. Sedang mencoba lagi otomatis."}
          </span>
          {!offlineState && (
            <button
              type="button"
              onClick={sync.retryNow}
              className="inline-flex items-center gap-1 rounded-md bg-amber-200/70 px-2 py-0.5 text-amber-900 hover:bg-amber-200"
            >
              <RefreshCw className="w-3 h-3" /> Coba sekarang
            </button>
          )}
        </div>
      )}

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
                  "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap",
                  isActive
                    ? "border-brand bg-brand/10 text-brand"
                    : done
                      ? "border-slate-200 bg-slate-50 text-slate-400"
                      : "border-slate-100 bg-white text-slate-400",
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
          <main style={zoomStyle} className="min-h-0 overflow-y-auto p-5 md:p-8">
            <div className="max-w-3xl mx-auto flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand px-2.5 text-sm font-extrabold tabular-nums text-white">
                  {currentLocalIdx + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Soal {currentLocalIdx + 1} dari {sheetQuestions.length} ·{" "}
                  {groupedLabel}
                </span>
              </div>

              <SoalPanel q={q.payload} groupLabel={passageGroupLabel} />
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
                    "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition-colors",
                    flagged
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <Flag
                    className={cn(
                      "w-3.5 h-3.5",
                      flagged && "fill-amber-400 text-amber-500",
                    )}
                  />
                  {flagged ? "Ditandai" : "Tandai"}
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

          <aside style={zoomStyle} className="min-h-0 overflow-y-auto overflow-x-hidden bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 md:p-6">
            <AnswerBubbleSheet
              sectionLabel={
                sectionNo
                  ? `Section ${sectionNo} · ${groupedLabel}`
                  : groupedLabel
              }
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
          <main style={zoomStyle} className="min-h-0 overflow-y-auto p-5 md:p-8">
            <div className="max-w-3xl mx-auto lg:mx-0">
              <SoalPanel q={q.payload} />
            </div>
          </main>

          <aside style={zoomStyle} className="min-h-0 overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-5 md:p-6">
            <AnswerSheet
              q={q.payload}
              number={current + 1}
              selected={answers[q.exam_question_id] ?? null}
              onSelect={handleSelect}
              multiSelected={multi[q.exam_question_id] ?? []}
              onMultiToggle={handleMultiToggle}
              textValue={text[q.exam_question_id] ?? ""}
              onTextChange={handleTextChange}
              onTextBlur={flushText}
              pairs={pairs[q.exam_question_id] ?? {}}
              onPairChange={handlePairChange}
              flagged={flags.has(q.exam_question_id)}
              onToggleFlag={toggleFlag}
              palette={palette}
              currentIndex={current}
              onJump={(i) => {
                flushText();
                setCurrent(i);
              }}
              onPrev={() => {
                flushText();
                setCurrent((i) => Math.max(0, i - 1));
              }}
              onNext={() => {
                flushText();
                setCurrent((i) => Math.min(questions.length - 1, i + 1));
              }}
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
              Masih ada{" "}
              <span className="font-bold text-amber-600">
                {unanswered} soal belum dijawab
              </span>{" "}
              di bagian ini. Setelah lanjut, bagian ini{" "}
              <span className="font-bold">terkunci</span> dan tidak bisa dibuka
              lagi. Sisa waktu bagian ini{" "}
              <span className="font-bold">hangus</span>.
            </p>
          ) : (
            <p>
              Bagian ini akan <span className="font-bold">terkunci</span> dan
              tidak bisa dibuka lagi. Sisa waktunya hangus, lalu timer bagian
              berikutnya dimulai.
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
              Masih ada{" "}
              <span className="font-bold text-amber-600">
                {unanswered} soal belum dijawab
              </span>
              {perSection ? " di bagian ini" : ""}. Setelah dikumpulkan, jawaban
              tidak dapat diubah lagi.
            </p>
          ) : (
            <p>
              {perSection
                ? "Bagian terakhir selesai. "
                : "Semua soal sudah terjawab. "}
              Setelah dikumpulkan, jawaban tidak dapat diubah lagi.
            </p>
          )}
        </div>
      </ConfirmDialog>

      {/* ── Petunjuk bagian (ETS-style) — sekali di awal tiap section ── */}
      {showDirections && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 md:p-10 shadow-xl flex flex-col items-center gap-5 text-center">
            <span className="inline-flex items-center rounded-full bg-brand/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-brand">
              Section {sectionNo} dari {totalGroups}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 text-balance">
              {groupedLabel}
            </h2>
            <p className="text-[15px] leading-relaxed text-slate-500">
              {SECTION_DIRECTIONS[gKey] ??
                "Pilih jawaban yang paling tepat pada lembar jawaban."}
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <span>{sheetQuestions.length} soal</span>
              {perSection && sectionRemaining > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />{" "}
                  {Math.ceil(sectionRemaining / 60)} menit
                </span>
              )}
            </div>
            <Button
              variant="primary"
              onClick={dismissDirections}
              className="mt-1 font-bold flex items-center gap-2"
            >
              Mulai Bagian
              <ArrowRightCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* M8.1: overlay wajib layar penuh */}
      {antiCheat.needFullscreen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl flex flex-col items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">Wajib Layar Penuh</h2>
            <p className="text-sm text-slate-500">
              Ujian ini harus dikerjakan dalam mode layar penuh. Klik tombol di bawah untuk melanjutkan.
            </p>
            <Button variant="primary" className="font-bold" onClick={antiCheat.enterFullscreen}>
              Masuk Layar Penuh
            </Button>
          </div>
        </div>
      )}

      {/* M8.1: peringatan pelanggaran */}
      {antiCheat.warning && !antiCheat.needFullscreen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl flex flex-col items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
              <AlertTriangle className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-800">Peringatan Integritas</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{antiCheat.warning}</p>
            <Button variant="secondary" className="font-bold" onClick={antiCheat.dismissWarning}>
              Saya Mengerti
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
