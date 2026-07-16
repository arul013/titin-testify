'use client';

import React from 'react';
import { Copy, MessageSquare } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { copyToClipboard } from '@/lib/clipboard';
import type { CredentialsData } from './hooks/useUsersPage';

interface CredentialsModalProps {
  data: CredentialsData | null;
  onClose: () => void;
}

function buildMessage(data: CredentialsData): string {
  const appUrl = window.location.origin;
  if (data.role === 'peserta') {
    return `Halo *${data.fullName}*,\n\nBerikut kredensial akun ujian CBT Titin Testify Anda:\n\n*Username:* ${data.username}\n*Password:* ${data.passwordUsed}\n*Link Ujian:* ${appUrl}\n\nSelamat menempuh ujian!`;
  }
  return `Halo *${data.fullName}*,\n\nBerikut kredensial akun administrator CBT Titin Testify Anda:\n\n*Username:* ${data.username}\n*Password:* ${data.passwordUsed}\n*Link Dashboard:* ${appUrl}\n\n_Catatan: Anda wajib mengganti password ini saat pertama kali login ke dashboard._`;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({ data, onClose }) => {
  const handleShareWA = () => {
    if (!data) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(data))}`, '_blank');
  };

  const handleCopy = async () => {
    if (!data) return;
    const success = await copyToClipboard(buildMessage(data));
    if (success) {
      toast.success('Kredensial disalin', {
        description: 'Format pesan pembagian kredensial telah disalin ke clipboard.',
      });
    } else {
      toast.error('Gagal menyalin kredensial');
    }
  };

  return (
    <Modal
      open={!!data}
      onClose={onClose}
      title={data?.title || 'Kredensial Pengguna'}
      size="md"
    >
      {data && (
        <div className="flex flex-col gap-6 text-gray-800">
          <p className="text-sm text-gray-500 leading-relaxed">{data.description}</p>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3 font-medium">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
              <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Nama Lengkap</span>
              <span className="text-sm font-bold text-gray-900">{data.fullName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
              <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Username</span>
              <span className="text-sm font-bold text-indigo-600 font-mono">@{data.username}</span>
            </div>
            <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
              <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Password Baru</span>
              <span className="text-sm font-mono font-bold bg-white border border-indigo-50 px-2 py-0.5 rounded-lg text-indigo-900 shadow-sm select-all">
                {data.passwordUsed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Peran (Role)</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase">
                {data.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="font-bold flex-1 gap-2 animate-scale-in"
              leftIcon={<Copy className="w-4 h-4" />}
            >
              Salin Kredensial
            </Button>
            <Button
              variant="primary"
              onClick={handleShareWA}
              className="font-bold flex-1 gap-2 animate-scale-in"
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Bagikan ke WA
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
