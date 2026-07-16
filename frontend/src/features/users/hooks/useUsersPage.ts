'use client';

import React, { useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUsers, type GeneratedUser } from './useUsers';
import type { UserProfile, CreateUserRequest, UpdateUserRequest } from '@/types';

export interface CredentialsData {
  title: string;
  description: string;
  username: string;
  passwordUsed: string;
  fullName: string;
  role: string;
}

const PER_PAGE = 10;

/**
 * Semua state, data, dan handler untuk halaman Manajemen User.
 * Memisahkan logika dari tampilan agar `page.tsx` tetap tipis.
 */
export function useUsersPage() {
  const { user: currentUser } = useAuth();
  const {
    users,
    total,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    generateUsers,
    resetPassword,
  } = useUsers();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('peserta');

  // Add/Edit user modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Confirmation states
  const [confirmResetUser, setConfirmResetUser] = useState<UserProfile | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmDeleteUserName, setConfirmDeleteUserName] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk generate states
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genQuantity, setGenQuantity] = useState(3);
  const [genNames, setGenNames] = useState<string[]>(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<GeneratedUser[] | null>(null);

  // Credentials success modal
  const [credentialsData, setCredentialsData] = useState<CredentialsData | null>(null);

  // Refresh list saat tab/search/pagination berubah
  const loadUsersList = React.useCallback(() => {
    const roleFilter = isSuperAdmin ? activeTab : 'peserta';
    fetchUsers(page, PER_PAGE, search, roleFilter).catch((err) => {
      toast.error(getErrorMessage(err, 'Gagal mengambil data user'));
    });
  }, [page, search, activeTab, isSuperAdmin, fetchUsers]);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  // ─── Filter/pagination handlers ────────────────────────────
  const onSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const onTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const nextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  // ─── Add/Edit user ─────────────────────────────────────────
  const openAdd = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const closeUserModal = () => setModalOpen(false);

  const submitUser = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData as UpdateUserRequest);
        toast.success('Pengguna berhasil diperbarui');
      } else {
        const createData = formData as CreateUserRequest;
        const payload: CreateUserRequest = {
          ...createData,
          role: isSuperAdmin ? createData.role : 'peserta',
        };
        const newUser = await createUser(payload);
        toast.success('Pengguna baru berhasil ditambahkan');

        if (newUser) {
          setCredentialsData({
            title: 'User Baru Berhasil Dibuat',
            description:
              'Berikut adalah kredensial akun pengguna yang baru saja dibuat. Silakan salin atau bagikan ke pengguna tersebut.',
            username: newUser.username,
            passwordUsed: createData.password || '',
            fullName: newUser.full_name,
            role: newUser.role,
          });
        }
      }
      setModalOpen(false);
      loadUsersList();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Terjadi kesalahan sistem'));
    }
  };

  // ─── Reset password ────────────────────────────────────────
  const requestReset = (user: UserProfile) => setConfirmResetUser(user);
  const closeReset = () => {
    if (!isResetting) setConfirmResetUser(null);
  };

  const executeReset = async () => {
    if (!confirmResetUser) return;
    setIsResetting(true);
    try {
      const res = await resetPassword(confirmResetUser.id);
      if (res) {
        toast.success('Password berhasil diatur ulang');
        setCredentialsData({
          title: 'Password Berhasil Diatur Ulang',
          description: `Password untuk akun @${confirmResetUser.username} (${confirmResetUser.full_name}) telah diatur ulang menjadi password acak baru di bawah ini.`,
          username: confirmResetUser.username,
          passwordUsed: res.password,
          fullName: confirmResetUser.full_name,
          role: confirmResetUser.role,
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengatur ulang password'));
    } finally {
      setIsResetting(false);
      setConfirmResetUser(null);
    }
  };

  // ─── Delete user ───────────────────────────────────────────
  const requestDelete = (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    setConfirmDeleteUserId(id);
    setConfirmDeleteUserName(
      targetUser ? `@${targetUser.username} (${targetUser.full_name})` : id
    );
  };

  const closeDelete = () => {
    if (!isDeleting) {
      setConfirmDeleteUserId(null);
      setConfirmDeleteUserName('');
    }
  };

  const executeDelete = async () => {
    if (!confirmDeleteUserId) return;
    setIsDeleting(true);
    try {
      await deleteUser(confirmDeleteUserId);
      toast.success('Pengguna berhasil dihapus');
      loadUsersList();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus pengguna'));
    } finally {
      setIsDeleting(false);
      setConfirmDeleteUserId(null);
      setConfirmDeleteUserName('');
    }
  };

  // ─── Credentials modal ─────────────────────────────────────
  const closeCredentials = () => setCredentialsData(null);

  // ─── Bulk generate ─────────────────────────────────────────
  const onGenQuantityChange = (val: number) => {
    const qty = Math.max(1, Math.min(50, val));
    setGenQuantity(qty);
    setGenNames((prev) => {
      const next = [...prev];
      if (qty > prev.length) {
        for (let i = prev.length; i < qty; i++) next.push('');
      } else if (qty < prev.length) {
        next.splice(qty);
      }
      return next;
    });
  };

  const onGenNameChange = (index: number, value: string) => {
    setGenNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const onGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const namesToSend = genNames.map((n) => n.trim()).filter(Boolean);
    if (namesToSend.length === 0) {
      toast.error('Harap isi minimal satu nama peserta');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateUsers({ names: namesToSend });
      if (result) {
        setGeneratedList(result);
        toast.success(`Berhasil generate ${result.length} akun peserta!`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal men-generate peserta masal'));
    } finally {
      setIsGenerating(false);
    }
  };

  const openGenerate = () => setGenerateModalOpen(true);

  const closeGenerate = () => {
    setGenerateModalOpen(false);
    setGeneratedList(null);
    setGenQuantity(3);
    setGenNames(['', '', '']);
    loadUsersList();
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return {
    currentUser,
    isSuperAdmin,

    // list + pagination
    users,
    total,
    isLoading,
    page,
    totalPages,
    prevPage,
    nextPage,
    search,
    onSearchChange,
    activeTab,
    onTabChange,

    // table row actions
    openEdit,
    requestReset,
    requestDelete,

    // add/edit modal
    modalOpen,
    editingUser,
    openAdd,
    closeUserModal,
    submitUser,

    // credentials modal
    credentials: { data: credentialsData, onClose: closeCredentials },

    // confirm reset
    confirmReset: {
      user: confirmResetUser,
      open: !!confirmResetUser,
      isResetting,
      onConfirm: executeReset,
      onClose: closeReset,
    },

    // confirm delete
    confirmDelete: {
      name: confirmDeleteUserName,
      open: !!confirmDeleteUserId,
      isDeleting,
      onConfirm: executeDelete,
      onClose: closeDelete,
    },

    // bulk generate
    generate: {
      open: generateModalOpen,
      quantity: genQuantity,
      names: genNames,
      isGenerating,
      list: generatedList,
      onOpen: openGenerate,
      onClose: closeGenerate,
      onQuantityChange: onGenQuantityChange,
      onNameChange: onGenNameChange,
      onSubmit: onGenerateSubmit,
    },
  };
}
