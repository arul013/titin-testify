'use client';

import React, { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/features/users/hooks/useUsers';

interface StepParticipantsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const StepParticipants: React.FC<StepParticipantsProps> = ({ selectedIds, onChange }) => {
  const { users, isLoading, fetchUsers } = useUsers();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(1, 100, search, 'peserta').catch(() => {});
    }, 300);
    return () => clearTimeout(handler);
  }, [search, fetchUsers]);

  const selected = new Set(selectedIds);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const visibleIds = users.map((u) => u.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onChange([...next]);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Tandai peserta yang boleh mengikuti ujian ini. Yang tidak ditandai tidak akan melihat sesi
          ujian.
        </p>
        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl shrink-0">
          {selectedIds.length} peserta dipilih
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau username peserta…"
          className="pl-10"
        />
      </div>

      <div className="border border-slate-100 rounded-2xl overflow-hidden">
        {users.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
            <Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} />
            <span className="text-xs font-bold text-slate-500">
              Pilih semua yang tampil ({users.length})
            </span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
          {isLoading ? (
            <div className="p-4 flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Tidak ada peserta"
              description="Buat akun peserta dulu di menu Manajemen User, lalu tandai di sini."
            />
          ) : (
            users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 cursor-pointer transition-colors"
              >
                <Checkbox checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
