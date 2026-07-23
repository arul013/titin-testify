"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit2,
  Trash2,
  Eye,
  Music,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Question } from "./hooks/useQuestions";

interface QuestionTableProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  onPreview: (question: Question) => void;
  currentUserRole?: string;
  currentUserId?: string;
}

export const QuestionTable: React.FC<QuestionTableProps> = ({
  questions,
  onEdit,
  onDelete,
  onPreview,
  currentUserRole,
  currentUserId,
}) => {
  const getSectionBadge = (section: string) => {
    switch (section) {
      case "listening":
        return (
          <Badge
            variant="info"
            className="flex items-center gap-1 font-bold text-xs"
          >
            <Music className="w-3.5 h-3.5" /> Listening
          </Badge>
        );
      case "reading":
        return (
          <Badge
            variant="success"
            className="flex items-center gap-1 font-bold text-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Reading
          </Badge>
        );
      case "structure":
        return (
          <Badge
            variant="warning"
            className="flex items-center gap-1 font-bold text-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Structure
          </Badge>
        );
      case "written_expression":
        return (
          <Badge
            variant="danger"
            className="flex items-center gap-1 font-bold text-xs"
          >
            <FileText className="w-3.5 h-3.5" /> Written Expression
          </Badge>
        );
      default:
        return <Badge variant="neutral">{section}</Badge>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return (
          <Badge
            variant="success"
            className="text-[10px] font-extrabold uppercase"
          >
            Mudah
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="warning"
            className="text-[10px] font-extrabold uppercase"
          >
            Sedang
          </Badge>
        );
      case "hard":
        return (
          <Badge
            variant="danger"
            className="text-[10px] font-extrabold uppercase"
          >
            Sulit
          </Badge>
        );
      default:
        return <Badge variant="neutral">{difficulty}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === "published" ? (
      <Badge
        variant="success"
        className="flex items-center gap-1 text-[10px] font-extrabold uppercase"
      >
        <CheckCircle2 className="w-3 h-3" /> Tayang
      </Badge>
    ) : (
      <Badge
        variant="neutral"
        className="flex items-center gap-1 text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500"
      >
        <AlertCircle className="w-3 h-3" /> Draf
      </Badge>
    );
  };

  const cleanHTML = (text: string) => {
    if (!text) return "";
    // Clean both __word__ and [word]{A} patterns
    return text
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\[([^\]]+)\]\{[A-Da-d]\}/g, "$1");
  };

  return (
    <Card className="overflow-hidden border border-slate-100 shadow-md shadow-slate-100/50 rounded-2xl bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pertanyaan
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bagian
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tingkat Kesulitan
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Jawaban
              </th>
              {currentUserRole === "super_admin" && (
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pembuat
                </th>
              )}
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.length === 0 ? (
              <tr>
                <td
                  colSpan={currentUserRole === "super_admin" ? 7 : 6}
                  className="py-12 text-center text-sm text-slate-400 font-medium"
                >
                  Belum ada soal di sini. Tambahkan lewat tombol di atas.
                </td>
              </tr>
            ) : (
              questions.map((q) => {
                const canModify =
                  currentUserRole === "super_admin" ||
                  q.created_by === currentUserId;

                return (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    {/* Question text & tags */}
                    <td className="py-4 px-6 max-w-md">
                      <div className="font-semibold text-slate-800 text-sm line-clamp-2 leading-relaxed">
                        {cleanHTML(q.question_text)}
                      </div>
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {q.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Section */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getSectionBadge(q.section)}
                    </td>

                    {/* Difficulty */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getDifficultyBadge(q.difficulty)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getStatusBadge(q.status)}
                    </td>

                    {/* Correct Answer */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center font-extrabold text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg h-7 w-7 uppercase">
                        {q.correct_answer}
                      </span>
                    </td>

                    {/* Creator (Super Admin view only) */}
                    {currentUserRole === "super_admin" && (
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-semibold text-slate-600">
                        {q.creator_name || "Super Admin Utama"}
                      </td>
                    )}

                    {/* Action buttons */}
                    <td className="py-4 px-6 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onPreview(q)}
                          title="Preview Soal"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canModify && (
                          <>
                            <button
                              onClick={() => onEdit(q)}
                              title="Edit Soal"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50/40 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(q.id)}
                              title="Hapus Soal"
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
      </div>
    </Card>
  );
};
