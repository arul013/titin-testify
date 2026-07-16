'use client';

import { useState, useCallback } from 'react';
import { UserProfile, CreateUserRequest, UpdateUserRequest, ChangeRoleRequest } from '../../../types';
import { api } from '../../../lib/api';
import { useAuth } from '../../auth/hooks/useAuth';

export const useUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page: number = 1, perPage: number = 20, search: string = '', role: string = '') => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/users?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`;
      if (role) {
        url += `&role=${role}`;
      }
      const response = await api.get<{ users: UserProfile[]; total: number }>(url, { token });
      setUsers(response.users);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar pengguna');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const createUser = async (request: CreateUserRequest) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await api.post<UserProfile>('/api/users', request, { token });
      setUsers((prev) => [newUser, ...prev]);
      setTotal((prev) => prev + 1);
      return newUser;
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pengguna');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id: string, request: UpdateUserRequest) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await api.put<UserProfile>(`/api/users/${id}`, request, { token });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui pengguna');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/api/users/${id}`, { token });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus pengguna');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changeRole = async (id: string, request: ChangeRoleRequest) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await api.patch<UserProfile>(`/api/users/${id}/role`, request, { token });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: updated.role } : u)));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah role pengguna');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateUsers = async (request: {
    names: string[];
  }) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ users: any[]; success: boolean }>(
        '/api/users/generate',
        request,
        { token }
      );
      return response.users;
    } catch (err: any) {
      setError(err.message || 'Gagal generate peserta secara masal');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (id: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        id: string;
        username: string;
        full_name: string;
        password: string;
        email: string;
        success: boolean;
      }>(`/api/users/${id}/reset-password`, {}, { token });
      return response;
    } catch (err: any) {
      setError(err.message || 'Gagal mengatur ulang password');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    users,
    total,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    changeRole,
    generateUsers,
    resetPassword,
  };
};
