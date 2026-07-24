'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import type { BankSoalTab } from './hooks/useBankSoalPage';

interface BankSoalFiltersProps {
  activeTab: BankSoalTab;
  onTabChange: (tab: BankSoalTab) => void;
  search: string;
  onSearchChange: (val: string) => void;
  difficulty: string;
  onDifficultyChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
}

const TABS: { id: BankSoalTab; label: string }[] = [
  { id: 'all', label: 'Semua Soal' },
  { id: 'passages', label: 'Teks Bacaan & Audio' },
  { id: 'listening', label: 'Listening' },
  { id: 'structure', label: 'Structure' },
  { id: 'written_expression', label: 'Written Expression' },
  { id: 'reading', label: 'Reading' },
];

export const BankSoalFilters: React.FC<BankSoalFiltersProps> = ({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  statusFilter,
  onStatusChange,
}) => {
  return (
    <>
      {/* Navigation Tabs */}
      <Tabs
        className="self-start"
        tabs={TABS}
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
