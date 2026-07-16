'use client';

import React from 'react';
import { UserProfile, UserRole } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/button';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';

interface UserTableProps {
  users: UserProfile[];
  currentUserId?: string;
  currentUserRole?: string;
  onEdit: (user: UserProfile) => void;
  onDelete: (id: string) => void;
  onResetPassword?: (user: UserProfile) => void;
  onChangeRole?: (id: string, newRole: UserRole) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  onResetPassword,
  onChangeRole,
}) => {
  const getRoleVariant = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'danger';
      case 'admin':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return role.replace('_', ' ');
  };

  // Detect oldest Super Admin in current user list to protect Owner from deletion/editing
  const oldestSuperAdminId = React.useMemo(() => {
    const superAdmins = users.filter((u) => u.role === 'super_admin' && u.created_at);
    if (superAdmins.length === 0) return null;
    return superAdmins.reduce((oldest, current) => {
      return new Date(current.created_at!) < new Date(oldest.created_at!) ? current : oldest;
    }).id;
  }, [users]);

  return (
    <Table headers={['Pengguna', 'Role', 'Status', 'Dibuat Pada', 'Aksi']}>
      {users.length === 0 ? (
        <tr>
          <td colSpan={5} className="px-6 py-10 text-center text-sm font-semibold text-gray-500">
            Tidak ada pengguna ditemukan.
          </td>
        </tr>
      ) : (
        users.map((user) => {
          // A user is protected if they are the oldest Super Admin in the pool or named temp_admin
          const isOwner = user.role === 'super_admin' && (user.id === oldestSuperAdminId || user.username === 'temp_admin');

          return (
            <tr key={user.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
              <td className="px-6 py-4 flex items-center gap-3">
                <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">@{user.username}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge variant={getRoleVariant(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge variant={user.is_active ? 'success' : 'neutral'}>
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </td>
              <td className="px-6 py-4 text-xs font-semibold text-gray-400">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }) : '-'}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                  {!isOwner && (currentUserRole === 'super_admin' || (currentUserRole === 'admin' && user.role === 'peserta')) && onResetPassword && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResetPassword(user)}
                      className="text-gray-400 hover:text-amber-600 hover:bg-amber-50/50 p-1.5 rounded-lg"
                      title="Reset Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  )}

                  {!isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                      className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 p-1.5 rounded-lg"
                      title="Edit User"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}

                  {!isOwner && user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50/50 p-1.5 rounded-lg"
                      title="Hapus User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })
      )}
    </Table>
  );
};
