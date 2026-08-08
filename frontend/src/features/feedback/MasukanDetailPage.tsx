'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquarePlus, Pencil, Trash2, ThumbsUp, User, Clock, Inbox,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { useFeedbackDetail } from './useFeedbackDetail';
import { FeedbackComments } from './FeedbackComments';
import { FeedbackFormModal } from './FeedbackFormModal';
import { renderFeedbackText } from './feedbackText';
import {
  CATEGORY_META, PRIORITY_META, STATUS_META, STATUS_ORDER, type Status,
} from './taxonomy';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export const MasukanDetailPage: React.FC<{ id: string }> = ({ id }) => {
  const router = useRouter();
  const { item, isLoading, notFound, save, changeStatus, remove, toggleVote, bumpCommentCount } =
    useFeedbackDetail(id);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);

  const backToList = () => router.push('/masukan');

  const handleStatus = async (next: Status) => {
    if (!item || next === item.status) return;
    setStatusBusy(true);
    try {
      await changeStatus(next);
      toast.success(`Status → ${STATUS_META[next].label}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status.'));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleVote = async () => {
    if (!item) return;
    setVoteBusy(true);
    try {
      await toggleVote(item.has_voted);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memperbarui suara.'));
    } finally {
      setVoteBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove();
      toast.success('Item dihapus.');
      backToList();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus item.'));
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-24 rounded-2xl" />
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (notFound || !item) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Inbox className="w-7 h-7" />}
          title="Item tidak ditemukan"
          description="Item mungkin sudah dihapus."
          action={<Button onClick={backToList}>Kembali ke daftar</Button>}
        />
      </PageContainer>
    );
  }

  const cat = CATEGORY_META[item.category];
  const prio = PRIORITY_META[item.priority];
  const st = STATUS_META[item.status];

  return (
    <PageContainer>
      <PageHeader
        icon={<MessageSquarePlus />}
        title={item.title}
        subtitle={`Oleh ${item.creator_name || 'Admin'} • ${fmtDate(item.created_at)}`}
        backLinks={[{ label: 'Masukan & Perbaikan', onBack: backToList }]}
      />

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Kolom utama: deskripsi + diskusi */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Card>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Deskripsi</h2>
            {renderFeedbackText(item.description)}
          </Card>

          <Card>
            <FeedbackComments itemId={item.id} onCountChange={bumpCommentCount} />
          </Card>
        </div>

        {/* Sidebar: rincian + aksi */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={cat.variant}>{cat.emoji} {cat.label}</Badge>
              <Badge variant={prio.variant}>Prioritas: {prio.label}</Badge>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {item.creator_name || 'Admin'}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {fmtDate(item.created_at)}</span>
            </div>

            <button
              type="button"
              onClick={handleVote}
              disabled={voteBusy}
              aria-pressed={item.has_voted}
              title={item.has_voted ? 'Batalkan suara' : 'Beri suara'}
              className={
                'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-60 ' +
                (item.has_voted
                  ? 'bg-brand text-white border-brand shadow-sm shadow-brand/25'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand/40 hover:text-brand')
              }
            >
              <ThumbsUp className="w-4 h-4" /> {item.has_voted ? 'Didukung' : 'Dukung'} · {item.vote_count}
            </button>
          </Card>

          {item.can_manage && (
            <Card className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Ubah Status</label>
                <Select
                  value={item.status}
                  onChange={(e) => handleStatus(e.target.value as Status)}
                  disabled={statusBusy}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="secondary" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => setEditOpen(true)}>
                  Ubah Isi
                </Button>
                <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmOpen(true)}>
                  Hapus
                </Button>
              </div>
            </Card>
          )}
        </aside>
      </div>

      <FeedbackFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={item}
        onSubmit={save}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Hapus item ini?"
        confirmLabel="Hapus"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
        loading={deleting}
        onConfirm={handleDelete}
      >
        <p className="text-sm text-slate-600">
          Item <span className="font-semibold">&ldquo;{item.title}&rdquo;</span> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
      </ConfirmDialog>
    </PageContainer>
  );
};
