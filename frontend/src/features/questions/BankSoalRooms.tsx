'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Library, Folder, ChevronRight, Clock, Layers } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ListToolbar, type ListView, type SortOption } from '@/components/ui/list-toolbar';
import { cn } from '@/src/lib/cn';
import { useTestTypes, type TestType } from '@/features/test-types/useTestTypes';

// Legend per jenis tes (kemampuan yang diujikan). Fallback ke deskripsi untuk
// jenis tes baru yang belum terdaftar di sini.
const LEGEND: Record<string, string> = {
  itp: 'Institutional Testing Program — Listening, Structure & Written Expression, Reading',
  ielts: 'International English Language Testing System — Listening, Speaking, Writing and Reading',
  ibt: 'Internet Based Test — Listening, Speaking, Writing and Reading',
  toeic: 'Test of English for International Communication — Listening, Speaking, Writing and Reading',
};

const SORT_OPTIONS: SortOption[] = [
  { value: 'default', label: 'Urutan Default' },
  { value: 'name-asc', label: 'Nama (A–Z)' },
  { value: 'name-desc', label: 'Nama (Z–A)' },
];

function legendFor(t: TestType): string {
  return LEGEND[t.code] ?? t.description ?? '';
}

// ─── Kartu / baris "folder" jenis tes ─────────────────────────────
function RoomFolder({
  testType: t,
  view,
  onOpen,
}: {
  testType: TestType;
  view: ListView;
  /** Diisi = bisa diklik (Tersedia). Kosong = "Segera" (muted, non-klik). */
  onOpen?: () => void;
}) {
  const soon = !onOpen;
  const legend = legendFor(t);

  const iconTile = (
    <span
      className={cn(
        'shrink-0 flex items-center justify-center rounded-xl',
        view === 'grid' ? 'w-11 h-11' : 'w-10 h-10',
        soon
          ? 'bg-slate-200/70 text-slate-400'
          : 'bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-brand/20',
      )}
    >
      <Folder className={view === 'grid' ? 'w-5 h-5' : 'w-4.5 h-4.5'} />
    </span>
  );

  const soonBadge = soon && (
    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Segera
    </span>
  );

  // ── List (baris) ──
  if (view === 'list') {
    const body = (
      <>
        {iconTile}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-bold truncate', soon ? 'text-slate-500' : 'text-slate-800')}>
              {t.name}
            </h3>
            {soonBadge}
          </div>
          <p className={cn('text-xs truncate mt-0.5', soon ? 'text-slate-400' : 'text-slate-500')}>
            {legend}
          </p>
        </div>
        {!soon && (
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0" />
        )}
      </>
    );
    return soon ? (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 cursor-not-allowed">
        {body}
      </div>
    ) : (
      <button
        type="button"
        onClick={onOpen}
        className="group flex items-center gap-3 w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-brand hover:bg-brand/5"
      >
        {body}
      </button>
    );
  }

  // ── Grid (kartu) ──
  const body = (
    <>
      <div className="flex items-start gap-3">
        {iconTile}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-bold text-base truncate', soon ? 'text-slate-500' : 'text-slate-800')}>
              {t.name}
            </h3>
            {soonBadge}
          </div>
        </div>
        {!soon && (
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
        )}
      </div>
      <p className={cn('text-xs leading-relaxed line-clamp-2', soon ? 'text-slate-400' : 'text-slate-500')}>
        {legend}
      </p>
    </>
  );
  return soon ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 cursor-not-allowed">
      {body}
    </div>
  ) : (
    <Card
      variant="interactive"
      onClick={onOpen}
      className="group flex flex-col gap-3 p-5 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      {body}
    </Card>
  );
}

/**
 * Gerbang Bank Soal ala Google Drive — pilih "folder" jenis tes dulu.
 * Toolbar (cari/urut/grid-list) + 2 seksi: Tersedia & Segera Hadir.
 */
export function BankSoalRooms() {
  const router = useRouter();
  const { testTypes, isLoading, error } = useTestTypes();
  const [view, setView] = useState<ListView>('grid');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');

  const { active, soon, totalRooms } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rooms = testTypes
      .filter((t) => t.status === 'active' || t.status === 'soon')
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));

    const sorted = [...rooms].sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      return a.sort_order - b.sort_order;
    });

    return {
      active: sorted.filter((t) => t.status === 'active'),
      soon: sorted.filter((t) => t.status === 'soon'),
      totalRooms: rooms.length,
    };
  }, [testTypes, search, sort]);

  const gridClass = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';
  const listClass = 'flex flex-col gap-2.5';

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<Library />}
          title="Bank Soal"
          subtitle="Pilih jenis tes untuk membuka bank soalnya. Tiap jenis tes punya ruang soal sendiri — tidak tercampur."
        />
      }
    >
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Cari jenis tes…"
        sortOptions={SORT_OPTIONS}
        sortValue={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
      />

      {isLoading ? (
        <div className={gridClass}>
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 rounded-2xl">
              <Skeleton className="h-11 w-11 rounded-xl mb-3" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Library className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : totalRooms === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title={search ? 'Tidak ditemukan' : 'Belum ada jenis tes'}
          description={
            search
              ? 'Tidak ada jenis tes yang cocok dengan pencarianmu.'
              : 'Tambahkan jenis tes di menu Jenis Ujian dulu, lalu kembali ke sini untuk mengelola soalnya.'
          }
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Tersedia <span className="text-slate-400">({active.length})</span>
              </h2>
              <div className={view === 'grid' ? gridClass : listClass}>
                {active.map((t) => (
                  <RoomFolder
                    key={t.id}
                    testType={t}
                    view={view}
                    onOpen={() => router.push(`/bank-soal/${t.code}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {soon.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Segera Hadir <span className="text-slate-400">({soon.length})</span>
              </h2>
              <div className={view === 'grid' ? gridClass : listClass}>
                {soon.map((t) => (
                  <RoomFolder key={t.id} testType={t} view={view} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}
