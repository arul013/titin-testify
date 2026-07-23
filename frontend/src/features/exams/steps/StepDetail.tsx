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
    <div className="flex flex-col gap-6">
      {/* Field inti — dua kolom sejajar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Input
          label="Nama Ujian"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Simulasi TOEFL — Structure & Written Expression"
        />
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
            hint="Kosongkan bila tak memakai."
          />
        </div>
      </div>

      <Textarea
        label="Deskripsi (opsional)"
        rows={3}
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder="Catatan singkat tentang ujian ini…"
      />

      {/* Jadwal (opsional, WIB) — kartu penuh-lebar */}
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

      {/* Opsi pengerjaan — kartu penuh-lebar, tiga opsi sejajar */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Shuffle className="w-4 h-4 text-indigo-600" /> Opsi Pengerjaan
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Checkbox
            checked={shuffleQuestions}
            onChange={setShuffleQuestions}
            label="Acak urutan soal"
            description="Diacak antar-unit; soal satu materi tetap berurutan."
          />
          <Checkbox
            checked={shuffleOptions}
            onChange={setShuffleOptions}
            label="Acak pilihan jawaban"
            description="Urutan opsi A/B/C/D diacak tiap peserta."
          />
          <Checkbox
            checked={allowRetake}
            onChange={setAllowRetake}
            label="Izinkan mengerjakan ulang"
            description="Bila mati, peserta hanya bisa mengerjakan sekali."
          />
        </div>
      </div>
    </div>
  );
};
