'use client';

import React, { useState } from 'react';
import { Layers, FileText, Music, Eye, Shuffle, Eraser, CheckCircle2, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

/** Fisher–Yates — salinan teracak (tak mengubah array asal). */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [previewPassage, setPreviewPassage] = useState<Passage | null>(null);
  const [diffFilter, setDiffFilter] = useState<string>('all'); // 'all' = semua kesulitan
  const [expanded, setExpanded] = useState<Set<string>>(new Set()); // id materi yang dibuka

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
  const childrenOf = (pid: string) =>
    questions.filter((q) => q.passage_id === pid).sort((a, b) => a.sort_order - b.sort_order);
  /** Distribusi kesulitan soal anak materi, urut easy→medium→hard. */
  const diffCounts = (pid: string) => {
    const c: Record<DiffKey, number> = { easy: 0, medium: 0, hard: 0 };
    for (const q of childrenOf(pid)) if (q.difficulty in c) c[q.difficulty as DiffKey] += 1;
    return c;
  };

  // ── Selektor pilihan (3 bentuk unit: materi utuh / soal tunggal / subset materi) ──
  const hasWholePassage = (pid: string) =>
    poolUnits.some((u) => u.passage_id === pid && u.question_id == null);
  const hasStandalone = (qid: string) =>
    poolUnits.some((u) => u.passage_id == null && u.question_id === qid);
  /** Id soal terpilih dalam sebuah materi (materi utuh legacy → dianggap semua anaknya). */
  const selectedQidsOf = (pid: string): string[] =>
    hasWholePassage(pid)
      ? childrenOf(pid).map((q) => q.id)
      : poolUnits
          .filter((u) => u.passage_id === pid && u.question_id != null)
          .map((u) => u.question_id as string);

  // ── Kuota per bagian (dihitung dalam JUMLAH SOAL Tayang) ──
  const target = (activeSection ? targets[activeSection] : undefined) ?? 0;
  const selectedQuestions =
    standalone.filter((q) => hasStandalone(q.id)).length +
    availablePassages.reduce((n, p) => n + selectedQidsOf(p.id).length, 0);
  const remaining = Math.max(0, target - selectedQuestions);

  /** Ganti seluruh pilihan sebuah materi dengan unit per-soal (buang unit lama materi itu). */
  const setPassageSelection = (pid: string, qids: string[]) => {
    const others = poolUnits.filter((u) => u.passage_id !== pid);
    onChange([...others, ...qids.map((qid) => ({ passage_id: pid, question_id: qid }))]);
  };
  /** Toggle satu soal di dalam materi (hormati sisa kuota). */
  const togglePQ = (pid: string, qid: string) => {
    const sel = selectedQidsOf(pid);
    if (sel.includes(qid)) setPassageSelection(pid, sel.filter((x) => x !== qid));
    else if (remaining >= 1) setPassageSelection(pid, [...sel, qid]);
  };
  /** Toggle materi: kosongkan bila penuh; jika tidak, isi soal sebanyak muat sisa kuota. */
  const toggleWholePassage = (p: Passage) => {
    const all = childrenOf(p.id).map((q) => q.id);
    const sel = selectedQidsOf(p.id);
    if (all.length > 0 && sel.length >= all.length) {
      setPassageSelection(p.id, []);
    } else {
      const unsel = all.filter((id) => !sel.includes(id));
      setPassageSelection(p.id, [...sel, ...unsel.slice(0, remaining)]);
    }
  };
  const toggleExpand = (pid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  /** Toggle soal tunggal (standalone). */
  const toggleStandalone = (qid: string) => {
    if (hasStandalone(qid)) {
      onChange(poolUnits.filter((u) => !(u.passage_id == null && u.question_id === qid)));
    } else if (remaining >= 1) {
      onChange([...poolUnits, { passage_id: null, question_id: qid }]);
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

  // Tampilan terfilter kesulitan (pilihan tetap tersimpan di pool meski tersembunyi).
  const visibleStandalone = standalone.filter(matchDiff);
  const visiblePassages = availablePassages.filter(
    (p) => diffFilter === 'all' || childrenOf(p.id).some(matchDiff),
  );

  // ── #1/#2 Pilih Acak & Kosongkan (per bagian aktif) ──
  const sectionPassageIds = new Set(passages.map((p) => p.id));
  const sectionQuestionIds = new Set(standalone.map((q) => q.id));
  const isSectionUnit = (u: ExamPoolUnit) =>
    (u.passage_id != null && sectionPassageIds.has(u.passage_id)) ||
    (u.question_id != null && sectionQuestionIds.has(u.question_id));

  /** Isi sisa kuota dengan SOAL acak (per-soal → bisa pas) dari yang tampil (hormati filter). */
  const fillRandom = () => {
    if (remaining <= 0) return;
    const cands: ExamPoolUnit[] = [];
    for (const p of visiblePassages) {
      const sel = new Set(selectedQidsOf(p.id));
      for (const q of childrenOf(p.id)) {
        if (!sel.has(q.id) && matchDiff(q)) cands.push({ passage_id: p.id, question_id: q.id });
      }
    }
    for (const q of visibleStandalone) {
      if (!hasStandalone(q.id)) cands.push({ passage_id: null, question_id: q.id });
    }
    const adds = shuffled(cands).slice(0, remaining);
    if (adds.length) onChange([...poolUnits, ...adds]);
  };

  /** Hapus semua pilihan bagian aktif (bagian lain tak tersentuh). */
  const clearSection = () => onChange(poolUnits.filter((u) => !isSectionUnit(u)));

  // Indikator target dinamis (menggantikan badge "Acak Dari Semua" yang redundan).
  const indicator: { text: string; tone: 'neutral' | 'warning' | 'success'; done: boolean } =
    selectedQuestions === 0
      ? { text: `Target ${target} soal`, tone: 'neutral', done: false }
      : exact
        ? selectedQuestions === target
          ? { text: `${target} / ${target} soal · pas`, tone: 'success', done: true }
          : { text: `${selectedQuestions} / ${target} · perlu tepat ${target}`, tone: 'warning', done: false }
        : remaining === 0
          ? { text: `${selectedQuestions} / ${target} soal · penuh`, tone: 'success', done: true }
          : { text: `${selectedQuestions} / ${target} soal · kurang ${remaining}`, tone: 'warning', done: false };

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

      {/* Toolbar 1 baris: filter kesulitan (kiri) · aksi + indikator (kanan) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ToggleGroup
          size="sm"
          options={DIFF_OPTIONS}
          value={diffFilter}
          onChange={(v) => setDiffFilter(v || 'all')}
        />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={fillRandom}
            disabled={remaining <= 0}
            title={
              remaining <= 0
                ? 'Kuota bagian ini sudah penuh'
                : `Pilih ${remaining} soal acak dari yang tampil`
            }
            className="font-bold gap-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Pilih Acak
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSection}
            disabled={selectedQuestions === 0}
            className="font-bold gap-1.5"
          >
            <Eraser className="w-3.5 h-3.5" />
            Kosongkan
          </Button>
          <Badge variant={indicator.tone} className="text-[10px] font-bold gap-1 whitespace-nowrap">
            {indicator.done && <CheckCircle2 className="w-3 h-3" />}
            {indicator.text}
          </Badge>
        </div>
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
          {/* Materi — bisa pilih sebagian soal (expand) */}
          {visiblePassages.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Materi
                <span className="font-normal text-slate-400">· klik untuk pilih sebagian soal</span>
              </p>
              <div className="flex flex-col gap-2">
                {visiblePassages.map((p) => {
                  const kids = childrenOf(p.id);
                  const sel = selectedQidsOf(p.id);
                  const selSet = new Set(sel);
                  const allSel = kids.length > 0 && sel.length >= kids.length;
                  const someSel = sel.length > 0 && !allSel;
                  const isOpen = expanded.has(p.id);
                  const dc = diffCounts(p.id);
                  const visKids = kids.filter((q) => matchDiff(q) || selSet.has(q.id));
                  return (
                    <div key={p.id} className="rounded-xl border border-slate-100 overflow-hidden">
                      {/* Header materi */}
                      <div className="flex items-center gap-3 p-3">
                        <Checkbox
                          checked={allSel}
                          indeterminate={someSel}
                          onChange={() => toggleWholePassage(p)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          {!p.content ? (
                            <Music className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 line-clamp-2">
                              {clean(p.content || '') || 'Audio Listening'}
                            </p>
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
                          <Badge
                            variant={allSel ? 'success' : someSel ? 'info' : 'neutral'}
                            className="text-[10px] font-bold shrink-0"
                          >
                            {sel.length}/{kids.length} soal
                          </Badge>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Daftar soal di dalam materi */}
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 flex flex-col gap-1">
                          {visKids.map((q) => {
                            const qChecked = selSet.has(q.id);
                            const qDisabled = !qChecked && remaining < 1;
                            return (
                              <div
                                key={q.id}
                                title={qDisabled ? `Kuota bagian ini sudah penuh (${target} soal)` : undefined}
                                className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
                                  qDisabled ? 'opacity-50' : 'hover:bg-white'
                                }`}
                              >
                                <Checkbox
                                  size="sm"
                                  checked={qChecked}
                                  disabled={qDisabled}
                                  onChange={() => togglePQ(p.id, q.id)}
                                />
                                <span className="text-[11px] font-bold text-slate-400 tabular-nums w-5 shrink-0 text-center">
                                  {kids.indexOf(q) + 1}
                                </span>
                                <p className="text-sm text-slate-700 line-clamp-1 flex-1 min-w-0">
                                  {clean(q.question_text)}
                                </p>
                                <DifficultyBadge difficulty={q.difficulty} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewPassage(p);
                                    setPreviewQuestion(q);
                                  }}
                                  title="Pratinjau soal"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors shrink-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
                  const checked = hasStandalone(q.id);
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
                      onChange={() => toggleStandalone(q.id)}
                    />
                    <p className="text-sm font-medium text-slate-700 line-clamp-1 flex-1 min-w-0">
                      {clean(q.question_text)}
                    </p>
                    <DifficultyBadge difficulty={q.difficulty} />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPassage(null);
                        setPreviewQuestion(q);
                      }}
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
        onClose={() => {
          setPreviewQuestion(null);
          setPreviewPassage(null);
        }}
        question={previewQuestion}
        passage={previewPassage}
      />
    </div>
  );
};
