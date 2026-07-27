'use client';

import React from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface UsersToolbarProps {
  isSuperAdmin: boolean;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  total: number;
}

/** Filter Manajemen User: tab peran (super admin) + pencarian + total akun. */
export const UsersToolbar: React.FC<UsersToolbarProps> = ({
  isSuperAdmin,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  total,
}) => {
  return (
    <Card className="p-4 rounded-3xl flex flex-col lg:flex-row lg:items-center gap-4">
      {isSuperAdmin && (
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          tabs={[
            { id: 'peserta', label: 'Peserta Ujian', icon: <Users className="w-4 h-4" /> },
            { id: 'admin', label: 'Administrator', icon: <Users className="w-4 h-4" /> },
          ]}
        />
      )}

      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 lg:justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama atau username…"
            className="pl-10"
            containerClassName="w-full"
          />
        </div>
        <div className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl self-start sm:self-auto">
          <span className="uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-brand font-extrabold tabular-nums">{total}</span>
          <span className="text-slate-400">akun</span>
        </div>
      </div>
    </Card>
  );
};
