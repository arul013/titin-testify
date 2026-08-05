"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  ListChecks,
  Layers,
  CalendarClock,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRightCircle,
  Lock,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/src/lib/cn";
import { attemptsApi, type AttemptIntro } from "./api";
import { ExamRunner } from "./ExamRunner";

const PACT =
  "Saya menyatakan akan mengerjakan ujian ini secara jujur dan mandiri — tanpa bantuan orang lain, catatan, atau sumber yang tidak diizinkan. Saya memahami bahwa pelanggaran dapat mengakibatkan pembatalan hasil ujian.";

function fmtSchedule(iso: string | null): string {
  if (!iso) return "—";
  try {
    return (
      new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return "—";
  }
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-base font-extrabold tabular-nums leading-tight text-slate-800">
          {value}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

/** Gerbang pra-ujian (M7.1): instruksi + pakta integritas sebelum attempt/timer dimulai.
 *  Bila sudah ada attempt berjalan → langsung lanjut (resume) tanpa pakta. */
export const PreExamGate: React.FC<{ examId: string }> = ({ examId }) => {
  const router = useRouter();
  const [intro, setIntro] = useState<AttemptIntro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let active = true;
    attemptsApi
      .intro(examId)
      .then((res) => {
        if (!active) return;
        setIntro(res);
        if (res.has_in_progress) setStarted(true); // resume → langsung ke runner
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : "Gagal memuat ujian");
      });
    return () => {
      active = false;
    };
  }, [examId]);

  // Sudah mulai (baru saja / melanjutkan) → jalankan runner (yang memanggil start()).
  if (started) return <ExamRunner examId={examId} />;

  if (error) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-extrabold text-slate-800">
            Tidak dapat memuat ujian
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
          <Button
            variant="secondary"
            className="font-bold"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.replace("/ujian")}
          >
            Kembali ke Daftar Ujian
          </Button>
        </div>
      </Shell>
    );
  }

  if (!intro) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Menyiapkan ujian…</p>
        </div>
      </Shell>
    );
  }

  const blocked = !intro.can_start;
  const blockMsg =
    intro.schedule_state === "upcoming"
      ? `Ujian belum dibuka. Dijadwalkan mulai ${fmtSchedule(intro.starts_at)}.`
      : intro.schedule_state === "ended"
        ? "Jendela ujian sudah berakhir."
        : intro.already_submitted && !intro.allow_retake
          ? "Kamu sudah menyelesaikan ujian ini."
          : "Ujian belum bisa dimulai saat ini.";

  return (
    <Shell wide>
      <div className="flex flex-col gap-6">
        {/* Judul */}
        <div className="flex items-start gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight">
              {intro.title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Layar persiapan — baca instruksi sebelum memulai.
            </p>
          </div>
        </div>

        {/* Info ringkas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={<Clock className="h-5 w-5" />}
            label="Durasi"
            value={`${intro.duration_minutes} mnt`}
          />
          <Stat
            icon={<ListChecks className="h-5 w-5" />}
            label="Jumlah soal"
            value={intro.total_questions}
          />
          <Stat
            icon={<Layers className="h-5 w-5" />}
            label="Bagian"
            value={intro.section_count}
          />
          <Stat
            icon={
              intro.per_section_mode ? (
                <Lock className="h-5 w-5" />
              ) : (
                <PlayCircle className="h-5 w-5" />
              )
            }
            label="Mode"
            value={
              <span className="text-sm">
                {intro.per_section_mode ? "Per-bagian" : "Bebas"}
              </span>
            }
          />
        </div>

        {/* Jadwal */}
        {(intro.starts_at || intro.ends_at) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Mulai:{" "}
              <b className="text-slate-700">{fmtSchedule(intro.starts_at)}</b>
            </span>
            {intro.ends_at && (
              <span className="inline-flex items-center gap-1.5">
                Selesai:{" "}
                <b className="text-slate-700">{fmtSchedule(intro.ends_at)}</b>
              </span>
            )}
          </div>
        )}

        {/* Instruksi (description ujian) */}
        {intro.description && (
          <div>
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Instruksi
            </h2>
            <p className="whitespace-pre-line rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-600">
              {intro.description}
            </p>
          </div>
        )}

        {/* Aturan umum */}
        <ul className="flex flex-col gap-1.5 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{" "}
            Timer berjalan di server — waktu tetap berkurang meski koneksi
            terputus atau halaman ditutup.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />{" "}
            Jawaban tersimpan otomatis setiap kali kamu menjawab.
          </li>
          {intro.per_section_mode && (
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{" "}
              Ujian per-bagian: setiap bagian punya batas waktu sendiri dan{" "}
              <b>terkunci</b> setelah dilewati.
            </li>
          )}
        </ul>

        {blocked ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-6 text-center">
            <p className="text-sm font-semibold text-amber-700">{blockMsg}</p>
            <Button
              variant="secondary"
              className="font-bold"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => router.replace("/ujian")}
            >
              Kembali ke Daftar Ujian
            </Button>
          </div>
        ) : (
          <>
            {/* Pakta integritas */}
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                agreed
                  ? "border-brand/40 bg-brand/4"
                  : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <Checkbox
                checked={agreed}
                onChange={() => setAgreed((v) => !v)}
              />
              <span className="text-sm leading-relaxed text-slate-600">
                <b className="text-slate-800">Pakta Integritas.</b> {PACT}
              </span>
            </label>

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                className="font-bold"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => router.replace("/ujian")}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="font-bold"
                disabled={!agreed}
                rightIcon={<ArrowRightCircle className="h-5 w-5" />}
                onClick={() => setStarted(true)}
              >
                Mulai Ujian
              </Button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
};

function Shell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 p-4 sm:p-8">
      <div
        className={cn(
          "mx-auto my-auto min-h-full flex items-center justify-center",
        )}
      >
        <div
          className={cn(
            "w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8",
            wide ? "max-w-2xl" : "max-w-md",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
