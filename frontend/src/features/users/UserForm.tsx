'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, CreateUserRequest, UpdateUserRequest, UserRole } from '../../types';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { useAuth } from '../auth/hooks/useAuth';

interface UserFormProps {
  user?: UserProfile | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { user: currentUser } = useAuth();
  const isEdit = !!user;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('peserta');
  const [isActive, setIsActive] = useState(true);

  // Load user data if edit mode
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setUsername(user.username);
      setFullName(user.full_name);
      setRole(user.role);
      setIsActive(user.is_active);
    } else {
      // Clear form
      setEmail('');
      setPassword('');
      setUsername('');
      setFullName('');
      setRole('peserta');
      setIsActive(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit) {
      const updateData: UpdateUserRequest = {
        username,
        full_name: fullName,
        is_active: isActive,
      };
      await onSubmit(updateData);
    } else {
      const finalEmail = role === 'peserta' ? `${username}@testify.id` : email;
      const createData: CreateUserRequest = {
        email: finalEmail,
        password,
        username,
        full_name: fullName,
        role,
      };
      await onSubmit(createData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* LANGKAH 1: Pilih Role (Khusus pembuatan baru oleh Super Admin) */}
      {!isEdit && currentUser?.role === 'super_admin' && (
        <Select
          label="Pilih Role (Langkah 1)"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={isLoading}
        >
          <option value="peserta">Peserta</option>
          <option value="admin">Admin</option>
        </Select>
      )}

      {/* LANGKAH 2: Isi Data Pengguna */}
      <div className="flex flex-col gap-4 border-t border-gray-100/80 pt-4 mt-1">
        {!isEdit && currentUser?.role === 'super_admin' && (
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
            Detail Informasi ({role.replace('_', ' ')}) — Langkah 2
          </p>
        )}

        <Input
          label="Nama Lengkap"
          type="text"
          placeholder={role === 'peserta' ? 'Nama Lengkap Peserta' : 'Nama Lengkap Administrator'}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={isLoading}
        />

        <Input
          label="Username"
          type="text"
          placeholder="Contoh: budi_sutrisno"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={isLoading}
        />

        {!isEdit && (
          <>
            {/* Tampilkan email HANYA jika bukan role peserta */}
            {role !== 'peserta' && (
              <Input
                label="Email"
                type="email"
                placeholder="nama@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            )}
            <Input
              label="Password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </>
        )}

        {isEdit && (
          <div className="flex items-center gap-2.5 mt-2 select-none">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded border-gray-250 bg-white text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
            />
            <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Akun Aktif
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-150 pt-4 mt-4">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading} className="font-bold">
          Batal
        </Button>
        <Button variant="primary" type="submit" loading={isLoading} className="font-bold">
          {isEdit ? 'Simpan Perubahan' : 'Tambah User'}
        </Button>
      </div>
    </form>
  );
};
