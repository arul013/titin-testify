"use client";

import React from "react";
import { Edit2, Trash2, Plus, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionTable } from "./QuestionTable";
import { BankSoalTableSkeleton } from "./BankSoalTableSkeleton";
import { PassageView } from "./PassageView";
import { renderExamText } from "./examText";
import type { Passage, Question } from "./hooks/useQuestions";

interface PassageDetailPanelProps {
  passage: Passage;
  questions: Question[];
  isLoading: boolean;
  currentUserId?: string;
  currentUserRole?: string;
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
  onEditPassage,
  onDeletePassage,
  onAddChild,
  onEditQuestion,
  onDeleteQuestion,
  onPreviewQuestion,
}) => {
  return (
    <Card className="bg-white border-2 border-indigo-500/10 p-6 pb-3 rounded-2xl shadow-md flex flex-col gap-5 relative">
      {/* Header: judul + badge inline (kiri), aksi (kanan) */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-extrabold text-slate-800">Kelola Soal untuk Materi Ini</h2>
          <Badge variant="info" className="font-extrabold uppercase text-xs">
            {passage.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEditPassage(passage)}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Materi
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none"
            onClick={() => onDeletePassage(passage.id)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus Materi Ini
          </Button>
          <Button variant="primary" size="sm" onClick={onAddChild}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Soal ke Materi
          </Button>
        </div>
      </div>

      {/* Materi — penuh-lebar */}
      {passage.audio_url && (
        <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
          <audio src={passage.audio_url} controls className="w-full h-8" />
        </div>
      )}
      {passage.content && (
        <div className="text-slate-600 text-sm max-h-64 overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed">
          {passage.type === "reading" ? (
            <PassageView content={passage.content} />
          ) : (
            passage.content.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className={i ? "mt-2" : ""}>
                {renderExamText(para.replace(/\n/g, " ").trim())}
              </p>
            ))
          )}
        </div>
      )}

      {/* Daftar soal */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-700 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Daftar Soal dalam Materi Ini ({questions.length})
        </h3>
        {isLoading ? (
          <BankSoalTableSkeleton rows={3} />
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
