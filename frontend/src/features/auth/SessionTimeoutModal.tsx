'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';

interface Props {
  seconds: number;
  onStay: () => void;
  onLogout: () => void;
}

/** Peringatan idle-timeout: hitung mundur + "Tetap Masuk" / "Keluar". */
export const SessionTimeoutModal: React.FC<Props> = ({ seconds, onStay, onLogout }) => {
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <Modal
      open
      onClose={onStay}
      title="Masih di sana?"
      size="sm"
      closeOnBackdrop={false}
      closeOnEsc={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" leftIcon={<LogOut className="w-4 h-4" />} onClick={onLogout}>
            Keluar
          </Button>
          <Button onClick={onStay}>Tetap Masuk</Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
          <Clock className="w-7 h-7" />
        </span>
        <p className="text-sm text-slate-600">
          Anda akan keluar otomatis karena tidak ada aktivitas. Tekan{' '}
          <span className="font-semibold text-slate-800">Tetap Masuk</span> untuk melanjutkan sesi.
        </p>
        <div className="text-3xl font-bold tabular-nums text-slate-900">
          {mm}:{ss}
        </div>
      </div>
    </Modal>
  );
};
