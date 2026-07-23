'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkflowStepper, type WorkflowStep } from '@/components/ui/WorkflowStepper';
import { StepDetail } from './steps/StepDetail';
import { StepComposition } from './steps/StepComposition';
import { StepSource } from './steps/StepSource';
import { StepParticipants } from './steps/StepParticipants';
import {
  ALL_SECTIONS,
  type ExamDetail,
  type ExamPoolUnit,
  type ExamSectionId,
} from './hooks/useExams';

interface ExamBuilderProps {
  initial: ExamDetail | null;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const STEP_LABELS = ['Detail', 'Komposisi', 'Sumber Soal', 'Peserta'];

// Semua jadwal ujian dipatok WIB (UTC+7 tetap, tanpa DST) — tak peduli zona
// perangkat admin/peserta. Jadi input & tampilan selalu waktu WIB.

/** Ubah ISO (instant UTC) → bagian tanggal (YYYY-MM-DD) & jam (HH:MM) dalam WIB. */
function isoToParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** Gabung tanggal + jam (dianggap WIB) → ISO UTC untuk backend. Jam kosong → 00:00. */
function partsToIso(date: string, time: string): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time || '00:00'}:00+07:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export const ExamBuilder: React.FC<ExamBuilderProps> = ({ initial, onCancel, onSubmit }) => {
  const isEditing = !!initial;

  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Detail
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [duration, setDuration] = useState(initial ? String(initial.duration_minutes) : '60');
  const [passingGrade, setPassingGrade] = useState(
    initial?.passing_grade != null ? String(initial.passing_grade) : '',
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(initial?.shuffle_questions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState(initial?.shuffle_options ?? false);
  const [allowRetake, setAllowRetake] = useState(initial?.allow_retake ?? false);
  const [scheduled, setScheduled] = useState(!!initial?.starts_at);
  const _startParts = isoToParts(initial?.starts_at ?? null);
  const _endParts = isoToParts(initial?.ends_at ?? null);
  const [startDate, setStartDate] = useState(_startParts.date);
  const [startTime, setStartTime] = useState(_startParts.time);
  const [endDate, setEndDate] = useState(_endParts.date);
  const [endTime, setEndTime] = useState(_endParts.time);

  // Komposisi
  const [counts, setCounts] = useState<Partial<Record<ExamSectionId, number>>>(() => {
    const init: Partial<Record<ExamSectionId, number>> = {};
    initial?.sections?.forEach((s) => {
      init[s.section] = s.target_count;
    });
    return init;
  });

  // Sumber soal (pool units)
  const [poolUnits, setPoolUnits] = useState<ExamPoolUnit[]>(initial?.pool_units ?? []);

  // Peserta
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.participants?.map((p) => p.user_id) ?? [],
  );

  const enabledSections = ALL_SECTIONS.filter((s) => counts[s] !== undefined);

  const toggleSection = (section: ExamSectionId, enabled: boolean) => {
    setCounts((prev) => {
      const next = { ...prev };
      if (enabled) next[section] = prev[section] ?? 5;
      else delete next[section];
      return next;
    });
  };

  const setSectionCount = (section: ExamSectionId, count: number) => {
    setCounts((prev) => ({ ...prev, [section]: count }));
  };

  const steps: WorkflowStep[] = STEP_LABELS.map((label, i) => ({
    label,
    state: i < step ? 'complete' : i === step ? 'active' : 'locked',
  }));

  const buildPayload = (): Record<string, unknown> => ({
    title: title.trim(),
    description: description.trim() || null,
    duration_minutes: Number(duration),
    passing_grade: passingGrade === '' ? null : Number(passingGrade),
    shuffle_questions: shuffleQuestions,
    shuffle_options: shuffleOptions,
    allow_retake: allowRetake,
    status: 'draft',
    starts_at: scheduled ? partsToIso(startDate, startTime) : null,
    ends_at: scheduled ? partsToIso(endDate, endTime) : null,
    sections: enabledSections.map((s) => ({
      section: s,
      target_count: counts[s],
    })),
    pool_units: poolUnits,
    participant_ids: participantIds,
  });

  const validate = (): boolean => {
    if (!title.trim()) {
      toast.error('Nama ujian wajib diisi.');
      setStep(0);
      return false;
    }
    if (!duration || Number(duration) < 1) {
      toast.error('Total waktu harus minimal 1 menit.');
      setStep(0);
      return false;
    }
    if (scheduled && !startDate) {
      toast.error('Isi waktu mulai, atau matikan "Tetapkan jadwal ujian".');
      setStep(0);
      return false;
    }
    if (scheduled) {
      const startIso = partsToIso(startDate, startTime);
      const endIso = partsToIso(endDate, endTime);
      if (startIso && endIso && endIso <= startIso) {
        toast.error('Jadwal selesai harus setelah jadwal mulai.');
        setStep(0);
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSubmit(buildPayload());
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = step === STEP_LABELS.length - 1;

  return (
    <Card className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md shadow-slate-100 flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali ke daftar ujian
        </button>
        <h2 className="text-lg font-extrabold text-slate-800">
          {isEditing ? 'Edit Paket Ujian' : 'Buat Paket Ujian'}
        </h2>
        <WorkflowStepper
          steps={steps}
          title="Langkah"
          className=""
          onStepClick={(idx) => setStep(idx)}
          viewingIdx={step}
        />
      </div>

      <div className="min-h-64">
        {step === 0 && (
          <StepDetail
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            duration={duration}
            setDuration={setDuration}
            passingGrade={passingGrade}
            setPassingGrade={setPassingGrade}
            shuffleQuestions={shuffleQuestions}
            setShuffleQuestions={setShuffleQuestions}
            shuffleOptions={shuffleOptions}
            setShuffleOptions={setShuffleOptions}
            allowRetake={allowRetake}
            setAllowRetake={setAllowRetake}
            scheduled={scheduled}
            setScheduled={setScheduled}
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endDate={endDate}
            setEndDate={setEndDate}
            endTime={endTime}
            setEndTime={setEndTime}
          />
        )}
        {step === 1 && (
          <StepComposition
            counts={counts}
            onToggle={toggleSection}
            onCountChange={setSectionCount}
          />
        )}
        {step === 2 && (
          <StepSource
            enabledSections={enabledSections}
            poolUnits={poolUnits}
            onChange={setPoolUnits}
          />
        )}
        {step === 3 && (
          <StepParticipants selectedIds={participantIds} onChange={setParticipantIds} />
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div>
          {step > 0 && (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Kembali
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={isSaving}
            className="font-bold gap-2"
            leftIcon={<Check className="w-4 h-4" />}
          >
            Simpan Draf
          </Button>
          {!isLastStep && (
            <Button
              variant="primary"
              onClick={() => setStep((s) => s + 1)}
              className="font-bold gap-2"
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
