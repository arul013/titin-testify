'use client';

import React from 'react';
import { ChevronLeft, Edit2, Trash2, Plus, Layers } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuestionTable } from './QuestionTable';
import type { Passage, Question } from './hooks/useQuestions';

interface PassageDetailPanelProps {
  passage: Passage;
  questions: Question[];
  isLoading: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onBack: () => void;
  onEditPassage: (passage: Passage) => void;
  onDeletePassage: (id: string) => void;
  onAddChild: () => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onPreviewQuestion: (question: Question) => void;
}

export const PassageDetailPanel: React.FC<PassageDetailPanelProps> = ({
  passage,
  questions,
  isLoading,
  currentUserId,
  currentUserRole,
  onBack,
  onEditPassage,
  onDeletePassage,
  onAddChild,
  onEditQuestion,
  onDeleteQuestion,
  onPreviewQuestion,
}) => {
  return (
    <Card className="bg-white border-2 border-indigo-500/10 p-6 rounded-2xl shadow-md flex flex-col gap-5 relative">
      <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              className="p-1 h-7 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold"
              onClick={onBack}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
            </Button>
            <Badge variant="info" className="font-extrabold uppercase text-xs">
              {passage.type} Group
            </Badge>
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Mengelola Anak Pertanyaan dari Passage
          </h2>
          {passage.audio_url && (
            <div className="mt-3 max-w-md bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
              <audio src={passage.audio_url} controls className="w-full h-8" />
            </div>
          )}
          {passage.content && (
            <div className="mt-3 text-slate-600 text-sm max-h-[140px] overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-xl whitespace-pre-wrap leading-relaxed">
              {passage.content}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEditPassage(passage)}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Passage
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none"
            onClick={() => onDeletePassage(passage.id)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus Group
          </Button>
          <Button variant="primary" size="sm" onClick={onAddChild}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Soal Anak
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Daftar Soal di dalam Group ({questions.length})
        </h3>
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 font-semibold">Memuat soal anak...</div>
        ) : (
          <QuestionTable
            questions={questions}
            onEdit={onEditQuestion}
            onDelete={onDeleteQuestion}
            onPreview={onPreviewQuestion}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )}
      </div>
    </Card>
  );
};
