'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isLoading, isLoggingOut, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.force_change_password) {
        router.replace('/change-password');
      } else if (user.role === 'peserta' && pathname !== '/ujian') {
        router.replace('/ujian');
      }
    }
  }, [user, isLoading, pathname, router]);

  // Show a logout loading overlay at dead center
  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md gap-4 animate-fade-in duration-300">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full text-center border border-white/20 animate-scale-in">
          <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <h3 className="text-md font-extrabold text-gray-900">Mengeluarkan Sesi</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium font-sans">Menghapus data sesi Anda dengan aman...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show a loading screen if the application is verifying authorization
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white gap-4">
        <svg className="animate-spin h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">Memuat Sesi...</p>
      </div>
    );
  }

  // If user is not authenticated, let the middleware handle redirect.
  // In the meantime, prevent layout flashing
  if (!user) return null;

  // Protect against flash of content before useEffect redirects
  if (user.force_change_password) return null;
  if (user.role === 'peserta' && pathname !== '/ujian') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header bar */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic content view */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-transparent">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
