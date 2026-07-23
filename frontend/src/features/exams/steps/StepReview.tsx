'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  CalendarClock,
  Award,
  Repeat,
  Shuffle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SECTION_LABELS,
  type ExamSectionId,
  type ExamPoolUnit,
  type SectionAvailability,
  type PoolPreviewPayload,
  type PoolPreviewResponse,
} from '../hooks/useExams';

interface StepReviewProps {
  title: string;
  durationMinutes: number;
  passingGrade: number | null;
  scheduleLabel: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowRetake: boolean;
  participantsCount: number;
  sections: { section: ExamSectionId; target_count: number }[];
  poolUnits: ExamPoolUnit[];
  fetchPreview: (payload: PoolPreviewPayload) => Promise<PoolPreviewResponse>;
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-indigo-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

export const StepReview: React.FC<StepReviewProps> = ({
  title,
  durationMinutes,
  passingGrade,
  scheduleLabel,
  shuffleQuestions,
  shuffleOptions,
  allowRetake,
  participantsCount,
  sections,
  poolUnits,
  fetchPreview,
}) => {
  const [availability, setAvailability] = useState<SectionAvailability[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPreview({ sections, pool_units: poolUnits })
      .then((res) => {
        if (active) setAvailability(res.sections);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shortSections = (availability ?? []).filter((a) => !a.enough);
  const ready =
    sections.length > 0 && participantsCount > 0 && !!availability && shortSections.length === 0;

  const shuffleText = [shuffleQuestions && 'urutan soal', shuffleOptions && 'pilihan jawaban']
    .filter(Boolean)
    .join(' & ');

  return (
    <div className="flex flex-col gap-6">
      {/* Ringkasan */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Ringkasan Paket Ujian</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SummaryItem
            icon={<Award className="w-4 h-4" />}
            label="Nama"
            value={title || <span className="text-slate-300 italic">Belum diisi</span>}
          />
          <SummaryItem icon={<Clock className="w-4 h-4" />} label="Total Waktu" value={`${durationMinutes} menit`} />
          <SummaryItem
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Nilai Kelulusan"
            value={passingGrade != null ? String(passingGrade) : '—'}
          />
          <SummaryItem icon={<CalendarClock className="w-4 h-4" />} label="Jadwal" value={scheduleLabel} />
          <SummaryItem
            icon={<Users className="w-4 h-4" />}
            label="Peserta"
            value={`${participantsCount} orang`}
          />
          <SummaryItem
            icon={<Repeat className="w-4 h-4" />}
            label="Pengerjaan"
            value={allowRetake ? 'Boleh diulang' : 'Sekali saja'}
          />
          <SummaryItem
            icon={<Shuffle className="w-4 h-4" />}
            label="Pengacakan"
            value={shuffleText ? `Acak ${shuffleText}` : 'Tidak diacak'}
          />
        </div>
      </div>

      {/* Ketersediaan stok soal */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Ketersediaan Soal (Bank Soal Tayang)</h3>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: sections.length || 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-slate-400">Gagal memuat ketersediaan soal.</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-amber-600">Belum ada komposisi soal. Kembali ke langkah Komposisi.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(availability ?? []).map((a) => (
              <div
                key={a.section}
                className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 ${
                  a.enough ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {a.enough ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {SECTION_LABELS[a.section]}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-500 text-right">
                  butuh <strong className="text-slate-700">{a.target_count}</strong> · tersedia{' '}
                  <strong className={a.enough ? 'text-emerald-700' : 'text-red-600'}>
                    {a.available_questions}
                  </strong>{' '}
                  soal
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kesiapan */}
      {ready ? (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Siap ditayangkan. Klik <span className="font-extrabold">Tayangkan</span> untuk mengaktifkan ujian.
        </div>
      ) : (
        !isLoading && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Belum siap ditayangkan:
              <ul className="list-disc ml-5 mt-1 text-xs">
                {sections.length === 0 && <li>Tambahkan minimal satu bagian di Komposisi.</li>}
                {participantsCount === 0 && <li>Tandai minimal satu peserta.</li>}
                {shortSections.map((a) => (
                  <li key={a.section}>
                    Stok {SECTION_LABELS[a.section]} kurang (butuh {a.target_count}, tersedia{' '}
                    {a.available_questions}).
                  </li>
                ))}
              </ul>
              Kamu tetap bisa menyimpannya sebagai draf.
            </div>
          </div>
        )
      )}
    </div>
  );
};
