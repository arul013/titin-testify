'use client';

import { LayoutDashboard, Sparkles } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/features/auth/hooks/useAuth';

/** Dashboard peserta (home). Placeholder — diisi di P5.4. */
export function PesertaBerandaPage() {
  const { user } = useAuth();
  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<LayoutDashboard />}
          title="Dashboard"
          subtitle={`Selamat datang${user?.full_name ? `, ${user.full_name}` : ''}. Ringkasan ujian & hasilmu tampil di sini.`}
        />
      }
    >
      <EmptyState
        icon={<Sparkles className="w-8 h-8" />}
        title="Dashboard sedang disiapkan"
        description="Kartu ujian berikutnya, statistik, dan hasil terbaru akan muncul di sini."
      />
    </PageContainer>
  );
}
