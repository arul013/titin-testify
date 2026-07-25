'use client';

import { useState } from 'react';
import { Gauge, Plus, Trash2, Pencil, Lock, Calculator } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useScoringSchemes, type ScoringScheme, type ComputeResult } from '@/features/scoring/hooks/useScoringSchemes';

const SECTIONS = [
  { id: 'listening', label: 'Listening' },
  { id: 'structure', label: 'Structure' },
  { id: 'written_expression', label: 'Written Expression' },
  { id: 'reading', label: 'Reading' },
];

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');
const digitsDot = (v: string) => v.replace(/[^0-9.]/g, '');

export default function SkemaPenilaianPage() {
  const { schemes, isLoading, createScheme, renameScheme, deleteScheme, computeScore } = useScoringSchemes();

  // ─── Buat / ubah skema ───
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScoringScheme | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ScoringScheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => { setEditing(null); setName(''); setFormOpen(true); };
  const openEdit = (s: ScoringScheme) => { setEditing(s); setName(s.name); setFormOpen(true); };

  const submitForm = async () => {
    if (!name.trim()) { toast.error('Nama skema wajib diisi.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await renameScheme(editing.id, name.trim());
        toast.success('Skema diperbarui.');
      } else {
        await createScheme(name.trim());
        toast.success('Skema custom dibuat.');
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan skema.'));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteScheme(pendingDelete.id);
      toast.success('Skema dihapus.');
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus skema.'));
    } finally {
      setDeleting(false);
    }
  };

  // ─── Kalkulator skor ───
  const [calcSchemeId, setCalcSchemeId] = useState('');
  const [rows, setRows] = useState<Record<string, { total: string; correct: string }>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, { total: '', correct: '' }])),
  );
  const [passing, setPassing] = useState('');
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<ComputeResult | null>(null);

  const effectiveSchemeId = calcSchemeId || schemes[0]?.id || '';

  const runCompute = async () => {
    if (!effectiveSchemeId) { toast.error('Pilih skema dulu.'); return; }
    const sections = SECTIONS.map((s) => ({
      section: s.id,
      total: parseInt(rows[s.id].total || '0', 10),
      correct: parseInt(rows[s.id].correct || '0', 10),
    })).filter((s) => s.total > 0);
    if (sections.length === 0) { toast.error('Isi minimal satu bagian (jumlah soal > 0).'); return; }
    setComputing(true);
    setResult(null);
    try {
      const res = await computeScore(effectiveSchemeId, sections, passing.trim() ? parseFloat(passing) : null);
      setResult(res);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghitung skor.'));
    } finally {
      setComputing(false);
    }
  };

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<Gauge />}
          title="Skema Penilaian"
          subtitle="Kelola cara penilaian ujian (persentase custom, dan tes standar). Termasuk alat hitung skor."
          actions={
            <Button variant="primary" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Buat Skema
            </Button>
          }
        />
      }
    >
      {/* Daftar skema */}
      <Card className="p-6 flex flex-col gap-4">
        <h2 className="text-sm font-extrabold text-slate-700">Daftar Skema</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : schemes.length === 0 ? (
          <EmptyState icon={<Gauge />} title="Belum ada skema" description="Buat skema custom untuk mulai menilai." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {schemes.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                    <Badge variant={s.family === 'standard' ? 'info' : 'neutral'} className="text-[10px] font-bold uppercase">
                      {s.family === 'standard' ? 'Standar' : 'Custom %'}
                    </Badge>
                    {s.is_builtin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Lock className="w-3 h-3" /> Bawaan
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{s.test_type}</p>
                </div>
                {!s.is_builtin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openEdit(s)} title="Ubah nama" className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setPendingDelete(s)} title="Hapus" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/40 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Kalkulator skor */}
      <Card className="p-6 flex flex-col gap-4">
        <h2 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600" /> Hitung Skor
        </h2>
        <p className="text-[11px] text-slate-400">
          Masukkan jumlah soal & benar per bagian → skor otomatis dihitung menurut skema terpilih.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Skema</label>
            <Select value={effectiveSchemeId} onChange={(e) => setCalcSchemeId(e.target.value)}>
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Nilai Kelulusan (opsional)</label>
            <Input
              value={passing}
              inputMode="decimal"
              onChange={(e) => setPassing(digitsDot(e.target.value))}
              placeholder="mis. 70 (persen)"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bagian</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Jumlah</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24 text-center">Benar</span>
          </div>
          {SECTIONS.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
              <div className="w-24">
                <Input
                  value={rows[s.id].total}
                  inputMode="numeric"
                  onChange={(e) => setRows((r) => ({ ...r, [s.id]: { ...r[s.id], total: onlyDigits(e.target.value) } }))}
                  placeholder="0"
                />
              </div>
              <div className="w-24">
                <Input
                  value={rows[s.id].correct}
                  inputMode="numeric"
                  onChange={(e) => setRows((r) => ({ ...r, [s.id]: { ...r[s.id], correct: onlyDigits(e.target.value) } }))}
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <Button variant="primary" onClick={runCompute} loading={computing} leftIcon={<Calculator className="w-4 h-4" />}>
            Hitung Skor
          </Button>
        </div>

        {result && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 flex flex-col gap-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Skor</p>
                <p className="text-3xl font-extrabold text-indigo-700">
                  {result.score}
                  {result.scale_unit === 'percent' && <span className="text-lg">%</span>}
                </p>
              </div>
              {result.passed != null && (
                <Badge variant={result.passed ? 'success' : 'danger'} className="font-extrabold uppercase mb-1.5">
                  {result.passed ? 'Lulus' : 'Tidak lulus'}
                </Badge>
              )}
              <span className="text-xs text-slate-500 mb-1.5">
                {result.total_correct} / {result.total_questions} benar
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.per_section.map((ps) => {
                const label = SECTIONS.find((x) => x.id === ps.section)?.label ?? ps.section;
                return (
                  <span key={ps.section} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200/70 px-2.5 py-1 text-xs">
                    <span className="font-bold text-slate-600">{label}</span>
                    <span className="text-slate-500">{ps.correct}/{ps.total} · {ps.percent}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Modal buat/ubah skema */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Ubah Skema' : 'Buat Skema Custom'}
        icon={<Gauge className="w-5 h-5" />}
        description={editing ? undefined : 'Skema persentase: skor = % jawaban benar (semua bagian setara).'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button variant="primary" onClick={submitForm} loading={saving}>
              {editing ? 'Simpan' : 'Buat'}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Skema</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kuis Grammar 70%" autoFocus />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Hapus Skema Ini?"
        icon={<Trash2 className="w-4 h-4" />}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={deleting}
        onConfirm={confirmDelete}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          Skema <strong>{pendingDelete?.name}</strong> akan dihapus permanen. Ujian yang memakainya perlu memilih skema lain.
        </p>
      </ConfirmDialog>
    </PageContainer>
  );
}
