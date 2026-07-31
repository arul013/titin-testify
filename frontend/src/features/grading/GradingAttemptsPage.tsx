'use client';

import { useRouter } from 'next/navigation';
import { SquarePen, ChevronRight, User, CheckCircle2, Clock } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useExamAttempts } from './useGrading';

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

/** Daftar peserta yang menunggu penilaian untuk satu ujian. */
export function GradingAttemptsPage({ examId }: { examId: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useExamAttempts(examId);

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<SquarePen />}
          title={data?.title ? `Nilai — ${data.title}` : 'Penilaian'}
          subtitle="Pilih peserta untuk menilai jawaban esainya."
          backLabel="Antrean Penilaian"
          onBack={() => router.push('/penilaian')}
        />
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-4 rounded-2xl">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<SquarePen className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : !data || data.attempts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8" />}
          title="Semua sudah dinilai"
          description="Tidak ada peserta yang menunggu penilaian untuk ujian ini."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.attempts.map((a) => {
            const done = a.manual_graded >= a.manual_total && a.manual_total > 0;
            return (
              <Card
                key={a.attempt_id}
                variant="interactive"
                onClick={() => router.push(`/penilaian/attempt/${a.attempt_id}`)}
                className="group p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all flex items-center gap-4"
              >
                <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500">
                  <User className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 truncate">
                    {a.participant_name || 'Peserta'}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Terkumpul {fmtDate(a.submitted_at)}
                  </p>
                </div>
                <Badge variant={done ? 'success' : 'warning'} className="gap-1 font-bold shrink-0">
                  {a.manual_graded}/{a.manual_total} dinilai
                </Badge>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0" />
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
