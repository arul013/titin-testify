'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ChangePasswordModal } from '../../features/auth/ChangePasswordModal';
import {
  Sidebar as GlassSidebar,
  SidebarBrand,
  SidebarProfile,
  SidebarNav,
  SidebarNavItem,
  SidebarBackdrop,
  SidebarFooter
} from '../ui/sidebar';
import { LayoutDashboard, Users, LogOut, ClipboardList, Library, KeyRound } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isChangePwOpen, setIsChangePwOpen] = useState(false);

  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const links = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      show: user && user.role !== 'peserta',
    },
    {
      name: 'Ujian CBT',
      href: '/ujian',
      icon: <ClipboardList className="w-4 h-4" />,
      show: user && user.role === 'peserta',
    },
    {
      name: 'Bank Soal',
      href: '/bank-soal',
      icon: <Library className="w-4 h-4" />,
      show: isAdmin,
    },
    {
      name: 'Manajemen User',
      href: '/users',
      icon: <Users className="w-4 h-4" />,
      show: isAdmin,
    },
  ];

  return (
    <>
      <SidebarBackdrop open={isOpen} onClose={onClose} />
      <GlassSidebar open={isOpen} credit={
        <>
          <div className="px-3 py-2 border-t border-black/5 mt-auto flex flex-col gap-1">
            <button
              onClick={() => setIsChangePwOpen(true)}
              className="group/nav flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-100"
            >
              <span className="flex shrink-0 items-center justify-center rounded-lg h-7 w-7 bg-white text-gray-500 shadow-sm ring-1 ring-black/5 group-hover/nav:bg-indigo-100 group-hover/nav:text-indigo-600 transition-colors">
                <KeyRound className="w-4 h-4" />
              </span>
              <span className="flex-1 text-left">Ganti Password</span>
            </button>
            <button
              onClick={logout}
              className="group/nav flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-100"
            >
              <span className="flex shrink-0 items-center justify-center rounded-lg h-7 w-7 bg-white text-gray-500 shadow-sm ring-1 ring-black/5 group-hover/nav:bg-red-100 group-hover/nav:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
              </span>
              <span className="flex-1 text-left">Keluar</span>
            </button>
          </div>
          <SidebarFooter>
            © Titin Testify · <span className="text-gray-500">by Hasrul Sani</span>
          </SidebarFooter>
        </>
      }>
        <SidebarBrand title="Titin Testify" badge="CBT" onClose={onClose} />
        {user && (
          <SidebarProfile
            name={user.full_name}
            subtitle={user.role.replace('_', ' ').toUpperCase()}
            avatar={
              <span className="text-white font-bold text-sm">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </span>
            }
          />
        )}
        <SidebarNav>
          {links
            .filter((link) => link.show)
            .map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <SidebarNavItem
                  key={link.name}
                  icon={link.icon}
                  label={link.name}
                  active={isActive}
                  onClick={() => {
                    onClose();
                    router.push(link.href);
                  }}
                />
              );
            })}
        </SidebarNav>
      </GlassSidebar>

      <ChangePasswordModal open={isChangePwOpen} onClose={() => setIsChangePwOpen(false)} />
    </>
  );
};
