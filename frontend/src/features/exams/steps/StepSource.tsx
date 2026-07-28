'use client';

import React, { useState } from 'react';
import { Layers, FileText, Music, Eye, Shuffle, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuestions, usePassages, type Question, type Passage } from '@/features/questions/hooks/useQuestions';
import { QuestionPreview } from '@/features/questions/QuestionPreview';
import { SECTION_LABELS, type ExamPoolUnit, type ExamSectionId } from '../hooks/useExams';

// ── Kesulitan soal (selaras Bank Soal) ──────────────────────────────────
type DiffKey = 'easy' | 'medium' | 'hard';
const DIFF: Record<DiffKey, { label: string; variant: 'success' | 'warning' | 'danger'; dot: string }> = {
  easy: { label: 'Mudah', variant: 'success', dot: 'bg-emerald-500' },
  medium: { label: 'Sedang', variant: 'warning', dot: 'bg-amber-500' },
  hard: { label: 'Sulit', variant: 'danger', dot: 'bg-rose-500' },
};
const DIFF_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'easy', label: 'Mudah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'hard', label: 'Sulit' },
];

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const meta = DIFF[difficulty as DiffKey];
  if (!meta) return null;
  return (
    <Badge variant={meta.variant} className="text-[10px] font-extrabold uppercase shrink-0">
      {meta.label}
    </Badge>
  );
}

interface StepSourceProps {
  enabledSections: ExamSectionId[];
  /** Target jumlah soal per bagian (dari step Komposisi) — batas kuota pemilihan. */
  targets: Partial<Record<ExamSectionId, number>>;
  /** Jenis tes ujian — memfilter Bank Soal agar hanya soal jenis ini yang muncul. */
  testType?: string;
  /** Mode full test → pemilihan harus TEPAT = target (bukan sekadar ≤). */
  exact?: boolean;
  poolUnits: ExamPoolUnit[];
  onChange: (units: ExamPoolUnit[]) => void;
}

