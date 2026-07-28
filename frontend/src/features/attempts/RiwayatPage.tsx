'use client';

import { History } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

/** Riwayat ujian peserta (read-only). Placeholder — diisi di P5.3. */
export function RiwayatPage() {
  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<History />}
          title="Riwayat Ujian"
          subtitle="Ujian yang sudah kamu selesaikan beserta hasil & pembahasannya."
        />
      }
    >
      <EmptyState
        icon={<History className="w-8 h-8" />}
        title="Riwayat sedang disiapkan"
        description="Hasil ujian selesai, skor, dan pembahasan (bila diizinkan) akan tampil di sini."
      />
    </PageContainer>
  );
}
