'use client';

import React, { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/features/users/hooks/useUsers';
import { GroupManagerModal } from '@/features/exams/GroupManagerModal';

interface StepParticipantsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Peserta yang sudah terdaftar & tak boleh dihapus (ujian sudah dikerjakan). */
  lockedIds?: string[];
}

export const StepParticipants: React.FC<StepParticipantsProps> = ({
  selectedIds,
  onChange,
  lockedIds = [],
}) => {
  const { users, isLoading, fetchUsers } = useUsers();
  const [search, setSearch] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers(1, 100, search, 'peserta').catch(() => {});
    }, 300);
    return () => clearTimeout(handler);
  }, [search, fetchUsers]);

  const selected = new Set(selectedIds);
  const locked = new Set(lockedIds);
  const toggle = (id: string) => {
    if (locked.has(id) && selected.has(id)) return; // peserta terkunci tak bisa dihapus
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const addMembers = (ids: string[]) => {
    const next = new Set(selected);
    ids.forEach((id) => next.add(id));
    onChange([...next]);
  };

  const visibleIds = users.map((u) => u.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleAllVisible = () => {
    const next = new Set(selected);
    if (allVisibleSelected) visibleIds.forEach((id) => !locked.has(id) && next.delete(id));
    else visibleIds.forEach((id) => next.add(id));
    onChange([...next]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Tandai peserta yang boleh mengikuti ujian ini. Yang tidak ditandai tidak akan melihat sesi
          ujian.
        </p>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="font-bold"
            leftIcon={<Users className="h-4 w-4" />}
            onClick={() => setGroupModalOpen(true)}
          >
            Grup / Kelas
          </Button>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl">
            {selectedIds.length} peserta dipilih
          </span>
        </div>
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

        <div className="max-h-96 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)
          ) : users.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState
                icon={<Users />}
                title="Tidak ada peserta"
                description="Buat akun peserta dulu di menu Manajemen User, lalu tandai di sini."
              />
            </div>
          ) : (
            users.map((u) => {
              const isLocked = locked.has(u.id) && selected.has(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isLocked ? 'cursor-not-allowed' : 'hover:bg-slate-50/60 cursor-pointer'
                  }`}
                >
                  <Checkbox
                    checked={selected.has(u.id)}
                    disabled={isLocked}
                    onChange={() => toggle(u.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                  </div>
                  {isLocked && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                      terdaftar
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>

      <GroupManagerModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        selectedIds={selectedIds}
        onAddMembers={addMembers}
      />
    </div>
  );
};
