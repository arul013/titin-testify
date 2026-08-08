'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Pencil, Trash2, User, Clock, ThumbsUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import { renderFeedbackText } from './feedbackText';
import {
  CATEGORY_META, PRIORITY_META, STATUS_META, STATUS_ORDER,
} from './taxonomy';
import type { Status } from './taxonomy';
import type { FeedbackItem } from './useFeedback';

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  item: FeedbackItem | null;
  onClose: () => void;
  onEdit: (item: FeedbackItem) => void;
  onChangeStatus: (id: string, status: Status) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

export const FeedbackDetailModal: React.FC<Props> = ({
  item, onClose, onEdit, onChangeStatus, onDelete,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  if (!item) return null;

  const cat = CATEGORY_META[item.category];
  const prio = PRIORITY_META[item.priority];
  const st = STATUS_META[item.status];

  const handleStatus = async (next: Status) => {
    if (next === item.status) return;
    setStatusBusy(true);
    try {
      await onChangeStatus(item.id, next);
      toast.success(`Status → ${STATUS_META[next].label}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status.'));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(item.id);
      toast.success('Item dihapus.');
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus item.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={!!item}
        onClose={onClose}
        title={item.title}
        size="2xl"
        footer={
          item.can_manage ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Status:</span>
                <div className="w-44">
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
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(item)}>
                  Ubah
                </Button>
                <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmOpen(true)}>
                  Hapus
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button variant="ghost" onClick={onClose}>Tutup</Button>
            </div>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={cat.variant}>{cat.emoji} {cat.label}</Badge>
            <Badge variant={prio.variant}>Prioritas: {prio.label}</Badge>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 border-b border-slate-100 pb-3">
            <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.creator_name || 'Admin'}</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtDate(item.created_at)}</span>
            <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {item.vote_count} vote</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {item.comment_count} komentar</span>
          </div>

          <div>{renderFeedbackText(item.description)}</div>
        </div>
      </Modal>

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
    </>
  );
};
