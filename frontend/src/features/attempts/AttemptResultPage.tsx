'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SECTION_LABELS, type ExamSectionId } from '@/features/exams/hooks/useExams';
import { attemptsApi, type AttemptResult } from '@/features/attempts/api';
import { AttemptReviewPanel } from '@/features/attempts/AttemptReviewPanel';

export function AttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params?.attemptId;
  const router = useRouter();

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    attemptsApi
      .result(attemptId)
      .then((res) => active && setResult(res))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Gagal memuat hasil'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attemptId]);

  const isItp = result?.scale_unit === 'toefl_itp';
  // Unit di sebelah angka skor: Nilai/skor tanpa satuan; hanya '%' untuk skema lama.
  const unit = result?.scale_unit === 'percent' ? '%' : '';
  const scoreLabel = isItp ? 'Skor TOEFL' : 'Nilai';
  const passed = result?.passed;

  return (
    <div className="flex flex-col gap-6 py-2 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/riwayat')}
        className="self-start font-bold text-slate-500 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Riwayat
      </Button>

      {loading ? (
        <Card className="p-8 rounded-3xl">
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-24 w-full mb-6 rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </Card>
      ) : error ? (
        <Card className="p-8 rounded-3xl flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">Gagal memuat hasil</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </Card>
      ) : result ? (
        <>
          {/* Hero hasil */}
          <div
            className={
              'rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden ' +
              (passed == null
                ? 'bg-linear-to-r from-brand-start via-brand to-brand-end shadow-indigo-200/60'
                : passed
                  ? 'bg-linear-to-r from-emerald-500 to-green-600 shadow-emerald-200/60'
                  : 'bg-linear-to-r from-rose-500 to-red-600 shadow-red-200/60')
            }
          >
            <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">
                  Hasil Ujian
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold">{result.title}</h1>
                {passed != null && (
                  <div className="inline-flex items-center gap-2 mt-4 bg-white/20 rounded-full px-4 py-1.5 font-bold text-sm">
                    {passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {passed ? 'LULUS' : 'BELUM LULUS'}
                  </div>
                )}
              </div>
              <div className="text-center md:text-right">
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-0.5">
                  {scoreLabel}
                </p>
                <div className="flex items-baseline gap-1 justify-center md:justify-end">
                  <span className="text-5xl md:text-6xl font-extrabold tabular-nums">
                    {result.score != null ? Math.round(result.score) : '—'}
                  </span>
                  <span className="text-2xl font-bold text-white/80">{unit}</span>
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {result.total_correct} dari {result.total_questions} benar
                </p>
                {result.passing_value != null && (
                  <p className="text-white/70 text-xs mt-0.5">
                    Nilai kelulusan: {result.passing_value}
                    {unit}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rincian per bagian */}
          <Card className="p-6 md:p-7 rounded-3xl">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mb-5">
              <Trophy className="w-5 h-5 text-brand" />
              Rincian per Bagian
            </h2>
            {result.per_section.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Tidak ada rincian bagian.</p>
            ) : (
              <>
              <div className="flex flex-col gap-3">
                {result.per_section.map((s) => (
                  <div
                    key={s.section}
                    className="flex items-center gap-4 border border-slate-100 rounded-2xl p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 text-sm">
                        {s.label ?? SECTION_LABELS[s.section as ExamSectionId] ?? s.section}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                        {s.correct}/{s.total} benar
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {s.converted != null ? (
                        <>
                          <p className="font-extrabold text-brand tabular-nums text-lg">{s.converted}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide">konversi</p>
                        </>
                      ) : (
                        <p className="font-extrabold text-slate-800 tabular-nums text-lg">{Math.round(s.percent)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {isItp && (
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Skor akhir = (jumlah nilai konversi × 10) ÷ 3, dibulatkan sesuai tabel resmi TOEFL ITP.
                </p>
              )}
              </>
            )}
          </Card>

          {/* Pembahasan (bila diizinkan admin: exam.show_review) */}
          {result.show_review && (
            <div className="flex flex-col gap-5">
              <Button
                variant={reviewOpen ? 'secondary' : 'primary'}
                onClick={() => setReviewOpen((v) => !v)}
                className="self-start font-bold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {reviewOpen ? 'Sembunyikan Pembahasan' : 'Lihat Pembahasan & Kunci Jawaban'}
                <ChevronDown
                  className={
                    'w-4 h-4 transition-transform ' + (reviewOpen ? 'rotate-180' : '')
                  }
                />
              </Button>

              {reviewOpen && <AttemptReviewPanel attemptId={result.attempt_id} />}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
