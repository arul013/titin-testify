"use client";

/**
 * Learning Nexus Design System — BackLink
 *
 * Afordans "kembali" untuk halaman detail **1 level** (Page Layout Standard §3b):
 * kembali cuma punya SATU tujuan (section-nya) → back-link cukup. Untuk hierarki
 * ≥2 leluhur pakai `Breadcrumb`. Header (fix) sudah menyebut section → label default
 * cukup "Kembali" (polos) tanpa mengulang nama section.
 *
 * Presentational & token-driven (extraction-safe): tidak import `next/link` —
 * lewatkan `linkComponent` (mis. Next `Link`) untuk navigasi SPA; default `<a>`.
 *
 *   <BackLink href="/portal/my-enrollments" linkComponent={Link} />
 */

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/src/lib/cn";

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

function DefaultLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export interface BackLinkProps {
  href: string;
  /** Teks (default "Kembali"). Isi mis. "Kembali ke Kelas Saya" bila perlu eksplisit. */
  label?: string;
  /** Komponen link (mis. Next `Link`) untuk navigasi SPA. Default `<a>`. */
  linkComponent?: LinkLike;
  className?: string;
}

export function BackLink({
  href,
  label = "Kembali",
  linkComponent: LinkComp = DefaultLink,
  className,
}: BackLinkProps) {
  return (
    <LinkComp
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-brand",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {label}
    </LinkComp>
  );
}
