'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { api } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/errors';
import { toast } from '../../../components/ui/toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, token, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Password Terlalu Pendek', {
        description: 'Password baru minimal harus terdiri dari 6 karakter.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi Salah', {
        description: 'Password baru dan konfirmasi password tidak cocok.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call endpoint change-password
      await api.post(
        '/api/auth/change-password',
        { new_password: newPassword },
        { token: token || undefined }
      );

      toast.success('Password Berhasil Diubah', {
        description: 'Sesi Anda telah diperbarui dengan password baru.',
      });

      // Refresh cache profile and redirect
      await refreshUser();
      
      // Redirect based on role
      if (user?.role === 'peserta') {
        router.push('/ujian');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error('Gagal Mengubah Password', {
        description: getErrorMessage(err, 'Terjadi kesalahan saat menyimpan password baru.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <Card className="w-full bg-gradient-to-br from-brand-start to-brand-end border-none shadow-2xl shadow-indigo-600/35 text-white p-8 md:p-10 rounded-3xl" variant="default">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white font-heading">Ubah Password</h1>
          <p className="text-sm text-indigo-100/80 mt-1.5">
            Anda wajib mengubah password bawaan sebelum dapat melanjutkan ke sistem.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">
              Password Baru <span className="text-red-300">*</span>
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="text-gray-800 focus:ring-2 focus:ring-white/55 focus:border-white transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">
              Konfirmasi Password Baru <span className="text-red-300">*</span>
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="text-gray-800 focus:ring-2 focus:ring-white/55 focus:border-white transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              variant="primary"
              className="font-bold shadow-lg shadow-indigo-950/25 active:scale-[0.98] ring-1 ring-white/20"
            >
              Simpan Password
            </Button>
            
            <button
              type="button"
              onClick={() => logout()}
              className="text-center text-xs text-indigo-200/70 hover:text-indigo-100 transition-colors duration-200 py-1"
            >
              Batal & Keluar Sesi
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
