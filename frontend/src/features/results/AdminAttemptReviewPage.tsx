'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, XCircle, Hourglass, CalendarClock, User, Loader2,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { ManajemenUjianHeader } from '@/features/exams/ManajemenUjianHeader';
import { AttemptReviewPanel } from '@/features/attempts/AttemptReviewPanel';
import { resultsApi, type AdminAttemptReview } from './api';

function fmtDate(v: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Rincian jawaban satu peserta (admin) — header ringkas + pembahasan per-soal. */
export function AdminAttemptReviewPage({ examId, attemptId }: { examId: string; attemptId: string }) {
  const [data, setData] = useState<AdminAttemptReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    resultsApi
      .review(attemptId)
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat rincian'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId]);

  const isItp = data?.scale_unit === 'toefl_itp';
  const unit = data?.scale_unit === 'percent' ? '%' : '';
  const pending = data?.grading_status === 'pending';
  const inProgress = data?.status !== 'submitted';

  return (
    <PageContainer
      className="space-y-6 pb-16"
      header={
        <ManajemenUjianHeader
          breadcrumb={[
            { label: 'Manajemen Ujian', href: '/manajemen-ujian' },
            { label: data ? `Hasil: ${data.title}` : 'Hasil', href: `/manajemen-ujian/${examId}/hasil` },
            { label: data?.participant_name || 'Rincian Jawaban' },
          ]}
        />
      }
    >
      {loading ? (
        <>
          <Skeleton className="h-36 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </>
      ) : error ? (
        <Card className="p-10 rounded-3xl flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">Gagal memuat rincian</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </Card>
      ) : data ? (
        <>
          {/* Header peserta + skor */}
          <Card className="rounded-3xl p-6 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <User className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-extrabold text-slate-800">{data.participant_name || 'Peserta'}</h1>
                  <p className="truncate text-sm text-slate-400">{data.title}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                    <CalendarClock className="h-3 w-3" />
                    {inProgress ? 'Belum dikumpulkan' : `Terkumpul ${fmtDate(data.submitted_at)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-5 md:flex-col md:items-end md:gap-1.5">
                {inProgress ? (
                  <Badge variant="neutral" className="gap-1"><Loader2 className="h-3.5 w-3.5" /> Mengerjakan</Badge>
                ) : pending ? (
                  <Badge variant="warning" className="gap-1"><Hourglass className="h-3.5 w-3.5" /> Menunggu Penilaian</Badge>
                ) : data.passed == null ? (
                  <Badge variant="success">Selesai</Badge>
                ) : data.passed ? (
                  <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Lulus</Badge>
                ) : (
                  <Badge variant="danger" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Belum Lulus</Badge>
                )}
                {!pending && !inProgress && (
                  <div className="text-right">
                    <span className="text-3xl font-extrabold tabular-nums text-slate-800">
                      {data.score != null ? Math.round(data.score) : '—'}
                    </span>
                    {unit && <span className="text-base font-bold text-slate-400">{unit}</span>}
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {isItp ? 'Skor TOEFL' : 'Nilai'} · {data.total_correct}/{data.total_questions} benar
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Per-section */}
            {data.per_section.length > 0 && (
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.per_section.map((s) => (
                  <div key={s.section} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="text-sm font-bold text-slate-600">
                      {s.label ?? SECTION_LABELS[s.section as ExamSectionId] ?? s.section}
                    </span>
                    <span className="text-right">
                      {s.converted != null ? (
                        <span className="text-lg font-extrabold tabular-nums text-brand">{s.converted}</span>
                      ) : (
                        <span className="text-lg font-extrabold tabular-nums text-slate-800">{Math.round(s.percent)}</span>
                      )}
                      <span className="ml-2 text-xs tabular-nums text-slate-400">{s.correct}/{s.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Rincian jawaban — hanya bila sudah dikumpulkan */}
          {inProgress ? (
            <Card className="flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Peserta masih mengerjakan</h3>
              <p className="max-w-md text-sm text-slate-500">
                Skor dan rincian jawaban akan tersedia di sini setelah peserta mengumpulkan ujiannya.
              </p>
            </Card>
          ) : (
            <div>
              <h2 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-500">Rincian Jawaban</h2>
              <AttemptReviewPanel attemptId={attemptId} data={data} />
            </div>
          )}
        </>
      ) : null}
    </PageContainer>
  );
}
