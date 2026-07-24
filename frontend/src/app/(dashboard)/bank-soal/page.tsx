'use client';

import { Library, Trash2, FileText, Layers, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { useBankSoalPage } from '@/features/questions/hooks/useBankSoalPage';
import { BankSoalStats } from '@/features/questions/BankSoalStats';
import { BankSoalFilters } from '@/features/questions/BankSoalFilters';
import { BankSoalTableSkeleton } from '@/features/questions/BankSoalTableSkeleton';
import { PassageTable } from '@/features/questions/PassageTable';
import { PassageDetailPanel } from '@/features/questions/PassageDetailPanel';
import { QuestionTable } from '@/features/questions/QuestionTable';
import { QuestionBuilder } from '@/features/questions/QuestionBuilder';
import { PassageForm } from '@/features/questions/PassageForm';
import { QuestionPreview } from '@/features/questions/QuestionPreview';

export default function BankSoalPage() {
  const bank = useBankSoalPage();

  const isDeletingPassage = bank.pendingDelete?.kind === 'passage';

  // Aksi "Buat Soal" — disajikan sebagai speed-dial FAB (tanya jenis soal tanpa jargon).
  const createActions: FABAction[] = [
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Soal Tunggal',
      onClick: bank.openCreateQuestion,
    },
    {
      icon: <Layers className="w-5 h-5" />,
      label: 'Soal + Materi Bersama',
      onClick: bank.openCreatePassage,
    },
  ];

  return (
    <PageContainer
      className={bank.isQuestionOpen ? 'space-y-4' : 'space-y-6 pb-24'}
      header={
        bank.isQuestionOpen ? undefined : (
          <PageHeader
            icon={<Library />}
            title="Bank Soal"
            subtitle="Tempat mengelola semua soal ujian — baik soal tunggal maupun soal yang berbagi teks bacaan atau audio yang sama."
          />
        )
      }
    >
      {bank.isQuestionOpen ? (
        /* ─── Builder Soal (halaman penuh, 2-panel + preview) ─── */
        <QuestionBuilder
          key={`q-${bank.editingQuestion?.id ?? 'new'}`}
          initialData={bank.editingQuestion}
          passageId={bank.selectedPassage?.id}
          defaultSection={bank.selectedPassage ? bank.selectedPassage.type : undefined}
          passage={bank.selectedPassage}
          onCancel={bank.closeQuestion}
          onSubmit={bank.submitQuestion}
        />
      ) : (
        <>
          <BankSoalStats stats={bank.stats} />

          {/* Detail view untuk passage terpilih */}
          {bank.selectedPassage && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => bank.setSelectedPassage(null)}
                className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar
              </button>
              <PassageDetailPanel
                passage={bank.selectedPassage}
                questions={bank.passageQuestions}
                isLoading={bank.isPassageQuestionsLoading}
                currentUserId={bank.user?.id}
                currentUserRole={bank.user?.role}
                onEditPassage={bank.openEditPassage}
                onDeletePassage={bank.requestDeletePassage}
                onAddChild={bank.openCreateQuestion}
                onEditQuestion={bank.openEditQuestion}
                onDeleteQuestion={bank.requestDeleteQuestion}
                onPreviewQuestion={bank.previewQuestionWithPassage}
              />
            </div>
          )}

          {/* Tabel utama + tab + filter */}
          {!bank.selectedPassage && (
            <Card className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md shadow-slate-100 flex flex-col gap-6">
              <BankSoalFilters
                activeTab={bank.activeTab}
                onTabChange={bank.onTabChange}
                search={bank.search}
                onSearchChange={bank.setSearch}
                difficulty={bank.difficulty}
                onDifficultyChange={bank.onDifficultyChange}
                statusFilter={bank.statusFilter}
                onStatusChange={bank.onStatusChange}
              />

              {bank.activeTab === 'passages' ? (
                <PassageTable
                  passages={bank.passages}
                  isLoading={bank.isPassagesLoading}
                  currentUserId={bank.user?.id}
                  currentUserRole={bank.user?.role}
                  onManage={(p) => bank.setSelectedPassage(p)}
                  onEdit={bank.openEditPassage}
                  onDelete={bank.requestDeletePassage}
                />
              ) : (
                <div>
                  {bank.isQuestionsLoading ? (
                    <BankSoalTableSkeleton />
                  ) : (
                    <QuestionTable
                      questions={bank.questions}
                      onEdit={bank.openEditQuestion}
                      onDelete={bank.requestDeleteQuestion}
                      onPreview={bank.previewQuestionWithPassage}
                      currentUserId={bank.user?.id}
                      currentUserRole={bank.user?.role}
                    />
                  )}
                </div>
              )}

              <Pagination
                page={bank.page}
                totalPages={bank.totalPages}
                onPrev={() => bank.setPage(bank.page - 1)}
                onNext={() => bank.setPage(bank.page + 1)}
              />
            </Card>
          )}

          {/* FAB "Buat Soal" — speed-dial 2 pilihan (soal tunggal vs materi bersama) */}
          <FAB actions={createActions} />
        </>
      )}

      {/* ─── Modals ─── */}
      <PassageForm
        key={`p-${bank.editingPassage?.id ?? 'new'}-${bank.isPassageOpen}`}
        open={bank.isPassageOpen}
        onClose={bank.closePassage}
        onSubmit={bank.submitPassage}
        initialData={bank.editingPassage}
        defaultType={
          bank.activeTab !== 'all' && bank.activeTab !== 'passages' ? bank.activeTab : undefined
        }
      />

      <QuestionPreview
        open={bank.isPreviewOpen}
        onClose={bank.closePreview}
        question={bank.previewQuestion}
        passage={bank.previewPassage}
      />

      <ConfirmDialog
        open={!!bank.pendingDelete}
        onClose={bank.cancelDelete}
        title={isDeletingPassage ? 'Hapus Materi Ini?' : 'Hapus Soal Ini?'}
        icon={<Trash2 className="w-4 h-4" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={bank.isDeleting}
        onConfirm={bank.confirmDelete}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          {isDeletingPassage
            ? 'Menghapus materi ini akan ikut menghapus semua soal di dalamnya. Tindakan ini tidak bisa dibatalkan.'
            : 'Soal ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.'}
        </p>
      </ConfirmDialog>
    </PageContainer>
  );
}
