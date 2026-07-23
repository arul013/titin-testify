'use client';

import React from 'react';
import { HelpCircle, Layers, Music, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { QuestionStats } from './hooks/useQuestions';

interface BankSoalStatsProps {
  stats: QuestionStats | null;
}

export const BankSoalStats: React.FC<BankSoalStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: 'Total Soal', val: stats.total_questions, icon: <HelpCircle className="w-5 h-5 text-indigo-600" /> },
    { label: 'Total Materi', val: stats.total_passages, icon: <Layers className="w-5 h-5 text-purple-600" /> },
    { label: 'Listening', val: stats.by_section.listening || 0, icon: <Music className="w-5 h-5 text-indigo-600" /> },
    { label: 'Structure', val: stats.by_section.structure || 0, icon: <FileText className="w-5 h-5 text-amber-600" /> },
    { label: 'Reading', val: stats.by_section.reading || 0, icon: <FileText className="w-5 h-5 text-emerald-600" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="bg-white border border-slate-100 p-4 flex items-center justify-between shadow-sm rounded-xl"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{item.label}</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{item.val}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg shrink-0">{item.icon}</div>
        </Card>
      ))}
    </div>
  );
};
