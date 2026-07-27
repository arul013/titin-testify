'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import type { BankSoalTab, BankSoalSection } from './hooks/useBankSoalPage';

interface BankSoalFiltersProps {
  activeTab: BankSoalTab;
  onTabChange: (tab: BankSoalTab) => void;
  /** Bagian/skill jenis tes ruang ini → jadi tab (setelah Semua Soal & Materi). */
  sections: BankSoalSection[];
  search: string;
  onSearchChange: (val: string) => void;
  difficulty: string;
  onDifficultyChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
}

export const BankSoalFilters: React.FC<BankSoalFiltersProps> = ({
  activeTab,
  onTabChange,
  sections,
  search,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  statusFilter,
  onStatusChange,
}) => {
  const tabs: { id: BankSoalTab; label: string }[] = [
    { id: 'all', label: 'Semua Soal' },
    { id: 'passages', label: 'Teks Bacaan & Audio' },
    ...sections.map((s) => ({ id: s.code, label: s.name })),
  ];

  return (
    <>
      {/* Navigation Tabs */}
      <Tabs
        className="self-start"
        tabs={tabs}
        value={activeTab}
        onChange={(id) => onTabChange(id as BankSoalTab)}
      />

      {/* Filters row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={activeTab === 'passages' ? 'Cari teks bacaan / audio...' : 'Cari teks pertanyaan...'}
            className="pl-10"
          />
        </div>

        {/* Difficulty Filter (hide for passages tab) */}
        {activeTab !== 'passages' ? (
          <Select value={difficulty} onChange={(e) => onDifficultyChange(e.target.value)}>
            <option value="">Semua Tingkat Kesulitan</option>
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </Select>
        ) : (
          <div />
        )}

        {/* Status Filter */}
        <Select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="draft">Draf</option>
          <option value="published">Tayang</option>
        </Select>
      </div>
    </>
  );
};
