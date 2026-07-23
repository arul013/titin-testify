'use client';

import React from 'react';
import { HelpCircle, Layers, Music, FileText } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { QuestionStats } from './hooks/useQuestions';

interface BankSoalStatsProps {
  stats: QuestionStats | null;
}

export const BankSoalStats: React.FC<BankSoalStatsProps> = ({ stats }) => {
  if (!stats) return null;

  const items = [
    { label: 'Total Soal', val: stats.total_questions, icon: <HelpCircle className="w-4 h-4" /> },
    { label: 'Total Materi', val: stats.total_passages, icon: <Layers className="w-4 h-4" /> },
    { label: 'Listening', val: stats.by_section.listening || 0, icon: <Music className="w-4 h-4" /> },
    { label: 'Structure', val: stats.by_section.structure || 0, icon: <FileText className="w-4 h-4" /> },
    { label: 'Reading', val: stats.by_section.reading || 0, icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.val} icon={item.icon} align="left" />
      ))}
    </div>
  );
};
