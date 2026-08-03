'use client';

import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

/** Header KONSTAN untuk seluruh area Manajemen Ujian (daftar, hasil, drill-down).
 *  Tak pernah berubah antar sub-halaman — konteks lokasi lewat Breadcrumb. */
export function ManajemenUjianHeader() {
  return (
    <PageHeader
      icon={<ClipboardCheck />}
      title="Manajemen Ujian"
      subtitle="Susun paket ujian dari Bank Soal: tentukan komposisi soal, jadwal, dan peserta."
    />
  );
}
