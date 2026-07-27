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
import { PassageBuilder } from '@/features/questions/PassageBuilder';
import { PassageTypeChooser } from '@/features/questions/PassageTypeChooser';
import { QuestionPreview } from '@/features/questions/QuestionPreview';
import type { TestType } from '@/features/test-types/useTestTypes';

interface BankSoalRoomProps {
  testType: TestType;
  onBack: () => void;
}

/** Bank soal untuk satu jenis tes (ruang). Data & soal baru ter-scope ke jenis ini. */
export function BankSoalRoom({ testType, onBack }: BankSoalRoomProps) {
  const sections = testType.skills.map((s) => ({ code: s.code, name: s.name }));
  const bank = useBankSoalPage(testType.code, sections);

  const isDeletingPassage = bank.pendingDelete?.kind === 'passage';

  const createActions: FABAction[] = [
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Soal Tunggal',
      onClick: bank.openCreateQuestion,
    },
    {
      icon: <Layers className="w-5 h-5" />,
      label: 'Soal + Materi Bersama',
      onClick: bank.openPassageTypeChooser,
    },
  ];

  const isBuilderOpen = bank.isQuestionOpen || bank.isPassageOpen;
  const showFab = !isBuilderOpen && !bank.selectedPassage;
  const sectionOptions = sections.map((s) => ({ value: s.code, label: s.name }));
  // Ruang bawah sama dengan tampilan detail materi (yang sudah pas): tanpa
  // padding ekstra. FAB mengambang di kanan, tak menutupi konten di layar lebar.

  return (
    <PageContainer
      className={isBuilderOpen ? 'space-y-4' : 'space-y-6'}
      header={
        <div className="space-y-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Semua Jenis Tes
          </button>
          <PageHeader
            icon={<Library />}
            title={`Bank Soal — ${testType.name}`}
            subtitle="Kelola soal untuk jenis tes ini — soal tunggal maupun soal yang berbagi teks bacaan atau audio yang sama."
          />
        </div>
      }
    >
      {bank.isQuestionOpen ? (
        <QuestionBuilder
          key={`q-${bank.editingQuestion?.id ?? 'new'}`}
          initialData={bank.editingQuestion}
          passageId={bank.builderPassage?.id}
          defaultSection={bank.builderPassage ? bank.builderPassage.type : sections[0]?.code}
          sectionOptions={sectionOptions}
          passage={bank.builderPassage}
          passageLoading={bank.isBuilderPassageLoading}
          onCancel={bank.closeQuestion}
          onSubmit={bank.submitQuestion}
        />
      ) : bank.isPassageOpen ? (
        <PassageBuilder
          key={`p-${bank.editingPassage?.id ?? 'new'}`}
          initialData={bank.editingPassage}
          defaultType={bank.passageDraftType}
          onCancel={bank.closePassage}
          onSubmit={bank.submitPassage}
        />
      ) : (
        <>
          <BankSoalStats stats={bank.stats} sections={sections} />

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
                onEditPassage={bank.openEditPassage}
                onDeletePassage={bank.requestDeletePassage}
                onCreateQuestion={bank.createPassageQuestion}
                onUpdateQuestion={bank.updatePassageQuestion}
                onDeleteQuestion={bank.deletePassageQuestion}
                onReorderQuestions={bank.reorderPassageQuestions}
                onPreviewQuestion={bank.previewQuestionWithPassage}
              />
            </div>
          )}

          {!bank.selectedPassage && (
            <Card className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md shadow-slate-100 flex flex-col gap-6">
              <BankSoalFilters
                activeTab={bank.activeTab}
                onTabChange={bank.onTabChange}
                sections={sections}
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

          {showFab && <FAB actions={createActions} />}
        </>
      )}

      {/* ─── Modals ─── */}
      <PassageTypeChooser
        open={bank.isPassageTypeChooserOpen}
        onClose={bank.closePassageTypeChooser}
        onChoose={bank.startCreatePassage}
        sections={sections}
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
