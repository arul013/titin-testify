'use client';

import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useBankSoalPage } from '@/features/questions/hooks/useBankSoalPage';
import { BankSoalHeader } from '@/features/questions/BankSoalHeader';
import { BankSoalStats } from '@/features/questions/BankSoalStats';
import { BankSoalFilters } from '@/features/questions/BankSoalFilters';
import { PassageTable } from '@/features/questions/PassageTable';
import { PassageDetailPanel } from '@/features/questions/PassageDetailPanel';
import { QuestionTable } from '@/features/questions/QuestionTable';
import { QuestionForm } from '@/features/questions/QuestionForm';
import { PassageForm } from '@/features/questions/PassageForm';
import { QuestionPreview } from '@/features/questions/QuestionPreview';

export default function BankSoalPage() {
  const bank = useBankSoalPage();

  return (
    <div className="flex flex-col gap-6 py-2">
      <BankSoalHeader onAddPassage={bank.openCreatePassage} onAddQuestion={bank.openCreateQuestion} />

      <BankSoalStats stats={bank.stats} />

      {/* Detail view untuk passage terpilih */}
      {bank.selectedPassage && (
        <PassageDetailPanel
          passage={bank.selectedPassage}
          questions={bank.passageQuestions}
          isLoading={bank.isPassageQuestionsLoading}
          currentUserId={bank.user?.id}
          currentUserRole={bank.user?.role}
          onBack={() => bank.setSelectedPassage(null)}
          onEditPassage={bank.openEditPassage}
          onDeletePassage={bank.deletePassageWithConfirm}
          onAddChild={bank.openCreateQuestion}
          onEditQuestion={bank.openEditQuestion}
          onDeleteQuestion={bank.deleteQuestionWithConfirm}
          onPreviewQuestion={bank.previewQuestionWithPassage}
        />
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
              onDelete={bank.deletePassageWithConfirm}
            />
          ) : (
            <div>
              {bank.isQuestionsLoading ? (
                <div className="py-20 text-center text-slate-500 font-bold">Memuat data soal...</div>
              ) : (
                <QuestionTable
                  questions={bank.questions}
                  onEdit={bank.openEditQuestion}
                  onDelete={bank.deleteQuestionWithConfirm}
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

      {/* ─── Modals ─── */}
      <QuestionForm
        key={`q-${bank.editingQuestion?.id ?? 'new'}-${bank.isQuestionOpen}`}
        open={bank.isQuestionOpen}
        onClose={bank.closeQuestion}
        onSubmit={bank.submitQuestion}
        initialData={bank.editingQuestion}
        passageId={bank.selectedPassage?.id}
        defaultSection={bank.selectedPassage ? bank.selectedPassage.type : undefined}
      />

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
    </div>
  );
}
