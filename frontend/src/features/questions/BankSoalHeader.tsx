'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BankSoalHeaderProps {
  onAddPassage: () => void;
  onAddQuestion: () => void;
}

export const BankSoalHeader: React.FC<BankSoalHeaderProps> = ({ onAddPassage, onAddQuestion }) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
          Bank Soal
        </h1>
        <p className="text-gray-500 mt-1.5 font-medium">
          Kelola daftar soal ujian, transkrip listening audio, dan teks bacaan ujian secara
          terisolasi dan dinamis.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <Button
          onClick={onAddPassage}
          variant="secondary"
          className="font-bold gap-2 shadow-xs border-slate-200"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Passage Induk
        </Button>
        <Button
          onClick={onAddQuestion}
          variant="primary"
          className="font-bold gap-2 shadow-md"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Soal Standalone
        </Button>
      </div>
    </div>
  );
};
