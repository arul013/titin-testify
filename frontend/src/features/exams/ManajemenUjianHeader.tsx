'use client';

import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

/** Header KONSTAN untuk seluruh area Manajemen Ujian (daftar, hasil, drill-down).
 *  Judul/ikon tak pernah berubah antar sub-halaman. Navigasi konteks lewat
 *  back-link bawaan PageHeader (garis pemisah + tombol di bawah kartu),
 *  seragam dengan pola Bank Soal. */
export function ManajemenUjianHeader({
  backLabel,
  onBack,
}: {
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <PageHeader
      icon={<ClipboardCheck />}
      title="Manajemen Ujian"
      subtitle="Susun paket ujian dari Bank Soal: tentukan komposisi soal, jadwal, dan peserta."
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}
