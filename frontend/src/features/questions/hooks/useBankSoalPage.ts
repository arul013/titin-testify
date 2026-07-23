'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useQuestions,
  usePassages,
  useQuestionStats,
  type Question,
  type Passage,
} from './useQuestions';

export type BankSoalTab =
  | 'all'
  | 'passages'
  | 'listening'
  | 'structure'
  | 'written_expression'
  | 'reading';

const PER_PAGE = 10;

/**
 * Semua state, data, dan handler untuk halaman Bank Soal.
 * Memisahkan logika dari tampilan agar `page.tsx` tetap tipis (smart page, dumb components).
 */
export function useBankSoalPage() {
  const { user } = useAuth();

  // ─── Filter & pagination state ─────────────────────────────
  const [activeTab, setActiveTab] = useState<BankSoalTab>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // ─── Passage detail view ───────────────────────────────────
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [passageQuestions, setPassageQuestions] = useState<Question[]>([]);
  const [isPassageQuestionsLoading, setIsPassageQuestionsLoading] = useState(false);
  const [passageQuestionsRefetch, setPassageQuestionsRefetch] = useState(0);

  // ─── Modal state ───────────────────────────────────────────
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const [isPassageOpen, setIsPassageOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewPassage, setPreviewPassage] = useState<Passage | null>(null);

  // Konfirmasi hapus (menggantikan window.confirm dengan ConfirmDialog).
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'question' | 'passage'; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Filter section berdasarkan tab aktif
  const sectionFilter =
    activeTab === 'all' || activeTab === 'passages' ? undefined : activeTab;

  // ─── Data hooks ────────────────────────────────────────────
  const {
    questions,
    total: totalQuestions,
    isLoading: isQuestionsLoading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuestions({
    section: sectionFilter,
    difficulty: difficulty || undefined,
    status: statusFilter || undefined,
    search: debouncedSearch,
    page,
    perPage: PER_PAGE,
  });

  const {
    passages,
    total: totalPassages,
    isLoading: isPassagesLoading,
    createPassage,
    updatePassage,
    deletePassage,
  } = usePassages({
    type: sectionFilter,
    status: statusFilter || undefined,
    search: debouncedSearch,
    page,
    perPage: PER_PAGE,
  });

  const { stats, refetch: refetchStats } = useQuestionStats();

  const refreshPassageQuestions = () => setPassageQuestionsRefetch((i) => i + 1);

  // Muat soal anak saat sebuah passage dipilih
  useEffect(() => {
    if (!selectedPassage) return;
    let active = true;
    const passageId = selectedPassage.id;

    api
      .request<{ questions: Question[] }>(`/api/questions?passage_id=${passageId}`)
      .then((data) => {
        if (active) setPassageQuestions(data.questions || []);
      })
      .catch((err) => console.error('Error fetching child questions:', err))
      .finally(() => {
        if (active) setIsPassageQuestionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPassage, passageQuestionsRefetch]);

  // ─── Filter handlers (reset ke halaman 1) ──────────────────
  const onTabChange = (tab: BankSoalTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedPassage(null);
  };

  const onDifficultyChange = (val: string) => {
    setDifficulty(val);
    setPage(1);
  };

  const onStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  // ─── Modal openers ─────────────────────────────────────────
  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setIsQuestionOpen(true);
  };

  const openEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsQuestionOpen(true);
  };

  const closeQuestion = () => {
    setIsQuestionOpen(false);
    setEditingQuestion(null);
  };

  const openCreatePassage = () => {
    setEditingPassage(null);
    setIsPassageOpen(true);
  };

  const openEditPassage = (passage: Passage) => {
    setEditingPassage(passage);
    setIsPassageOpen(true);
  };

  const closePassage = () => {
    setIsPassageOpen(false);
    setEditingPassage(null);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewQuestion(null);
    setPreviewPassage(null);
  };

  // ─── Submit / delete / preview handlers ────────────────────
  const submitQuestion = async (data: Record<string, unknown>) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, data);
        toast.success('Soal berhasil diperbarui.');
      } else {
        await createQuestion(data);
        toast.success('Soal baru berhasil ditambahkan.');
      }
      refetchStats();
      if (selectedPassage) refreshPassageQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan soal.'));
    }
  };

  const submitPassage = async (data: Record<string, unknown>) => {
    try {
      if (editingPassage) {
        await updatePassage(editingPassage.id, data);
        toast.success('Materi berhasil diperbarui.');
      } else {
        await createPassage(data);
        toast.success('Materi baru berhasil ditambahkan.');
      }
      refetchStats();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan materi.'));
    }
  };

  // Buka dialog konfirmasi (tabel memanggil ini alih-alih langsung menghapus).
  const requestDeleteQuestion = (id: string) => setPendingDelete({ kind: 'question', id });
  const requestDeletePassage = (id: string) => setPendingDelete({ kind: 'passage', id });
  const cancelDelete = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.kind === 'question') {
        await deleteQuestion(pendingDelete.id);
        toast.success('Soal berhasil dihapus.');
        if (selectedPassage) refreshPassageQuestions();
      } else {
        await deletePassage(pendingDelete.id);
        toast.success('Materi beserta soalnya berhasil dihapus.');
        setSelectedPassage(null);
      }
      refetchStats();
      setPendingDelete(null);
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          pendingDelete.kind === 'question' ? 'Gagal menghapus soal.' : 'Gagal menghapus materi.'
        )
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const previewQuestionWithPassage = async (q: Question) => {
    setPreviewQuestion(q);
    setPreviewPassage(null);
    if (q.passage_id) {
      try {
        const data = await api.request<{ passage: Passage }>(`/api/passages/${q.passage_id}`);
        setPreviewPassage(data.passage);
      } catch (err) {
        console.error(err);
      }
    }
    setIsPreviewOpen(true);
  };

  const totalPages = Math.ceil(
    (activeTab === 'passages' ? totalPassages : totalQuestions) / PER_PAGE
  );

  return {
    // current user
    user,

    // filter & pagination
    activeTab,
    search,
    difficulty,
    statusFilter,
    page,
    totalPages,
    setSearch,
    setPage,
    onTabChange,
    onDifficultyChange,
    onStatusChange,

    // questions & passages data
    questions,
    isQuestionsLoading,
    passages,
    isPassagesLoading,
    stats,

    // passage detail
    selectedPassage,
    setSelectedPassage,
    passageQuestions,
    isPassageQuestionsLoading,

    // modal state
    isQuestionOpen,
    isPassageOpen,
    isPreviewOpen,
    editingQuestion,
    editingPassage,
    previewQuestion,
    previewPassage,

    // openers/closers
    openCreateQuestion,
    openEditQuestion,
    closeQuestion,
    openCreatePassage,
    openEditPassage,
    closePassage,
    closePreview,

    // actions
    submitQuestion,
    submitPassage,
    previewQuestionWithPassage,

    // delete confirmation
    pendingDelete,
    isDeleting,
    requestDeleteQuestion,
    requestDeletePassage,
    cancelDelete,
    confirmDelete,
  };
}
