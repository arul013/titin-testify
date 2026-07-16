'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BankSoalHeaderProps {
  onAddPassage: () => void;
  onAddQuestion: () => void;
}

export const BankSoalHeader: React.FC<BankSoalHeaderProps> = ({ onAddPassage, onAddQuestion }) => {
  return (
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
            onClick={onAddPassage}
          >
            <Plus className="w-4 h-4 mr-2" /> Passage Induk
          </Button>
          <Button
            variant="primary"
            className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-lg shadow-black/10 border-none"
            onClick={onAddQuestion}
          >
            <Plus className="w-4 h-4 mr-2" /> Soal Standalone
          </Button>
        </div>
      </div>
    </div>
  );
};
