'use client';

import { useRouter } from 'next/navigation';
import { Gauge, GraduationCap, ChevronRight, Clock, Layers, ClipboardCheck } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/src/lib/cn';
import { useTestTypes, type TestType } from '@/features/test-types/useTestTypes';

// Subtitle metode skor per jenis tes. Fallback untuk jenis tes baru.
const SCORING_SUBTITLE: Record<string, string> = {
  itp: 'Skor resmi 217–677 (tabel konversi) + kalkulator',
};
function scoringSubtitle(t: TestType): string {
  return SCORING_SUBTITLE[t.code] ?? 'Skor resmi menyusul — sementara Nilai 0–100';
}

function ScoringCard({ testType: t, onOpen }: { testType: TestType; onOpen?: () => void }) {
  const soon = !onOpen;
  const iconTile = (
    <span
      className={cn(
        'shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center',
        soon
          ? 'bg-slate-200/70 text-slate-400'
          : 'bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-brand/20',
      )}
    >
      <GraduationCap className="w-5 h-5" />
    </span>
  );
  const inner = (
    <div className="flex items-start gap-3.5">
      {iconTile}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn('font-extrabold text-base truncate', soon ? 'text-slate-500' : 'text-slate-800')}>
            {t.name}
          </h3>
          {soon && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> Segera
            </span>
          )}
        </div>
        <p className={cn('text-xs mt-0.5 line-clamp-2', soon ? 'text-slate-400' : 'text-slate-500')}>
          {scoringSubtitle(t)}
        </p>
      </div>
      {!soon && (
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
      )}
    </div>
  );

  return soon ? (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 cursor-not-allowed">
      {inner}
    </div>
  ) : (
    <Card
      variant="interactive"
      onClick={onOpen}
      className="group p-5 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      {inner}
    </Card>
  );
}

/** Gerbang Skema Penilaian — pilih jenis tes untuk melihat cara & skor penilaiannya. */
export function SkemaRooms() {
  const router = useRouter();
  const { testTypes, isLoading, error } = useTestTypes();

  const rooms = [...testTypes]
    .filter((t) => t.status === 'active' || t.status === 'soon')
    .sort((a, b) => a.sort_order - b.sort_order);
  const active = rooms.filter((t) => t.status === 'active');
  const soon = rooms.filter((t) => t.status === 'soon');

  const gridClass = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<Gauge />}
          title="Skema Penilaian"
          subtitle="Pilih jenis tes untuk melihat cara & skor penilaiannya. Skor ditentukan otomatis oleh jenis tes & mode ujian."
        />
      }
    >
      {/* Alat penilaian lintas jenis tes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Alat Penilaian</h2>
        <Card
          variant="interactive"
          onClick={() => router.push('/skema-penilaian/rubrik')}
          className="group p-5 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-start gap-3.5">
            <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-brand/20">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-base text-slate-800">Rubrik Penilaian</h3>
              <p className="text-xs mt-0.5 text-slate-500">
                Kelola pustaka rubrik untuk penilaian manual esai/writing (dipakai ulang lintas soal).
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
          </div>
        </Card>
      </section>

      {isLoading ? (
        <div className={gridClass}>
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-5 rounded-2xl">
              <Skeleton className="h-11 w-11 rounded-2xl mb-3" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Gauge className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="Belum ada jenis tes"
          description="Tambahkan jenis tes di menu Jenis Ujian dulu."
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                Tersedia <span className="text-slate-400">({active.length})</span>
              </h2>
              <div className={gridClass}>
                {active.map((t) => (
                  <ScoringCard
                    key={t.id}
                    testType={t}
                    onOpen={() => router.push(`/skema-penilaian/${t.code}`)}
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
              <div className={gridClass}>
                {soon.map((t) => (
                  <ScoringCard key={t.id} testType={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}
