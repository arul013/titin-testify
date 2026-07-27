'use client';

import { KeyRound, Trash2, AlertTriangle, Users, Sparkles, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { FAB, type FABAction } from '@/components/ui/FAB';
import { useUsersPage } from '@/features/users/hooks/useUsersPage';
import { UsersToolbar } from '@/features/users/UsersToolbar';
import { UserTable } from '@/features/users/UserTable';
import { UserForm } from '@/features/users/UserForm';
import { GenerateUsersModal } from '@/features/users/GenerateUsersModal';
import { CredentialsModal } from '@/features/users/CredentialsModal';

export function UsersPage() {
  const p = useUsersPage();

  const createActions: FABAction[] = [
    { icon: <Sparkles className="w-5 h-5" />, label: 'Generate Peserta', onClick: p.generate.onOpen },
    {
      icon: <UserPlus className="w-5 h-5" />,
      label: p.isSuperAdmin ? 'Tambah User' : 'Tambah Peserta',
      onClick: p.openAdd,
    },
  ];

  return (
    <PageContainer
      className="space-y-6 pb-4"
      header={
        <PageHeader
          icon={<Users />}
          title="Manajemen User"
          subtitle="Kelola & generate akun pengguna terdaftar pada sistem CBT Titin Testify."
        />
      }
    >
      <UsersToolbar
        isSuperAdmin={p.isSuperAdmin}
        activeTab={p.activeTab}
        onTabChange={p.onTabChange}
        search={p.search}
        onSearchChange={p.onSearchChange}
        total={p.total}
      />

      {/* Tabel utama */}
      <Card className="overflow-hidden p-0 rounded-3xl border border-slate-100 shadow-md shadow-slate-100">
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

      <FAB actions={createActions} />

      {/* Add/Edit User Modal */}
      <Modal
        open={p.modalOpen}
        onClose={p.closeUserModal}
        title={
          p.editingUser
            ? 'Edit Detail User'
            : p.isSuperAdmin
              ? 'Tambah User Baru'
              : 'Tambah Peserta Baru'
        }
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
    </PageContainer>
  );
}
