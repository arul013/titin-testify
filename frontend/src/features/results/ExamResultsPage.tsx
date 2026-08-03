'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users, CheckCircle2, XCircle, Hourglass, ChevronRight, AlertTriangle,
  TrendingUp, Award, ClipboardCheck, CalendarClock, Loader2, Download,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { ManajemenUjianHeader } from '@/features/exams/ManajemenUjianHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/src/lib/cn';
import { getErrorMessage } from '@/lib/errors';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { resultsApi, downloadResultsCsv, type AdminResults, type AdminAttemptRow } from './api';
import { ExamAnalytics } from './ExamAnalytics';

function fmtDate(v: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function StatTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Card className="flex items-center gap-3.5 rounded-2xl p-4">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tone ?? 'bg-brand/10 text-brand')}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold tabular-nums text-slate-800 leading-tight">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </Card>
  );
}

/** Halaman Hasil Ujian (admin/super_admin pemilik) — ringkasan + daftar peserta. */
export function ExamResultsPage({ examId }: { examId: string }) {
  const router = useRouter();
  const [data, setData] = useState<AdminResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'peserta' | 'analitik'>('peserta');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadResultsCsv(examId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengunduh CSV.'));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    let active = true;
    resultsApi
      .exam(examId)
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat hasil'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [examId]);

  const isItp = data?.scale_unit === 'toefl_itp';
  const unit = data?.scale_unit === 'percent' ? '%' : '';

  return (
    <PageContainer
      className="space-y-6 pb-16"
      header={
        <ManajemenUjianHeader
          breadcrumb={[
            { label: 'Manajemen Ujian', href: '/manajemen-ujian' },
            { label: data ? `Hasil: ${data.title}` : 'Hasil' },
          ]}
        />
      }
    >
      {loading ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : data ? (
        <>
          {/* Tab + ekspor */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onChange={(id) => setTab(id as 'peserta' | 'analitik')}
              tabs={[
                { id: 'peserta', label: 'Peserta' },
                { id: 'analitik', label: 'Analitik' },
              ]}
            />
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
              leftIcon={<Download className="h-4 w-4" />}
              className="font-bold"
            >
              Ekspor CSV
            </Button>
          </div>

          {tab === 'peserta' ? (
            <>
              {/* Ringkasan */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile
                  icon={<Users className="h-5 w-5" />}
                  label="Peserta mengerjakan"
                  value={`${data.summary.submitted + data.summary.in_progress} / ${data.summary.participants_total}`}
                />
                <StatTile
                  icon={<TrendingUp className="h-5 w-5" />}
                  label={`Rata-rata (${isItp ? 'skor' : 'nilai'})`}
                  value={data.summary.avg_score != null ? Math.round(data.summary.avg_score) : '—'}
                  tone="bg-blue-50 text-blue-600"
                />
                <StatTile
                  icon={<Award className="h-5 w-5" />}
                  label="Lulus"
                  value={data.summary.passed_count != null ? data.summary.passed_count : '—'}
                  tone="bg-emerald-50 text-emerald-600"
                />
                <StatTile
                  icon={<Hourglass className="h-5 w-5" />}
                  label="Menunggu penilaian"
                  value={data.summary.pending_grading}
                  tone="bg-amber-50 text-amber-600"
                />
              </div>

              {/* Daftar peserta */}
              {data.attempts.length === 0 ? (
                <EmptyState
                  icon={<ClipboardCheck className="w-8 h-8" />}
                  title="Belum ada yang mengerjakan"
                  description="Hasil akan muncul di sini setelah peserta mulai/menyelesaikan ujian."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {data.attempts.map((a) => (
                    <AttemptRow
                      key={a.attempt_id}
                      a={a}
                      unit={unit}
                      onOpen={() => router.push(`/manajemen-ujian/${examId}/hasil/${a.attempt_id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ExamAnalytics examId={examId} />
          )}
        </>
      ) : null}
    </PageContainer>
  );
}

function AttemptRow({ a, unit, onOpen }: { a: AdminAttemptRow; unit: string; onOpen: () => void }) {
  const inProgress = a.status !== 'submitted';
  const pending = a.grading_status === 'pending';
  const finalScore = !inProgress && !pending;

  const statusBadge = inProgress ? (
    <Badge variant="neutral" className="gap-1"><Loader2 className="h-3 w-3" /> Mengerjakan</Badge>
  ) : pending ? (
    <Badge variant="warning" className="gap-1"><Hourglass className="h-3 w-3" /> Menunggu Penilaian</Badge>
  ) : a.passed == null ? (
    <Badge variant="success">Selesai</Badge>
  ) : a.passed ? (
    <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Lulus</Badge>
  ) : (
    <Badge variant="danger" className="gap-1"><XCircle className="h-3 w-3" /> Belum Lulus</Badge>
  );

  return (
    <Card
      variant={inProgress ? 'default' : 'interactive'}
      onClick={inProgress ? undefined : onOpen}
      className={cn(
        'group flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:gap-4',
        inProgress ? '' : 'cursor-pointer transition-shadow hover:shadow-md',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <Users className="h-4 w-4" />
          </span>
          <h3 className="truncate font-bold text-slate-800">{a.participant_name || 'Peserta'}</h3>
          {statusBadge}
        </div>
        {a.per_section.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 text-[11px] text-slate-400">
            {a.per_section.map((s) => (
              <span key={s.section} className="tabular-nums">
                {s.label ?? SECTION_LABELS[s.section as ExamSectionId] ?? s.section}{' '}
                <b className="text-slate-600">{s.correct}/{s.total}</b>
              </span>
            ))}
          </div>
        )}
        <span className="inline-flex items-center gap-1.5 pl-10 text-[11px] text-slate-400">
          <CalendarClock className="h-3 w-3" /> {inProgress ? 'Mulai' : 'Terkumpul'} {fmtDate(inProgress ? a.started_at : a.submitted_at)}
        </span>
      </div>

      <div className="flex items-center gap-3 pl-10 md:pl-0">
        <div className="text-right">
          {finalScore ? (
            <>
              <p className="text-2xl font-extrabold tabular-nums text-slate-800 leading-none">
                {a.score != null ? Math.round(a.score) : '—'}
                {unit && <span className="text-sm font-bold text-slate-400">{unit}</span>}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {a.total_correct}/{a.total_questions} benar
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-slate-400">{pending ? 'Menunggu' : '—'}</p>
          )}
        </div>
        {!inProgress && (
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-brand" />
        )}
      </div>
    </Card>
  );
}
