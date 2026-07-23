"use client";

/**
 * Learning Nexus Design System — LoadingOverlay
 *
 * Veil loading di atas sebuah area: Spinner + label opsional, di atas kaca putih
 * tipis (backdrop-blur). Dua mode:
 *   - default  → `absolute inset-0` (parent WAJIB `relative`) untuk menutup section.
 *   - fullscreen → `fixed inset-0` menutup seluruh viewport (blocking).
 *
 * Contoh:
 *   <div className="relative">
 *     <LoadingOverlay show={saving} label="Menyimpan…" />
 *     … konten …
 *   </div>
 *   <LoadingOverlay fullscreen show={processing} label="Memproses…" />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";
import { Spinner, type SpinnerSize } from "./spinner";

export interface LoadingOverlayProps {
  /** Tampilkan overlay (default true — memudahkan render kondisional). */
  show?: boolean;
  label?: React.ReactNode;
  /** Tutup seluruh viewport (`fixed`) alih-alih parent (`absolute`). */
  fullscreen?: boolean;
  spinnerSize?: SpinnerSize;
  className?: string;
}

export function LoadingOverlay({
  show = true,
  label,
  fullscreen = false,
  spinnerSize = "lg",
  className,
}: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        fullscreen ? "fixed z-100" : "absolute z-30",
        "inset-0 flex flex-col items-center justify-center gap-3",
        "bg-white/60 backdrop-blur-sm",
        className,
      )}
    >
      <Spinner size={spinnerSize} />
      {label && <p className="text-sm font-medium text-gray-500">{label}</p>}
    </div>
  );
}
