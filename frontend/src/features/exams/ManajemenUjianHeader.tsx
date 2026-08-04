'use client';

import { ClipboardCheck } from 'lucide-react';
import { PageHeader, type BackLink } from '@/components/ui/page-header';

/** Header KONSTAN untuk seluruh area Manajemen Ujian (daftar, hasil, drill-down).
 *  Judul/ikon tak pernah berubah antar sub-halaman. Navigasi konteks lewat
 *  back-link bawaan PageHeader (garis pemisah + tombol di bawah kartu),
 *  seragam dengan pola Bank Soal. Dukung rantai leluhur via `backLinks`. */
export function ManajemenUjianHeader({
  backLabel,
  onBack,
  backLinks,
}: {
  backLabel?: string;
  onBack?: () => void;
  backLinks?: BackLink[];
}) {
  return (
    <PageHeader
      icon={<ClipboardCheck />}
      title="Manajemen Ujian"
      subtitle="Susun paket ujian dari Bank Soal: tentukan komposisi soal, jadwal, dan peserta."
      backLabel={backLabel}
      onBack={onBack}
      backLinks={backLinks}
    />
  );
}
