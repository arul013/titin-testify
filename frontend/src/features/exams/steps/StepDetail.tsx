'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { ClockTimePicker } from '@/components/ui/clock-time-picker';
import { CalendarClock, AlertTriangle, Repeat } from 'lucide-react';
import type { ScoringScheme } from '@/features/scoring/hooks/useScoringSchemes';

interface StepDetailProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  schemes: ScoringScheme[];
  scoringSchemeId: string;
  setScoringSchemeId: (v: string) => void;
  passingValue: string;
  setPassingValue: (v: string) => void;
  allowRetake: boolean;
  setAllowRetake: (v: boolean) => void;
  scheduled: boolean;
  setScheduled: (v: boolean) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
}

/** Hanya izinkan digit (+ titik untuk desimal, mis. band IELTS 6.5). */
const digitsDot = (v: string) => v.replace(/[^0-9.]/g, '');
const digits = (v: string) => v.replace(/[^0-9]/g, '');

/** Waktu mulai (WIB) dianggap "sudah lewat" bila > 5 menit di masa lalu. */
function isStartInPast(date: string, time: string): boolean {
  if (!date) return false;
  const d = new Date(`${date}T${time || '00:00'}:00+07:00`);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now() - 5 * 60 * 1000;
}

const fieldLabel = 'mb-1.5 block text-sm font-medium text-gray-700';

export const StepDetail: React.FC<StepDetailProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  duration,
  setDuration,
  schemes,
  scoringSchemeId,
  setScoringSchemeId,
  passingValue,
  setPassingValue,
  allowRetake,
  setAllowRetake,
  scheduled,
  setScheduled,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
}) => {
  const pastWarning = scheduled && isStartInPast(startDate, startTime);

  const scheme = schemes.find((s) => s.id === scoringSchemeId);
  const unit = (scheme?.config?.passing_unit as string) || 'percent';
  const passingLabel = unit === 'percent' ? 'Nilai Kelulusan (%) — opsional' : 'Nilai Kelulusan (opsional)';
  const passingPlaceholder = unit === 'percent' ? 'mis. 70' : 'mis. 500';

  return (
    <div className="flex flex-col gap-6">
      {/* Nama + waktu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Input
          label="Nama Ujian"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Simulasi TOEFL — Structure & Written Expression"
        />
        <Input
          label="Total Waktu (menit)"
          required
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(digits(e.target.value))}
          placeholder="60"
        />
      </div>

      {/* Skema penilaian + nilai kelulusan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <span className={fieldLabel}>
            Skema Penilaian <span className="text-red-500">*</span>
          </span>
          <Select value={scoringSchemeId} onChange={(e) => setScoringSchemeId(e.target.value)}>
            <option value="">Pilih skema…</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-400">
            Menentukan cara skor dihitung. Kelola di menu <strong>Skema Penilaian</strong>.
          </p>
        </div>
        <Input
          label={passingLabel}
          inputMode="decimal"
          value={passingValue}
          onChange={(e) => setPassingValue(digitsDot(e.target.value))}
          placeholder={passingPlaceholder}
          hint="Kosongkan bila tak memakai ambang lulus."
        />
      </div>

      <Textarea
        label="Deskripsi (opsional)"
        rows={3}
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder="Catatan singkat tentang ujian ini…"
      />

      {/* Jadwal (opsional, WIB) */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <Checkbox
          checked={scheduled}
          onChange={setScheduled}
          label={
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
              <CalendarClock className="w-4 h-4 text-indigo-600" /> Tetapkan jadwal ujian (WIB)
            </span>
          }
          description="Bila tidak dicentang, ujian bisa diakses kapan saja setelah ditayangkan."
        />

        {scheduled && (
          <div className="flex flex-col gap-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
              <div>
                <span className={fieldLabel}>Waktu Mulai (WIB)</span>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={startDate} onChange={setStartDate} placeholder="Tanggal" />
                  <ClockTimePicker value={startTime} onChange={setStartTime} placeholder="Jam" />
                </div>
              </div>
              <div>
                <span className={fieldLabel}>Waktu Selesai (WIB, opsional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={endDate} onChange={setEndDate} placeholder="Tanggal" />
                  <ClockTimePicker value={endTime} onChange={setEndTime} placeholder="Jam" />
                </div>
              </div>
            </div>

            {pastWarning && (
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Waktu mulai sudah lewat. Masih bisa disimpan sebagai draf, tapi saat
                  <strong> Tayangkan</strong> waktu mulai tidak boleh lebih dari 5 menit yang lalu.
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Semua waktu dihitung dalam <strong>WIB (GMT+7)</strong>, tidak tergantung lokasi admin
              maupun peserta.
            </p>
          </div>
        )}
      </div>

      {/* Opsi pengerjaan (tanpa pengacakan — ujian deterministik) */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Repeat className="w-4 h-4 text-indigo-600" /> Opsi Pengerjaan
        </p>
        <Checkbox
          checked={allowRetake}
          onChange={setAllowRetake}
          label="Izinkan mengerjakan ulang"
          description="Bila mati, peserta hanya bisa mengerjakan sekali."
        />
      </div>
    </div>
  );
};
