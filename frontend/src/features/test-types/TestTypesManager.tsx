'use client';

import { useState } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useTestTypes, type TestType, type TestTypePayload } from './useTestTypes';
import { TestTypeCard } from './TestTypeCard';
import { TestTypeFormModal } from './TestTypeFormModal';

/** Halaman "Jenis Ujian" — CRUD jenis tes + skill (admin). */
export function TestTypesManager() {
  const { testTypes, isLoading, error, createTestType, updateTestType, deleteTestType } = useTestTypes();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TestType | null>(null);
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<TestType | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <PageContainer>
      <PageHeader
        title="Jenis Ujian"
        subtitle="Kelola jenis tes (ITP, iBT, IELTS, TOEIC, …), skill-nya, dan komposisi preset full test."
        icon={<Layers className="w-6 h-6" />}
        actions={
          <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Tambah Jenis
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 rounded-2xl">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {testTypes.map((t) => (
            <TestTypeCard key={t.id} testType={t} onEdit={openEdit} onDelete={setPendingDelete} />
          ))}
        </div>
      )}

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
          Jenis tes <strong>{pendingDelete?.name}</strong> beserta skill-nya akan dihapus. Tindakan ini tidak
          bisa dibatalkan. (Ditolak bila masih ada soal/ujian yang memakainya.)
        </div>
      </ConfirmDialog>
    </PageContainer>
  );
}
