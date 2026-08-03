'use client';

import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';

/** Header KONSTAN untuk seluruh area Manajemen Ujian (daftar, hasil, drill-down).
 *  Judul/ikon tak pernah berubah antar sub-halaman — konteks lokasi lewat
 *  Breadcrumb yang dirender di slot bawaan PageHeader (di atas judul). */
export function ManajemenUjianHeader({ breadcrumb }: { breadcrumb?: BreadcrumbItem[] }) {
  return (
    <PageHeader
      icon={<ClipboardCheck />}
      title="Manajemen Ujian"
      subtitle="Susun paket ujian dari Bank Soal: tentukan komposisi soal, jadwal, dan peserta."
      breadcrumb={breadcrumb && <Breadcrumb linkComponent={Link} items={breadcrumb} />}
    />
  );
}
