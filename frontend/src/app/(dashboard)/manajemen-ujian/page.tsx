'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, ClipboardCheck, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useExams, type ExamDetail } from '@/features/exams/hooks/useExams';
import { ExamTable } from '@/features/exams/ExamTable';
import { ExamBuilder } from '@/features/exams/ExamBuilder';

const PER_PAGE = 10;

export default function ManajemenUjianPage() {
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editingDetail, setEditingDetail] = useState<ExamDetail | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    exams,
    total,
    isLoading,
    getExam,
    createExam,
    updateExam,
    deleteExam,
    poolPreview,
    publishExam,
    unpublishExam,
  } = useExams({
    search: debouncedSearch,
    page,
    perPage: PER_PAGE,
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const openCreate = () => {
    setEditingDetail(null);
    setMode('builder');
  };

  const openEdit = async (id: string) => {
    try {
      const detail = await getExam(id);
      setEditingDetail(detail);
      setMode('builder');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memuat detail paket ujian.'));
    }
  };

  const handleSaveDraft = async (payload: Record<string, unknown>) => {
    try {
      if (editingDetail) {
        await updateExam(editingDetail.id, payload);
        toast.success('Paket ujian berhasil diperbarui.');
      } else {
        await createExam(payload);
        toast.success('Paket ujian berhasil disimpan sebagai draf.');
      }
      setMode('list');
      setEditingDetail(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan paket ujian.'));
    }
  };

  const handlePublish = async (payload: Record<string, unknown>) => {
    try {
      let id: string;
      if (editingDetail) {
        await updateExam(editingDetail.id, payload);
        id = editingDetail.id;
      } else {
        const created = await createExam(payload);
        id = created.id;
      }
      await publishExam(id);
      toast.success('Ujian berhasil ditayangkan.');
      setMode('list');
      setEditingDetail(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menayangkan ujian.'));
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishExam(id);
      toast.success('Ujian dikembalikan ke draf.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status ujian.'));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteExam(pendingDeleteId);
      toast.success('Paket ujian berhasil dihapus.');
      setPendingDeleteId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus paket ujian.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const createActions: FABAction[] = [
    {
      icon: <ClipboardCheck className="w-5 h-5" />,
      label: 'Buat Ujian',
      onClick: openCreate,
    },
  ];

  return (
    <PageContainer
      className="space-y-6 pb-24"
      header={
        <PageHeader
          icon={<ClipboardCheck />}
          title="Manajemen Ujian"
          subtitle="Susun paket ujian dari Bank Soal: tentukan komposisi soal, jadwal, dan peserta."
        />
      }
    >
      {mode === 'builder' ? (
        <ExamBuilder
          key={editingDetail?.id ?? 'new'}
          initial={editingDetail}
          onCancel={() => {
            setMode('list');
            setEditingDetail(null);
          }}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          fetchPreview={poolPreview}
        />
      ) : (
        <>
          <Card className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md shadow-slate-100 flex flex-col gap-6">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama ujian…"
                className="pl-10"
              />
            </div>

            <ExamTable
              exams={exams}
              isLoading={isLoading}
              currentUserRole={user?.role}
              onEdit={(exam) => openEdit(exam.id)}
              onDelete={(id) => setPendingDeleteId(id)}
              onUnpublish={handleUnpublish}
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
            />
          </Card>

          <FAB actions={createActions} />
        </>
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        title="Hapus Paket Ujian?"
        icon={<Trash2 className="w-4 h-4" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={isDeleting}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Paket ujian ini beserta komposisi & daftar pesertanya akan dihapus permanen. Tindakan ini
          tidak bisa dibatalkan.
        </p>
      </ConfirmDialog>
    </PageContainer>
  );
}
