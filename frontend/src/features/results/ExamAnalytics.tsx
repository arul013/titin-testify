"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  BarChart3,
  AlertTriangle,
  ClipboardCheck,
  Lightbulb,
  Users,
  Info,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/cn";
import {
  SECTION_LABELS,
  type ExamSectionId,
} from "@/features/exams/hooks/useExams";
import {
  resultsApi,
  type ExamAnalytics as Analytics,
  type ItemStat,
} from "./api";

const FLAG_META: Record<
  string,
  { label: string; variant: "info" | "warning" | "danger" }
> = {
  too_easy: { label: "Terlalu mudah", variant: "info" },
  too_hard: { label: "Terlalu sulit", variant: "info" },
  low_discrimination: { label: "Daya beda rendah", variant: "warning" },
  negative: { label: "Perlu ditinjau", variant: "danger" },
};

const GROUP_LABEL: Record<string, string> = {
  listening: "Listening",
  structure_we: "Structure & Written Expression",
  reading: "Reading",
};
const GROUP_ORDER = ["listening", "structure_we", "reading"];
const groupKeyOf = (s: string) =>
  s === "structure" || s === "written_expression" ? "structure_we" : s;
const groupLabelOf = (s: string) =>
  GROUP_LABEL[groupKeyOf(s)] ?? SECTION_LABELS[s as ExamSectionId] ?? s;

function discTone(d: number | null): string {
  if (d == null) return "text-slate-400";
  if (d < 0) return "text-rose-600";
  if (d < 0.1) return "text-amber-600";
  if (d < 0.3) return "text-slate-600";
  return "text-emerald-600";
}

