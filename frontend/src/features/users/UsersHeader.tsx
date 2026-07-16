'use client';

import React from 'react';
import { Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UsersHeaderProps {
  onGenerate: () => void;
  onAdd: () => void;
}

export const UsersHeader: React.FC<UsersHeaderProps> = ({ onGenerate, onAdd }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
          Manajemen User
        </h1>
        <p className="text-gray-500 mt-1.5 font-medium">
          Kelola dan generate akun pengguna terdaftar pada sistem CBT Titin Testify.
        </p>
      </div>
      <div className="flex items-center gap-2.5">
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
