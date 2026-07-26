'use client';

import { useState } from 'react';
import { Layers, Plus, Trash2, Sparkles, Clock } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useTestTypes, type TestType, type TestTypePayload } from './useTestTypes';
import { TestTypeCard } from './TestTypeCard';
import { TestTypeSoonCard } from './TestTypeSoonCard';
import { TestTypeFormModal } from './TestTypeFormModal';

/** Halaman "Jenis Ujian" — kelola jenis tes (admin). */
export function TestTypesManager() {
  const { testTypes, isLoading, error, createTestType, updateTestType, deleteTestType } = useTestTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TestType | null>(null);
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<TestType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const active = testTypes.filter((t) => t.status === 'active');
  const soon = testTypes.filter((t) => t.status === 'soon');

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: TestType) => {
    setEditing(t);
    setFormOpen(true);
  };

  const handleSubmit = async (payload: TestTypePayload) => {
    setSaving(true);
    try {
      if (editing) {
        await updateTestType(editing.id, payload);
        toast.success('Jenis tes diperbarui.');
      } else {
        await createTestType(payload);
        toast.success('Jenis tes dibuat.');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan jenis tes.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTestType(pendingDelete.id);
      toast.success('Jenis tes dihapus.');
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus jenis tes.'));
    } finally {
      setDeleting(false);
    }
  };

  const createActions: FABAction[] = [
    { icon: <Plus className="w-5 h-5" />, label: 'Tambah Jenis Ujian', onClick: openCreate },
  ];

  return (
    <PageContainer
      className="space-y-8 pb-24"
      header={
        <PageHeader
          icon={<Layers />}
          title="Jenis Ujian"
          subtitle="Atur jenis-jenis tes untuk ujian Anda — seperti TOEFL dan IELTS. Tiap jenis punya bagian dan jumlah soalnya sendiri."
        />
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 rounded-3xl">
              <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Layers className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : testTypes.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="Belum ada jenis tes"
          description="Tambahkan jenis tes pertama untuk mulai membangun bank soal & ujian."
          action={
            <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Tambah Jenis
            </Button>
          }
        />
      ) : (
        <>
          {/* Tersedia */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">
                Tersedia untuk Ujian
              </h2>
              <span className="text-xs font-bold text-slate-400">({active.length})</span>
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Belum ada jenis tes yang aktif. Aktifkan atau tambahkan jenis tes baru.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
                {active.map((t) => (
                  <TestTypeCard key={t.id} testType={t} onEdit={openEdit} onDelete={setPendingDelete} />
                ))}
              </div>
            )}
          </section>

          {/* Segera hadir */}
          {soon.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">
                  Segera Hadir
                </h2>
                <span className="text-xs font-bold text-slate-400">({soon.length})</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {soon.map((t) => (
                  <TestTypeSoonCard key={t.id} testType={t} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <FAB actions={createActions} />

      {formOpen && (
        <TestTypeFormModal
          key={editing?.id ?? 'new'}
          editing={editing}
          defaultSortOrder={(testTypes.length + 1) * 10}
          saving={saving}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Hapus Jenis Tes?"
        icon={<Trash2 className="w-5 h-5 text-red-500" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={deleting}
        onConfirm={confirmDelete}
      >
        <div className="text-sm text-slate-600 leading-relaxed">
          Jenis tes <strong>{pendingDelete?.name}</strong> beserta bagiannya akan dihapus. Tindakan ini
          tidak bisa dibatalkan. (Ditolak bila masih ada soal/ujian yang memakainya.)
        </div>
      </ConfirmDialog>
    </PageContainer>
  );
}
