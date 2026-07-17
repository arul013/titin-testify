'use client';

import React from 'react';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';

interface UsersToolbarProps {
  isSuperAdmin: boolean;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onGenerate: () => void;
  onAdd: () => void;
}

/**
 * Baris toolbar: tab filter (kiri, khusus super admin) + tombol aksi (kanan).
 * Memakai justify-between agar tombol tetap rata kanan meski tab tidak tampil.
 */
export const UsersToolbar: React.FC<UsersToolbarProps> = ({
  isSuperAdmin,
  activeTab,
  onTabChange,
  onGenerate,
  onAdd,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {isSuperAdmin ? (
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          tabs={[
            { id: 'peserta', label: 'Peserta Ujian', icon: <Users className="w-4 h-4" /> },
            { id: 'admin', label: 'Administrator', icon: <Users className="w-4 h-4" /> },
          ]}
        />
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={onGenerate}
          variant="secondary"
          className="font-bold gap-2 shadow-xs border-slate-200"
          leftIcon={<Sparkles className="w-4 h-4 text-indigo-500" />}
        >
          Generate Peserta
        </Button>
        <Button
          onClick={onAdd}
          variant="primary"
          className="font-bold gap-2 shadow-md"
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Tambah User
        </Button>
      </div>
    </div>
  );
};
