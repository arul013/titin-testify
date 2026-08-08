'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, Plus, Inbox } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { ListToolbar } from '@/components/ui/list-toolbar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { FAB } from '@/components/ui/FAB';
import { useFeedback, type FeedbackInput } from './useFeedback';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackFormModal } from './FeedbackFormModal';
import {
  CATEGORY_ORDER, PRIORITY_ORDER, STATUS_ORDER,
  PRIORITY_META, STATUS_META, categoryOptionLabel,
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

  const router = useRouter();
  const { items, total, isLoading, createItem } =
    useFeedback({ status, category, priority, search, sort });

  const [formOpen, setFormOpen] = useState(false);

  const openDetail = (id: string) => router.push(`/masukan/${id}`);

  const handleSubmit = async (input: FeedbackInput) => {
    await createItem(input);
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
              <option key={c} value={c}>{categoryOptionLabel(c)}</option>
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
                <FeedbackCard key={item.id} item={item} onOpen={(it) => openDetail(it.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      <FAB actions={[{ icon: <Plus className="w-6 h-6" />, label: 'Tambah Masukan', onClick: () => setFormOpen(true) }]} />

      <FeedbackFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={null}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
};
