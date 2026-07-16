'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
  { id: 'passages', label: 'Passage Bacaan & Audio' },
  { id: 'listening', label: 'Listening Group' },
  { id: 'structure', label: 'Structure' },
  { id: 'written_expression', label: 'Written Expression' },
  { id: 'reading', label: 'Reading Group' },
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
      <div className="flex flex-wrap border-b border-slate-100 gap-1 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={activeTab === 'passages' ? 'Cari teks passage...' : 'Cari teks pertanyaan...'}
            className="pl-10"
          />
        </div>

        {/* Difficulty Filter (hide for passages tab) */}
        {activeTab !== 'passages' ? (
          <Select value={difficulty} onChange={(e) => onDifficultyChange(e.target.value)}>
            <option value="">Semua Tingkat Kesulitan</option>
            <option value="easy">Easy (Mudah)</option>
            <option value="medium">Medium (Sedang)</option>
            <option value="hard">Hard (Sulit)</option>
          </Select>
        ) : (
          <div />
        )}

        {/* Status Filter */}
        <Select value={statusFilter} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">Semua Status Publikasi</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
      </div>
    </>
  );
};
