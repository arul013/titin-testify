'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { History, ClipboardList, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyExams } from '@/features/attempts/hooks/useMyExams';
import type { MyExamItem } from '@/features/attempts/api';

/** Label & satuan skor sesuai skema penilaian. */
function scoreMeta(e: MyExamItem): { label: string; unit: string } {
  if (e.scale_unit === 'toefl_itp') return { label: 'Skor TOEFL', unit: '' };
  if (e.scale_unit === 'percent') return { label: 'Nilai', unit: '%' };
  return { label: 'Nilai', unit: '' };
}

export function RiwayatPage() {
  const router = useRouter();
  const { exams, isLoading, error } = useMyExams();

  const done = useMemo(
    () => exams.filter((e) => e.attempt_status === 'submitted' && e.attempt_id),
    [exams],
  );

  const goDetail = (e: MyExamItem) => e.attempt_id && router.push(`/ujian/hasil/${e.attempt_id}`);

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<History />}
          title="Riwayat Ujian"
          subtitle="Ujian yang sudah kamu selesaikan beserta hasil & pembahasannya."
        />
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="rounded-3xl p-6">
              <Skeleton className="mb-4 h-5 w-24" />
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="Gagal memuat riwayat"
          description={error}
        />
      ) : done.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="Belum ada riwayat"
          description="Ujian yang sudah kamu selesaikan akan muncul di sini lengkap dengan skor dan pembahasannya."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {done.map((e) => {
            const meta = scoreMeta(e);
            const pending = e.grading_status === 'pending';
            const passed = pending ? null : e.passed;
            return (
              <Card
                key={e.exam_id}
                variant="interactive"
                onClick={() => goDetail(e)}
                className="group flex h-full flex-col justify-between rounded-3xl border-slate-100 bg-white p-6 shadow-md shadow-slate-100/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    {pending ? (
                      <Badge variant="warning">Menunggu Penilaian</Badge>
                    ) : passed != null ? (
                      <Badge variant={passed ? 'success' : 'danger'}>
                        {passed ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Lulus
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Belum Lulus
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="success">Selesai</Badge>
                    )}
                  </div>

                  <h3 className="mb-4 line-clamp-2 text-lg leading-snug font-extrabold text-slate-800">
                    {e.title}
                  </h3>
                </div>

                <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      {meta.label}
                    </p>
                    {pending ? (
                      <p className="text-sm font-extrabold text-amber-600">Menunggu Penilaian</p>
                    ) : (
                      <p className="flex items-baseline gap-0.5 text-slate-800">
                        <span className="text-3xl font-extrabold tabular-nums">
                          {e.score != null ? Math.round(e.score) : '—'}
                        </span>
                        <span className="text-base font-bold text-slate-400">{meta.unit}</span>
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-brand transition-transform group-hover:translate-x-0.5">
                    Lihat Hasil
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
