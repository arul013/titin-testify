'use client';

import React, { useEffect, useState } from 'react';
import { useUsers, type GeneratedUser } from '../../../features/users/hooks/useUsers';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { UserTable } from '../../../features/users/UserTable';
import { UserForm } from '../../../features/users/UserForm';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { Tabs } from '../../../components/ui/tabs';
import { toast } from '../../../components/ui/toast';
import { copyToClipboard } from '../../../lib/clipboard';
import { getErrorMessage } from '../../../lib/errors';
import { UserProfile, CreateUserRequest, UpdateUserRequest } from '../../../types';
import { Download, Sparkles, UserPlus, Users, MessageSquare, Copy, AlertTriangle, KeyRound, Trash2 } from 'lucide-react';

export default function UserManagementPage() {
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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('peserta');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Confirmation modal states
  const [confirmResetUser, setConfirmResetUser] = useState<UserProfile | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmDeleteUserName, setConfirmDeleteUserName] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // States for bulk user generation
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genQuantity, setGenQuantity] = useState(3);
  const [genNames, setGenNames] = useState<string[]>(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedList, setGeneratedList] = useState<GeneratedUser[] | null>(null);

  // Credentials success modal state
  const [credentialsModalData, setCredentialsModalData] = useState<{
    title: string;
    description: string;
    username: string;
    passwordUsed: string;
    fullName: string;
    role: string;
  } | null>(null);

  const perPage = 10;

  // Refresh user list on tab change, search, or pagination
  const loadUsersList = React.useCallback(() => {
    const roleFilter = currentUser?.role === 'super_admin' ? activeTab : 'peserta';
    fetchUsers(page, perPage, search, roleFilter).catch((err) => {
      toast.error(err.message || 'Gagal mengambil data user');
    });
  }, [page, search, activeTab, currentUser, fetchUsers]);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1); // Reset page on tab change
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleFormSubmit = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData as UpdateUserRequest);
        toast.success('Pengguna berhasil diperbarui');
      } else {
        // Automatically default to 'peserta' if creating by an admin
        const createData = formData as CreateUserRequest;
        const payload: CreateUserRequest = {
          ...createData,
          role: currentUser?.role === 'super_admin' ? createData.role : 'peserta',
        };
        const newUser = await createUser(payload);
        toast.success('Pengguna baru berhasil ditambahkan');

        if (newUser) {
          setCredentialsModalData({
            title: 'User Baru Berhasil Dibuat',
            description: 'Berikut adalah kredensial akun pengguna yang baru saja dibuat. Silakan salin atau bagikan ke pengguna tersebut.',
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

  // Open confirmation modal for reset password
  const handleResetPassword = (user: UserProfile) => {
    setConfirmResetUser(user);
  };

  // Execute the actual reset password API call
  const executeResetPassword = async () => {
    if (!confirmResetUser) return;
    setIsResetting(true);
    try {
      const res = await resetPassword(confirmResetUser.id);
      if (res) {
        toast.success('Password berhasil diatur ulang');
        setCredentialsModalData({
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

  const getCredentialMessageText = (data: NonNullable<typeof credentialsModalData>) => {
    const appUrl = window.location.origin;
    if (data.role === 'peserta') {
      return `Halo *${data.fullName}*,\n\nBerikut kredensial akun ujian CBT Titin Testify Anda:\n\n*Username:* ${data.username}\n*Password:* ${data.passwordUsed}\n*Link Ujian:* ${appUrl}\n\nSelamat menempuh ujian!`;
    } else {
      return `Halo *${data.fullName}*,\n\nBerikut kredensial akun administrator CBT Titin Testify Anda:\n\n*Username:* ${data.username}\n*Password:* ${data.passwordUsed}\n*Link Dashboard:* ${appUrl}\n\n_Catatan: Anda wajib mengganti password ini saat pertama kali login ke dashboard._`;
    }
  };

  const handleShareCredentialsWA = (data: typeof credentialsModalData) => {
    if (!data) return;
    const text = getCredentialMessageText(data);
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCopyCredentialsMessage = async (data: typeof credentialsModalData) => {
    if (!data) return;
    const text = getCredentialMessageText(data);
    const success = await copyToClipboard(text);
    if (success) {
      toast.success('Kredensial disalin', {
        description: 'Format pesan pembagian kredensial telah disalin ke clipboard.',
      });
    } else {
      toast.error('Gagal menyalin kredensial');
    }
  };

  // Open confirmation modal for delete user
  const handleDeleteUser = (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    setConfirmDeleteUserId(id);
    setConfirmDeleteUserName(targetUser ? `@${targetUser.username} (${targetUser.full_name})` : id);
  };

  // Execute the actual delete user API call
  const executeDeleteUser = async () => {
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

  // Quantity handler to dynamically update genNames array size
  const handleQuantityChange = (val: number) => {
    const qty = Math.max(1, Math.min(50, val));
    setGenQuantity(qty);
    setGenNames((prev) => {
      const next = [...prev];
      if (qty > prev.length) {
        for (let i = prev.length; i < qty; i++) {
          next.push('');
        }
      } else if (qty < prev.length) {
        next.splice(qty);
      }
      return next;
    });
  };

  const handleNameInputChange = (index: number, value: string) => {
    setGenNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Bulk generate submit handler
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const namesToSend = genNames.map((n) => n.trim()).filter(Boolean);
    if (namesToSend.length === 0) {
      toast.error('Harap isi minimal satu nama peserta');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateUsers({
        names: namesToSend,
      });
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

  // Download credentials list as CSV file (3 COLS: Nama Lengkap | Username | Password)
  const handleDownloadCSV = () => {
    if (!generatedList || generatedList.length === 0) return;
    const headers = 'Nama Lengkap,Username,Password\r\n';
    const rows = generatedList
      .map((u) => `"${u.full_name}","${u.username}","${u.password}"`)
      .join('\r\n');
    
    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel mendeteksi encoding UTF-8 secara otomatis
    const BOM = '\uFEFF';
    const csvContent = BOM + headers + rows;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    link.setAttribute('download', `kredensial_peserta_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Hapus object URL dari memori
  };

  // Share generated credentials via WA directly
  const handleShareGeneratedWA = (u: GeneratedUser) => {
    const appUrl = window.location.origin;
    const text = `Halo *${u.full_name}*,\n\nBerikut kredensial akun ujian CBT Titin Testify Anda:\n\n*Username:* ${u.username}\n*Password:* ${u.password}\n*Link Ujian:* ${appUrl}\n\nSelamat menempuh ujian!`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleCloseGenerateModal = () => {
    setGenerateModalOpen(false);
    setGeneratedList(null);
    setGenQuantity(3);
    setGenNames(['', '', '']);
    loadUsersList(); // Refresh main list
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
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
            onClick={() => setGenerateModalOpen(true)}
            variant="secondary"
            className="font-bold gap-2 shadow-xs border-slate-200"
            leftIcon={<Sparkles className="w-4 h-4 text-indigo-500" />}
          >
            Generate Peserta
          </Button>
          <Button
            onClick={handleOpenAddModal}
            variant="primary"
            className="font-bold gap-2 shadow-md"
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tambah User
          </Button>
        </div>
      </div>

      {/* Tabs Filter for Super Admin */}
      {currentUser?.role === 'super_admin' && (
        <div className="flex justify-start">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            tabs={[
              { id: 'peserta', label: 'Peserta Ujian', icon: <Users className="w-4 h-4" /> },
              { id: 'admin', label: 'Administrator', icon: <Users className="w-4 h-4" /> },
            ]}
          />
        </div>
      )}

      {/* Search and Metadata Controls */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full max-w-sm">
          <Input
            type="text"
            placeholder="Cari berdasarkan nama atau username..."
            value={search}
            onChange={handleSearchChange}
            className="w-full"
            containerClassName="w-full"
          />
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <span>Total:</span>
          <span className="text-indigo-600 font-extrabold">{total}</span>
          <span>Akun</span>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden p-0 border border-slate-100/80 shadow-xs">
        <UserTable
          users={users}
          currentUserId={currentUser?.id}
          currentUserRole={currentUser?.role}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteUser}
          onResetPassword={handleResetPassword}
        />
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            size="sm"
            className="font-bold text-xs"
          >
            Sebelumnya
          </Button>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            size="sm"
            className="font-bold text-xs"
          >
            Berikutnya
          </Button>
        </div>
      )}

      {/* Add/Edit User Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit Detail User' : 'Tambah User Baru'}
      >
        <UserForm
          key={`u-${editingUser?.id ?? 'new'}-${modalOpen}`}
          user={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={() => setModalOpen(false)}
          isLoading={isLoading}
        />
      </Modal>

      {/* Bulk Generate Peserta Modal */}
      <Modal
        open={generateModalOpen}
        onClose={handleCloseGenerateModal}
        title="Generate Akun Peserta Ujian (Masal)"
        size={generatedList ? 'lg' : 'md'}
        closeOnBackdrop={!isGenerating && !generatedList}
      >
        {!generatedList ? (
          <form onSubmit={handleGenerateSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              Masukkan nama lengkap peserta ujian di bawah ini. Username dan password akan secara otomatis dibuat untuk masing-masing peserta.
            </p>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-semibold text-gray-700">Jumlah Peserta</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={genQuantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                required
                disabled={isGenerating}
              />
            </div>

            {/* Dynamic Inputs for Full Names */}
            <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Daftar Nama Peserta</p>
              {genNames.map((name, index) => (
                <Input
                  key={index}
                  type="text"
                  placeholder={`Nama Lengkap Peserta ${index + 1}`}
                  value={name}
                  onChange={(e) => handleNameInputChange(index, e.target.value)}
                  required
                  disabled={isGenerating}
                  className="w-full"
                  containerClassName="w-full"
                />
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-150 pt-4 mt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={handleCloseGenerateModal}
                disabled={isGenerating}
                className="font-bold"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={isGenerating}
                className="font-bold"
              >
                Mulai Generate
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-sm flex gap-3">
              <div className="w-5 h-5 bg-emerald-500 rounded-full text-white flex items-center justify-center shrink-0 font-bold">✓</div>
              <div>
                <p className="font-bold">Generate Akun Sukses!</p>
                <p className="mt-1 text-xs text-emerald-600 leading-relaxed">
                  Berhasil membuat <strong>{generatedList.length}</strong> akun peserta baru. Silakan unduh daftar kredensial berikut untuk dibagikan.
                </p>
              </div>
            </div>

            {/* Scrollable credentials view */}
            <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-gray-500 uppercase border-b border-slate-150 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5">Nama Lengkap</th>
                    <th className="px-4 py-2.5">Username</th>
                    <th className="px-4 py-2.5">Password</th>
                    <th className="px-4 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generatedList.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{u.full_name}</td>
                      <td className="px-4 py-3 text-indigo-600 font-mono">@{u.username}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 bg-slate-50/50 select-all px-2 py-1 rounded-md">{u.password}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShareGeneratedWA(u)}
                          className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg flex items-center gap-1 text-xs"
                          leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                        >
                          Kirim WA
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center border-t border-slate-150 pt-4 mt-2">
              <Button
                variant="secondary"
                onClick={handleDownloadCSV}
                className="font-bold gap-2"
                leftIcon={<Download className="w-4 h-4" />}
              >
                Unduh File CSV
              </Button>
              <Button
                variant="primary"
                onClick={handleCloseGenerateModal}
                className="font-bold"
              >
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Credentials Success Modal */}
      <Modal
        open={!!credentialsModalData}
        onClose={() => setCredentialsModalData(null)}
        title={credentialsModalData?.title || 'Kredensial Pengguna'}
        size="md"
      >
        {credentialsModalData && (
          <div className="flex flex-col gap-6 text-gray-800">
            <p className="text-sm text-gray-500 leading-relaxed">
              {credentialsModalData.description}
            </p>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3 font-medium">
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
                <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Nama Lengkap</span>
                <span className="text-sm font-bold text-gray-900">{credentialsModalData.fullName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
                <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Username</span>
                <span className="text-sm font-bold text-indigo-600 font-mono">@{credentialsModalData.username}</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-50 pb-2.5">
                <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Password Baru</span>
                <span className="text-sm font-mono font-bold bg-white border border-indigo-50 px-2 py-0.5 rounded-lg text-indigo-900 shadow-sm select-all">
                  {credentialsModalData.passwordUsed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-500/80 font-bold uppercase tracking-wider">Peran (Role)</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase">
                  {credentialsModalData.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-4 mt-2">
              <Button
                variant="secondary"
                onClick={() => handleCopyCredentialsMessage(credentialsModalData)}
                className="font-bold flex-1 gap-2 animate-scale-in"
                leftIcon={<Copy className="w-4 h-4" />}
              >
                Salin Kredensial
              </Button>
              <Button
                variant="primary"
                onClick={() => handleShareCredentialsWA(credentialsModalData)}
                className="font-bold flex-1 gap-2 animate-scale-in"
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Bagikan ke WA
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal: Reset Password */}
      <Modal
        open={!!confirmResetUser}
        onClose={() => !isResetting && setConfirmResetUser(null)}
        title="Konfirmasi Reset Password"
        icon={<KeyRound className="w-5 h-5" />}
        size="sm"
        closeOnBackdrop={!isResetting}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmResetUser(null)}
              disabled={isResetting}
              className="font-bold"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={executeResetPassword}
              loading={isResetting}
              className="font-bold gap-2 bg-amber-600 hover:bg-amber-700"
              leftIcon={<KeyRound className="w-4 h-4" />}
            >
              Ya, Reset Password
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Apakah Anda yakin ingin mengatur ulang password untuk akun <strong className="text-gray-900">@{confirmResetUser?.username}</strong> ({confirmResetUser?.full_name})?
          </p>
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Password saat ini akan diganti dengan password acak baru. Pastikan Anda menyimpan atau membagikan password baru tersebut kepada pengguna.
            </p>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Delete User */}
      <Modal
        open={!!confirmDeleteUserId}
        onClose={() => !isDeleting && setConfirmDeleteUserId(null)}
        title="Konfirmasi Hapus Pengguna"
        icon={<Trash2 className="w-5 h-5" />}
        size="sm"
        closeOnBackdrop={!isDeleting}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setConfirmDeleteUserId(null); setConfirmDeleteUserName(''); }}
              disabled={isDeleting}
              className="font-bold"
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={executeDeleteUser}
              loading={isDeleting}
              className="font-bold gap-2"
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Ya, Hapus Pengguna
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus akun <strong className="text-gray-900">{confirmDeleteUserName}</strong>?
          </p>
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">
              Tindakan ini bersifat <strong>permanen</strong> dan tidak dapat dibatalkan. Akun autentikasi dan semua data profil pengguna akan dihapus secara permanen dari sistem.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
