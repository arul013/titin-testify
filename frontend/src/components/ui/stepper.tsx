"use client";

/**
 * Learning Nexus Design System — Stepper
 *
 * Kontrol "◀ label ▶" untuk melangkah antar nilai diskret (bulan, tahun,
 * halaman, dll). Presentational murni — logika nilai (increment, format, batas)
 * di-handle pemanggil lewat `onPrev`/`onNext` + `prevDisabled`/`nextDisabled`.
 *
 * Contoh:
 *   <Stepper label="Juli 2026" onPrev={prev} onNext={next} nextDisabled={isCurrent} />
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/cn";

function StepBtn({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="rounded-xl p-1.5 text-gray-500 outline-none transition-all hover:bg-white/80 hover:text-brand hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:hover:shadow-none"
    >
      {children}
    </button>
  );
}

export interface StepperProps {
  label: React.ReactNode;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** class untuk label tengah (mis. atur min-width agar tak "loncat"). */
  labelClassName?: string;
  className?: string;
}

export function Stepper({
  label,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  labelClassName,
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-2xl border border-white/60 bg-white/70 p-1",
        "shadow-sm shadow-indigo-950/5 ring-1 ring-inset ring-white/50 backdrop-blur-xl",
        className,
      )}
    >
      <StepBtn onClick={onPrev} disabled={prevDisabled} ariaLabel="Sebelumnya">
        <ChevronLeft className="h-4 w-4" />
      </StepBtn>
      <span className={cn("min-w-35 px-2 text-center text-sm font-semibold text-gray-800", labelClassName)}>
        {label}
      </span>
      <StepBtn onClick={onNext} disabled={nextDisabled} ariaLabel="Berikutnya">
        <ChevronRight className="h-4 w-4" />
      </StepBtn>
    </div>
  );
}
