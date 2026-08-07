'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck, Library, Users, Hourglass, ShieldAlert, BarChart3,
  Plus, ChevronRight, SquarePen, CheckCircle2, TrendingUp, History, UserCog,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/src/lib/cn';
import { useDashboard, type DashboardSummary } from './useDashboard';

function StatCard({
  icon, label, value, sub, tone, onClick,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode;
  tone?: string; onClick?: () => void;
}) {
  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={onClick}
      className={cn('flex items-center gap-4 rounded-2xl p-5', onClick && 'cursor-pointer transition-shadow hover:shadow-md')}
    >
      <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', tone ?? 'bg-brand/10 text-brand')}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold tabular-nums leading-tight text-slate-900">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-gray-900">
            Selamat Datang,{' '}
            <span className="bg-linear-to-r from-brand-start to-brand-end bg-clip-text text-transparent">
              {user.full_name}
            </span>
            !
          </h1>
          <p className="mt-1.5 font-medium text-gray-500">Ringkasan aktivitas CBT yang kamu kelola.</p>
        </div>
        <Badge variant="info" className="self-start px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-xs md:self-auto">
          {user.role.replace('_', ' ')}
        </Badge>
      </div>

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <AdminSections data={data} isSuper={user.role === 'super_admin'} router={router} />
      )}
    </div>
  );
}

function AdminSections({ data, isSuper, router }: { data: DashboardSummary; isSuper: boolean; router: ReturnType<typeof useRouter> }) {
  const go = (path: string) => () => router.push(path);
  const scopeNote = isSuper ? 'seluruh sistem' : 'yang kamu kelola';

  return (
    <>
      {/* Kartu statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ClipboardCheck className="h-6 w-6" />}
          label="Ujian"
          value={data.exams.total}
          sub={`${data.exams.published} tayang · ${data.exams.draft} draf`}
          onClick={go('/manajemen-ujian')}
        />
        <StatCard
          icon={<Library className="h-6 w-6" />}
          label="Bank Soal"
          value={data.questions.total}
          sub={`${data.questions.published} tayang · ${data.passages_total} materi`}
          tone="bg-blue-50 text-blue-600"
          onClick={go('/bank-soal')}
        />
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Peserta & Grup"
          value={data.participants_total}
          sub={`${data.groups_total} grup/kelas`}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<Hourglass className="h-6 w-6" />}
          label="Menunggu Penilaian"
          value={data.pending_grading}
          sub={data.pending_grading > 0 ? 'Perlu dinilai' : 'Tak ada antrean'}
          tone={data.pending_grading > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}
          onClick={data.pending_grading > 0 ? go('/penilaian') : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ujian aktif */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-gray-900">Ujian Aktif</h3>
              <button onClick={go('/manajemen-ujian')} className="text-xs font-bold text-brand hover:underline">
                Semua ujian →
              </button>
            </div>
            {data.active_exams.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-8 w-8" />}
                title="Belum ada ujian tayang"
                description={`Ujian Tayang ${scopeNote} akan muncul di sini beserta progres pesertanya.`}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {data.active_exams.map((e) => (
                  <div
                    key={e.exam_id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-slate-800">{e.title}</h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {e.submitted}/{e.participants} mengerjakan
                        </span>
                        {e.avg_score != null && (
                          <span className="inline-flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-slate-400" /> Rata-rata {Math.round(e.avg_score)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 font-bold"
                      leftIcon={<BarChart3 className="h-4 w-4" />}
                      onClick={() => router.push(`/manajemen-ujian/${e.exam_id}/hasil`)}
                    >
                      Lihat Hasil
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Perlu tindakan + aksi cepat */}
        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl p-6">
            <h3 className="mb-4 font-heading text-lg font-bold text-gray-900">Perlu Tindakan</h3>
            <div className="flex flex-col gap-2.5">
              {data.pending_grading > 0 && (
                <ActionItem
                  icon={<SquarePen className="h-4 w-4" />}
                  tone="bg-amber-50 text-amber-600"
                  title={`${data.pending_grading} jawaban menunggu dinilai`}
                  onClick={go('/penilaian')}
                />
              )}
              {data.flagged_attempts > 0 && (
                <ActionItem
                  icon={<ShieldAlert className="h-4 w-4" />}
                  tone="bg-red-50 text-red-500"
                  title={`${data.flagged_attempts} percobaan dengan pelanggaran integritas`}
                  onClick={go('/manajemen-ujian')}
                />
              )}
              {data.pending_grading === 0 && data.flagged_attempts === 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50/60 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Semua beres — tak ada yang perlu ditindak.
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl p-6">
            <h3 className="mb-4 font-heading text-lg font-bold text-gray-900">Aksi Cepat</h3>
            <div className="flex flex-col gap-2">
              <QuickLink icon={<Plus className="h-4 w-4" />} label="Buat Ujian" onClick={go('/manajemen-ujian')} />
              <QuickLink icon={<Library className="h-4 w-4" />} label="Bank Soal" onClick={go('/bank-soal')} />
              <QuickLink icon={<SquarePen className="h-4 w-4" />} label="Penilaian" onClick={go('/penilaian')} />
              {isSuper && <QuickLink icon={<Users className="h-4 w-4" />} label="Manajemen User" onClick={go('/users')} />}
            </div>
          </Card>
        </div>
      </div>

      {/* Super Admin: pengguna + audit sistem */}
      {isSuper && data.users && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <UsersCard users={data.users} onManage={go('/users')} />
          <AuditCard items={data.audit_recent ?? []} />
        </div>
      )}
    </>
  );
}

function UsersCard({ users, onManage }: { users: NonNullable<DashboardSummary['users']>; onManage: () => void }) {
  return (
    <Card className="rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-heading text-lg font-bold text-gray-900">
          <UserCog className="h-5 w-5 text-brand" /> Pengguna
        </h3>
        <button onClick={onManage} className="text-xs font-bold text-brand hover:underline">Kelola →</button>
      </div>
      <p className="text-3xl font-extrabold tabular-nums text-slate-900">{users.total}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">total akun</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-slate-100 px-3 py-2">
          <p className="font-extrabold tabular-nums text-slate-800">{users.admins}</p>
          <p className="text-[11px] text-slate-400">Admin</p>
        </div>
        <div className="rounded-xl border border-slate-100 px-3 py-2">
          <p className="font-extrabold tabular-nums text-slate-800">{users.participants}</p>
          <p className="text-[11px] text-slate-400">Peserta</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {users.active} aktif
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> {users.inactive} nonaktif
        </span>
      </div>
    </Card>
  );
}

function auditRelTime(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function AuditCard({ items }: { items: NonNullable<DashboardSummary['audit_recent']> }) {
  return (
    <Card className="rounded-2xl p-6 lg:col-span-2">
      <h3 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-bold text-gray-900">
        <History className="h-5 w-5 text-brand" /> Aktivitas Sistem
      </h3>
      {items.length === 0 ? (
        <EmptyState icon={<History className="h-8 w-8" />} title="Belum ada aktivitas" description="Aksi admin (buat/ubah/hapus) akan tercatat di sini." />
      ) : (
        <div className="flex flex-col">
          {items.map((a, i) => (
            <div key={i} className={cn('flex items-start justify-between gap-3 py-2.5', i > 0 && 'border-t border-slate-100')}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{a.summary || a.action}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-500">{a.actor_name || 'Sistem'}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{a.action}</span>
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-400">{auditRelTime(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ActionItem({ icon, tone, title, onClick }: { icon: React.ReactNode; tone: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-colors hover:border-brand/30 hover:bg-slate-50"
    >
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone)}>{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-brand" />
    </button>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand" />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