/** Bersihkan markup (bold/italic/underline/label) untuk tampilan ringkas. */
function clean(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\[([^\]]+)\]\{[A-Da-d]\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const StepSource: React.FC<StepSourceProps> = ({
  enabledSections,
  targets,
  testType,
  exact = false,
  poolUnits,
  onChange,
}) => {
  const [activeSection, setActiveSection] = useState<ExamSectionId | null>(
    enabledSections[0] ?? null,
  );
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [diffFilter, setDiffFilter] = useState<string>('all'); // 'all' = semua kesulitan

  const section = activeSection ?? undefined;
  const { passages, isLoading: pLoading } = usePassages({
    type: section,
    status: 'published',
    perPage: 100,
    testType,
  });
  const { questions, isLoading: qLoading } = useQuestions({
    section,
    status: 'published',
    perPage: 100,
    testType,
  });
  const standalone = questions.filter((q) => !q.passage_id);

  // Jumlah soal materi yang dipakai ujian = HANYA yang Tayang (soal Draf diabaikan
  // saat rakit ujian). Materi tanpa soal Tayang disembunyikan.
  const pubCount = (p: Passage) => p.published_questions_count ?? 0;
  const availablePassages = passages.filter((p) => pubCount(p) > 0);

  // ── Filter kesulitan (hanya memfilter tampilan, tak mengubah pilihan) ──
  const matchDiff = (q: Question) => diffFilter === 'all' || q.difficulty === diffFilter;
  const childrenOf = (pid: string) => questions.filter((q) => q.passage_id === pid);
  /** Distribusi kesulitan soal anak materi, urut easy→medium→hard. */
  const diffCounts = (pid: string) => {
    const c: Record<DiffKey, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of childrenOf(pid)) if (q.difficulty in c) c[q.difficulty as DiffKey] += 1;
    return c;
  };

  const hasPassage = (id: string) => poolUnits.some((u) => u.passage_id === id);
  const hasQuestion = (id: string) => poolUnits.some((u) => u.question_id === id);

  // ── Kuota per bagian (dihitung dalam JUMLAH SOAL Tayang, bukan unit) ──
  const target = (activeSection ? targets[activeSection] : undefined) ?? 0;
  const selectedQuestions =
    availablePassages.filter((p) => hasPassage(p.id)).reduce((n, p) => n + pubCount(p), 0) +
    standalone.filter((q) => hasQuestion(q.id)).length;
  const remaining = Math.max(0, target - selectedQuestions);

  const togglePassage = (id: string, count: number) => {
    if (hasPassage(id)) {
      onChange(poolUnits.filter((u) => u.passage_id !== id));
    } else if (count <= remaining) {
      onChange([...poolUnits, { passage_id: id, question_id: null }]);
    }
  };
  const toggleQuestion = (id: string) => {
    if (hasQuestion(id)) {
      onChange(poolUnits.filter((u) => u.question_id !== id));
    } else if (remaining >= 1) {
      onChange([...poolUnits, { passage_id: null, question_id: id }]);
    }
  };

  if (enabledSections.length === 0) {
    return (
      <EmptyState
        icon={<Layers />}
        title="Tentukan komposisi dulu"
        description="Pilih bagian & jumlah soal di langkah Komposisi, lalu kembali ke sini untuk (opsional) mempersempit sumber soal."
      />
    );
  }

  const isLoading = pLoading || qLoading;
  const quotaFull = target > 0 && remaining === 0;

  // Tampilan terfilter kesulitan (pilihan tetap tersimpan di pool meski tersembunyi).
  const visibleStandalone = standalone.filter(matchDiff);
  const visiblePassages = availablePassages.filter(
    (p) => diffFilter === 'all' || childrenOf(p.id).some(matchDiff),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        Secara default, soal diambil <strong>acak dari seluruh Bank Soal (Tayang)</strong> untuk tiap
        bagian. Kamu bisa mempersempit ke materi/soal tertentu di bawah (opsional) — maksimal{' '}
        <strong>sebanyak jumlah soal yang ditetapkan di Komposisi</strong> per bagian.
      </p>

      <Tabs
        className="self-start"
        tabs={enabledSections.map((s) => ({ id: s, label: SECTION_LABELS[s] }))}
        value={activeSection ?? ''}
        onChange={(id) => setActiveSection(id as ExamSectionId)}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {activeSection ? SECTION_LABELS[activeSection] : ''}
        </span>
        {selectedQuestions === 0 ? (
          <Badge variant="neutral" className="text-[10px] font-bold gap-1">
            <Shuffle className="w-3 h-3" />
            {exact ? `Acak → tepat ${target} soal` : `Acak dari semua · target ${target} soal`}
          </Badge>
        ) : (
          <Badge
            variant={
              exact
                ? selectedQuestions === target
                  ? 'success'
                  : 'warning'
                : quotaFull
                  ? 'success'
                  : 'info'
            }
            className="text-[10px] font-bold"
          >
            Terpilih {selectedQuestions} / {target} soal
            {exact
              ? selectedQuestions === target
                ? ' · pas'
                : ` · perlu tepat ${target}`
              : remaining > 0
                ? ` · sisa ${remaining}`
                : ' · kuota penuh'}
          </Badge>
        )}
      </div>

      {/* Filter kesulitan (hanya menyaring tampilan) */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Kesulitan
        </span>
        <ToggleGroup
          size="sm"
          options={DIFF_OPTIONS}
          value={diffFilter}
          onChange={(v) => setDiffFilter(v || 'all')}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : availablePassages.length === 0 && standalone.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Belum ada soal Tayang di bagian ini"
          description="Tayangkan soal/materi di Bank Soal agar bisa dipakai, atau biarkan acak."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {/* Materi (passage utuh) */}
          {visiblePassages.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Materi (unit utuh)
              </p>
              <div className="flex flex-col gap-2">
                {visiblePassages.map((p) => {
                  const checked = hasPassage(p.id);
                  const count = pubCount(p);
                  const disabled = !checked && count > remaining;
                  const dc = diffCounts(p.id);
                  return (
                    <label
                      key={p.id}
                      title={
                        disabled
                          ? `Materi ${count} soal melebihi sisa kuota (${remaining} soal)`
                          : undefined
                      }
                      className={`flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-200 cursor-pointer'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onChange={() => togglePassage(p.id, count)}
                      />
                      {!p.content ? (
                        <Music className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 line-clamp-2">
                          {clean(p.content || '') || 'Audio Listening'}
                        </p>
                        {/* Distribusi kesulitan soal di dalam materi */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {(['easy', 'medium', 'hard'] as DiffKey[]).map((k) =>
                            dc[k] > 0 ? (
                              <span key={k} className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                                <span className={`w-1.5 h-1.5 rounded-full ${DIFF[k].dot}`} />
                                {dc[k]} {DIFF[k].label}
                              </span>
                            ) : null,
                          )}
                        </div>
                      </div>
                      <Badge variant="neutral" className="text-[10px] font-bold shrink-0">
                        {count} soal
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Soal tunggal (standalone) */}
          {visibleStandalone.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Soal tunggal
              </p>
              <div className="flex flex-col gap-2">
                {visibleStandalone.map((q) => {
                  const checked = hasQuestion(q.id);
                  const disabled = !checked && remaining < 1;
                  return (
                  <div
                    key={q.id}
                    title={disabled ? `Kuota bagian ini sudah penuh (${target} soal)` : undefined}
                    className={`flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors ${
                      disabled ? 'opacity-50' : 'hover:border-slate-200'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleQuestion(q.id)}
                    />
                    <p className="text-sm font-medium text-slate-700 line-clamp-1 flex-1 min-w-0">
                      {clean(q.question_text)}
                    </p>
                    <DifficultyBadge difficulty={q.difficulty} />
                    <button
                      type="button"
                      onClick={() => setPreviewQuestion(q)}
                      title="Pratinjau soal"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kosong akibat filter kesulitan */}
          {diffFilter !== 'all' &&
            visiblePassages.length === 0 &&
            visibleStandalone.length === 0 && (
              <p className="text-sm text-slate-400 italic py-2">
                Tidak ada soal berkategori <strong>{DIFF[diffFilter as DiffKey]?.label}</strong> di
                bagian ini.
              </p>
            )}
        </div>
      )}

      <QuestionPreview
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
        question={previewQuestion}
        passage={null}
      />
    </div>
  );
};
