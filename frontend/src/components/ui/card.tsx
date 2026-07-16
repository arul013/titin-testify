"use client";

/**
 * Learning Nexus Design System — Card
 *
 * Permukaan konten solid (bukan glass, demi keterbacaan data-dense). Sentuhan
 * brand hanya di interaksi/aksen — bukan flood. Presentational & token-driven.
 *
 * Varian:
 *   - "default"     → putih, border tipis, shadow lembut.
 *   - "interactive" → bisa diklik: hover angkat + border brand (ringan, CSS).
 *   - "accent"      → garis aksen brand di kiri untuk kartu yang ditonjolkan.
 *   - "premium"     → "glass look" jewel: rim gradient indigo + glow + tint tipis
 *                     (TANPA blur → tetap terbaca & ringan). Pakai SELEKTIF untuk
 *                     kartu hero/penonjolan, bukan tiap kartu di list.
 *
 * Contoh:
 *   <Card>…</Card>
 *   <Card variant="interactive" onClick={…}>…</Card>
 *   <Card variant="premium" className="p-6">…</Card>
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export type CardVariant = "default" | "interactive" | "accent" | "premium";

const CARD: Record<Exclude<CardVariant, "premium">, string> = {
  default: "border border-gray-100 shadow-sm",
  interactive:
    "border border-gray-100 shadow-sm cursor-pointer transition-all " +
    "hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md",
  accent: "border border-gray-100 border-l-2 border-l-brand shadow-sm",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", className, children, ...props },
  ref,
) {
  // Premium: FRAME (rim gradient indigo + glow) > INNER (tint tipis + konten).
  // className konsumen diteruskan ke INNER (biasanya padding).
  if (variant === "premium") {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl p-px",
          "bg-linear-to-br from-indigo-400/50 via-purple-400/30 to-transparent",
          "shadow-[0_14px_44px_-14px_rgba(79,70,229,0.45)]",
        )}
        {...props}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-[15px] p-5",
            "bg-linear-to-b from-white to-indigo-50/50 ring-1 ring-inset ring-white/60",
            className,
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("rounded-2xl bg-white p-5", CARD[variant], className)} {...props}>
      {children}
    </div>
  );
});
