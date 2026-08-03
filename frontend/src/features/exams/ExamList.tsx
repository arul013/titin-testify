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

/** Satu baris aksi berlabel di dalam Modal "Lainnya". */
const ActionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, label, desc, danger, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors",
      danger
        ? "border-red-100 hover:border-red-200 hover:bg-red-50/50"
        : "border-slate-100 hover:border-brand/30 hover:bg-slate-50",
    )}
  >
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
        danger
          ? "bg-red-50 text-red-500"
          : "bg-slate-100 text-slate-500 group-hover:bg-brand/10 group-hover:text-brand",
      )}
    >
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          "block text-sm font-bold",
          danger ? "text-red-600" : "text-slate-800",
        )}
      >
        {label}
      </span>
      <span className="block text-xs text-slate-400">{desc}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-400" />
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
                        <span className="font-semibold text-emerald-600">
                          {" "}
                          · {exam.attempts_count} mengerjakan
                        </span>
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
        size="md"
      >
        {m && (
          <div className="flex flex-col gap-2">
            {canEdit && (
              <ActionRow
                icon={<Edit2 className="h-[18px] w-[18px]" />}
                label="Ubah Ujian"
                desc="Ubah komposisi soal, jadwal, dan peserta"
                onClick={act(() => onEdit(m))}
              />
            )}
            <ActionRow
              icon={<Copy className="h-[18px] w-[18px]" />}
              label="Duplikat"
              desc="Salin jadi ujian baru (atur ulang jadwalnya)"
              onClick={act(() => onDuplicate(m))}
            />
            {canUnpublish && (
              <ActionRow
                icon={<Undo2 className="h-[18px] w-[18px]" />}
                label="Kembalikan ke Draf"
                desc="Sembunyikan dari peserta untuk diubah lagi"
                onClick={act(() => onUnpublish(m.id))}
              />
            )}
            {canClose && (
              <ActionRow
                icon={<Lock className="h-[18px] w-[18px]" />}
                label="Tutup Ujian"
                desc="Kunci — tak bisa dikerjakan lagi"
                onClick={act(() => onClose(m))}
              />
            )}
            {canArchive && (
              <ActionRow
                icon={<Archive className="h-[18px] w-[18px]" />}
                label="Arsipkan"
                desc="Sembunyikan dari daftar aktif"
                onClick={act(() => onArchive(m))}
              />
            )}
            {canUnarchive && (
              <ActionRow
                icon={<ArchiveRestore className="h-[18px] w-[18px]" />}
                label="Keluarkan dari Arsip"
                desc="Kembalikan ke daftar aktif"
                onClick={act(() => onUnarchive(m))}
              />
            )}
            <div className="my-1 border-t border-slate-100" />
            <ActionRow
              icon={<Trash2 className="h-[18px] w-[18px]" />}
              label="Hapus"
              desc="Ujian dihapus dari daftar (data tetap tersimpan untuk audit)"
              danger
              onClick={act(() => onDelete(m))}
            />
          </div>
        )}
      </Modal>
    </>
  );
};
