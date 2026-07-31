'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Plus, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { useTestTypes } from '@/features/test-types/useTestTypes';
import type { Rubric, RubricPayload } from './useRubrics';

/** Batasi input skor ke angka desimal positif (mis. 9 atau 2.5). */
const decimalFilter = (v: string) => {
  const cleaned = v.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  return parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;
};

let _uid = 0;
const uid = () => `kriteria-${Date.now()}-${_uid++}`;

interface CriterionDraft {
  key: string;
  name: string;
  max_score: string;
  descriptors: string;
}

const emptyCriterion = (): CriterionDraft => ({ key: uid(), name: '', max_score: '', descriptors: '' });

interface RubrikFormModalProps {
  editing: Rubric | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: RubricPayload) => void;
}

/** Form buat/ubah rubrik penilaian manual (esai/writing). */
export function RubrikFormModal({ editing, saving, onClose, onSubmit }: RubrikFormModalProps) {
  const { testTypes } = useTestTypes();

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [testType, setTestType] = useState(editing?.test_type ?? '');
  const [criteria, setCriteria] = useState<CriterionDraft[]>(
    editing?.criteria.length
      ? editing.criteria.map((c) => ({
          key: uid(),
          name: c.name,
          max_score: String(c.max_score ?? ''),
          descriptors: c.descriptors ?? '',
        }))
      : [emptyCriterion()],
  );
  const listEndRef = useRef<HTMLDivElement>(null);

  const setCriterion = (key: string, patch: Partial<CriterionDraft>) =>
    setCriteria((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const addCriterion = () => {
    const row = emptyCriterion();
    setCriteria((prev) => [...prev, row]);
    setTimeout(() => {
      document.getElementById(`crit-name-${row.key}`)?.focus();
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const removeCriterion = (key: string) => setCriteria((prev) => prev.filter((c) => c.key !== key));

  const maxTotal = criteria.reduce((n, c) => n + (parseFloat(c.max_score || '0') || 0), 0);

  const submit = () => {
    if (!name.trim()) return toast.error('Nama rubrik wajib diisi.');

    const clean = criteria
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        max_score: parseFloat(c.max_score || '0') || 0,
        descriptors: c.descriptors.trim() || null,
      }));

    if (clean.length === 0) return toast.error('Tambahkan minimal satu kriteria.');
    if (clean.some((c) => c.max_score <= 0)) {
      return toast.error('Setiap kriteria harus punya skor maksimum lebih dari 0.');
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      test_type: testType || null,
      criteria: clean,
    });
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={editing ? `Ubah — ${editing.name}` : 'Buat Rubrik'}
      icon={<ClipboardCheck className="w-5 h-5 text-white" />}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving} className="font-bold">
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} className="font-bold">
            {editing ? 'Simpan Perubahan' : 'Simpan Rubrik'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── Info dasar ── */}
        <div className="flex flex-col gap-4">
          <Input
            label="Nama rubrik"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. IELTS Writing Task 2"
          />
          <Input
            label="Deskripsi singkat (opsional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="mis. Rubrik penilaian esai argumentatif"
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Jenis tes (opsional)</label>
            <Select value={testType} onChange={(e) => setTestType(e.target.value)}>
              <option value="">Umum — lintas jenis tes</option>
              {testTypes.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── Kriteria ── */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-brand" /> Kriteria Penilaian
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Aspek yang dinilai (mis. Task Achievement, Coherence). Satu kriteria = penilaian holistik.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
              Maks total {maxTotal || 0}
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-3">
            <AnimatePresence initial={false}>
              {criteria.map((c, i) => (
                <motion.div
                  key={c.key}
                  layout
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Kriteria {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCriterion(c.key)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      title="Hapus kriteria"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <Input
                          id={`crit-name-${c.key}`}
                          label="Nama kriteria"
                          value={c.name}
                          onChange={(e) => setCriterion(c.key, { name: e.target.value })}
                          placeholder="mis. Task Achievement"
                        />
                      </div>
                      <Input
                        label="Skor maksimum"
                        value={c.max_score}
                        onChange={(e) => setCriterion(c.key, { max_score: decimalFilter(e.target.value) })}
                        inputMode="decimal"
                        placeholder="mis. 9"
                      />
                    </div>
                    <Textarea
                      label="Deskripsi / band descriptor (opsional)"
                      value={c.descriptors}
                      onChange={(e) => setCriterion(c.key, { descriptors: e.target.value })}
                      placeholder="Panduan skoring untuk kriteria ini (opsional)"
                      rows={2}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={listEndRef} />

            <Button
              variant="secondary"
              onClick={addCriterion}
              leftIcon={<Plus className="w-4 h-4" />}
              className="font-bold self-start"
            >
              Tambah Kriteria
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
