'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Timer, Check, Users } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import type { ExamDetail, ExamParticipant } from '@/features/exams/hooks/useExams';

interface AccommodationModalProps {
  open: boolean;
  onClose: () => void;
  examId: string | null;
  examTitle?: string;
  getExam: (id: string) => Promise<ExamDetail>;
  setParticipantExtra: (examId: string, userId: string, extraMinutes: number) => Promise<ExamDetail>;
}

/** Kelola waktu tambahan (akomodasi) per-peserta untuk satu ujian (M5.2). */
export function AccommodationModal({
  open, onClose, examId, examTitle, getExam, setParticipantExtra,
}: AccommodationModalProps) {
  const [participants, setParticipants] = useState<ExamParticipant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !examId) return;
    let active = true;
    Promise.resolve()
      .then(() => { if (active) setLoading(true); })
      .then(() => getExam(examId))
      .then((detail) => {
        if (!active) return;
        setParticipants(detail.participants || []);
        setDrafts(Object.fromEntries((detail.participants || []).map((p) => [p.user_id, String(p.extra_minutes ?? 0)])));
      })
      .catch((err) => { if (active) toast.error(getErrorMessage(err, 'Gagal memuat peserta.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, examId, getExam]);

  const handleSave = async (p: ExamParticipant) => {
    if (!examId) return;
    const minutes = parseInt(drafts[p.user_id] || '0', 10) || 0;
    setSavingId(p.user_id);
    try {
      await setParticipantExtra(examId, p.user_id, minutes);
      setParticipants((prev) => prev.map((x) => (x.user_id === p.user_id ? { ...x, extra_minutes: minutes } : x)));
      toast.success(
        minutes > 0
          ? `${p.full_name || 'Peserta'} diberi +${minutes} menit.`
          : `Waktu tambahan ${p.full_name || 'peserta'} dihapus.`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan waktu tambahan.'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Waktu Tambahan Peserta"
      icon={<Timer className="h-5 w-5 text-white" />}
      size="lg"
    >
      <p className="mb-4 text-sm text-slate-500">
        Beri menit tambahan (akomodasi) untuk peserta tertentu pada <b className="text-slate-700">{examTitle}</b>.
        Durasi personal &amp; batas akhir ujian digeser sebanyak menit ini khusus peserta tersebut.
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : participants.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Belum ada peserta"
          description="Tambahkan peserta ke ujian ini dulu lewat “Ubah Ujian” → langkah Peserta."
        />
      ) : (
        <div className="flex max-h-[55vh] flex-col gap-2.5 overflow-y-auto pr-1">
          {participants.map((p) => {
            const draft = drafts[p.user_id] ?? '0';
            const dirty = (parseInt(draft || '0', 10) || 0) !== (p.extra_minutes ?? 0);
            return (
              <Card key={p.user_id} className="flex items-center gap-3 rounded-2xl p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{p.full_name || 'Peserta'}</p>
                  <p className="truncate text-xs text-slate-400">@{p.username}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative">
                    <Input
                      value={draft}
                      inputMode="numeric"
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [p.user_id]: e.target.value.replace(/\D/g, '').slice(0, 3) }))
                      }
                      className="w-24 pr-12 text-right tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      menit
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold"
                    loading={savingId === p.user_id}
                    disabled={!dirty}
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => handleSave(p)}
                  >
                    Simpan
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
