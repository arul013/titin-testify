'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { FeedbackDescriptionEditor } from './FeedbackDescriptionEditor';
import { CATEGORY_ORDER, PRIORITY_ORDER, CATEGORY_META, PRIORITY_META } from './taxonomy';
import type { Category, Priority } from './taxonomy';
import type { FeedbackItem, FeedbackInput } from './useFeedback';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Item yang diedit; null = mode buat baru. */
  editing: FeedbackItem | null;
  onSubmit: (input: FeedbackInput) => Promise<unknown>;
}

export const FeedbackFormModal: React.FC<Props> = ({ open, onClose, editing, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [priority, setPriority] = useState<Priority>('medium');
  const [saving, setSaving] = useState(false);

  // Isi/segarkan field saat modal dibuka atau item yang diedit berubah — pola
  // "reset state saat render" (bukan efek) agar bebas cascading-render lint.
  const formKey = open ? editing?.id ?? 'new' : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (open && formKey !== syncedKey) {
    setSyncedKey(formKey);
    setTitle(editing?.title ?? '');
    setDescription(editing?.description ?? '');
    setCategory(editing?.category ?? 'other');
    setPriority(editing?.priority ?? 'medium');
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Judul wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description, category, priority });
      toast.success(editing ? 'Item diperbarui.' : 'Item ditambahkan.');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Ubah Masukan' : 'Tambah Masukan'}
      description="Catat perbaikan, perubahan logic, atau fitur baru untuk aplikasi ini."
      size="2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? 'Simpan Perubahan' : 'Tambahkan'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Judul"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ringkas: apa yang perlu diperbaiki / ditambahkan"
          maxLength={200}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Kategori"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
            ))}
          </Select>
          <Select
            label="Prioritas"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>{PRIORITY_META[p].label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Deskripsi lengkap</label>
          <FeedbackDescriptionEditor value={description} onChange={setDescription} />
        </div>
      </div>
    </Modal>
  );
};
