'use client';

import { useRouter } from 'next/navigation';
import { SquarePen, ChevronRight, ClipboardCheck } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingExams } from './useGrading';

/** Antrean penilaian manual — daftar ujian yang punya jawaban esai menunggu dinilai. */
export function PenilaianPage() {
  const router = useRouter();
  const { exams, isLoading, error } = usePendingExams();

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<SquarePen />}
          title="Penilaian"
          subtitle="Nilai jawaban esai/writing peserta berdasarkan rubrik. Skor final muncul setelah semua item manual dinilai."
        />
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 rounded-2xl">
              <Skeleton className="h-11 w-11 rounded-2xl mb-3" />
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<SquarePen className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-8 h-8" />}
          title="Tidak ada yang perlu dinilai"
          description="Semua jawaban esai sudah dinilai, atau belum ada ujian ber-esai yang terkumpul."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {exams.map((e) => (
            <Card
              key={e.exam_id}
              variant="interactive"
              onClick={() => router.push(`/penilaian/${e.exam_id}`)}
              className="group p-5 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3.5">
                <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-brand/20">
                  <SquarePen className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-base text-slate-800 truncate">{e.title}</h3>
                  <p className="text-xs mt-0.5 text-slate-500">{e.total_submitted} peserta terkumpul</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="border-t border-slate-100 pt-3">
                <Badge variant="warning" className="gap-1 font-bold">
                  {e.pending_count} menunggu penilaian
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
