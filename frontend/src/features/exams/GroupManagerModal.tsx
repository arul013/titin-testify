'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Users, Plus, UserPlus, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import { useParticipantGroups, type ParticipantGroup } from '@/features/exams/hooks/useParticipantGroups';

interface GroupManagerModalProps {
  open: boolean;
  onClose: () => void;
  /** Peserta yang sedang dipilih di builder (untuk buat/perbarui grup dari pilihan). */
  selectedIds: string[];
  /** Tambahkan anggota grup ke pilihan peserta builder. */
  onAddMembers: (memberIds: string[]) => void;
}

/** Kelola grup/kelas peserta: buat dari pilihan, pakai (tambah ke pilihan), perbarui, hapus. */
export function GroupManagerModal({ open, onClose, selectedIds, onAddMembers }: GroupManagerModalProps) {
  const { groups, isLoading, getGroup, createGroup, updateGroup, deleteGroup } = useParticipantGroups();
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createGroup({ name, member_ids: selectedIds });
      toast.success(`Grup “${name}” dibuat dari ${selectedIds.length} peserta terpilih.`);
      setNewName('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal membuat grup.'));
    } finally {
      setCreating(false);
    }
  };

  const handleUse = async (g: ParticipantGroup) => {
    setBusyId(g.id);
    try {
      const detail = await getGroup(g.id);
      onAddMembers(detail.members.map((m) => m.user_id));
      toast.success(`${detail.members.length} anggota “${g.name}” ditambahkan ke pilihan.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memuat anggota grup.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSync = async (g: ParticipantGroup) => {
    setBusyId(g.id);
    try {
      await updateGroup(g.id, { member_ids: selectedIds });
      toast.success(`Anggota grup “${g.name}” diperbarui ke ${selectedIds.length} peserta terpilih.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memperbarui grup.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (g: ParticipantGroup) => {
    setBusyId(g.id);
    try {
      await deleteGroup(g.id);
      toast.success(`Grup “${g.name}” dihapus.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus grup.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grup / Kelas Peserta"
      icon={<Users className="h-5 w-5 text-white" />}
      size="lg"
    >
      {/* Buat grup dari pilihan saat ini */}
      <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="mb-2.5 text-sm font-bold text-slate-700">Buat grup dari pilihan saat ini</p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama grup (mis. “Kelas IELTS Pagi”)"
            className="flex-1"
          />
          <Button
            variant="primary"
            className="font-bold"
            loading={creating}
            disabled={!newName.trim() || selectedIds.length === 0}
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleCreate}
          >
            Simpan Grup
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {selectedIds.length > 0
            ? `${selectedIds.length} peserta terpilih akan jadi anggota awal.`
            : 'Pilih peserta dulu di daftar untuk menyimpannya sebagai grup.'}
        </p>
      </div>

      {/* Daftar grup */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Belum ada grup"
          description="Simpan pilihan peserta sebagai grup di atas agar bisa dipakai ulang di ujian lain."
        />
      ) : (
        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
          {groups.map((g) => (
            <Card key={g.id} className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold text-slate-800">{g.name}</h3>
                  <Badge variant="info" className="shrink-0 text-[10px] font-bold">
                    {g.member_count} anggota
                  </Badge>
                </div>
                {g.description && <p className="truncate text-xs text-slate-400">{g.description}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold"
                  loading={busyId === g.id}
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => handleUse(g)}
                >
                  Gunakan
                </Button>
                <button
                  type="button"
                  onClick={() => handleSync(g)}
                  disabled={busyId === g.id || selectedIds.length === 0}
                  title="Perbarui anggota grup ke pilihan saat ini"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand disabled:opacity-40"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(g)}
                  disabled={busyId === g.id}
                  title="Hapus grup"
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50/60 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}
