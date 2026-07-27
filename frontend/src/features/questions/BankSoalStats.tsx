'use client';

import React from 'react';
import { HelpCircle, Layers, ListChecks } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { QuestionStats } from './hooks/useQuestions';
import type { BankSoalSection } from './hooks/useBankSoalPage';

interface BankSoalStatsProps {
  stats: QuestionStats | null;
  /** Bagian jenis tes ruang ini → satu kartu statistik per bagian. */
  sections: BankSoalSection[];
}

export const BankSoalStats: React.FC<BankSoalStatsProps> = ({ stats, sections }) => {
  if (!stats) return null;

  const items = [
    { label: 'Total Soal', val: stats.total_questions, icon: <HelpCircle className="w-4 h-4" /> },
    { label: 'Total Materi', val: stats.total_passages, icon: <Layers className="w-4 h-4" /> },
    ...sections.map((s) => ({
      label: s.name,
      val: stats.by_section[s.code] || 0,
      icon: <ListChecks className="w-4 h-4" />,
    })),
  ];

  // Kolom menyesuaikan jumlah kartu (maks 6 per baris) agar rapi untuk jumlah bagian apa pun.
  const cols = Math.min(items.length, 6);
  const colClass =
    { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }[cols] ??
    'lg:grid-cols-6';

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 ${colClass} gap-4`}>
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.val} icon={item.icon} align="left" />
      ))}
    </div>
  );
};
