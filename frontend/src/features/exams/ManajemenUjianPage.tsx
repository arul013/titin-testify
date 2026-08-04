'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, ClipboardCheck, Trash2, Lock, Archive, ArchiveRestore, LayoutTemplate } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { Pagination } from '@/components/ui/pagination';
import { PageContainer } from '@/components/ui/page-container';
import { ManajemenUjianHeader } from '@/features/exams/ManajemenUjianHeader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useExams, type Exam, type ExamDetail, type ExamMode, type ExamStatus } from '@/features/exams/hooks/useExams';
import { ExamList } from '@/features/exams/ExamList';
import { ExamBuilder } from '@/features/exams/ExamBuilder';
import { PilihJenisUjianModal } from '@/features/exams/PilihJenisUjianModal';
import { TemplatePickerModal } from '@/features/exams/TemplatePickerModal';
import { AccommodationModal } from '@/features/exams/AccommodationModal';
import type { TestType } from '@/features/test-types/useTestTypes';

const PER_PAGE = 10;

export function ManajemenUjianPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExamStatus>('all');
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'list' | 'builder'>('list');
  const [editingDetail, setEditingDetail] = useState<ExamDetail | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [accommodationExam, setAccommodationExam] = useState<Exam | null>(null);
  const [newChoice, setNewChoice] = useState<{
    testType: string;
    examMode: ExamMode;
    presetCounts: Record<string, number>;
  } | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingLifecycle, setPendingLifecycle] = useState<{
    exam: Exam;
    action: 'close' | 'archive' | 'unarchive';
  } | null>(null);
  const [isLifecycleBusy, setIsLifecycleBusy] = useState(false);

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
    closeExam,
    archiveExam,
    unarchiveExam,
    duplicateExam,
    saveAsTemplate,
    createFromTemplate,
    setParticipantExtra,
  } = useExams({
    search: debouncedSearch,
    status: statusFilter === 'all' ? undefined : statusFilter,
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
    setNewChoice(null);
    setChooserOpen(true);
  };

  const handleChooseType = (t: TestType, examMode: ExamMode) => {
    const presetCounts = Object.fromEntries(t.skills.map((s) => [s.code, s.full_test_count]));
    setNewChoice({ testType: t.code, examMode, presetCounts });
    setEditingDetail(null);
    setChooserOpen(false);
    setMode('builder');
  };

  const openEdit = async (id: string) => {
    try {
      const detail = await getExam(id);
      setEditingDetail(detail);
      setNewChoice(null);
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

  const handleDuplicate = async (exam: Exam) => {
    try {
      const dup = await duplicateExam(exam.id);
      toast.success(`Ujian diduplikat sebagai “${dup.title}”. Silakan atur jadwalnya.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menduplikat ujian.'));
    }
  };

  const handleSaveAsTemplate = async (exam: Exam) => {
    try {
      const tpl = await saveAsTemplate(exam.id);
      toast.success(`Template “${tpl.title}” tersimpan. Pakai lewat “Dari Template”.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan template.'));
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const created = await createFromTemplate(templateId);
      setTemplatePickerOpen(false);
      toast.success('Ujian dibuat dari template. Atur jadwal & peserta, lalu simpan.');
      openEdit(created.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal membuat ujian dari template.'));
    }
  };

  const LIFECYCLE_FN = {
    close: closeExam,
    archive: archiveExam,
    unarchive: unarchiveExam,
  } as const;
  const LIFECYCLE_DONE = {
    close: 'Ujian ditutup.',
    archive: 'Ujian diarsipkan.',
    unarchive: 'Ujian dikeluarkan dari arsip.',
  } as const;

  const confirmLifecycle = async () => {
    if (!pendingLifecycle) return;
    setIsLifecycleBusy(true);
    try {
      await LIFECYCLE_FN[pendingLifecycle.action](pendingLifecycle.exam.id);
      toast.success(LIFECYCLE_DONE[pendingLifecycle.action]);
      setPendingLifecycle(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status ujian.'));
    } finally {
      setIsLifecycleBusy(false);
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
      header={<ManajemenUjianHeader />}
    >
      {mode === 'builder' ? (
        <ExamBuilder
          key={editingDetail?.id ?? `new-${newChoice?.testType}-${newChoice?.examMode}`}
          initial={editingDetail}
          testTypeCode={editingDetail?.test_type ?? newChoice?.testType ?? 'itp'}
          examMode={editingDetail?.exam_mode ?? newChoice?.examMode ?? 'custom'}
          initialCounts={newChoice?.presetCounts}
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
        <div className="flex flex-col gap-5">
          {/* Toolbar: cari + filter status */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama ujian…"
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="font-bold"
                leftIcon={<LayoutTemplate className="h-4 w-4" />}
                onClick={() => setTemplatePickerOpen(true)}
              >
                Dari Template
              </Button>
              <ToggleGroup
                size="sm"
                value={statusFilter}
                onChange={(v) => {
                  if (v) {
                    setStatusFilter(v as 'all' | ExamStatus);
                    setPage(1);
                  }
                }}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'published', label: 'Tayang' },
                  { value: 'draft', label: 'Draf' },
                  { value: 'closed', label: 'Selesai' },
                  { value: 'archived', label: 'Arsip' },
                ]}
              />
            </div>
          </div>

          {!isLoading && (
            <p className="text-xs font-semibold text-slate-400">
              {total} ujian{statusFilter !== 'all' ? ' (terfilter)' : ''}
            </p>
          )}

          <ExamList
            exams={exams}
            isLoading={isLoading}
            currentUserRole={user?.role}
            onEdit={(exam) => openEdit(exam.id)}
            onDelete={(exam) => setPendingDeleteId(exam.id)}
            onUnpublish={handleUnpublish}
            onClose={(exam) => setPendingLifecycle({ exam, action: 'close' })}
            onArchive={(exam) => setPendingLifecycle({ exam, action: 'archive' })}
            onUnarchive={(exam) => setPendingLifecycle({ exam, action: 'unarchive' })}
            onDuplicate={handleDuplicate}
            onSaveAsTemplate={handleSaveAsTemplate}
            onManageAccommodation={(exam) => setAccommodationExam(exam)}
            onViewResults={(exam) => router.push(`/manajemen-ujian/${exam.id}/hasil`)}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage(page - 1)}
            onNext={() => setPage(page + 1)}
          />
        </div>
        <FAB actions={createActions} />
        </>
      )}

      <PilihJenisUjianModal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onChoose={handleChooseType}
      />

      <TemplatePickerModal
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onUse={handleUseTemplate}
      />

      <AccommodationModal
        open={!!accommodationExam}
        onClose={() => setAccommodationExam(null)}
        examId={accommodationExam?.id ?? null}
        examTitle={accommodationExam?.title}
        getExam={getExam}
        setParticipantExtra={setParticipantExtra}
      />

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
          Paket ujian ini akan dihapus dari daftar. Data (termasuk hasil percobaan) tetap tersimpan
          untuk keperluan audit, tetapi ujian tak lagi tampil di sini maupun bagi peserta.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!pendingLifecycle}
        onClose={() => setPendingLifecycle(null)}
        title={
          pendingLifecycle?.action === 'close'
            ? 'Tutup Ujian?'
            : pendingLifecycle?.action === 'archive'
              ? 'Arsipkan Ujian?'
              : 'Keluarkan dari Arsip?'
        }
        icon={
          pendingLifecycle?.action === 'close' ? (
            <Lock className="w-4 h-4" />
          ) : pendingLifecycle?.action === 'unarchive' ? (
            <ArchiveRestore className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )
        }
        confirmLabel={
          pendingLifecycle?.action === 'close'
            ? 'Ya, Tutup'
            : pendingLifecycle?.action === 'archive'
              ? 'Ya, Arsipkan'
              : 'Ya, Keluarkan'
        }
        confirmVariant={pendingLifecycle?.action === 'unarchive' ? 'primary' : 'warning'}
        loading={isLifecycleBusy}
        onConfirm={confirmLifecycle}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          {pendingLifecycle?.action === 'close' &&
            'Ujian akan ditutup dan tak bisa dikerjakan lagi. Status jadi read-only — untuk menjalankan ulang, gunakan Duplikat.'}
          {pendingLifecycle?.action === 'archive' &&
            'Ujian disembunyikan dari daftar aktif. Kamu bisa mengeluarkannya dari arsip kapan saja.'}
          {pendingLifecycle?.action === 'unarchive' &&
            'Ujian dikembalikan ke daftar aktif (ke Draf bila belum pernah dikerjakan, atau Selesai bila sudah).'}
        </p>
      </ConfirmDialog>
    </PageContainer>
  );
}
