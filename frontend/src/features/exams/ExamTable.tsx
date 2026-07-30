'use client';

import React from 'react';
import {
  Edit2,
  Trash2,
  Clock,
  Users,
  CalendarClock,
  ClipboardList,
  Undo2,
  Copy,
  Lock,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Exam, ExamStatus } from './hooks/useExams';

interface ExamTableProps {
  exams: Exam[];
  isLoading: boolean;
  currentUserRole?: string;
  onEdit: (exam: Exam) => void;
  onDelete: (exam: Exam) => void;
  onUnpublish: (id: string) => void;
  onClose: (exam: Exam) => void;
  onArchive: (exam: Exam) => void;
  onUnarchive: (exam: Exam) => void;
  onDuplicate: (exam: Exam) => void;
}

const STATUS_META: Record<ExamStatus, { label: string; variant: 'success' | 'info' | 'neutral' }> = {
  draft: { label: 'Draf', variant: 'neutral' },
  published: { label: 'Tayang', variant: 'success' },
  closed: { label: 'Selesai', variant: 'info' },
  archived: { label: 'Arsip', variant: 'neutral' },
};

function formatSchedule(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return 'Kapan saja';
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

const iconBtn = (tone: 'slate' | 'amber' | 'red' | 'indigo') =>
  ({
    slate: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60',
    amber: 'text-slate-400 hover:text-amber-600 hover:bg-amber-50/40',
    red: 'text-slate-400 hover:text-red-600 hover:bg-red-50/40',
    indigo: 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40',
  })[tone] + ' p-1.5 rounded-lg transition-colors';

export const ExamTable: React.FC<ExamTableProps> = ({
  exams,
  isLoading,
  currentUserRole,
  onEdit,
  onDelete,
  onUnpublish,
  onClose,
  onArchive,
  onUnarchive,
  onDuplicate,
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
          {exams.map((exam) => {
            const meta = STATUS_META[exam.status];
            const hasAttempts = exam.attempts_count > 0;
            const canEdit = exam.status === 'draft' || exam.status === 'published';
            const canUnpublish = exam.status === 'published' && !hasAttempts;
            const canClose = exam.status === 'published';
            const canArchive = exam.status !== 'archived';
            const canUnarchive = exam.status === 'archived';

            return (
              <tr
                key={exam.id}
                className={`hover:bg-slate-50/40 transition-colors ${
                  exam.status === 'archived' ? 'opacity-60' : ''
                }`}
              >
                <td className="py-4 px-6 max-w-xs">
                  <div className="font-semibold text-slate-800 text-sm truncate">{exam.title}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {exam.duration_minutes} menit
                    {exam.passing_value != null && <span>• Lulus ≥ {exam.passing_value}</span>}
                  </div>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <Badge variant={meta.variant} className="text-[10px] font-extrabold uppercase">
                    {meta.label}
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
                  {hasAttempts && (
                    <span className="block text-[11px] font-semibold text-emerald-600 mt-0.5">
                      {exam.attempts_count} dikerjakan
                    </span>
                  )}
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
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 py-0 font-bold text-xs"
                        onClick={() => onEdit(exam)}
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Kelola
                      </Button>
                    )}
                    <button onClick={() => onDuplicate(exam)} title="Duplikat" className={iconBtn('indigo')}>
                      <Copy className="w-4 h-4" />
                    </button>
                    {canClose && (
                      <button onClick={() => onClose(exam)} title="Tutup ujian" className={iconBtn('amber')}>
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    {canUnpublish && (
                      <button onClick={() => onUnpublish(exam.id)} title="Jadikan Draf" className={iconBtn('amber')}>
                        <Undo2 className="w-4 h-4" />
                      </button>
                    )}
                    {canArchive && (
                      <button onClick={() => onArchive(exam)} title="Arsipkan" className={iconBtn('slate')}>
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    {canUnarchive && (
                      <button onClick={() => onUnarchive(exam)} title="Keluarkan dari arsip" className={iconBtn('indigo')}>
                        <ArchiveRestore className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => onDelete(exam)} title="Hapus" className={iconBtn('red')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
