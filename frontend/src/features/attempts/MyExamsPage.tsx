'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMyExams } from '@/features/attempts/hooks/useMyExams';
import type { MyExamItem } from '@/features/attempts/api';
import { ExamCard, bucketOf, type ExamBucket } from '@/features/attempts/ExamCard';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, CheckCircle2, Hourglass } from 'lucide-react';

/** Urutan prioritas bucket di grup "Perlu Dikerjakan". */
const TODO_ORDER: ExamBucket[] = ['in_progress', 'available', 'retake'];

export function MyExamsPage() {
  const router = useRouter();
  const { exams, isLoading, error, refetch } = useMyExams();

  const goStart = (e: MyExamItem) => router.push(`/ujian/kerjakan/${e.exam_id}`);

  const { todo, upcoming } = useMemo(() => {
    const tagged = exams
      .map((e) => ({ exam: e, bucket: bucketOf(e) }))
      .filter((x): x is { exam: MyExamItem; bucket: ExamBucket } => x.bucket !== null);

    const todo = tagged
      .filter((x) => x.bucket !== 'upcoming')
      .sort((a, b) => TODO_ORDER.indexOf(a.bucket) - TODO_ORDER.indexOf(b.bucket));

    const upcoming = tagged
      .filter((x) => x.bucket === 'upcoming')
      .sort((a, b) => {
        const ta = a.exam.starts_at ? new Date(a.exam.starts_at).getTime() : Infinity;
        const tb = b.exam.starts_at ? new Date(b.exam.starts_at).getTime() : Infinity;
        return ta - tb;
      });

    return { todo, upcoming };
  }, [exams]);

  const isEmpty = todo.length === 0 && upcoming.length === 0;

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<ClipboardList />}
          title="Ujian Saya"
          subtitle="Ujian yang perlu kamu kerjakan dan yang akan datang. Ujian selesai ada di Riwayat."
        />
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="rounded-3xl p-6 md:p-7">
              <Skeleton className="mb-4 h-11 w-11 rounded-2xl" />
              <Skeleton className="mb-3 h-6 w-3/4" />
              <Skeleton className="mb-6 h-4 w-1/2" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Gagal memuat ujian"
          description={error}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8" />}
          title="Tidak ada ujian aktif"
          description="Belum ada ujian yang perlu dikerjakan saat ini. Ujian yang sudah selesai bisa kamu lihat di Riwayat Ujian."
        />
      ) : (
        <div className="space-y-8">
          {todo.length > 0 && (
            <Section
              icon={<ClipboardList className="h-4 w-4" />}
              title="Perlu Dikerjakan"
              count={todo.length}
            >
              {todo.map(({ exam, bucket }) => (
                <ExamCard key={exam.exam_id} exam={exam} bucket={bucket} onStart={goStart} />
              ))}
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section
              icon={<Hourglass className="h-4 w-4" />}
              title="Akan Datang"
              count={upcoming.length}
            >
              {upcoming.map(({ exam, bucket }) => (
                <ExamCard
                  key={exam.exam_id}
                  exam={exam}
                  bucket={bucket}
                  onStart={goStart}
                  onOpen={refetch}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold tracking-wide text-slate-600 uppercase">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </span>
        {title}
        <span className="ml-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
          {count}
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
