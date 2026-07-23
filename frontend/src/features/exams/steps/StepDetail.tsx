'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { ClockTimePicker } from '@/components/ui/clock-time-picker';
import { Shuffle, CalendarClock, AlertTriangle } from 'lucide-react';

interface StepDetailProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  passingGrade: string;
  setPassingGrade: (v: string) => void;
  shuffleQuestions: boolean;
  setShuffleQuestions: (v: boolean) => void;
  shuffleOptions: boolean;
  setShuffleOptions: (v: boolean) => void;
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

/** Hanya izinkan digit. */
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
  passingGrade,
  setPassingGrade,
  shuffleQuestions,
  setShuffleQuestions,
  shuffleOptions,
  setShuffleOptions,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kolom kiri */}
      <div className="flex flex-col gap-5">
        <Input
          label="Nama Ujian"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Simulasi TOEFL — Structure & Written Expression"
        />
        <Textarea
          label="Deskripsi (opsional)"
          rows={5}
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Catatan singkat tentang ujian ini…"
        />
      </div>

      {/* Kolom kanan */}
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Total Waktu (menit)"
            required
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(digits(e.target.value))}
            placeholder="60"
          />
          <Input
            label="Nilai Kelulusan (opsional)"
            inputMode="numeric"
            value={passingGrade}
            onChange={(e) => setPassingGrade(digits(e.target.value))}
            placeholder="mis. 70"
            hint="Kosongkan bila tidak memakai passing grade."
          />
        </div>

        {/* Jadwal (opsional, WIB) */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 flex flex-col gap-3">
          <Checkbox
            checked={scheduled}
            onChange={setScheduled}
            label={
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" /> Tetapkan jadwal ujian (WIB)
              </span>
            }
            description="Bila tidak dicentang, ujian bisa diakses kapan saja setelah ditayangkan."
          />

          {scheduled && (
            <div className="flex flex-col gap-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className={fieldLabel}>Waktu Mulai (WIB)</span>
                  <div className="flex flex-col gap-2">
                    <DatePicker value={startDate} onChange={setStartDate} placeholder="Pilih tanggal" />
                    <ClockTimePicker value={startTime} onChange={setStartTime} placeholder="Pilih jam" />
                  </div>
                </div>
                <div>
                  <span className={fieldLabel}>Waktu Selesai (WIB, opsional)</span>
                  <div className="flex flex-col gap-2">
                    <DatePicker value={endDate} onChange={setEndDate} placeholder="Pilih tanggal" />
                    <ClockTimePicker value={endTime} onChange={setEndTime} placeholder="Pilih jam" />
                  </div>
                </div>
              </div>

              {pastWarning && (
                <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Waktu mulai sudah lewat. Masih bisa disimpan sebagai draf, tapi saat
                    <strong> Tayangkan</strong> waktu mulai tidak boleh lebih dari 5 menit yang lalu.
                  </span>
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                Semua waktu dihitung dalam <strong>WIB (GMT+7)</strong>, tidak tergantung lokasi
                admin maupun peserta.
              </p>
            </div>
          )}
        </div>

        {/* Opsi pengerjaan */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 flex flex-col gap-3">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Shuffle className="w-3.5 h-3.5 text-indigo-600" /> Opsi Pengerjaan
          </p>
          <Checkbox
            checked={shuffleQuestions}
            onChange={setShuffleQuestions}
            label="Acak urutan soal"
            description="Urutan diacak antar-unit; soal dalam satu materi tetap berurutan."
          />
          <Checkbox
            checked={shuffleOptions}
            onChange={setShuffleOptions}
            label="Acak pilihan jawaban (A/B/C/D)"
          />
          <Checkbox
            checked={allowRetake}
            onChange={setAllowRetake}
            label="Izinkan mengerjakan ulang"
            description="Bila tidak dicentang, peserta hanya bisa mengerjakan satu kali."
          />
        </div>
      </div>
    </div>
  );
};
