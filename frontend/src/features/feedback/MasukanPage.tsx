'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Plus, Inbox } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/FAB';
import { useFeedback, type FeedbackItem, type FeedbackInput } from './useFeedback';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackFormModal } from './FeedbackFormModal';
import { FeedbackDetailModal } from './FeedbackDetailModal';
import {
  CATEGORY_ORDER, PRIORITY_ORDER, STATUS_ORDER,
  CATEGORY_META, PRIORITY_META, STATUS_META,
  type Status,
} from './taxonomy';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Terbaru' },
  { value: 'priority', label: 'Prioritas' },
  { value: 'votes', label: 'Vote terbanyak' },
];

export const MasukanPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { items, total, isLoading, createItem, updateItem, updateStatus, deleteItem, bumpCommentCount, toggleVote } =
    useFeedback({ status, category, priority, search, sort });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackItem | null>(null);
  const [detail, setDetail] = useState<FeedbackItem | null>(null);

  // Deep-link dari notifikasi (`/masukan?item=<id>`): buka detail sekali saat
  // item termuat — dibaca sekali dari URL (tanpa useSearchParams → tanpa Suspense).
  const [deepLinkId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('item');
  });
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  if (!deepLinkDone && deepLinkId && items.length > 0) {
    setDeepLinkDone(true);
    const found = items.find((it) => it.id === deepLinkId);
    if (found) setDetail(found);
  }

  // Jaga agar modal detail menampilkan data terbaru setelah item diperbarui.
  const detailLive = detail ? items.find((it) => it.id === detail.id) ?? detail : null;

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (item: FeedbackItem) => { setDetail(null); setEditing(item); setFormOpen(true); };

  const handleSubmit = async (input: FeedbackInput) => {
    if (editing) await updateItem(editing.id, input);
    else await createItem(input);
  };

  return (
    <PageContainer>
      <PageHeader
        icon={<MessageSquarePlus />}
        title="Masukan & Perbaikan"
        subtitle="Catat perbaikan, perubahan logic, dan usulan fitur baru untuk aplikasi ini."
      />

      <div className="mt-5 flex flex-col gap-3">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari judul atau deskripsi…"
          sortOptions={SORT_OPTIONS}
          sortValue={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Semua Kategori</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
            ))}
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Semua Prioritas</option>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>{PRIORITY_META[p].label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' : 'flex flex-col gap-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="w-7 h-7" />}
            title="Belum ada masukan"
            description={
              search || status || category || priority
                ? 'Tidak ada item yang cocok dengan filter. Coba ubah kata kunci atau filter.'
                : 'Mulai catat perbaikan, perubahan logic, atau usulan fitur baru dengan tombol tambah.'
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-400">{total} item</p>
            <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' : 'flex flex-col gap-3'}>
              {items.map((item) => (
                <FeedbackCard key={item.id} item={item} onOpen={setDetail} />
              ))}
            </div>
          </>
        )}
      </div>

      <FAB actions={[{ icon: <Plus className="w-6 h-6" />, label: 'Tambah Masukan', onClick: openCreate }]} />

      <FeedbackFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <FeedbackDetailModal
        item={detailLive}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onChangeStatus={(id, s: Status) => updateStatus(id, s)}
        onDelete={deleteItem}
        onCommentCountChange={bumpCommentCount}
        onToggleVote={toggleVote}
      />
    </PageContainer>
  );
};
