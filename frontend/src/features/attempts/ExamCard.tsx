'use client';

import type { MyExamItem } from '@/features/attempts/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCountdown } from '@/features/attempts/hooks/useCountdown';
import {
  ClipboardList,
  Clock,
  ArrowRight,
  CalendarClock,
  PlayCircle,
  RotateCcw,
  Hourglass,
} from 'lucide-react';

export type ExamBucket = 'in_progress' | 'available' | 'retake' | 'upcoming';

/** Bucket actionable sebuah ujian; null = tak ditampilkan di "Ujian Saya". */
export function bucketOf(e: MyExamItem): ExamBucket | null {
  if (e.attempt_status === 'in_progress') return 'in_progress';
  if (e.schedule_state === 'upcoming') return 'upcoming';
  if (e.can_start && e.attempt_status === 'submitted' && e.allow_retake) return 'retake';
  if (e.can_start && e.attempt_status === 'none') return 'available';
  return null;
}

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

const pad = (n: number) => String(n).padStart(2, '0');

const BUCKET_META: Record<
  ExamBucket,
  { label: string; variant: 'success' | 'info' | 'warning' | 'neutral' }
> = {
  in_progress: { label: 'Sedang Berlangsung', variant: 'warning' },
  available: { label: 'Siap Dikerjakan', variant: 'success' },
  retake: { label: 'Bisa Diulang', variant: 'info' },
  upcoming: { label: 'Akan Datang', variant: 'neutral' },
};

const CTA: Record<
  Exclude<ExamBucket, 'upcoming'>,
  { label: string; icon: typeof PlayCircle }
> = {
  in_progress: { label: 'Lanjutkan Ujian', icon: PlayCircle },
  available: { label: 'Mulai Ujian', icon: PlayCircle },
  retake: { label: 'Ulangi Ujian', icon: RotateCcw },
};

interface ExamCardProps {
  exam: MyExamItem;
  bucket: ExamBucket;
  onStart: (e: MyExamItem) => void;
  /** Dipanggil saat countdown "Akan Datang" mencapai nol (untuk refetch). */
  onOpen?: () => void;
}

export function ExamCard({ exam: e, bucket, onStart, onOpen }: ExamCardProps) {
  const cd = useCountdown(bucket === 'upcoming' ? e.starts_at : null, onOpen);
  const meta = BUCKET_META[bucket];
  const startsTxt = fmtWIB(e.starts_at);
  const endsTxt = fmtWIB(e.ends_at);
  const highlight = bucket === 'in_progress';

  return (
    <Card
      className={[
        'flex h-full flex-col justify-between rounded-3xl p-6 transition-all duration-300 md:p-7',
        highlight
          ? 'border-amber-200 bg-amber-50/40 shadow-md shadow-amber-100/60'
          : 'border-slate-100 bg-white shadow-md shadow-slate-100/60',
      ].join(' ')}
    >
      <div>
        <div className="mb-4 flex items-center gap-3">
          <span
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
              highlight ? 'bg-amber-100 text-amber-600' : 'bg-brand/10 text-brand',
            ].join(' ')}
          >
            <ClipboardList className="h-5 w-5" />
          </span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>

        <h3 className="mb-3 line-clamp-2 text-lg leading-snug font-extrabold text-slate-800">
          {e.title}
        </h3>

        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            {e.duration_minutes} Menit
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            {e.total_questions} Soal
          </span>
        </div>

        {(startsTxt || endsTxt) && (
          <div className="flex items-start gap-1.5 text-xs text-slate-400">
            <CalendarClock className="mt-px h-4 w-4 shrink-0" />
            <span>
              {startsTxt && <>Buka {startsTxt}</>}
              {startsTxt && endsTxt && ' · '}
              {endsTxt && <>Tutup {endsTxt}</>}
              {' WIB'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        {bucket === 'upcoming' ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Hourglass className="h-4 w-4 text-slate-400" />
              Dibuka dalam
            </span>
            <span className="font-mono text-base font-extrabold tabular-nums text-slate-700">
              {cd && cd.days > 0 && <span className="mr-1">{cd.days}h</span>}
              {cd ? `${pad(cd.hours)}:${pad(cd.minutes)}:${pad(cd.seconds)}` : '—'}
            </span>
          </div>
        ) : (
          (() => {
            const { label, icon: Icon } = CTA[bucket];
            return (
              <Button
                variant="primary"
                onClick={() => onStart(e)}
                className="group flex w-full items-center justify-center gap-2 font-bold active:scale-[0.98]"
              >
                <Icon className="h-4 w-4" />
                {label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            );
          })()
        )}
      </div>
    </Card>
  );
}
