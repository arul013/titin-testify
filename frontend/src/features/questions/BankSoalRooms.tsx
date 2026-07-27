'use client';

import { Library, GraduationCap, ChevronRight, Clock, Layers } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestTypes, type TestType } from '@/features/test-types/useTestTypes';

interface BankSoalRoomsProps {
  onSelect: (t: TestType) => void;
}

/**
 * Gerbang Bank Soal — pilih "ruang" jenis tes dulu. Setiap jenis tes punya
 * bank soal terpisah (tak bercampur). Muncul jenis Aktif & "Segera hadir"
 * (biar bisa menyiapkan soal sebelum di-launch).
 */
export function BankSoalRooms({ onSelect }: BankSoalRoomsProps) {
  const { testTypes, isLoading, error } = useTestTypes();

  const rooms = [...testTypes]
    .filter((t) => t.status === 'active' || t.status === 'soon')
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <PageContainer
      className="space-y-6"
      header={
        <div className="-mt-5 bg-white border border-slate-100 rounded-3xl shadow-md shadow-slate-100 overflow-hidden">
          <div className="p-6">
            <PageHeader
              icon={<Library />}
              title="Bank Soal"
              subtitle="Pilih jenis tes untuk membuka bank soalnya. Tiap jenis tes punya ruang soal sendiri — tidak tercampur."
            />
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 rounded-3xl">
              <Skeleton className="h-12 w-12 rounded-2xl mb-4" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<Library className="w-8 h-8" />} title="Gagal memuat" description={error} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="Belum ada jenis tes"
          description="Tambahkan jenis tes di menu Jenis Ujian dulu, lalu kembali ke sini untuk mengelola soalnya."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rooms.map((t) => {
            const isSoon = t.status === 'soon';
            return (
              <Card
                key={t.id}
                variant="interactive"
                onClick={() => onSelect(t)}
                className="group p-6 rounded-3xl flex flex-col gap-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start gap-3.5">
                  <span className="shrink-0 w-12 h-12 rounded-2xl bg-linear-to-br from-brand-start to-brand-end text-white flex items-center justify-center shadow-sm shadow-brand/20">
                    <GraduationCap className="w-6 h-6" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-800 text-lg leading-snug truncate">{t.name}</h3>
                      {isSoon && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Segera
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.code}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors shrink-0 mt-1" />
                </div>

                {t.description && (
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 -mt-1">{t.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                  {t.skills.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Belum ada bagian</span>
                  ) : (
                    t.skills.map((s) => (
                      <span
                        key={s.code}
                        className="text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg"
                      >
                        {s.name}
                      </span>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
