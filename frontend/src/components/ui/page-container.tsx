"use client";

/**
 * Learning Nexus Design System — PageContainer
 *
 * Pembungkus konten halaman admin portal dengan ritme vertikal baku (`space-y-6`)
 * dan slot `header` opsional (biasanya <PageHeader />).
 *
 * PENTING: PageContainer TIDAK menetapkan padding luar. Padding halaman (gutter
 * kiri/kanan/atas + ruang bawah untuk FAB) dimiliki oleh `AdminShell` <main>
 * (`px-6 pt-6 pb-24`) sebagai SATU-SATUNYA sumber — supaya posisi header & lebar
 * konten identik di semua menu. JANGAN menambah `p-*` di root halaman.
 *
 * Contoh:
 *   <PageContainer header={<PageHeader icon={<Users />} title="Data Karyawan" />}>
 *     <Card>…</Card>
 *   </PageContainer>
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface PageContainerProps {
  /** Header halaman (umumnya <PageHeader />). */
  header?: React.ReactNode;
  children: React.ReactNode;
  /** Override ritme vertikal (default `space-y-6`). */
  className?: string;
}

export function PageContainer({ header, children, className }: PageContainerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {header}
      {children}
    </div>
  );
}
