'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyExams } from '@/features/attempts/hooks/useMyExams';
import type { MyExamItem } from '@/features/attempts/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  Clock,
  ArrowRight,
  Award,
  CalendarClock,
  PlayCircle,
  RotateCcw,
  Eye,
  Lock,
} from 'lucide-react';

function fmtWIB(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

interface StatusMeta {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'neutral' | 'danger';
}

function statusMeta(e: MyExamItem): StatusMeta {
  if (e.attempt_status === 'submitted') return { label: 'Selesai', variant: 'success' };
  if (e.attempt_status === 'in_progress') return { label: 'Berlangsung', variant: 'info' };
  if (e.schedule_state === 'upcoming') return { label: 'Belum Dibuka', variant: 'warning' };
  if (e.schedule_state === 'ended') return { label: 'Berakhir', variant: 'neutral' };
  return { label: 'Siap Dikerjakan', variant: 'info' };
}

export default function UjianPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { exams, isLoading, error } = useMyExams();

  const goStart = (e: MyExamItem) => router.push(`/ujian/kerjakan/${e.exam_id}`);
  const goResult = (e: MyExamItem) =>
    e.attempt_id && router.push(`/ujian/hasil/${e.attempt_id}`);

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Welcome Banner — brand Learning Nexus */}
      <div className="rounded-3xl bg-linear-to-r from-brand-start via-brand to-brand-end text-white p-8 md:p-10 shadow-xl shadow-indigo-200/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none px-3 py-1 font-bold text-xs uppercase tracking-wider mb-4">
            Peserta CBT
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-white">
            Selamat Datang, {user?.full_name}!
          </h1>
          <p className="text-indigo-100/90 mt-2 max-w-xl text-sm leading-relaxed">
            Ini daftar ujian yang ditugaskan untuk Anda. Pilih ujian yang tersedia untuk memulai
            atau melanjutkan pengerjaan.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-brand" />
          Ujian Saya
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <Card key={i} className="p-6 md:p-8 rounded-2xl">
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Gagal memuat ujian"
            description={error}
          />
        ) : exams.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-8 h-8" />}
            title="Belum ada ujian"
            description="Saat ini belum ada ujian yang ditugaskan untuk Anda. Silakan cek kembali nanti."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((e) => {
              const meta = statusMeta(e);
              const startLabel =
                e.attempt_status === 'in_progress'
                  ? 'Lanjutkan'
                  : e.attempt_status === 'submitted'
                    ? 'Ulangi Ujian'
                    : 'Mulai Ujian';
              const StartIcon = e.attempt_status === 'submitted' ? RotateCcw : PlayCircle;
              const startsTxt = fmtWIB(e.starts_at);
              const endsTxt = fmtWIB(e.ends_at);

              return (
                <Card
                  key={e.exam_id}
                  variant="interactive"
                  className="bg-white border border-slate-100 shadow-md shadow-slate-100/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-6 md:p-7 flex flex-col justify-between h-full rounded-2xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {e.attempt_status === 'submitted' && e.score != null && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <Award className="w-3.5 h-3.5" />
                          Nilai: {e.score}
                          {e.scale_unit === 'percent' ? '%' : ''}
                          {e.passed != null && (
                            <span className={e.passed ? 'text-emerald-600' : 'text-red-500'}>
                              · {e.passed ? 'Lulus' : 'Belum Lulus'}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-800 text-lg leading-snug line-clamp-2 mb-3">
                      {e.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-500 text-xs mb-3">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {e.duration_minutes} Menit
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                        {e.total_questions} Soal
                      </span>
                    </div>

                    {(startsTxt || endsTxt) && (
                      <div className="flex items-start gap-1.5 text-slate-400 text-xs mb-5">
                        <CalendarClock className="w-4 h-4 shrink-0 mt-px" />
                        <span>
                          {startsTxt && <>Buka: {startsTxt}</>}
                          {startsTxt && endsTxt && ' · '}
                          {endsTxt && <>Tutup: {endsTxt}</>}
                          {' WIB'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                    {e.can_start ? (
                      <Button
                        variant="primary"
                        onClick={() => goStart(e)}
                        className="flex-1 font-bold active:scale-[0.98] group flex items-center justify-center gap-2"
                      >
                        <StartIcon className="w-4 h-4" />
                        {startLabel}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    ) : e.schedule_state === 'upcoming' ? (
                      <Button
                        variant="secondary"
                        disabled
                        className="flex-1 font-bold text-slate-400 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Belum Dibuka
                      </Button>
                    ) : e.attempt_status !== 'submitted' ? (
                      <Button
                        variant="secondary"
                        disabled
                        className="flex-1 font-bold text-slate-400 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Ujian Berakhir
                      </Button>
                    ) : null}

                    {e.attempt_status === 'submitted' && e.attempt_id && (
                      <Button
                        variant="secondary"
                        onClick={() => goResult(e)}
                        className="flex-1 font-bold flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Hasil
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
