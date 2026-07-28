'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CalendarClock,
  PlayCircle,
  RotateCcw,
  ArrowRight,
  Hourglass,
  CheckCircle2,
  XCircle,
  History,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyExams } from '@/features/attempts/hooks/useMyExams';
import { useCountdown } from '@/features/attempts/hooks/useCountdown';
import { bucketOf, type ExamBucket } from '@/features/attempts/ExamCard';
import type { MyExamItem } from '@/features/attempts/api';

const NEXT_ORDER: Record<ExamBucket, number> = {
  in_progress: 0,
  available: 1,
  retake: 2,
  upcoming: 3,
};

const pad = (n: number) => String(n).padStart(2, '0');

function fmtWIB(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function scoreMeta(e: MyExamItem): { label: string; unit: string } {
  if (e.scale_unit === 'toefl_itp') return { label: 'Skor TOEFL', unit: '' };
  if (e.scale_unit === 'percent') return { label: 'Nilai', unit: '%' };
  return { label: 'Nilai', unit: '' };
}

export function PesertaBerandaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { exams, isLoading, error, refetch } = useMyExams();

  const goStart = (e: MyExamItem) => router.push(`/ujian/kerjakan/${e.exam_id}`);

  const { next, stats, recent } = useMemo(() => {
    const tagged = exams
      .map((e) => ({ exam: e, bucket: bucketOf(e) }))
      .filter((x): x is { exam: MyExamItem; bucket: ExamBucket } => x.bucket !== null);

    const sorted = [...tagged].sort((a, b) => {
      const d = NEXT_ORDER[a.bucket] - NEXT_ORDER[b.bucket];
      if (d !== 0) return d;
      // Sesama "upcoming": paling dekat dulu.
      const ta = a.exam.starts_at ? new Date(a.exam.starts_at).getTime() : Infinity;
      const tb = b.exam.starts_at ? new Date(b.exam.starts_at).getTime() : Infinity;
      return ta - tb;
    });

    const done = exams.filter((e) => e.attempt_status === 'submitted' && e.attempt_id);

    return {
      next: sorted[0] ?? null,
      stats: {
        assigned: exams.length,
        todo: tagged.filter((x) => x.bucket !== 'upcoming').length,
        done: done.length,
      },
      recent: done.slice(0, 3),
    };
  }, [exams]);

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<LayoutDashboard />}
          title="Dashboard"
          subtitle={`Selamat datang${user?.full_name ? `, ${user.full_name}` : ''}. Berikut ringkasan ujianmu.`}
        />
      }
    >
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
          <h2 className="text-base font-extrabold text-slate-800">Gagal memuat dashboard</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <NextExamHero next={next} onStart={goStart} onRefetch={refetch} />

          {/* Statistik ringkas — sekaligus pintasan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              icon={<ClipboardList className="h-5 w-5" />}
              label="Ditugaskan"
              value={stats.assigned}
              tone="slate"
            />
            <StatTile
              icon={<ListChecks className="h-5 w-5" />}
              label="Perlu Dikerjakan"
              value={stats.todo}
              tone="brand"
              onClick={() => router.push('/ujian')}
            />
            <StatTile
              icon={<History className="h-5 w-5" />}
              label="Selesai"
              value={stats.done}
              tone="emerald"
              onClick={() => router.push('/riwayat')}
            />
          </div>

          {/* Hasil terakhir */}
          {recent.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-slate-600 uppercase">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <History className="h-4 w-4" />
                  </span>
                  Hasil Terakhir
                </h2>
                <button
                  type="button"
                  onClick={() => router.push('/riwayat')}
                  className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  Lihat Semua
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <Card className="divide-y divide-slate-100 rounded-3xl border-slate-100 p-2">
                {recent.map((e) => {
                  const meta = scoreMeta(e);
                  return (
                    <button
                      key={e.exam_id}
                      type="button"
                      onClick={() => e.attempt_id && router.push(`/ujian/hasil/${e.attempt_id}`)}
                      className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{e.title}</p>
                        {e.passed != null && (
                          <span
                            className={
                              'mt-0.5 inline-flex items-center gap-1 text-xs font-bold ' +
                              (e.passed ? 'text-emerald-600' : 'text-rose-500')
                            }
                          >
                            {e.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {e.passed ? 'Lulus' : 'Belum Lulus'}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          {meta.label}
                        </p>
                        <p className="flex items-baseline justify-end gap-0.5 text-slate-800">
                          <span className="text-xl font-extrabold tabular-nums">
                            {e.score != null ? Math.round(e.score) : '—'}
                          </span>
                          <span className="text-sm font-bold text-slate-400">{meta.unit}</span>
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    </button>
                  );
                })}
              </Card>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

// ─── Hero "Ujian Berikutnya" ─────────────────────────────────────────────

function NextExamHero({
  next,
  onStart,
  onRefetch,
}: {
  next: { exam: MyExamItem; bucket: ExamBucket } | null;
  onStart: (e: MyExamItem) => void;
  onRefetch: () => void;
}) {
  const isUpcoming = next?.bucket === 'upcoming';
  const cd = useCountdown(isUpcoming ? (next?.exam.starts_at ?? null) : null, onRefetch);

  if (!next) {
    return (
      <Card className="flex flex-col items-center gap-3 rounded-3xl border-slate-100 bg-white p-10 text-center shadow-md shadow-slate-100/60">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Sparkles className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-extrabold text-slate-800">Tidak ada ujian aktif</h2>
        <p className="max-w-md text-sm text-slate-500">
          Belum ada ujian yang perlu dikerjakan saat ini. Ujian yang sudah selesai bisa kamu lihat
          di Riwayat.
        </p>
      </Card>
    );
  }

  const e = next.exam;
  const bucket = next.bucket;
  const startsTxt = fmtWIB(e.starts_at);
  const endsTxt = fmtWIB(e.ends_at);

  const cta: Record<Exclude<ExamBucket, 'upcoming'>, { label: string; icon: typeof PlayCircle }> = {
    in_progress: { label: 'Lanjutkan Ujian', icon: PlayCircle },
    available: { label: 'Mulai Ujian', icon: PlayCircle },
    retake: { label: 'Ulangi Ujian', icon: RotateCcw },
  };
  const statusLabel: Record<ExamBucket, string> = {
    in_progress: 'Sedang Berlangsung',
    available: 'Siap Dikerjakan',
    retake: 'Bisa Diulang',
    upcoming: 'Akan Datang',
  };

  return (
    <div className="from-brand-start via-brand to-brand-end relative overflow-hidden rounded-3xl bg-linear-to-r p-8 text-white shadow-xl shadow-indigo-200/60 md:p-10">
      <div className="pointer-events-none absolute top-0 right-0 h-56 w-56 -translate-y-8 translate-x-8 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            Ujian Berikutnya · {statusLabel[bucket]}
          </span>
          <h2 className="text-2xl leading-tight font-extrabold md:text-3xl">{e.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/85">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {e.duration_minutes} Menit
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {e.total_questions} Soal
            </span>
            {(startsTxt || endsTxt) && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                {startsTxt && <>Buka {startsTxt}</>}
                {startsTxt && endsTxt && ' · '}
                {endsTxt && <>Tutup {endsTxt}</>}
                {' WIB'}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {bucket === 'upcoming' ? (
            <div className="rounded-2xl bg-white/15 px-5 py-4 text-center backdrop-blur-sm">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wider text-white/80 uppercase">
                <Hourglass className="h-3.5 w-3.5" />
                Dibuka dalam
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums md:text-3xl">
                {cd && cd.days > 0 && <span className="mr-1">{cd.days}h</span>}
                {cd ? `${pad(cd.hours)}:${pad(cd.minutes)}:${pad(cd.seconds)}` : '—'}
              </p>
            </div>
          ) : (
            (() => {
              const { label, icon: Icon } = cta[bucket];
              return (
                <Button
                  variant="secondary"
                  onClick={() => onStart(e)}
                  className="group flex items-center gap-2 font-bold shadow-md active:scale-[0.98]"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kartu statistik (opsional klik = pintasan) ──────────────────────────

function StatTile({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'slate' | 'brand' | 'emerald';
  onClick?: () => void;
}) {
  const toneCls =
    tone === 'brand'
      ? 'bg-brand/10 text-brand'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-slate-100 text-slate-500';

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={onClick}
      className={[
        'flex items-center gap-4 rounded-3xl border-slate-100 bg-white p-5 shadow-md shadow-slate-100/60',
        onClick ? 'group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg' : '',
      ].join(' ')}
    >
      <span className={['flex h-12 w-12 items-center justify-center rounded-2xl', toneCls].join(' ')}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-extrabold tabular-nums text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
      </div>
      {onClick && (
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
      )}
    </Card>
  );
}
