/**
 * Learning Nexus Design System — Section
 *
 * Primitif layout GENERIC (bukan khusus marketing): pembungkus `<section>` dengan
 * ritme padding vertikal + container max-width + gutter horizontal yang konsisten.
 * Dipakai di halaman apa pun yang butuh section full-width dengan konten terpusat
 * (landing, docs, product page). Beda dari `PageContainer` admin yang justru TANPA
 * padding luar (bergantung shell).
 *
 * Presentational & token-driven. BUKAN "use client" (server component) → nol JS,
 * konten ada di HTML awal (baik untuk SEO & LCP).
 *
 * Contoh:
 *   <Section id="why">
 *     <SectionHeading eyebrow="Kenapa LN" title="Alasan memilih kami" />
 *     …
 *   </Section>
 *
 *   // Full-bleed (background sendiri, atur container manual di dalam):
 *   <Section container={false} className="bg-linear-to-br from-brand-start to-brand-end">
 *     <div className="mx-auto max-w-6xl px-5">…</div>
 *   </Section>
 *
 * Gutter = `px-5` (fixed) — KANONIK, sejajar navbar marketing (`max-w-6xl px-5`).
 * Jangan ganti ke gutter responsif (sm:px-6 lg:px-8) → konten jadi tak lurus navbar.
 */
import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Bungkus anak dengan container max-width + gutter (default true). Set false
   *  untuk section full-bleed yang mengatur containernya sendiri (mis. background
   *  gradient penuh lebar). */
  container?: boolean;
  /** Class untuk container dalam (hanya berlaku bila `container` true). */
  containerClassName?: string;
}

export function Section({
  container = true,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-16 sm:py-20 lg:py-24", className)} {...props}>
      {container ? (
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-5",
            containerClassName,
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
