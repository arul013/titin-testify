'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useRubrics, type Rubric, type RubricPayload } from './useRubrics';
import { RubrikFormModal } from './RubrikFormModal';

function RubricCard({
  rubric,
  onEdit,
  onDelete,
}: {
  rubric: Rubric;
  onEdit: (r: Rubric) => void;
  onDelete: (r: Rubric) => void;
}) {
  return (
    <Card className="p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-brand/20">
          <ClipboardCheck className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base text-slate-800 truncate">{rubric.name}</h3>
            {rubric.is_builtin && (
              <Badge variant="neutral" className="gap-1">
                <Lock className="w-3 h-3" /> Bawaan
              </Badge>
            )}
          </div>
          {rubric.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{rubric.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rubric.criteria.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1"
          >
            {c.name}
            <span className="text-slate-400">· {c.max_score}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
        <span className="text-xs font-bold text-slate-500">
          {rubric.criteria.length} kriteria · maks {rubric.max_total}
        </span>
        {!rubric.is_builtin && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(rubric)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>
              Ubah
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(rubric)}
              className="text-slate-400 hover:text-red-600"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Halaman "Rubrik" — pustaka rubrik penilaian manual, di bawah area Skema Penilaian. */
export function RubrikManager() {
  const router = useRouter();
  const { rubrics, isLoading, error, createRubric, updateRubric, deleteRubric } = useRubrics();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rubric | null>(null);
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Rubric | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: Rubric) => {
    setEditing(r);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: RubricPayload) => {
    setSaving(true);
    try {
      if (editing) {
        await updateRubric(editing.id, payload);
        toast.success('Rubrik diperbarui.');
      } else {
        await createRubric(payload);
        toast.success('Rubrik dibuat.');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan rubrik.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteRubric(pendingDelete.id);
      toast.success('Rubrik dihapus.');
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus rubrik.'));
    } finally {
      setDeleting(false);
    }
  };

  const createActions: FABAction[] = [
    { icon: <Plus className="w-5 h-5" />, label: 'Buat Rubrik', onClick: openCreate },
  ];

  const gridClass = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch';

  return (
    <PageContainer
      className="space-y-6 pb-24"
      header={
        <PageHeader
          icon={<ClipboardCheck />}
          title="Rubrik Penilaian"
          subtitle="Pustaka rubrik untuk penilaian manual (esai/writing). Dipakai ulang lintas soal & ujian."
          backLabel="Skema Penilaian"
          onBack={() => router.push('/skema-penilaian')}
          actions={
            <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />} className="font-bold">
              Buat Rubrik
            </Button>
          }
        />
      }
    >
      {isLoading ? (
        <div className={gridClass}>
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 rounded-2xl">
              <Skeleton className="h-11 w-11 rounded-2xl mb-3" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<ClipboardCheck className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : rubrics.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-8 h-8" />}
          title="Belum ada rubrik"
          description="Buat rubrik pertama untuk menilai soal esai/writing secara manual."
          action={
            <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Buat Rubrik
            </Button>
          }
        />
      ) : (
        <div className={gridClass}>
          {rubrics.map((r) => (
            <RubricCard key={r.id} rubric={r} onEdit={openEdit} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

      <FAB actions={createActions} />

      {formOpen && (
        <RubrikFormModal
          key={editing?.id ?? 'new'}
          editing={editing}
          saving={saving}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Hapus Rubrik?"
        icon={<Trash2 className="w-5 h-5 text-red-500" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={deleting}
        onConfirm={confirmDelete}
      >
        <div className="text-sm text-slate-600 leading-relaxed">
          Rubrik <strong>{pendingDelete?.name}</strong> akan dihapus. Soal yang memakainya tidak lagi
          terhubung ke rubrik ini.
        </div>
      </ConfirmDialog>
    </PageContainer>
  );
}
