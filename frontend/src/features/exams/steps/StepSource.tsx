'use client';

import React, { useState } from 'react';
import { Layers, FileText, Music, Eye, Shuffle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestions, usePassages, type Question } from '@/features/questions/hooks/useQuestions';
import { QuestionPreview } from '@/features/questions/QuestionPreview';
import { SECTION_LABELS, type ExamPoolUnit, type ExamSectionId } from '../hooks/useExams';

interface StepSourceProps {
  enabledSections: ExamSectionId[];
  poolUnits: ExamPoolUnit[];
  onChange: (units: ExamPoolUnit[]) => void;
}

/** Bersihkan markup Written Expression untuk tampilan ringkas. */
function clean(text: string): string {
  if (!text) return '';
  return text.replace(/__([^_]+)__/g, '$1').replace(/\[([^\]]+)\]\{[A-Da-d]\}/g, '$1');
}

export const StepSource: React.FC<StepSourceProps> = ({ enabledSections, poolUnits, onChange }) => {
  const [activeSection, setActiveSection] = useState<ExamSectionId | null>(
    enabledSections[0] ?? null,
  );
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const section = activeSection ?? undefined;
  const { passages, isLoading: pLoading } = usePassages({
    type: section,
    status: 'published',
    perPage: 100,
  });
  const { questions, isLoading: qLoading } = useQuestions({
    section,
    status: 'published',
    perPage: 100,
  });
  const standalone = questions.filter((q) => !q.passage_id);

  const hasPassage = (id: string) => poolUnits.some((u) => u.passage_id === id);
  const hasQuestion = (id: string) => poolUnits.some((u) => u.question_id === id);

  const togglePassage = (id: string) => {
    onChange(
      hasPassage(id)
        ? poolUnits.filter((u) => u.passage_id !== id)
        : [...poolUnits, { passage_id: id, question_id: null }],
    );
  };
  const toggleQuestion = (id: string) => {
    onChange(
      hasQuestion(id)
        ? poolUnits.filter((u) => u.question_id !== id)
        : [...poolUnits, { passage_id: null, question_id: id }],
    );
  };

  if (enabledSections.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="Tentukan komposisi dulu"
        description="Pilih bagian & jumlah soal di langkah Komposisi, lalu kembali ke sini untuk (opsional) mempersempit sumber soal."
      />
    );
  }

  const selectedInSection =
    passages.filter((p) => hasPassage(p.id)).length +
    standalone.filter((q) => hasQuestion(q.id)).length;

  const isLoading = pLoading || qLoading;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Secara default, soal diambil <strong>acak dari seluruh Bank Soal (Tayang)</strong> untuk tiap
        bagian. Kamu bisa mempersempit ke materi/soal tertentu di bawah (opsional).
      </p>

      <Tabs
        className="self-start"
        tabs={enabledSections.map((s) => ({ id: s, label: SECTION_LABELS[s] }))}
        value={activeSection ?? ''}
        onChange={(id) => setActiveSection(id as ExamSectionId)}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {activeSection ? SECTION_LABELS[activeSection] : ''}
        </span>
        {selectedInSection === 0 ? (
          <Badge variant="neutral" className="text-[10px] font-bold gap-1">
            <Shuffle className="w-3 h-3" /> Acak dari semua
          </Badge>
        ) : (
          <Badge variant="info" className="text-[10px] font-bold">
            Dibatasi ke {selectedInSection} unit
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : passages.length === 0 && standalone.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Belum ada soal Tayang di bagian ini"
          description="Tayangkan soal/materi di Bank Soal agar bisa dipakai, atau biarkan acak."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Materi (passage utuh) */}
          {passages.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Materi (unit utuh)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {passages.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 hover:border-slate-200 p-3 cursor-pointer transition-colors"
                  >
                    <Checkbox checked={hasPassage(p.id)} onChange={() => togglePassage(p.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 line-clamp-1 flex items-center gap-1.5">
                        {!p.content && <Music className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        {clean(p.content || '') || 'Audio Listening'}
                      </p>
                    </div>
                    <Badge variant="neutral" className="text-[10px] font-bold shrink-0">
                      {p.questions_count} soal
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Soal tunggal (standalone) */}
          {standalone.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Soal tunggal
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {standalone.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 hover:border-slate-200 p-3 transition-colors"
                  >
                    <Checkbox checked={hasQuestion(q.id)} onChange={() => toggleQuestion(q.id)} />
                    <p className="text-sm font-medium text-slate-700 line-clamp-1 flex-1 min-w-0">
                      {clean(q.question_text)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewQuestion(q)}
                      title="Pratinjau soal"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <QuestionPreview
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
        passage={null}
      />
    </div>
  );
};
