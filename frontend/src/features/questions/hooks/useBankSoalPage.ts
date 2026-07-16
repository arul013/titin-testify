'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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

    fetch(`/api/questions?passage_id=${passageId}`)
      .then((res) => (res.ok ? res.json() : { questions: [] }))
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
        toast.success('Passage berhasil diperbarui.');
      } else {
        await createPassage(data);
        toast.success('Passage baru berhasil ditambahkan.');
      }
      refetchStats();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan passage.'));
    }
  };

  const deleteQuestionWithConfirm = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;
    try {
      await deleteQuestion(id);
      toast.success('Soal berhasil dihapus.');
      refetchStats();
      if (selectedPassage) refreshPassageQuestions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus soal.'));
    }
  };

  const deletePassageWithConfirm = async (id: string) => {
    if (
      !confirm(
        'Menghapus passage ini akan menghapus semua anak pertanyaan di dalamnya. Lanjutkan?'
      )
    )
      return;
    try {
      await deletePassage(id);
      toast.success('Passage beserta soal terkait berhasil dihapus.');
      refetchStats();
      setSelectedPassage(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus passage.'));
    }
  };

  const previewQuestionWithPassage = async (q: Question) => {
    setPreviewQuestion(q);
    setPreviewPassage(null);
    if (q.passage_id) {
      try {
        const res = await fetch(`/api/passages/${q.passage_id}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewPassage(data.passage);
        }
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
    deleteQuestionWithConfirm,
    deletePassageWithConfirm,
    previewQuestionWithPassage,
  };
}
