"use client";

import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PassageView } from "./PassageView";
import { MateriQuestionsEditor } from "./MateriQuestionsEditor";
import { renderExamText } from "./examText";
import type { Passage, Question } from "./hooks/useQuestions";

interface PassageDetailPanelProps {
  passage: Passage;
  questions: Question[];
  isLoading: boolean;
  onEditPassage: (passage: Passage) => void;
  onDeletePassage: (id: string) => void;
  onCreateQuestion: (data: Record<string, unknown>) => Promise<void>;
  onUpdateQuestion: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onReorderQuestions: (orderedIds: string[]) => Promise<void>;
  onPreviewQuestion: (question: Question) => void;
}

export const PassageDetailPanel: React.FC<PassageDetailPanelProps> = ({
  passage,
  questions,
  isLoading,
  onEditPassage,
  onDeletePassage,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions,
  onPreviewQuestion,
}) => {
  return (
    <Card className="bg-white border-2 border-indigo-500/10 p-6 pb-4 rounded-2xl shadow-md flex flex-col gap-5 relative">
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
        </div>
      </div>

      {/* Materi (stimulus) — pinned agar tetap terlihat saat menyusun soal */}
      <div className="sticky top-4 z-10 flex flex-col gap-4 bg-white/95 backdrop-blur-sm pb-1">
        {passage.audio_url && (
          <div className="bg-slate-50 p-2.5 border border-slate-200/50 rounded-xl">
            <audio src={passage.audio_url} controls className="w-full h-8" />
          </div>
        )}
        {(() => {
          const textNode = passage.content ? (
            <div
              key="text"
              className="text-slate-600 text-sm max-h-56 overflow-y-auto bg-slate-50 border border-slate-100 p-4 rounded-xl leading-relaxed"
            >
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
          ) : null;
          const imgNode = passage.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key="img"
              src={passage.image_url}
              alt="Gambar materi"
              className="max-h-40 w-auto rounded-xl border border-slate-200/50"
            />
          ) : null;
          return passage.image_position === "above" ? [imgNode, textNode] : [textNode, imgNode];
        })()}
      </div>

      {/* Editor inline multi-soal (kartu bernomor + reorder) */}
      <MateriQuestionsEditor
        passage={passage}
        questions={questions}
        isLoading={isLoading}
        onCreate={onCreateQuestion}
        onUpdate={onUpdateQuestion}
        onDelete={onDeleteQuestion}
        onReorder={onReorderQuestions}
        onPreview={onPreviewQuestion}
      />
    </Card>
  );
};
