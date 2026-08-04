'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LayoutTemplate, Clock, ClipboardList, Trash2, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { Exam } from '@/features/exams/hooks/useExams';

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Buat ujian dari template terpilih (parent membuka builder ujian barunya). */
  onUse: (templateId: string) => Promise<void> | void;
}

interface TemplateListResponse {
  exams: Exam[];
  total: number;
}

/** Modal pilih template → "Gunakan" membuat ujian draf baru dari resepnya. */
export function TemplatePickerModal({ open, onClose, onUse }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Muat daftar template setiap kali modal dibuka. setState hanya di callback async
  // (bukan sinkron di body efek) agar patuh react-compiler.
  useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.resolve()
      .then(() => { if (active) setLoading(true); })
      .then(() => api.request<TemplateListResponse>('/api/exams?templates=true&per_page=100'))
      .then((data) => { if (active) setTemplates(data.exams || []); })
      .catch((err) => { if (active) toast.error(getErrorMessage(err, 'Gagal memuat template.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  const handleUse = async (id: string) => {
    setBusyId(id);
    try {
      await onUse(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await api.request(`/api/exams/${id}`, { method: 'DELETE' });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template dihapus.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus template.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buat dari Template"
      icon={<LayoutTemplate className="h-5 w-5 text-white" />}
      size="lg"
    >
      <p className="mb-4 text-sm text-slate-500">
        Pilih resep untuk memulai ujian baru dengan komposisi soal & pengaturan yang sama.
        Jadwal dan peserta diatur setelahnya.
      </p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-8 w-8" />}
          title="Belum ada template"
          description="Buka menu Kelola pada sebuah ujian, lalu pilih “Jadikan Template” untuk menyimpan komposisinya di sini."
        />
      ) : (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h3 className="truncate font-bold text-slate-800">{t.title}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                    {t.total_target} soal · {t.sections.length} bagian
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {t.duration_minutes} menit
                  </span>
                  <span className="font-semibold uppercase text-slate-400">{t.test_type}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={busyId === t.id}
                  title="Hapus template"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50/60 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold"
                  loading={busyId === t.id}
                  onClick={() => handleUse(t.id)}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Gunakan
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
