'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Shuffle } from 'lucide-react';

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
  startsAt: string;
  setStartsAt: (v: string) => void;
  endsAt: string;
  setEndsAt: (v: string) => void;
}

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
  startsAt,
  setStartsAt,
  endsAt,
  setEndsAt,
}) => {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <Input
        label="Nama Ujian"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="mis. Simulasi TOEFL — Structure & Written Expression"
      />

      <Textarea
        label="Deskripsi (opsional)"
        rows={2}
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder="Catatan singkat tentang ujian ini…"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Total Waktu (menit)"
          required
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="60"
        />
        <Input
          label="Nilai Kelulusan (opsional)"
          type="number"
          min={0}
          max={100}
          value={passingGrade}
          onChange={(e) => setPassingGrade(e.target.value)}
          placeholder="mis. 70"
          hint="Kosongkan bila tidak memakai passing grade."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Jadwal Mulai (opsional)"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Input
          label="Jadwal Selesai (opsional)"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </div>

      <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
          <Shuffle className="w-3.5 h-3.5 text-indigo-600" /> Pengacakan
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
      </div>
    </div>
  );
};
