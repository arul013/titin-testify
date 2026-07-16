'use client';

import { KeyRound, Trash2, Users, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useUsersPage } from '@/features/users/hooks/useUsersPage';
import { UsersHeader } from '@/features/users/UsersHeader';
import { UserTable } from '@/features/users/UserTable';
import { UserForm } from '@/features/users/UserForm';
import { GenerateUsersModal } from '@/features/users/GenerateUsersModal';
import { CredentialsModal } from '@/features/users/CredentialsModal';

export default function UserManagementPage() {
  const p = useUsersPage();

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <UsersHeader onGenerate={p.generate.onOpen} onAdd={p.openAdd} />

      {/* Tab filter khusus Super Admin */}
      {p.isSuperAdmin && (
        <div className="flex justify-start">
          <Tabs
            value={p.activeTab}
            onChange={p.onTabChange}
            tabs={[
              { id: 'peserta', label: 'Peserta Ujian', icon: <Users className="w-4 h-4" /> },
              { id: 'admin', label: 'Administrator', icon: <Users className="w-4 h-4" /> },
            ]}
          />
        </div>
      )}

      {/* Search + total */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-full max-w-sm">
          <Input
            type="text"
            placeholder="Cari berdasarkan nama atau username..."
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            className="w-full"
            containerClassName="w-full"
          />
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <span>Total:</span>
          <span className="text-indigo-600 font-extrabold">{p.total}</span>
          <span>Akun</span>
        </div>
      </Card>

      {/* Tabel utama */}
      <Card className="overflow-hidden p-0 border border-slate-100/80 shadow-xs">
        <UserTable
          users={p.users}
          currentUserId={p.currentUser?.id}
          currentUserRole={p.currentUser?.role}
          onEdit={p.openEdit}
          onDelete={p.requestDelete}
          onResetPassword={p.requestReset}
        />
      </Card>

      <Pagination page={p.page} totalPages={p.totalPages} onPrev={p.prevPage} onNext={p.nextPage} />

      {/* Add/Edit User Modal */}
      <Modal
        open={p.modalOpen}
        onClose={p.closeUserModal}
        title={p.editingUser ? 'Edit Detail User' : 'Tambah User Baru'}
      >
        <UserForm
          key={`u-${p.editingUser?.id ?? 'new'}-${p.modalOpen}`}
          user={p.editingUser}
          onSubmit={p.submitUser}
          onCancel={p.closeUserModal}
          isLoading={p.isLoading}
        />
      </Modal>

      {/* Bulk Generate Peserta Modal */}
      <GenerateUsersModal
        open={p.generate.open}
        quantity={p.generate.quantity}
        names={p.generate.names}
        isGenerating={p.generate.isGenerating}
        list={p.generate.list}
        onClose={p.generate.onClose}
        onQuantityChange={p.generate.onQuantityChange}
        onNameChange={p.generate.onNameChange}
        onSubmit={p.generate.onSubmit}
      />

      {/* Credentials Success Modal */}
      <CredentialsModal data={p.credentials.data} onClose={p.credentials.onClose} />

      {/* Confirm: Reset Password */}
      <ConfirmDialog
        open={p.confirmReset.open}
        onClose={p.confirmReset.onClose}
        title="Konfirmasi Reset Password"
        icon={<KeyRound className="w-5 h-5" />}
        confirmLabel="Ya, Reset Password"
        confirmIcon={<KeyRound className="w-4 h-4" />}
        confirmClassName="bg-amber-600 hover:bg-amber-700"
        loading={p.confirmReset.isResetting}
        onConfirm={p.confirmReset.onConfirm}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Apakah Anda yakin ingin mengatur ulang password untuk akun{' '}
            <strong className="text-gray-900">@{p.confirmReset.user?.username}</strong> (
            {p.confirmReset.user?.full_name})?
          </p>
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Password saat ini akan diganti dengan password acak baru. Pastikan Anda menyimpan atau
              membagikan password baru tersebut kepada pengguna.
            </p>
          </div>
        </div>
      </ConfirmDialog>

      {/* Confirm: Delete User */}
      <ConfirmDialog
        open={p.confirmDelete.open}
        onClose={p.confirmDelete.onClose}
        title="Konfirmasi Hapus Pengguna"
        icon={<Trash2 className="w-5 h-5" />}
        confirmLabel="Ya, Hapus Pengguna"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        confirmVariant="danger"
        loading={p.confirmDelete.isDeleting}
        onConfirm={p.confirmDelete.onConfirm}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus akun{' '}
            <strong className="text-gray-900">{p.confirmDelete.name}</strong>?
          </p>
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 leading-relaxed">
              Tindakan ini bersifat <strong>permanen</strong> dan tidak dapat dibatalkan. Akun
              autentikasi dan semua data profil pengguna akan dihapus secara permanen dari sistem.
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