export function ExamAnalytics({ examId }: { examId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    resultsApi
      .analytics(examId)
      .then((res) => active && setData(res))
      .catch(
        (err) =>
          active &&
          setError(
            err instanceof Error ? err.message : "Gagal memuat analitik",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [examId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (error)
    return (
      <EmptyState
        icon={<AlertTriangle className="w-8 h-8" />}
        title="Gagal memuat"
        description={error}
      />
    );
  if (!data) return null;

  if (data.summary.submitted === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck className="w-8 h-8" />}
        title="Belum ada data analitik"
        description="Analitik muncul setelah ada peserta yang menyelesaikan ujian."
      />
    );
  }

  const s = data.summary;
  const isItp = data.scale_unit === "toefl_itp";
  const smallSample = s.submitted < 5;

  // Performa per-bagian (rata-rata % benar dari p-value tiap butir).
  const secAgg = new Map<string, { sum: number; n: number; label: string }>();
  data.items.forEach((it) => {
    const k = groupKeyOf(it.section);
    const e = secAgg.get(k) ?? {
      sum: 0,
      n: 0,
      label: groupLabelOf(it.section),
    };
    e.sum += it.p_value;
    e.n += 1;
    secAgg.set(k, e);
  });
  const sections = [...secAgg.entries()]
    .map(([key, e]) => ({ key, label: e.label, avg: e.n ? e.sum / e.n : 0 }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.key) - GROUP_ORDER.indexOf(b.key));
  const weakest = sections.length
    ? sections.reduce((m, x) => (x.avg < m.avg ? x : m))
    : null;

  const flagged = data.items.filter((it) => it.flag);
  const hardest = [...data.items]
    .sort((a, b) => a.p_value - b.p_value)
    .slice(0, 5);

  // Insight bahasa manusia.
  const insights: string[] = [];
  if (s.pass_rate != null) {
    insights.push(
      `Kelulusan ${Math.round(s.pass_rate)}% — ${s.passed_count} dari ${s.submitted} peserta lulus.`,
    );
  }
  if (weakest && sections.length > 1) {
    insights.push(
      `Bagian terlemah: ${weakest.label} (${Math.round(weakest.avg * 100)}% benar rata-rata).`,
    );
  }
  insights.push(
    flagged.length > 0
      ? `${flagged.length} soal perlu ditinjau.`
      : "Tidak ada soal yang menandai masalah.",
  );

  return (
    <div className="flex flex-col gap-6">
      {smallSample && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Data masih sedikit (<b>{s.submitted} peserta</b>). Angka rata-rata &
            khususnya <b>daya beda</b> baru akan akurat setelah lebih banyak
            peserta mengerjakan.
          </span>
        </div>
      )}

      {/* Insight utama */}
      <Card className="rounded-3xl border-brand/15 bg-brand/4 p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-brand">
          <Lightbulb className="h-4 w-4" /> Ringkasan
        </div>
        <ul className="flex flex-col gap-2">
          {insights.map((t, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] text-slate-700"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {t}
            </li>
          ))}
        </ul>
      </Card>

      {/* Ringkasan angka */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label={`Rata-rata (${isItp ? "skor" : "nilai"})`}
          value={s.avg_score != null ? Math.round(s.avg_score) : "—"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <Tile
          label="Median"
          value={s.median_score != null ? Math.round(s.median_score) : "—"}
          icon={<BarChart3 className="h-5 w-5" />}
          tone="bg-blue-50 text-blue-600"
        />
        <Tile
          label="Tertinggi / Terendah"
          value={
            s.highest != null
              ? `${Math.round(s.highest)} / ${Math.round(s.lowest ?? 0)}`
              : "—"
          }
          icon={<Award className="h-5 w-5" />}
          tone="bg-violet-50 text-violet-600"
        />
        <Tile
          label="Peserta"
          value={s.submitted}
          icon={<Users className="h-5 w-5" />}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Performa per bagian */}
      {sections.length > 0 && (
        <Card className="rounded-3xl p-6">
          <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-slate-500">
            Performa per Bagian
          </h3>
          <p className="mb-5 text-xs text-slate-400">
            Rata-rata persentase benar tiap bagian — makin rendah, makin sulit
            bagi peserta.
          </p>
          <div className="flex flex-col gap-4">
            {sections.map((sec) => {
              const pct = Math.round(sec.avg * 100);
              const isWeak = sections.length > 1 && weakest?.key === sec.key;
              return (
                <div key={sec.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      {sec.label}
                      {isWeak && <Badge variant="warning">Terlemah</Badge>}
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-slate-800">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        isWeak
                          ? "bg-amber-400"
                          : "bg-linear-to-r from-brand-start to-brand-end",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Distribusi skor */}
      <Card className="rounded-3xl p-6">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
            Distribusi Skor
          </h3>
          <span className="text-xs text-slate-400">{s.submitted} peserta</span>
        </div>
        <p className="mb-6 text-xs text-slate-400">
          Jumlah peserta per rentang skor.
        </p>
        <Distribution data={data} />
      </Card>

      {/* Analisis butir — dikurasi */}
      <Card className="rounded-3xl p-6">
        <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-500">
          Analisis Butir Soal
        </h3>

        {flagged.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Perlu ditinjau (
              {flagged.length})
            </p>
            <div className="rounded-2xl border border-rose-100">
              {flagged.slice(0, 8).map((it, i) => (
                <CompactRow key={it.exam_question_id} it={it} first={i === 0} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">
            Soal tersulit (peserta paling banyak salah)
          </p>
          <div className="rounded-2xl border border-slate-100">
            {hardest.map((it, i) => (
              <CompactRow key={it.exam_question_id} it={it} first={i === 0} />
            ))}
          </div>
        </div>

        {/* Tabel lengkap (disembunyikan) */}
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
        >
          {showAll ? "Sembunyikan" : `Lihat semua butir (${data.items.length})`}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              showAll && "rotate-180",
            )}
          />
        </button>

        {showAll && (
          <div className="mt-3 overflow-x-auto">
            <p className="mb-3 text-xs text-slate-400">
              <b>% Benar</b> = tingkat kesulitan (rendah = sulit).{" "}
              <b>Daya beda</b> = apakah soal ini lebih dikuasai peserta kuat
              daripada lemah (tinggi = baik; negatif = kemungkinan salah kunci).
            </p>
            <table className="w-full min-w-140 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="py-2.5 pr-3">No</th>
                  <th className="py-2.5 pr-3">Bagian</th>
                  <th className="py-2.5 pr-3">% Benar</th>
                  <th className="py-2.5 pr-3 text-right">Daya Beda</th>
                  <th className="py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((it) => (
                  <ItemRow key={it.exam_question_id} it={it} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Distribution({ data }: { data: Analytics }) {
  const maxCount = Math.max(1, ...data.distribution.map((b) => b.count));
  const lo = data.distribution[0]?.lo ?? 0;
  const hi = data.distribution[data.distribution.length - 1]?.hi ?? 100;
  const passFrac =
    data.passing_value != null && hi > lo
      ? Math.min(1, Math.max(0, (data.passing_value - lo) / (hi - lo)))
      : null;

  return (
    <div className="relative">
      {passFrac != null && (
        <div
          className="pointer-events-none absolute bottom-8 top-0 z-10 border-l-2 border-dashed border-amber-400"
          style={{ left: `${passFrac * 100}%` }}
        >
          <span className="absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
            Lulus {data.passing_value}
          </span>
        </div>
      )}
      <div className="flex h-52 items-end gap-1.5">
        {data.distribution.map((b) => (
          <div
            key={b.label}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            title={`${b.label}: ${b.count} peserta`}
          >
            <span className="text-[11px] font-bold tabular-nums text-slate-500">
              {b.count > 0 ? b.count : ""}
            </span>
            <div
              className="w-full rounded-t-md bg-linear-to-t from-brand-start to-brand-end transition-opacity group-hover:opacity-80"
              style={{
                height: `${(b.count / maxCount) * 100}%`,
                minHeight: b.count > 0 ? 4 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2">
        {data.distribution.map((b) => (
          <span
            key={b.label}
            className="flex-1 text-center text-[9px] font-semibold tabular-nums text-slate-400"
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompactRow({ it, first }: { it: ItemStat; first: boolean }) {
  const pct = Math.round(it.p_value * 100);
  const flag = it.flag ? FLAG_META[it.flag] : null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-2.5",
        !first && "border-t border-slate-50",
      )}
    >
      <span className="text-sm text-slate-600">
        <b className="tabular-nums text-slate-800">No {it.position}</b>
        <span className="ml-2 text-xs text-slate-400">
          {SECTION_LABELS[it.section as ExamSectionId] ?? it.section}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-sm font-bold tabular-nums text-slate-700">
          {pct}%
        </span>
        {flag ? <Badge variant={flag.variant}>{flag.label}</Badge> : null}
      </span>
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 rounded-2xl p-4">
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          tone ?? "bg-brand/10 text-brand",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold tabular-nums leading-tight text-slate-800">
          {value}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
      </div>
    </Card>
  );
}

function ItemRow({ it }: { it: ItemStat }) {
  const pct = Math.round(it.p_value * 100);
  const flag = it.flag ? FLAG_META[it.flag] : null;
  return (
    <tr className="text-slate-700">
      <td className="py-3 pr-3 font-bold tabular-nums">{it.position}</td>
      <td className="py-3 pr-3 text-xs text-slate-500">
        {SECTION_LABELS[it.section as ExamSectionId] ?? it.section}
      </td>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-600">
            {pct}%
          </span>
        </div>
      </td>
      <td
        className={cn(
          "py-3 pr-3 text-right font-bold tabular-nums",
          discTone(it.discrimination),
        )}
      >
        {it.discrimination != null ? it.discrimination.toFixed(2) : "—"}
      </td>
      <td className="py-3 text-right">
        {flag ? (
          <Badge variant={flag.variant}>{flag.label}</Badge>
        ) : (
          <span className="text-xs text-emerald-500">✓ Baik</span>
        )}
      </td>
    </tr>
  );
}
