'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from './hooks/useAuth';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

/** Ganti password sukarela (saat login) — memverifikasi password lama di backend. */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password terlalu pendek', { description: 'Password baru minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi salah', { description: 'Password baru dan konfirmasi tidak cocok.' });
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('Password sama', { description: 'Password baru tidak boleh sama dengan yang lama.' });
      return;
    }

    setIsLoading(true);
    try {
      await api.post(
        '/api/auth/change-password',
        { current_password: currentPassword, new_password: newPassword },
        { token: token || undefined }
      );
      toast.success('Password berhasil diubah', {
        description: 'Gunakan password baru saat login berikutnya.',
      });
      reset();
      onClose();
    } catch (err) {
      toast.error('Gagal mengubah password', {
        description: getErrorMessage(err, 'Terjadi kesalahan saat menyimpan password baru.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ganti Password"
      icon={<KeyRound className="w-5 h-5" />}
      size="sm"
      closeOnBackdrop={!isLoading}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          label="Password Lama"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
          disabled={isLoading}
          showGenerate={false}
          placeholder="Masukkan password saat ini"
        />
        <PasswordField
          label="Password Baru"
          value={newPassword}
          onChange={setNewPassword}
          required
          disabled={isLoading}
          placeholder="Minimal 6 karakter"
          hint="Klik ikon ✨ untuk membuat password acak yang kuat."
        />
        <PasswordField
          label="Konfirmasi Password Baru"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          disabled={isLoading}
          showGenerate={false}
          placeholder="Ulangi password baru"
        />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-1">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading} className="font-bold">
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} className="font-bold">
            Simpan Password
          </Button>
        </div>
      </form>
    </Modal>
  );
};
