"use client";

import React, { useState } from "react";
import {
  Edit2,
  Trash2,
  Clock,
  Users,
  CalendarClock,
  ClipboardList,
  Target,
  Undo2,
  Copy,
  Lock,
  Archive,
  ArchiveRestore,
  ChevronRight,
  Settings2,
  BarChart3,
  LayoutTemplate,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/cn";
import type { Exam, ExamStatus } from "./hooks/useExams";

interface ExamListProps {
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
  onSaveAsTemplate: (exam: Exam) => void;
  onManageAccommodation: (exam: Exam) => void;
  onViewResults: (exam: Exam) => void;
}

const STATUS_META: Record<
  ExamStatus,
  {
    label: string;
    variant: "success" | "info" | "neutral" | "warning";
    dot: string;
  }
> = {
  draft: { label: "Draf", variant: "neutral", dot: "bg-slate-300" },
  published: { label: "Tayang", variant: "success", dot: "bg-emerald-500" },
  closed: { label: "Selesai", variant: "info", dot: "bg-blue-500" },
  archived: { label: "Diarsipkan", variant: "warning", dot: "bg-amber-400" },
};

function formatSchedule(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return "Kapan saja";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)} WIB`;
  if (starts) return `Mulai ${fmt(starts)} WIB`;
  return `Selesai ${fmt(ends as string)} WIB`;
}

const Meta: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-500">
    <span className="text-slate-400">{icon}</span>
    {children}
  </span>
);

/** Kartu aksi ringkas untuk grid 2 kolom (tinggi seragam via auto-rows-fr). */
const ActionTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}> = ({ icon, label, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex h-full w-full items-start gap-3 rounded-2xl border border-slate-100 p-3.5 text-left transition-colors hover:border-brand/30 hover:bg-slate-50"
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand/10 group-hover:text-brand">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-slate-800">{label}</span>
      <span className="mt-0.5 block text-xs leading-snug text-slate-400">{desc}</span>
    </span>
  </button>
);

/** Baris aksi berbahaya (full-width) di kaki modal. */
const DangerRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}> = ({ icon, label, desc, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-3.5 rounded-2xl border border-red-100 p-3.5 text-left transition-colors hover:border-red-200 hover:bg-red-50/50"
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-500">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-red-600">{label}</span>
      <span className="block text-xs text-slate-400">{desc}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-red-200 group-hover:text-red-300" />
  </button>
);

export const ExamList: React.FC<ExamListProps> = ({
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
  onSaveAsTemplate,
  onManageAccommodation,
  onViewResults,
}) => {
  const isSuperAdmin = currentUserRole === "super_admin";
  const [menuExam, setMenuExam] = useState<Exam | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl p-5">
            <Skeleton className="mb-3 h-5 w-56" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="Belum ada ujian"
        description="Buat paket ujian pertamamu lewat tombol “Buat Ujian”, lalu tentukan komposisi soal, jadwal, dan peserta."
      />
    );
  }

  // Aksi kontekstual sesuai status ujian yang dibuka menunya.
  const m = menuExam;
  const hasAttempts = !!m && m.attempts_count > 0;
  const canEdit = !!m && (m.status === "draft" || m.status === "published");
  const canUnpublish = !!m && m.status === "published" && !hasAttempts;
  const canClose = !!m && m.status === "published";
  const canArchive = !!m && m.status !== "archived";
  const canUnarchive = !!m && m.status === "archived";
  const canAccommodate = !!m && m.participants_count > 0 && m.status !== "archived";
  const act = (fn: () => void) => () => {
    setMenuExam(null);
    fn();
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {exams.map((exam) => {
          const meta = STATUS_META[exam.status];
          const rowHasAttempts = exam.attempts_count > 0;

          return (
            <Card
              key={exam.id}
              className={cn(
                "flex flex-col gap-4 rounded-2xl p-5 transition-shadow hover:shadow-md md:flex-row md:items-center",
                exam.status === "archived" && "opacity-70",
              )}
            >
              {/* identitas + meta */}
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <span
                  className={cn(
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    meta.dot,
                  )}
                />
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="truncate text-base font-extrabold text-slate-800">
                      {exam.title}
                    </h3>
                    <Badge
                      variant={meta.variant}
                      className="text-[10px] font-extrabold uppercase"
                    >
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                    <Meta icon={<CalendarClock className="h-3.5 w-3.5" />}>
                      {formatSchedule(exam.starts_at, exam.ends_at)}
                    </Meta>
                    <Meta icon={<Clock className="h-3.5 w-3.5" />}>
                      {exam.duration_minutes} menit
                    </Meta>
                    <Meta icon={<ClipboardList className="h-3.5 w-3.5" />}>
                      {exam.total_target} soal · {exam.sections.length} bagian
                    </Meta>
                    {exam.passing_value != null && (
                      <Meta icon={<Target className="h-3.5 w-3.5" />}>
                        Lulus ≥ {exam.passing_value}
                      </Meta>
                    )}
                    <Meta icon={<Users className="h-3.5 w-3.5" />}>
                      {exam.participants_count} peserta
                      {rowHasAttempts && (
                        <>
                          {" · "}
                          <button
                            type="button"
                            onClick={() => onViewResults(exam)}
                            className="font-semibold text-emerald-600 hover:underline"
                          >
                            {exam.attempts_count} mengerjakan
                          </button>
                        </>
                      )}
                    </Meta>
                  </div>
                  {isSuperAdmin && (
                    <span className="text-[11px] text-slate-400">
                      oleh {exam.creator_name || "Super Admin"}
                    </span>
                  )}
                </div>
              </div>

              {/* aksi — satu tombol membuka menu berisi semua aksi */}
              <div className="flex shrink-0 items-center md:justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMenuExam(exam)}
                  className="font-bold"
                  leftIcon={<Settings2 className="h-4 w-4" />}
                >
                  Kelola
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal aksi "Lainnya" — semua berlabel */}
      <Modal
        open={!!menuExam}
        onClose={() => setMenuExam(null)}
        title={m ? m.title : ""}
        icon={<Settings2 className="h-5 w-5 text-white" />}
        size="lg"
      >
        {m && (
          <div className="flex flex-col gap-3">
            <div className="grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2">
              <ActionTile
                icon={<BarChart3 className="h-4.5 w-4.5" />}
                label="Lihat Hasil"
                desc="Skor & rincian jawaban peserta"
                onClick={act(() => onViewResults(m))}
              />
              {canEdit && (
                <ActionTile
                  icon={<Edit2 className="h-4.5 w-4.5" />}
                  label="Ubah Ujian"
                  desc="Ubah komposisi soal, jadwal, dan peserta"
                  onClick={act(() => onEdit(m))}
                />
              )}
              <ActionTile
                icon={<Copy className="h-4.5 w-4.5" />}
                label="Duplikat"
                desc="Salin jadi ujian baru (atur ulang jadwalnya)"
                onClick={act(() => onDuplicate(m))}
              />
              <ActionTile
                icon={<LayoutTemplate className="h-4.5 w-4.5" />}
                label="Jadikan Template"
                desc="Simpan komposisinya sebagai resep untuk ujian berikutnya"
                onClick={act(() => onSaveAsTemplate(m))}
              />
              {canAccommodate && (
                <ActionTile
                  icon={<Timer className="h-4.5 w-4.5" />}
                  label="Waktu Tambahan Peserta"
                  desc="Beri menit ekstra (akomodasi) untuk peserta tertentu"
                  onClick={act(() => onManageAccommodation(m))}
                />
              )}
              {canUnpublish && (
                <ActionTile
                  icon={<Undo2 className="h-4.5 w-4.5" />}
                  label="Kembalikan ke Draf"
                  desc="Sembunyikan dari peserta untuk diubah lagi"
                  onClick={act(() => onUnpublish(m.id))}
                />
              )}
              {canClose && (
                <ActionTile
                  icon={<Lock className="h-4.5 w-4.5" />}
                  label="Tutup Ujian"
                  desc="Kunci — tak bisa dikerjakan lagi"
                  onClick={act(() => onClose(m))}
                />
              )}
              {canArchive && (
                <ActionTile
                  icon={<Archive className="h-4.5 w-4.5" />}
                  label="Arsipkan"
                  desc="Sembunyikan dari daftar aktif"
                  onClick={act(() => onArchive(m))}
                />
              )}
              {canUnarchive && (
                <ActionTile
                  icon={<ArchiveRestore className="h-4.5 w-4.5" />}
                  label="Keluarkan dari Arsip"
                  desc="Kembalikan ke daftar aktif"
                  onClick={act(() => onUnarchive(m))}
                />
              )}
            </div>
            <div className="border-t border-slate-100" />
            <DangerRow
              icon={<Trash2 className="h-4.5 w-4.5" />}
              label="Hapus"
              desc="Ujian dihapus dari daftar (data tetap tersimpan untuk audit)"
              onClick={act(() => onDelete(m))}
            />
          </div>
        )}
      </Modal>
    </>
  );
};
