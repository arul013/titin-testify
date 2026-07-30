'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Check, Rocket, Lock, Sparkles, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowStepper, type WorkflowStep } from '@/components/ui/WorkflowStepper';
import { StepDetail } from './steps/StepDetail';
import { StepComposition } from './steps/StepComposition';
import { StepSource } from './steps/StepSource';
import { StepParticipants } from './steps/StepParticipants';
import { StepReview } from './steps/StepReview';
import {
  type ExamDetail,
  type ExamMode,
  type ExamPoolUnit,
  type ExamSectionId,
  type PoolPreviewPayload,
  type PoolPreviewResponse,
  type SectionAvailability,
} from './hooks/useExams';
import { useTestTypes } from '@/features/test-types/useTestTypes';

interface ExamBuilderProps {
  initial: ExamDetail | null;
  testTypeCode: string;
  examMode: ExamMode;
  /** Komposisi awal (preset dari jenis tes) untuk ujian Latihan baru. */
  initialCounts?: Record<string, number>;
  onCancel: () => void;
  onSaveDraft: (payload: Record<string, unknown>) => Promise<void>;
  onPublish: (payload: Record<string, unknown>) => Promise<void>;
  fetchPreview: (payload: PoolPreviewPayload) => Promise<PoolPreviewResponse>;
}

const STEP_LABELS = ['Detail', 'Komposisi', 'Sumber Soal', 'Peserta', 'Review'];

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

