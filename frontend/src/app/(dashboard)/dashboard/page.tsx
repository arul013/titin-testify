'use client';

import React from 'react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ClipboardList, CheckCircle2, Award, Bell, User } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Welcome Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
            Selamat Datang, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-start to-brand-end">{user.full_name}</span>!
          </h1>
          <p className="text-gray-500 mt-1.5 font-medium">
            Berikut ringkasan aktivitas CBT Anda hari ini.
          </p>
        </div>
        <div>
          <Badge variant={isAdmin ? 'info' : 'success'} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-xs">
            {user.role.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="interactive">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/50">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Jadwal Ujian</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">0</h3>
            </div>
          </div>
        </Card>

        <Card variant="interactive">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/50">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Ujian Selesai</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">0</h3>
            </div>
          </div>
        </Card>

        <Card variant="interactive">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100/50">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Nilai Rata-Rata</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">-</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900 font-heading">Pengumuman Terbaru</h3>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/50 flex gap-4">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 mt-2 flex-shrink-0 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-gray-900">Selamat Datang di CBT Titin Testify</h4>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Ujian simulasi akan dijadwalkan oleh admin. Pastikan Anda memiliki aplikasi Safe Exam Browser (SEB) terinstal untuk pengerjaan ujian mendatang.
                </p>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-4">
                  Diposting oleh Admin • Baru Saja
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Info Panel */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900 font-heading">Detail Akun</h3>
            </div>
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="font-medium text-gray-500">Username</span>
                <span className="font-bold text-gray-800">{user.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="font-medium text-gray-500">Nama Lengkap</span>
                <span className="font-bold text-gray-800">{user.full_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="font-medium text-gray-500">Status</span>
                <Badge variant="success" className="shadow-xs">Aktif</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
