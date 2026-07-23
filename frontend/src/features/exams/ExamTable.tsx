'use client';

import React from 'react';
import { Edit2, Trash2, Clock, Users, CalendarClock, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Exam } from './hooks/useExams';

interface ExamTableProps {
  exams: Exam[];
  isLoading: boolean;
  currentUserRole?: string;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

function formatSchedule(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return 'Kapan saja';
  // Selalu tampilkan dalam WIB (Asia/Jakarta), tak peduli zona perangkat.
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)} WIB`;
  if (starts) return `Mulai ${fmt(starts)} WIB`;
  return `Selesai ${fmt(ends as string)} WIB`;
}

export const ExamTable: React.FC<ExamTableProps> = ({
  exams,
  isLoading,
  currentUserRole,
  onEdit,
  onDelete,
}) => {
  const isSuperAdmin = currentUserRole === 'super_admin';

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="Belum ada paket ujian"
        description="Buat paket ujian lewat tombol “Buat Ujian”, lalu tentukan komposisi soal & peserta."
      />
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100">
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Nama Ujian</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Status</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Komposisi</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Peserta</th>
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Jadwal</th>
            {isSuperAdmin && (
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Pembuat</th>
            )}
            <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {exams.map((exam) => (
            <tr key={exam.id} className="hover:bg-slate-50/40 transition-colors">
              <td className="py-4 px-6 max-w-xs">
                <div className="font-semibold text-slate-800 text-sm truncate">{exam.title}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> {exam.duration_minutes} menit
                  {exam.passing_grade != null && <span>• Lulus ≥ {exam.passing_grade}</span>}
                </div>
              </td>
              <td className="py-4 px-6 whitespace-nowrap">
                <Badge
                  variant={exam.status === 'published' ? 'success' : 'neutral'}
                  className="text-[10px] font-extrabold uppercase"
                >
                  {exam.status === 'published' ? 'Tayang' : 'Draf'}
                </Badge>
              </td>
              <td className="py-4 px-6 whitespace-nowrap">
                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                  {exam.total_target} soal
                </span>
                <span className="text-xs text-slate-400 ml-1">• {exam.sections.length} bagian</span>
              </td>
              <td className="py-4 px-6 whitespace-nowrap">
                <span className="text-sm font-semibold text-slate-600 inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> {exam.participants_count}
                </span>
              </td>
              <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                  {formatSchedule(exam.starts_at, exam.ends_at)}
                </span>
              </td>
              {isSuperAdmin && (
                <td className="py-4 px-6 whitespace-nowrap text-xs font-semibold text-slate-600">
                  {exam.creator_name || 'Super Admin'}
                </td>
              )}
              <td className="py-4 px-6 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 py-0 font-bold text-xs"
                    onClick={() => onEdit(exam)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Kelola
                  </Button>
                  <button
                    onClick={() => onDelete(exam.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
