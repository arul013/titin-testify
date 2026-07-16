'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Check, BookOpen, HelpCircle } from 'lucide-react';
import type { Question } from './hooks/useQuestions';

interface QuestionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Question | null;
  passageId?: string | null;
  defaultSection?: string;
}

const SECTION_OPTIONS = [
  { value: 'listening', label: 'Listening' },
  { value: 'structure', label: 'Structure' },
  { value: 'written_expression', label: 'Written Expression' },
  { value: 'reading', label: 'Reading' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export const QuestionForm: React.FC<QuestionFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  passageId,
  defaultSection,
}) => {
  // State di-init langsung dari props. Parent memberi `key` unik agar form
  // remount (state fresh) tiap kali record/berubah dibuka — tidak perlu effect sinkronisasi.
  const [section, setSection] = useState(initialData?.section || defaultSection || 'listening');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'medium');
  const [questionText, setQuestionText] = useState(initialData?.question_text || '');
  const [optionA, setOptionA] = useState(initialData?.option_a || '');
  const [optionB, setOptionB] = useState(initialData?.option_b || '');
  const [optionC, setOptionC] = useState(initialData?.option_c || '');
  const [optionD, setOptionD] = useState(initialData?.option_d || '');
  const [correctAnswer, setCorrectAnswer] = useState(initialData?.correct_answer || 'a');
  const [explanation, setExplanation] = useState(initialData?.explanation || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        passage_id: passageId || null,
        section,
        difficulty,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        explanation: explanation || null,
        status,
        tags,
      });
      onClose();
    } catch {
      // Error handled by toast in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const answerLabels = ['A', 'B', 'C', 'D'];
  const answerValues = [optionA, optionB, optionC, optionD];

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Soal' : 'Tambah Soal Baru'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section, Difficulty, Status row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Section</label>
            <Select value={section} onChange={(e) => setSection(e.target.value)} disabled={!!passageId}>
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tingkat Kesulitan</label>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
            Pertanyaan
          </label>
          <Textarea
            rows={3}
            value={questionText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestionText(e.target.value)}
            placeholder="Tulis pertanyaan di sini..."
            required
          />
        </div>

        {/* Options A-D */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['a', 'b', 'c', 'd'].map((key, i) => {
            const setters = [setOptionA, setOptionB, setOptionC, setOptionD];
            return (
              <div key={key} className="relative">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Opsi {answerLabels[i]}
                  {correctAnswer === key && (
                    <Badge variant="success" className="ml-2 text-[10px] py-0 px-1.5">
                      <Check className="w-3 h-3 mr-0.5" /> Jawaban Benar
                    </Badge>
                  )}
                </label>
                <Input
                  value={answerValues[i]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setters[i](e.target.value)}
                  placeholder={`Isi opsi ${answerLabels[i]}...`}
                  required
                />
              </div>
            );
          })}
        </div>

        {/* Correct Answer */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Jawaban Benar</label>
          <Select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
            <option value="d">D</option>
          </Select>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 inline mr-1" />
            Pembahasan (Opsional)
          </label>
          <Textarea
            rows={2}
            value={explanation}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value)}
            placeholder="Penjelasan jawaban benar..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Tag Topik</label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
              placeholder="Ketik tag lalu tekan Enter..."
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
              }}
            />
            <Button type="button" variant="secondary" onClick={addTag} className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="neutral" className="flex items-center gap-1 text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => removeTag(tag)}>
                  {tag}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Simpan Perubahan' : 'Tambah Soal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
