"use client";

/**
 * Learning Nexus Design System — Spinner
 *
 * Indikator loading inline (Loader2 berputar), warna brand. Token-driven.
 *
 * Contoh:
 *   <Spinner />
 *   <Spinner size="sm" />
 *   <Button loading> … </Button>   // tombol punya spinner sendiri
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/src/lib/cn";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export function Spinner({
  size = "md",
  className,
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <Loader2
      role="status"
      aria-label="Memuat"
      className={cn("animate-spin text-brand", SIZE[size], className)}
    />
  );
}
