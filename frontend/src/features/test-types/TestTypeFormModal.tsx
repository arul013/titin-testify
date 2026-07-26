'use client';

import { useState } from 'react';
import { Layers, Plus, X, GripVertical, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import type { TestType, TestTypeSkill, TestTypeStatus, TestTypePayload } from './useTestTypes';

const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9_]/g, '');

interface SkillDraft {
  code: string;
  name: string;
  scorable: boolean;
  full_test_count: string;
}

const emptySkill = (): SkillDraft => ({ code: '', name: '', scorable: true, full_test_count: '0' });

function toDraft(s: TestTypeSkill): SkillDraft {
  return { code: s.code, name: s.name, scorable: s.scorable, full_test_count: String(s.full_test_count ?? 0) };
}

interface TestTypeFormModalProps {
  editing: TestType | null;
  defaultSortOrder: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: TestTypePayload) => void;
}

/** Form buat/ubah jenis tes + editor skill & preset full test. */
export function TestTypeFormModal({
  editing,
  defaultSortOrder,
  saving,
  onClose,
  onSubmit,
}: TestTypeFormModalProps) {
  const [code, setCode] = useState(editing?.code ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [statusVal, setStatusVal] = useState<TestTypeStatus>(editing?.status ?? 'active');
  const [allowCustom, setAllowCustom] = useState(editing?.allow_custom ?? true);
  const [skills, setSkills] = useState<SkillDraft[]>(
    editing?.skills.length ? editing.skills.map(toDraft) : [emptySkill()],
  );

  const setSkill = (i: number, patch: Partial<SkillDraft>) =>
    setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSkill = () => setSkills((prev) => [...prev, emptySkill()]);
  const removeSkill = (i: number) => setSkills((prev) => prev.filter((_, idx) => idx !== i));

  const totalFull = skills.reduce((n, s) => n + (parseInt(s.full_test_count || '0', 10) || 0), 0);

  const submit = () => {
    if (!editing && !code.trim()) return toast.error('Kode jenis tes wajib diisi.');
    if (!name.trim()) return toast.error('Nama jenis tes wajib diisi.');

    const cleanSkills: TestTypeSkill[] = skills
      .filter((s) => s.code.trim() && s.name.trim())
      .map((s, idx) => ({
        code: s.code.trim(),
        name: s.name.trim(),
        scorable: s.scorable,
        full_test_count: parseInt(s.full_test_count || '0', 10) || 0,
        sort_order: (idx + 1) * 10,
      }));

    const codes = cleanSkills.map((s) => s.code);
    if (new Set(codes).size !== codes.length) return toast.error('Kode skill tidak boleh sama.');

    onSubmit({
      ...(editing ? {} : { code: code.trim() }),
      name: name.trim(),
      description: description.trim() || null,
      status: statusVal,
      allow_custom: allowCustom,
      sort_order: editing ? editing.sort_order : defaultSortOrder,
      skills: cleanSkills,
    });
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={editing ? `Ubah Jenis Tes — ${editing.name}` : 'Tambah Jenis Tes'}
      icon={<Layers className="w-5 h-5 text-brand" />}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving} className="font-bold">
            Batal
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} className="font-bold">
            {editing ? 'Simpan Perubahan' : 'Buat Jenis Tes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Kode (slug)"
            value={code}
            onChange={(e) => setCode(slugify(e.target.value))}
            placeholder="mis. itp"
            disabled={!!editing}
            containerClassName={editing ? 'opacity-60' : ''}
          />
          <Input label="Nama" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. TOEFL ITP" />
        </div>

        <Input
          label="Deskripsi (opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Keterangan singkat jenis tes"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
            <Select value={statusVal} onChange={(e) => setStatusVal(e.target.value as TestTypeStatus)}>
              <option value="active">Aktif (bisa dipilih)</option>
              <option value="soon">Soon (badge, belum bisa dipakai)</option>
              <option value="disabled">Nonaktif (disembunyikan)</option>
            </Select>
          </div>
          <div className="pb-2">
            <Checkbox
              checked={allowCustom}
              onChange={setAllowCustom}
              label="Izinkan ujian mode Custom berbasis jenis ini"
            />
          </div>
        </div>

        {/* Skills editor */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-700 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-brand" /> Skill & Preset Full Test
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Total soal full test: <strong className="text-slate-600">{totalFull}</strong>
              </p>
            </div>
            <Button variant="secondary" onClick={addSkill} leftIcon={<Plus className="w-4 h-4" />} className="font-bold">
              Tambah Skill
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-2.5 px-2.5 mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            <span className="col-span-1" />
            <span className="col-span-3">Kode</span>
            <span className="col-span-4">Nama</span>
            <span className="col-span-2 text-center">Jml Full</span>
            <span className="col-span-1 text-center">Skor</span>
            <span className="col-span-1" />
          </div>

          <div className="flex flex-col gap-2.5">
            {skills.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-2.5 items-center bg-slate-50/60 border border-slate-100 rounded-xl p-2.5"
              >
                <GripVertical className="col-span-1 w-4 h-4 text-slate-300 mx-auto" />
                <div className="col-span-3">
                  <Input
                    value={s.code}
                    onChange={(e) => setSkill(i, { code: slugify(e.target.value) })}
                    placeholder="listening"
                    className="text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    value={s.name}
                    onChange={(e) => setSkill(i, { name: e.target.value })}
                    placeholder="Nama skill"
                    className="text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={s.full_test_count}
                    onChange={(e) => setSkill(i, { full_test_count: onlyDigits(e.target.value) })}
                    inputMode="numeric"
                    placeholder="0"
                    className="text-xs text-center"
                  />
                </div>
                <div
                  className="col-span-1 flex justify-center"
                  title="MCQ auto-skor? (matikan untuk Speaking/Writing)"
                >
                  <Checkbox checked={s.scorable} onChange={(v) => setSkill(i, { scorable: v })} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeSkill(i)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Hapus skill"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-3">
                Belum ada skill. Klik &ldquo;Tambah Skill&rdquo;.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
