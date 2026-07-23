"use client";

/**
 * Learning Nexus Design System — Skeleton
 *
 * Placeholder loading berdenyut (`animate-pulse`). Primitive presentational:
 * atur bentuk lewat `className` (tinggi/lebar/rounded). `SkeletonText` untuk
 * beberapa baris teks (baris terakhir lebih pendek).
 *
 * Contoh:
 *   <Skeleton className="h-24 rounded-2xl" />
 *   <Skeleton className="h-10 w-10 rounded-full" />
 *   <SkeletonText lines={3} />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-xl bg-gray-100", className)} />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  /** Lebar baris terakhir (default 60%). */
  lastLineWidth?: string;
  className?: string;
}

export function SkeletonText({ lines = 3, lastLineWidth = "60%", className }: SkeletonTextProps) {
  return (
    <div aria-hidden className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 animate-pulse rounded bg-gray-100"
          style={i === lines - 1 && lines > 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}
