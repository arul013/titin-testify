'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BankSoalToolbarProps {
  onAddPassage: () => void;
  onAddQuestion: () => void;
}

/** Baris aksi Bank Soal (di bawah header), tombol rata kanan. */
export const BankSoalToolbar: React.FC<BankSoalToolbarProps> = ({ onAddPassage, onAddQuestion }) => {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
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
  );
};
