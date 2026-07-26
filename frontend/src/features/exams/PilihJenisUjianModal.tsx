'use client';

import { useState } from 'react';
import { Layers, ChevronLeft, ChevronRight, Lock, Pencil, GraduationCap, ClipboardCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestTypes, type TestType } from '@/features/test-types/useTestTypes';
import type { ExamMode } from '@/features/exams/hooks/useExams';

interface PilihJenisUjianModalProps {
  open: boolean;
  onClose: () => void;
  onChoose: (testType: TestType, mode: ExamMode) => void;
}

/** Modal Buat Ujian: pilih jenis tes AKTIF → pilih mode (Tes Lengkap / Latihan). */
export function PilihJenisUjianModal({ open, onClose, onChoose }: PilihJenisUjianModalProps) {
  const { testTypes, isLoading } = useTestTypes();
  const [picked, setPicked] = useState<TestType | null>(null);

  // Hanya jenis AKTIF yang boleh dipakai membuat ujian.
  const active = [...testTypes]
    .filter((t) => t.status === 'active')
    .sort((a, b) => a.sort_order - b.sort_order);

  // Kalau hanya 1 jenis aktif → langsung ke pilih mode (hemat klik).
  const chosen = picked ?? (active.length === 1 ? active[0] : null);
  const showMode = chosen !== null;
  const canGoBack = picked !== null && active.length > 1;

  const close = () => {
    setPicked(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={showMode ? `Buat Ujian — ${chosen?.name}` : 'Buat Ujian'}
      icon={<ClipboardCheck className="w-5 h-5 text-white" />}
      size="2xl"
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-400">
          <Layers className="w-9 h-9" />
          <p className="text-sm max-w-sm">
            Belum ada jenis tes yang aktif. Aktifkan atau tambahkan jenis tes di menu{' '}
            <strong className="text-slate-500">Jenis Ujian</strong> dulu.
          </p>
        </div>
      ) : !showMode ? (
        /* ── Langkah 1: pilih jenis tes ── */
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">Pilih jenis tes yang ingin diujikan.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map((t) => {
              const total = t.skills.reduce((n, s) => n + (s.full_test_count || 0), 0);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked(t)}
                  className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-5 transition-all hover:border-brand hover:shadow-md hover:shadow-brand/10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-linear-to-br from-brand-start to-brand-end text-white flex items-center justify-center">
                      <GraduationCap className="w-5 h-5" />
                    </span>
                    <span className="font-extrabold text-slate-800 text-base flex-1 truncate">{t.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors" />
                  </div>
                  {t.description && <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>}
                  {total > 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      Tes lengkap: <strong className="text-slate-600">{total}</strong> soal
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Langkah 2: pilih mode ── */
        <div className="flex flex-col gap-4">
          {canGoBack && (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-brand transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Ganti jenis tes
            </button>
          )}
          <p className="text-sm text-slate-500">Mau dibuat sebagai apa?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tes Lengkap */}
            <button
              type="button"
              onClick={() => chosen && onChoose(chosen, 'full')}
              className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-5 transition-all hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Lock className="w-4.5 h-4.5" />
                </span>
                <span className="font-extrabold text-slate-800">Tes Lengkap</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Komposisi <strong>resmi &amp; terkunci</strong> sesuai standar. Cocok untuk ujian
                sungguhan.
              </p>
            </button>

            {/* Latihan */}
            <button
              type="button"
              onClick={() => chosen && onChoose(chosen, 'custom')}
              className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-5 transition-all hover:border-brand hover:shadow-md hover:shadow-brand/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-slate-800">Latihan</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mulai dari komposisi standar, tapi <strong>bebas diubah</strong>. Nilai berupa
                persentase.
              </p>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
