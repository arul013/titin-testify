'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useQuestions,
  usePassages,
  useQuestionStats,
  type Question,
  type Passage,
} from '@/features/questions/hooks/useQuestions';
import { QuestionTable } from '@/features/questions/QuestionTable';
import { QuestionForm } from '@/features/questions/QuestionForm';
import { PassageForm } from '@/features/questions/PassageForm';
import { QuestionPreview } from '@/features/questions/QuestionPreview';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Search,
  Music,
  FileText,
  HelpCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function BankSoalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'passages' | 'listening' | 'structure' | 'written_expression' | 'reading'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Selected passage for detail view (shows child questions)
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [passageQuestions, setPassageQuestions] = useState<Question[]>([]);
  const [isPassageQuestionsLoading, setIsPassageQuestionsLoading] = useState(false);

  // Modals state
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

  // Determine section filter based on tab
  const getSectionFilter = () => {
    if (activeTab === 'all' || activeTab === 'passages') return undefined;
    return activeTab;
  };

  // Fetch data
  const {
    questions,
    total: totalQuestions,
    isLoading: isQuestionsLoading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    fetchQuestions,
  } = useQuestions({
    section: getSectionFilter(),
    difficulty: difficulty || undefined,
    status: statusFilter || undefined,
    search: debouncedSearch,
    page,
    perPage,
  });

  const {
    passages,
    total: totalPassages,
    isLoading: isPassagesLoading,
    createPassage,
    updatePassage,
    deletePassage,
    fetchPassages,
  } = usePassages({
    type: getSectionFilter(),
    status: statusFilter || undefined,
    search: debouncedSearch,
    page,
    perPage,
  });

  const { stats, refetch: refetchStats } = useQuestionStats();

  // Fetch child questions when a passage is selected
  const fetchPassageQuestions = async (passageId: string) => {
    setIsPassageQuestionsLoading(true);
    try {
      const res = await fetch(`/api/questions?passage_id=${passageId}`);
      if (res.ok) {
        const data = await res.json();
        setPassageQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Error fetching child questions:', err);
    } finally {
      setIsPassageQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPassage) {
      fetchPassageQuestions(selectedPassage.id);
    }
  }, [selectedPassage]);

  // Reset pagination when tab/filters change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedPassage(null);
  };

  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  // Actions
  const handleCreateQuestionSubmit = async (data: Record<string, unknown>) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, data);
        toast.success('Soal berhasil diperbarui.');
      } else {
        await createQuestion(data);
        toast.success('Soal baru berhasil ditambahkan.');
      }
      refetchStats();
      if (selectedPassage) {
        fetchPassageQuestions(selectedPassage.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan soal.');
    }
  };

  const handleCreatePassageSubmit = async (data: Record<string, unknown>) => {
    try {
      if (editingPassage) {
        await updatePassage(editingPassage.id, data);
        toast.success('Passage berhasil diperbarui.');
      } else {
        await createPassage(data);
        toast.success('Passage baru berhasil ditambahkan.');
      }
      refetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan passage.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;
    try {
      await deleteQuestion(id);
      toast.success('Soal berhasil dihapus.');
      refetchStats();
      if (selectedPassage) {
        fetchPassageQuestions(selectedPassage.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus soal.');
    }
  };

  const handleDeletePassage = async (id: string) => {
    if (!confirm('Menghapus passage ini akan menghapus semua anak pertanyaan di dalamnya. Lanjutkan?')) return;
    try {
      await deletePassage(id);
      toast.success('Passage beserta soal terkait berhasil dihapus.');
      refetchStats();
      setSelectedPassage(null);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus passage.');
    }
  };

  const handlePreviewQuestion = async (q: Question) => {
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
    (activeTab === 'passages' ? totalPassages : totalQuestions) / perPage
  );

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 shadow-xl shadow-indigo-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-none px-3 py-1 font-bold text-xs uppercase tracking-wider mb-3">
              Katalog Soal
            </Badge>
            <h1 className="text-3xl font-extrabold font-heading text-white">Bank Soal Titin Testify</h1>
            <p className="text-indigo-100/90 mt-1 max-w-xl text-sm leading-relaxed">
              Kelola daftar soal ujian, transkrip listening audio, dan teks bacaan ujian secara terisolasi dan dinamis.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 border-none text-white font-bold"
              onClick={() => {
                setEditingPassage(null);
                setIsPassageOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Passage Induk
            </Button>
            <Button
              variant="primary"
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg shadow-black/10 border-none"
              onClick={() => {
                setEditingQuestion(null);
                setIsQuestionOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Soal Standalone
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Soal', val: stats.total_questions, icon: <HelpCircle className="w-5 h-5 text-indigo-600" /> },
            { label: 'Total Passage', val: stats.total_passages, icon: <Layers className="w-5 h-5 text-purple-600" /> },
            { label: 'Listening', val: stats.by_section.listening || 0, icon: <Music className="w-5 h-5 text-indigo-600" /> },
            { label: 'Structure', val: stats.by_section.structure || 0, icon: <FileText className="w-5 h-5 text-amber-600" /> },
            { label: 'Reading', val: stats.by_section.reading || 0, icon: <FileText className="w-5 h-5 text-emerald-600" /> },
          ].map((item, i) => (
            <Card key={i} className="bg-white border border-slate-100 p-4 flex items-center justify-between shadow-sm rounded-xl">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{item.val}</p>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg shrink-0">
                {item.icon}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail view for selected passage */}
      {selectedPassage && (
        <Card className="bg-white border-2 border-indigo-500/10 p-6 rounded-2xl shadow-md flex flex-col gap-5 relative">
          <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  className="p-1 h-7 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold"
                  onClick={() => setSelectedPassage(null)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
                </Button>
                <Badge variant="info" className="font-extrabold uppercase text-xs">
                  {selectedPassage.type} Group
                </Badge>
              </div>
              <h2 className="text-lg font-extrabold text-slate-800">
                Mengelola Anak Pertanyaan dari Passage
              </h2>
              {selectedPassage.audio_url && (
                <div className="mt-3 max-w-md bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
                  <audio src={selectedPassage.audio_url} controls className="w-full h-8" />
                </div>
              )}
              {selectedPassage.content && (
                <div className="mt-3 text-slate-600 text-sm max-h-[140px] overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-xl whitespace-pre-wrap leading-relaxed">
                  {selectedPassage.content}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingPassage(selectedPassage);
                  setIsPassageOpen(true);
                }}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Passage
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none"
                onClick={() => handleDeletePassage(selectedPassage.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus Group
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsQuestionOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Soal Anak
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Daftar Soal di dalam Group ({passageQuestions.length})
            </h3>
            {isPassageQuestionsLoading ? (
              <div className="py-12 text-center text-slate-500 font-semibold">Memuat soal anak...</div>
            ) : (
              <QuestionTable
                questions={passageQuestions}
                onEdit={(q) => {
                  setEditingQuestion(q);
                  setIsQuestionOpen(true);
                }}
                onDelete={handleDeleteQuestion}
                onPreview={handlePreviewQuestion}
                currentUserId={user?.id}
                currentUserRole={user?.role}
              />
            )}
          </div>
        </Card>
      )}

      {/* Main bank table and tabs */}
      {!selectedPassage && (
        <Card className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md shadow-slate-100 flex flex-col gap-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap border-b border-slate-100 gap-1 pb-1">
            {[
              { id: 'all', label: 'Semua Soal' },
              { id: 'passages', label: 'Passage Bacaan & Audio' },
              { id: 'listening', label: 'Listening Group' },
              { id: 'structure', label: 'Structure' },
              { id: 'written_expression', label: 'Written Expression' },
              { id: 'reading', label: 'Reading Group' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'passages' ? 'Cari teks passage...' : 'Cari teks pertanyaan...'}
                className="pl-10"
              />
            </div>

            {/* Difficulty Filter (hide for passages tab) */}
            {activeTab !== 'passages' ? (
              <Select
                value={difficulty}
                onChange={(e) => handleFilterChange(setDifficulty, e.target.value)}
              >
                <option value="">Semua Tingkat Kesulitan</option>
                <option value="easy">Easy (Mudah)</option>
                <option value="medium">Medium (Sedang)</option>
                <option value="hard">Hard (Sulit)</option>
              </Select>
            ) : <div />}

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            >
              <option value="">Semua Status Publikasi</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </div>

          {/* List Display */}
          {activeTab === 'passages' ? (
            // Passages Table
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              {isPassagesLoading ? (
                <div className="py-20 text-center text-slate-500 font-bold">Memuat data passage...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Konten / Ringkasan</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Tipe Passage</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Jumlah Pertanyaan</th>
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Status</th>
                      {user?.role === 'super_admin' && (
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Pembuat</th>
                      )}
                      <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {passages.length === 0 ? (
                      <tr>
                        <td colSpan={user?.role === 'super_admin' ? 6 : 5} className="py-12 text-center text-sm text-slate-400 font-medium">
                          Belum ada passage induk yang dibuat.
                        </td>
                      </tr>
                    ) : (
                      passages.map((p) => {
                        const canModify = user?.role === 'super_admin' || p.created_by === user?.id;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-4 px-6 max-w-md">
                              <div className="font-semibold text-slate-800 text-sm line-clamp-2 leading-relaxed">
                                {p.content || (
                                  <span className="text-indigo-600 font-bold flex items-center gap-1">
                                    <Music className="w-3.5 h-3.5" /> Audio Listening Group
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <Badge variant="info" className="font-extrabold uppercase text-xs">{p.type}</Badge>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="font-bold text-slate-700 text-sm bg-slate-100 px-3 py-1 rounded-xl">
                                {p.questions_count} Soal
                              </span>
                            </td>
                            <td className="py-4 px-6 whitespace-nowrap">
                              <Badge variant={p.status === 'published' ? 'success' : 'neutral'} className="text-[10px] font-extrabold uppercase">
                                {p.status}
                              </Badge>
                            </td>
                            {user?.role === 'super_admin' && (
                              <td className="py-4 px-6 whitespace-nowrap text-xs font-semibold text-slate-600">
                                {p.creator_name || 'Super Admin'}
                              </td>
                            )}
                            <td className="py-4 px-6 whitespace-nowrap text-right text-xs">
                              <div className="flex items-center justify-end gap-2.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="h-8 py-0 font-bold text-xs"
                                  onClick={() => setSelectedPassage(p)}
                                >
                                  <Layers className="w-3.5 h-3.5 mr-1" /> Kelola Soal
                                </Button>
                                {canModify && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingPassage(p);
                                        setIsPassageOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50/40 transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePassage(p.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/40 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            // Questions Table
            <div>
              {isQuestionsLoading ? (
                <div className="py-20 text-center text-slate-500 font-bold">Memuat data soal...</div>
              ) : (
                <QuestionTable
                  questions={questions}
                  onEdit={(q) => {
                    setEditingQuestion(q);
                    setIsQuestionOpen(true);
                  }}
                  onDelete={handleDeleteQuestion}
                  onPreview={handlePreviewQuestion}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                />
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 font-sans">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Sebelum
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Berikut <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Question Form Modal */}
      <QuestionForm
        open={isQuestionOpen}
        onClose={() => {
          setIsQuestionOpen(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleCreateQuestionSubmit}
        initialData={editingQuestion}
        passageId={selectedPassage?.id}
        defaultSection={selectedPassage ? selectedPassage.type : undefined}
      />

      {/* Passage Form Modal */}
      <PassageForm
        open={isPassageOpen}
        onClose={() => {
          setIsPassageOpen(false);
          setEditingPassage(null);
        }}
        onSubmit={handleCreatePassageSubmit}
        initialData={editingPassage}
        defaultType={activeTab !== 'all' && activeTab !== 'passages' ? activeTab : undefined}
      />

      {/* Question Preview Modal */}
      <QuestionPreview
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewQuestion(null);
          setPreviewPassage(null);
        }}
        question={previewQuestion}
        passage={previewPassage}
      />
    </div>
  );
}