export const ExamBuilder: React.FC<ExamBuilderProps> = ({
  initial,
  testTypeCode,
  examMode,
  initialCounts,
  onCancel,
  onSaveDraft,
  onPublish,
  fetchPreview,
}) => {
  const isEditing = !!initial;
  const isFull = examMode === 'full';

  // Jenis tes + skill-nya (menentukan bagian yang muncul & preset full test).
  const { testTypes } = useTestTypes();
  const testType = testTypes.find((t) => t.code === testTypeCode) ?? null;
  const skills = testType?.skills ?? [];

  // Edit ujian yang sudah ada → mulai di Review (step terakhir); buat baru → step 0.
  const [step, setStep] = useState(() => (initial ? STEP_LABELS.length - 1 : 0));
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Detail
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [duration, setDuration] = useState(initial ? String(initial.duration_minutes) : '60');
  // Skor otomatis (tanpa skema manual). Default passing 500 utk Tes Lengkap ITP baru.
  const isOfficialItp = examMode === 'full' && testTypeCode === 'itp';
  const [passingValue, setPassingValue] = useState(
    initial?.passing_value != null
      ? String(initial.passing_value)
      : isOfficialItp
        ? '500'
        : '',
  );
  const [allowRetake, setAllowRetake] = useState(initial?.allow_retake ?? false);
  // Pembahasan: default Latihan ON, Tes Lengkap OFF (admin bisa ubah).
  const [showReview, setShowReview] = useState(
    initial?.show_review ?? examMode === 'custom',
  );
  const [scheduled, setScheduled] = useState(!!initial?.starts_at);
  const _startParts = isoToParts(initial?.starts_at ?? null);
  const _endParts = isoToParts(initial?.ends_at ?? null);
  const [startDate, setStartDate] = useState(_startParts.date);
  const [startTime, setStartTime] = useState(_startParts.time);
  const [endDate, setEndDate] = useState(_endParts.date);
  const [endTime, setEndTime] = useState(_endParts.time);

  // Komposisi (mode custom/Latihan) — keyed by skill code.
  // Ujian lama → dari sections tersimpan; ujian Latihan baru → preset jenis tes.
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    if (initial?.sections?.length) {
      const init: Record<string, number> = {};
      initial.sections.forEach((s) => {
        init[s.section] = s.target_count;
      });
      return init;
    }
    return { ...(initialCounts ?? {}) };
  });

  // Sumber soal (pool units)
  const [poolUnits, setPoolUnits] = useState<ExamPoolUnit[]>(initial?.pool_units ?? []);

  // Peserta
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.participants?.map((p) => p.user_id) ?? [],
  );

  const toggleSection = (section: string, enabled: boolean) => {
    setCounts((prev) => {
      const next = { ...prev };
      if (enabled) next[section] = prev[section] ?? 5;
      else delete next[section];
      return next;
    });
  };

  const setSectionCount = (section: string, count: number) => {
    setCounts((prev) => ({ ...prev, [section]: count }));
  };

  // ─── Bagian efektif (menentukan komposisi, sumber, validasi) ───
  // Full test: preset dari skill (terkunci). Custom: dari pilihan admin.
  const targetByCode: Record<string, number> = isFull
    ? Object.fromEntries(skills.map((s) => [s.code, s.full_test_count]))
    : counts;
  const activeSkillCodes: string[] = isFull
    ? skills.map((s) => s.code)
    : skills.filter((s) => counts[s.code] !== undefined).map((s) => s.code);
  const targetsById = activeSkillCodes.reduce<Partial<Record<ExamSectionId, number>>>((acc, code) => {
    acc[code as ExamSectionId] = targetByCode[code] ?? 0;
    return acc;
  }, {});

  const buildPayload = (): Record<string, unknown> => ({
    title: title.trim(),
    description: description.trim() || null,
    duration_minutes: Number(duration),
    test_type: testTypeCode,
    exam_mode: examMode,
    show_review: showReview,
    scoring_scheme_id: null,
    passing_value: passingValue === '' ? null : Number(passingValue),
    allow_retake: allowRetake,
    status: 'draft',
    starts_at: scheduled ? partsToIso(startDate, startTime) : null,
    ends_at: scheduled ? partsToIso(endDate, endTime) : null,
    sections: activeSkillCodes.map((code) => ({
      section: code,
      target_count: targetByCode[code],
    })),
    pool_units: poolUnits,
    participant_ids: participantIds,
    // Optimistic concurrency: server tolak 409 bila versi ini tertinggal.
    ...(isEditing && initial ? { version: initial.version } : {}),
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
    if (activeSkillCodes.length === 0) {
      toast.error('Tentukan komposisi: pilih minimal satu bagian & jumlah soal.');
      setStep(1);
      return false;
    }
    if (participantIds.length === 0) {
      toast.error('Pilih minimal satu peserta.');
      setStep(3);
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
    // Draf boleh belum lengkap — cukup ada nama untuk mengidentifikasi.
    if (!title.trim()) {
      toast.error('Nama ujian wajib diisi untuk menyimpan draf.');
      setStep(0);
      return;
    }
    setIsSaving(true);
    try {
      await onSaveDraft(buildPayload());
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setIsPublishing(true);
    try {
      await onPublish(buildPayload());
    } finally {
      setIsPublishing(false);
    }
  };

  const isLastStep = step === STEP_LABELS.length - 1;

  const enabledSections = activeSkillCodes as ExamSectionId[];
  const sectionsInput = activeSkillCodes.map((code) => ({
    section: code as ExamSectionId,
    target_count: targetByCode[code],
  }));

  // ─── Kelengkapan per step (gating strict) ───
  const detailComplete = !!title.trim() && Number(duration) >= 1;
  const komposisiComplete = activeSkillCodes.length > 0;
  const pesertaComplete = participantIds.length > 0;

  // Sumber Soal lengkap = stok cukup untuk tiap bagian (dicek via availability).
  const sectionsKey = JSON.stringify(sectionsInput);
  const poolKey = JSON.stringify(poolUnits);
  const [srcResult, setSrcResult] = useState<{ key: string; avail: SectionAvailability[] } | null>(null);
  useEffect(() => {
    if (step !== 2) return;
    const key = `${sectionsKey}|${poolKey}`;
    let active = true;
    fetchPreview({ sections: sectionsInput, pool_units: poolUnits })
      .then((res) => {
        if (active) setSrcResult({ key, avail: res.sections });
      })
      .catch(() => {
        if (active) setSrcResult({ key, avail: [] });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sectionsKey, poolKey]);
  const srcKey = `${sectionsKey}|${poolKey}`;
  const sumberChecking = step === 2 && (!srcResult || srcResult.key !== srcKey);
  const sumberComplete =
    !!srcResult && srcResult.key === srcKey && srcResult.avail.length > 0 && srcResult.avail.every((s) => s.enough);

  const stepComplete = [detailComplete, komposisiComplete, sumberComplete, pesertaComplete, true];
  const canReach = (idx: number) => stepComplete.slice(0, idx).every(Boolean);
  const currentComplete = stepComplete[step];

  // Centang stepper: mode buat baru = berbasis posisi + gating; mode edit = berbasis
  // DATA (Sumber Soal opsional → dianggap selesai; kesiapan stok tampil di Review).
  const stepDone = [detailComplete, komposisiComplete, true, pesertaComplete, true];
  const steps: WorkflowStep[] = STEP_LABELS.map((label, i) => {
    let state: WorkflowStep['state'];
    if (i === step) state = 'active';
    else if (isEditing) state = stepDone[i] ? 'complete' : 'locked';
    else state = i < step ? 'complete' : 'locked';
    return { label, state };
  });

  const STEP_HINT = [
    'Isi Nama Ujian, Total Waktu, dan Skema Penilaian untuk lanjut.',
    'Tentukan minimal satu bagian dengan jumlah soal.',
    sumberChecking ? 'Mengecek ketersediaan soal…' : 'Stok soal belum cukup untuk sebagian bagian. Tambahkan soal Tayang di Bank Soal atau kurangi target.',
    'Pilih minimal satu peserta.',
    '',
  ];
  const scheduleLabel =
    !scheduled || !startDate
      ? 'Kapan saja'
      : `${startDate} ${startTime || '00:00'} WIB${endDate ? ` – ${endDate} ${endTime || '00:00'} WIB` : ''}`;

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
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-lg font-extrabold text-slate-800">
            {isEditing ? 'Edit Paket Ujian' : 'Buat Paket Ujian'}
          </h2>
          <Badge variant="info" className="font-bold gap-1">
            {testType?.name ?? testTypeCode.toUpperCase()}
          </Badge>
          <Badge variant={isFull ? 'success' : 'neutral'} className="font-bold gap-1">
            {isFull ? (
              <>
                <Lock className="w-3 h-3" /> Tes Lengkap
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" /> Latihan
              </>
            )}
          </Badge>
        </div>
        <WorkflowStepper
          steps={steps}
          title="Langkah"
          className=""
          unlockAll={isEditing}
          onStepClick={(idx) => {
            if (isEditing || idx <= step || canReach(idx)) setStep(idx);
            else toast.error('Selesaikan langkah sebelumnya dulu.');
          }}
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
            testTypeCode={testTypeCode}
            examMode={examMode}
            passingValue={passingValue}
            setPassingValue={setPassingValue}
            showReview={showReview}
            setShowReview={setShowReview}
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
            skills={skills}
            mode={examMode}
            counts={counts}
            onToggle={toggleSection}
            onCountChange={setSectionCount}
          />
        )}
        {step === 2 && (
          <StepSource
            enabledSections={enabledSections}
            targets={targetsById}
            testType={testTypeCode}
            exact={isFull}
            poolUnits={poolUnits}
            onChange={setPoolUnits}
          />
        )}
        {step === 3 && (
          <StepParticipants selectedIds={participantIds} onChange={setParticipantIds} />
        )}
        {step === 4 && (
          <StepReview
            title={title}
            testTypeName={testType?.name ?? testTypeCode.toUpperCase()}
            examMode={examMode}
            testTypeCode={testTypeCode}
            durationMinutes={Number(duration) || 0}
            passingValue={passingValue === '' ? null : Number(passingValue)}
            scheduleLabel={scheduleLabel}
            allowRetake={allowRetake}
            participantsCount={participantIds.length}
            sections={sectionsInput}
            poolUnits={poolUnits}
            fetchPreview={fetchPreview}
          />
        )}
      </div>

      {/* Hint kelengkapan step (hanya mode buat baru; edit = navigasi bebas) */}
      {!isEditing && !isLastStep && !currentComplete && (
        <div className="flex items-center gap-2 -mb-2 text-xs text-amber-700 bg-amber-50/70 border border-amber-100 rounded-xl px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>{STEP_HINT[step]}</span>
        </div>
      )}

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
            disabled={isPublishing}
            className="font-bold gap-2"
            leftIcon={<Check className="w-4 h-4" />}
          >
            Simpan Draf
          </Button>
          {!isLastStep ? (
            <Button
              variant="primary"
              onClick={() => (isEditing || currentComplete) && setStep((s) => s + 1)}
              disabled={!isEditing && !currentComplete}
              loading={!isEditing && sumberChecking}
              className="font-bold gap-2"
            >
              Lanjut
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handlePublish}
              loading={isPublishing}
              disabled={isSaving}
              className="font-bold gap-2"
              leftIcon={<Rocket className="w-4 h-4" />}
            >
              Tayangkan
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
