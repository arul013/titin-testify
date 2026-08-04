"use client";

/**
 * Learning Nexus Design System — PageHeader
 *
 * Header baku halaman admin portal, DEFAULT sebagai panel "timbul" (kartu putih
 * + border + shadow), sejajar brand sidebar (offset `-mt-5`). Isi: chip ikon
 * gradient brand + judul + subjudul, opsional breadcrumb & slot aksi di kanan,
 * serta opsional back link di bawah (garis pemisah + tombol).
 *
 * Menyeragamkan tampilan & jarak header di SEMUA halaman.
 *
 * Contoh:
 *   <PageHeader icon={<Users />} title="Data Karyawan" subtitle="…" />
 *   <PageHeader icon={<Library />} title="Bank Soal — TOEFL ITP" subtitle="…"
 *     backLabel="Semua Jenis Tes" onBack={goBack} />
 *   <PageHeader title="…" actions={<Button>Buat</Button>} />
 *   <PageHeader title="…" card={false} />   // header polos tanpa panel
 */

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/src/lib/cn";

/** Satu tautan "kembali" di kaki header (rantai leluhur). */
export interface BackLink {
  label: React.ReactNode;
  onBack: () => void;
}

export interface PageHeaderProps {
  /** Ikon (lucide) — dirender dalam chip gradient brand. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Aksi di kanan header (tombol, stepper, dll). */
  actions?: React.ReactNode;
  /** Breadcrumb opsional di atas judul (mis. <Breadcrumb />). */
  breadcrumb?: React.ReactNode;
  /** Back link tunggal di bawah header (garis + tombol). Muncul bila `onBack` diisi. */
  backLabel?: React.ReactNode;
  onBack?: () => void;
  /**
   * Multi back-link (rantai leluhur) di bawah header, mis.
   * `‹ Semua Ujian  ‹ Hasil: TOEFL ITP`. Bila diisi, mengabaikan `onBack`/`backLabel`.
   */
  backLinks?: BackLink[];
  /** Bungkus dalam panel kartu timbul (default true). Set false = header polos. */
  card?: boolean;
  className?: string;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  breadcrumb,
  backLabel = "Kembali",
  onBack,
  backLinks,
  card = true,
  className,
}: PageHeaderProps) {
  // Normalisasi: multi back-links diutamakan; jika tidak, pakai onBack tunggal.
  const links: BackLink[] =
    backLinks && backLinks.length > 0
      ? backLinks
      : onBack
        ? [{ label: backLabel, onBack }]
        : [];
  const inner = (
    <div className="space-y-3">
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
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );

  // Header polos (tanpa panel) — jarang dipakai.
  if (!card) {
    return <div className={cn("space-y-3", className)}>{inner}</div>;
  }

  // Panel timbul (default).
  return (
    <div
      className={cn(
        "-mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md shadow-slate-100",
        className,
      )}
    >
      <div className="p-6">{inner}</div>
      {links.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-100 px-6 py-3">
          {links.map((link, i) => (
            <button
              key={i}
              type="button"
              onClick={link.onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-indigo-600"
            >
              <ChevronLeft className="h-4 w-4" /> {link.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
