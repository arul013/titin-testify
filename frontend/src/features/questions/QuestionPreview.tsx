"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { QuestionView } from "./QuestionView";
import type { Question, Passage } from "./hooks/useQuestions";

interface QuestionPreviewProps {
  open: boolean;
  onClose: () => void;
  question: Question | null;
  passage?: Passage | null;
}

export const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  open,
  onClose,
  question,
  passage,
}) => {
  if (!question) return null;

  return (
    <Modal open={open} onClose={onClose} title="Pratinjau Soal" size="lg">
      <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">
        <QuestionView question={question} passage={passage} layout="stacked" />
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button type="button" variant="primary" onClick={onClose}>
            Tutup Pratinjau
          </Button>
        </div>
      </div>
    </Modal>
  );
};
