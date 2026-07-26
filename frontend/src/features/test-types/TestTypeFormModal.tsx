'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plus, Trash2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import type { TestType, TestTypeSkill, TestTypeStatus, TestTypePayload } from './useTestTypes';

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');
const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

let _uid = 0;
const uid = () => `bagian-${Date.now()}-${_uid++}`;

interface SkillDraft {
  key: string;
  code: string; // kode asli (dipertahankan utk skill lama; kosong utk baru → auto dari nama)
  name: string;
  scorable: boolean;
  full_test_count: string;
}

const emptySkill = (): SkillDraft => ({
  key: uid(),
  code: '',
  name: '',
  scorable: true,
  full_test_count: '0',
});

function toDraft(s: TestTypeSkill): SkillDraft {
  return {
    key: uid(),
    code: s.code,
    name: s.name,
    scorable: s.scorable,
    full_test_count: String(s.full_test_count ?? 0),
  };
}

interface TestTypeFormModalProps {
  editing: TestType | null;
  defaultSortOrder: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: TestTypePayload) => void;
}

/** Form buat/ubah jenis tes + bagian tes (non-jargon, ramah user non-teknis). */
export function TestTypeFormModal({
  editing,
  defaultSortOrder,
  saving,
  onClose,
  onSubmit,
}: TestTypeFormModalProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [statusVal, setStatusVal] = useState<TestTypeStatus>(editing?.status ?? 'active');
  const [skills, setSkills] = useState<SkillDraft[]>(
    editing?.skills.length ? editing.skills.map(toDraft) : [emptySkill()],
  );
  const listEndRef = useRef<HTMLDivElement>(null);

  const setSkill = (key: string, patch: Partial<SkillDraft>) =>
    setSkills((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const addSkill = () => {
    const row = emptySkill();
    setSkills((prev) => [...prev, row]);
    // Fokus + gulir ke bagian baru agar user tahu ada penambahan.
    setTimeout(() => {
      document.getElementById(`skill-name-${row.key}`)?.focus();
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const removeSkill = (key: string) => setSkills((prev) => prev.filter((s) => s.key !== key));

  const totalFull = skills.reduce((n, s) => n + (parseInt(s.full_test_count || '0', 10) || 0), 0);

  const submit = () => {
    if (!name.trim()) return toast.error('Nama jenis tes wajib diisi.');

    const cleanSkills: TestTypeSkill[] = skills
      .filter((s) => s.name.trim())
      .map((s, idx) => ({
        code: (s.code || slugify(s.name)).trim(),
        name: s.name.trim(),
        scorable: s.scorable,
        full_test_count: parseInt(s.full_test_count || '0', 10) || 0,
        sort_order: (idx + 1) * 10,
      }));

    const codes = cleanSkills.map((s) => s.code);
    if (new Set(codes).size !== codes.length) {
      return toast.error('Ada nama bagian yang sama — beri nama yang berbeda.');
    }

    onSubmit({
      ...(editing ? {} : { code: slugify(name) }),
      name: name.trim(),
      description: description.trim() || null,
      status: statusVal,
      allow_custom: true,
      sort_order: editing ? editing.sort_order : defaultSortOrder,
      skills: cleanSkills,
    });
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={editing ? `Ubah — ${editing.name}` : 'Tambah Jenis Ujian'}
      icon={<GraduationCap className="w-5 h-5 text-white" />}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving} className="font-bold">
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} className="font-bold">
            {editing ? 'Simpan Perubahan' : 'Simpan Jenis Ujian'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ── Info dasar ── */}
        <div className="flex flex-col gap-4">
          <Input
            label="Nama jenis tes"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mis. TOEFL ITP"
          />
          <Input
            label="Deskripsi singkat (opsional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="mis. Tes TOEFL untuk kelas institusi"
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Ketersediaan</label>
            <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value as TestTypeStatus)}>
              <option value="active">Aktif — bisa dipakai membuat ujian</option>
              <option value="soon">Segera hadir — tampil, belum bisa dipakai</option>
              <option value="disabled">Disembunyikan</option>
            </Select>
          </div>
        </div>

        {/* ── Bagian tes ── */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-brand" /> Bagian Tes
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Bagian yang diujikan (mis. Listening, Reading) beserta jumlah soalnya.
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
              Total {totalFull} soal
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-3">
            <AnimatePresence initial={false}>
              {skills.map((s, i) => (
                <motion.div
                  key={s.key}
                  layout
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      Bagian {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSkill(s.key)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                      title="Hapus bagian"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Input
                      id={`skill-name-${s.key}`}
                      label="Nama bagian"
                      value={s.name}
                      onChange={(e) => setSkill(s.key, { name: e.target.value })}
                      placeholder="mis. Listening Comprehension"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <Input
                        label="Jumlah soal"
                        value={s.full_test_count}
                        onChange={(e) => setSkill(s.key, { full_test_count: onlyDigits(e.target.value) })}
                        inputMode="numeric"
                        placeholder="0"
                      />
                      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 flex items-center">
                        <Checkbox
                          checked={s.scorable}
                          onChange={(v) => setSkill(s.key, { scorable: v })}
                          label="Soal pilihan ganda"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={listEndRef} />

            <Button
              variant="secondary"
              onClick={addSkill}
              leftIcon={<Plus className="w-4 h-4" />}
              className="font-bold self-start"
            >
              Tambah Bagian
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
