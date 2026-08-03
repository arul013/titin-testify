'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Award, BarChart3, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/src/lib/cn';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { resultsApi, type ExamAnalytics as Analytics, type ItemStat } from './api';

const FLAG_META: Record<string, { label: string; variant: 'info' | 'warning' | 'danger' }> = {
  too_easy: { label: 'Terlalu mudah', variant: 'info' },
  too_hard: { label: 'Terlalu sulit', variant: 'info' },
  low_discrimination: { label: 'Daya beda rendah', variant: 'warning' },
  negative: { label: 'Perlu ditinjau', variant: 'danger' },
};

function discTone(d: number | null): string {
  if (d == null) return 'text-slate-400';
  if (d < 0) return 'text-rose-600';
  if (d < 0.1) return 'text-amber-600';
  if (d < 0.3) return 'text-slate-600';
  return 'text-emerald-600';
}

export function ExamAnalytics({ examId }: { examId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  useEffect(() => {
    let active = true;
    resultsApi
      .analytics(examId)
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat analitik'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [examId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }
  if (error) return <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="Gagal memuat" description={error} />;
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
  const isItp = data.scale_unit === 'toefl_itp';
  const maxCount = Math.max(1, ...data.distribution.map((b) => b.count));
  const scaleLo = data.distribution[0]?.lo ?? 0;
  const scaleHi = data.distribution[data.distribution.length - 1]?.hi ?? 100;
  const passFrac =
    data.passing_value != null && scaleHi > scaleLo
      ? Math.min(1, Math.max(0, (data.passing_value - scaleLo) / (scaleHi - scaleLo)))
      : null;

  const flaggedCount = data.items.filter((it) => it.flag).length;
  const items = onlyFlagged ? data.items.filter((it) => it.flag) : data.items;

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={`Rata-rata (${isItp ? 'skor' : 'nilai'})`} value={s.avg_score != null ? Math.round(s.avg_score) : '—'} icon={<TrendingUp className="h-5 w-5" />} />
        <Tile label="Median" value={s.median_score != null ? Math.round(s.median_score) : '—'} icon={<BarChart3 className="h-5 w-5" />} tone="bg-blue-50 text-blue-600" />
        <Tile label="Tertinggi / Terendah" value={s.highest != null ? `${Math.round(s.highest)} / ${Math.round(s.lowest ?? 0)}` : '—'} icon={<Award className="h-5 w-5" />} tone="bg-violet-50 text-violet-600" />
        <Tile label="Kelulusan" value={s.pass_rate != null ? `${Math.round(s.pass_rate)}%` : '—'} icon={<Award className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Distribusi skor */}
      <Card className="rounded-3xl p-6">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Distribusi Skor</h3>
          <span className="text-xs text-slate-400">{s.submitted} peserta</span>
        </div>
        <p className="mb-6 text-xs text-slate-400">Jumlah peserta per rentang skor.</p>

        <div className="relative">
          {/* garis ambang lulus */}
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
              <div key={b.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${b.label}: ${b.count} peserta`}>
                <span className="text-[11px] font-bold tabular-nums text-slate-500">{b.count > 0 ? b.count : ''}</span>
                <div
                  className="w-full rounded-t-md bg-linear-to-t from-brand-start to-brand-end transition-opacity group-hover:opacity-80"
                  style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2">
            {data.distribution.map((b) => (
              <span key={b.label} className="flex-1 text-center text-[9px] font-semibold tabular-nums text-slate-400">
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Item analysis */}
      <Card className="rounded-3xl p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Analisis Butir Soal</h3>
          {flaggedCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyFlagged((v) => !v)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                onlyFlagged ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              Perlu ditinjau ({flaggedCount})
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-400">
          <b>% Benar</b> = tingkat kesulitan (rendah = sulit). <b>Daya beda</b> = seberapa baik soal membedakan peserta kuat vs lemah
          (tinggi = baik; negatif = kemungkinan salah kunci). Hanya soal otomatis.
        </p>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Tidak ada butir soal untuk ditampilkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
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
                {items.map((it) => (
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

function Tile({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; tone?: string }) {
  return (
    <Card className="flex items-center gap-3.5 rounded-2xl p-4">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tone ?? 'bg-brand/10 text-brand')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold tabular-nums leading-tight text-slate-800">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
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
      <td className="py-3 pr-3 text-xs text-slate-500">{SECTION_LABELS[it.section as ExamSectionId] ?? it.section}</td>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-600">{pct}%</span>
        </div>
      </td>
      <td className={cn('py-3 pr-3 text-right font-bold tabular-nums', discTone(it.discrimination))}>
        {it.discrimination != null ? it.discrimination.toFixed(2) : '—'}
      </td>
      <td className="py-3 text-right">
        {flag ? <Badge variant={flag.variant}>{flag.label}</Badge> : <span className="text-xs text-emerald-500">✓ Baik</span>}
      </td>
    </tr>
  );
}
