"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Hourglass,
  Headphones,
  PencilRuler,
  BookOpenText,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SECTION_LABELS,
  type ExamSectionId,
} from "@/features/exams/hooks/useExams";
import {
  attemptsApi,
  type AttemptResult,
  type SectionResult,
} from "@/features/attempts/api";
import { AttemptReviewPanel } from "@/features/attempts/AttemptReviewPanel";

function fmtDate(v: string | null): string | null {
  if (!v) return null;
  try {
    return new Date(v).toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function sectionIconEl(section: string) {
  const cls = "h-4.5 w-4.5";
  if (section === "listening") return <Headphones className={cls} />;
  if (section === "reading") return <BookOpenText className={cls} />;
  return <PencilRuler className={cls} />; // structure / written_expression / structure_we
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function AttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params?.attemptId;
  const router = useRouter();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    attemptsApi
      .result(attemptId)
      .then((res) => active && setResult(res))
      .catch(
        (err) =>
          active &&
          setError(err instanceof Error ? err.message : "Gagal memuat hasil"),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId]);

  const isItp = result?.scale_unit === "toefl_itp";
  const unit = result?.scale_unit === "percent" ? "%" : "";
  const scoreLabel = isItp ? "Skor TOEFL" : "Nilai";
  const pending = result?.grading_status === "pending";
  const passed = pending ? null : result?.passed;

  // Skala skor untuk meter (ITP resmi 217–677; selain itu 0–100).
  const scaleMin = isItp ? 217 : 0;
  const scaleMax = isItp ? 677 : 100;
  const score = result?.score ?? null;
  const scorePct =
    score != null
      ? clamp(((score - scaleMin) / (scaleMax - scaleMin)) * 100)
      : 0;
  const passVal = result?.passing_value ?? null;
  const passPct =
    passVal != null
      ? clamp(((passVal - scaleMin) / (scaleMax - scaleMin)) * 100)
      : null;

  const tone =
    passed == null
      ? {
          grad: "from-brand-start via-brand to-brand-end",
          shadow: "shadow-indigo-200/50",
        }
      : passed
        ? {
            grad: "from-emerald-500 via-emerald-500 to-green-600",
            shadow: "shadow-emerald-200/50",
          }
        : {
            grad: "from-rose-500 via-rose-500 to-red-600",
            shadow: "shadow-rose-200/50",
          };

  return (
    <div className="flex flex-col gap-6 py-1">
      <Button
        variant="ghost"
        onClick={() => router.push("/riwayat")}
        className="self-start font-bold text-slate-500 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Riwayat
      </Button>

      {loading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-10 rounded-3xl flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Gagal memuat hasil
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
        </Card>
      ) : result ? (
        <>
          {/* ── Hero ── */}
          <section
            className={`relative overflow-hidden rounded-3xl text-white shadow-xl bg-linear-to-br ${tone.grad} ${tone.shadow}`}
          >
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-black/5 blur-2xl" />

            <div className="relative p-7 md:p-10">
              <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
                {/* kiri: identitas */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                    Hasil Ujian
                  </p>
                  <h1 className="mt-1.5 text-3xl md:text-4xl font-black tracking-tight text-balance">
                    {result.title}
                  </h1>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {pending ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
                        <Hourglass className="w-4 h-4" /> Menunggu Penilaian
                      </span>
                    ) : passed == null ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
                        <CheckCircle2 className="w-4 h-4" /> Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
                        {passed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {passed ? "LULUS" : "BELUM LULUS"}
                      </span>
                    )}
                    {fmtDate(result.submitted_at) && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70">
                        <CalendarClock className="w-3.5 h-3.5" />{" "}
                        {fmtDate(result.submitted_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* kanan: skor */}
                {pending ? (
                  <div className="lg:text-right">
                    <p className="max-w-xs text-sm leading-relaxed text-white/85 lg:ml-auto">
                      Jawaban esaimu sedang dinilai. Nilai final akan muncul di
                      sini setelah penilaian selesai.
                    </p>
                  </div>
                ) : (
                  <div className="lg:text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70">
                      {scoreLabel}
                    </p>
                    <div className="flex items-baseline gap-1.5 lg:justify-end">
                      <span className="text-6xl md:text-7xl font-black tabular-nums leading-none">
                        {score != null ? Math.round(score) : "—"}
                      </span>
                      {unit && (
                        <span className="text-2xl font-bold text-white/80">
                          {unit}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white/85 tabular-nums">
                      {result.total_correct} dari {result.total_questions} benar
                    </p>
                  </div>
                )}
              </div>

              {/* meter skor */}
              {!pending && score != null && (
                <div className="mt-8 border-t border-white/15 pt-6">
                  <div className="relative">
                    {passPct != null && (
                      <div
                        className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-white/90"
                        style={{ left: `${passPct}%` }}
                      >
                        Lulus {passVal}
                      </div>
                    )}
                    <div className="relative h-2.5 rounded-full bg-white/20">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white shadow-sm"
                        style={{ width: `${scorePct}%` }}
                      />
                      {passPct != null && (
                        <div
                          className="absolute -top-1 h-4.5 w-0.75 -translate-x-1/2 rounded-full bg-white/90"
                          style={{ left: `${passPct}%` }}
                        />
                      )}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-white/60">
                      <span>{scaleMin}</span>
                      <span>{scaleMax}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Rincian per bagian ── */}
          {!pending && result.per_section.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
                Rincian per Bagian
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.per_section.map((s) => (
                  <SectionCard key={s.section} s={s} />
                ))}
              </div>
              {isItp && (
                <p className="text-xs leading-relaxed text-slate-400">
                  Skor akhir = (jumlah nilai konversi × 10) ÷ 3, dibulatkan
                  sesuai tabel resmi TOEFL ITP.
                </p>
              )}
            </section>
          )}

          {/* ── Pembahasan ── */}
          {result.show_review && (
            <div className="flex flex-col gap-5">
              <Button
                variant={reviewOpen ? "secondary" : "primary"}
                onClick={() => setReviewOpen((v) => !v)}
                className="self-start font-bold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {reviewOpen
                  ? "Sembunyikan Pembahasan"
                  : "Lihat Pembahasan & Kunci Jawaban"}
                <ChevronDown
                  className={
                    "w-4 h-4 transition-transform " +
                    (reviewOpen ? "rotate-180" : "")
                  }
                />
              </Button>
              {reviewOpen && (
                <AttemptReviewPanel attemptId={result.attempt_id} />
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SectionCard({ s }: { s: SectionResult }) {
  const label =
    s.label ?? SECTION_LABELS[s.section as ExamSectionId] ?? s.section;
  const big = s.converted != null ? s.converted : Math.round(s.percent);
  const bigLabel = s.converted != null ? "Skor Konversi" : "Nilai";
  const correctPct = s.total > 0 ? clamp((s.correct / s.total) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4 rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
          {sectionIconEl(s.section)}
        </span>
        <span className="text-sm font-bold leading-tight text-slate-700">
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-4xl font-black tabular-nums leading-none text-slate-800">
            {big}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {bigLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold tabular-nums text-slate-600">
            {s.correct}
            <span className="text-slate-300">/{s.total}</span>
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            benar
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-linear-to-r from-brand-start to-brand-end"
          style={{ width: `${correctPct}%` }}
        />
      </div>
    </Card>
  );
}
