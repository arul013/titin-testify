'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SquarePen, User, Save, CheckCircle2, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { SoalPanel } from '@/features/attempts/SoalPanel';
import type { QuestionPayload } from '@/features/attempts/api';
import { useAttemptGrading, type GradingAnswer } from './useGrading';

/** Batasi input skor ke desimal positif. */
const decimalFilter = (v: string) => {
  const cleaned = v.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
};

function GradingAnswerCard({
  answer,
  number,
  onSave,
}: {
  answer: GradingAnswer;
  number: number;
  onSave: (answerId: string, scores: number[], feedback: string) => Promise<void>;
}) {
  const [scores, setScores] = useState<string[]>(
    answer.criteria.map((c) => (c.score != null ? String(c.score) : '')),
  );
  const [feedback, setFeedback] = useState(answer.feedback ?? '');
  const [saving, setSaving] = useState(false);

  const notAnswered = !answer.answer_id;
  const total = scores.reduce((n, s) => n + (parseFloat(s || '0') || 0), 0);

  const setScore = (i: number, v: string) =>
    setScores((prev) => prev.map((x, idx) => (idx === i ? decimalFilter(v) : x)));

  const submit = async () => {
    if (!answer.answer_id) return;
    // Validasi: semua kriteria terisi & dalam rentang.
    for (let i = 0; i < answer.criteria.length; i++) {
      const raw = scores[i];
      if (raw === '' || raw == null) {
        toast.error(`Isi skor untuk "${answer.criteria[i].name}".`);
        return;
      }
      const val = parseFloat(raw);
      if (Number.isNaN(val) || val < 0 || val > answer.criteria[i].max_score) {
        toast.error(`Skor "${answer.criteria[i].name}" harus 0–${answer.criteria[i].max_score}.`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(answer.answer_id, scores.map((s) => parseFloat(s)), feedback);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan penilaian.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-100 bg-white p-6 shadow-md shadow-slate-100/60 md:p-7 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600">
            {number}
          </span>
          <span className="text-xs font-bold tracking-wide text-slate-400 uppercase">
            {answer.rubric_name || 'Rubrik'} · maks {answer.max_score}
          </span>
        </div>
        {answer.graded ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Dinilai ({answer.awarded_score})
          </Badge>
        ) : (
          <Badge variant="warning">Belum dinilai</Badge>
        )}
      </div>

      {/* Soal */}
      <SoalPanel q={answer.payload as unknown as QuestionPayload} />

      {/* Jawaban peserta */}
      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-4">
        <span className="text-xs font-bold text-slate-400 uppercase">
          {answer.participant_audio_url ? 'Jawaban speaking peserta' : 'Jawaban esai peserta'}
        </span>
        {notAnswered ? (
          <p className="mt-1 text-sm italic text-slate-400">Peserta tidak menjawab — otomatis 0 poin.</p>
        ) : answer.participant_audio_url ? (
          <audio controls src={answer.participant_audio_url} className="mt-2 w-full" preload="none">
            <track kind="captions" />
          </audio>
        ) : (
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-700">
            {answer.participant_text || <span className="italic text-slate-400">(kosong)</span>}
          </p>
        )}
      </div>

      {/* Penilaian kriteria */}
      {!notAnswered && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-brand" /> Skor per Kriteria
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
              Total {total} / {answer.max_score}
            </span>
          </div>

          {answer.criteria.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start rounded-2xl border border-slate-100 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700">{c.name}</p>
                {c.descriptors && <p className="text-[11px] text-slate-400 mt-0.5 whitespace-pre-wrap">{c.descriptors}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={scores[i]}
                  onChange={(e) => setScore(i, e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="w-20 text-center"
                />
                <span className="text-xs font-bold text-slate-400">/ {c.max_score}</span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Feedback untuk peserta (opsional)</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Komentar/masukan atas jawaban esai…"
            />
          </div>

          <Button
            variant="primary"
            onClick={submit}
            loading={saving}
            leftIcon={<Save className="w-4 h-4" />}
            className="font-bold self-start"
          >
            {answer.graded ? 'Perbarui Nilai' : 'Simpan Nilai'}
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Halaman penilaian satu attempt (grader). */
export function GradingDetailPage({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { detail, isLoading, error, refetch, submitGrade } = useAttemptGrading(attemptId);

  const handleSave = async (answerId: string, scores: number[], feedback: string) => {
    const res = await submitGrade(answerId, scores, feedback);
    if (res.grading_status === 'complete') {
      toast.success(`Penilaian selesai. Nilai akhir peserta: ${res.attempt_score}.`);
    } else {
      toast.success('Nilai tersimpan.');
    }
    refetch();
  };

  const gradedCount = detail?.answers.filter((a) => a.graded).length ?? 0;
  const totalManual = detail?.answers.length ?? 0;

  return (
    <PageContainer
      className="space-y-5 pb-16"
      header={
        <PageHeader
          icon={<SquarePen />}
          title={detail?.title ? `Nilai — ${detail.title}` : 'Penilaian'}
          subtitle="Baca jawaban esai, beri skor per kriteria rubrik, lalu simpan."
          backLabel="Daftar Peserta"
          onBack={() => router.push(detail ? `/penilaian/${detail.exam_id}` : '/penilaian')}
        />
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="rounded-3xl p-6">
              <Skeleton className="mb-4 h-5 w-40" />
              <Skeleton className="mb-3 h-24 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<AlertTriangle className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : !detail || detail.answers.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-8 h-8" />}
          title="Tidak ada esai"
          description="Attempt ini tidak memiliki item yang perlu dinilai manual."
        />
      ) : (
        <>
          {/* Ringkasan peserta */}
          <Card className="rounded-2xl p-4 flex items-center gap-4">
            <span className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500">
              <User className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-800 truncate">{detail.participant_name || 'Peserta'}</h3>
              <p className="text-xs text-slate-400">{gradedCount}/{totalManual} item dinilai</p>
            </div>
            <Badge variant={detail.grading_status === 'complete' ? 'success' : 'warning'} className="gap-1 font-bold shrink-0">
              {detail.grading_status === 'complete' ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Selesai</>
              ) : (
                'Menunggu penilaian'
              )}
            </Badge>
          </Card>

          {detail.answers.map((a, i) => (
            <GradingAnswerCard key={a.exam_question_id} answer={a} number={i + 1} onSave={handleSave} />
          ))}
        </>
      )}
    </PageContainer>
  );
}
