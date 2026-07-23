"use client";

/**
 * Learning Nexus Design System — PageHeader
 *
 * Header baku halaman admin portal: chip ikon gradient brand + judul + subjudul,
 * opsional breadcrumb di atas dan slot aksi di kanan. Menyeragamkan tampilan &
 * jarak header di semua halaman (masalah "tiap menu beda posisi header").
 * Presentational & token-driven.
 *
 * Contoh:
 *   <PageHeader
 *     icon={<ClipboardCheck />}
 *     title="Penilaian Tim"
 *     subtitle="Evaluasi bulanan anggota tim yang menjadi tanggung jawab Anda"
 *     actions={<Button>Export</Button>}
 *   />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface PageHeaderProps {
  /** Ikon (lucide) — dirender dalam chip gradient brand. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Aksi di kanan header (tombol, stepper, dll). */
  actions?: React.ReactNode;
  /** Breadcrumb opsional di atas judul (mis. <Breadcrumb />). */
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  breadcrumb,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumb}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/30 [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
