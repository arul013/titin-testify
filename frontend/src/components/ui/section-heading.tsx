/**
 * Learning Nexus Design System — SectionHeading (marketing)
 *
 * Kepala section baku halaman marketing: eyebrow (label kecil brand) + judul +
 * subjudul, dengan skala tipografi & warna brand yang seragam antar section.
 *
 * Presentational & token-driven. Server component (nol JS). Judul default `h2`;
 * untuk Hero pakai `as="h1"` (satu h1 per halaman, penting untuk SEO).
 *
 * Contoh:
 *   <SectionHeading
 *     eyebrow="Kenapa Learning Nexus"
 *     title="Belajar bahasa Inggris tanpa ribet"
 *     subtitle="Dibimbing tutor privat, jadwal fleksibel, materi terarah."
 *   />
 */
import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface SectionHeadingProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Perataan konten (default "center"). */
  align?: "center" | "left";
  /** Tag judul — "h1" hanya untuk Hero (satu per halaman). Default "h2". */
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  as: TitleTag = "h2",
  className,
}: SectionHeadingProps) {
  const isCenter = align === "center";
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        isCenter ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center rounded-lg bg-brand/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] ring-1 ring-inset ring-brand/20 sm:text-xs">
          <span className="bg-linear-to-r from-brand-start to-brand-end bg-clip-text text-transparent">
            {eyebrow}
          </span>
        </span>
      )}
      {/* Ukuran judul KANONIK — identik untuk h1 & h2, di semua halaman/section.
          `as` hanya menentukan tag semantik (SEO), BUKAN ukuran. */}
      <TitleTag className="text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
        {title}
      </TitleTag>
      {subtitle && (
        <p
          className={cn(
            "text-pretty text-base leading-relaxed text-gray-500 sm:text-lg",
            isCenter && "max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
