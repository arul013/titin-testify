"use client";

/**
 * Learning Nexus Design System — Checkbox
 *
 * Checkbox custom (bukan native) — fill gradient brand saat dicentang + animasi
 * "pop" centang yang halus. Bukan glass (ukuran checkbox terlalu kecil untuk
 * frost). Controlled, aksesibel (real <input> tersembunyi + keyboard).
 *
 * Contoh:
 *   <Checkbox checked={val} onChange={setVal} label="Setuju" description="opsional" />
 *   <Checkbox checked={absent} onChange={setAbsent} variant="warning" label="Siswa tidak hadir" />
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/src/lib/cn";

export type CheckboxVariant = "brand" | "warning";
export type CheckboxSize = "sm" | "md";

const BOX: Record<CheckboxSize, string> = { sm: "h-4 w-4", md: "h-5 w-5" };
const ICON: Record<CheckboxSize, string> = { sm: "h-3 w-3", md: "h-3.5 w-3.5" };

const FILL: Record<CheckboxVariant, string> = {
  brand: "border-transparent bg-linear-to-br from-brand-start to-brand-end",
  warning: "border-transparent bg-orange-500",
};
const RING: Record<CheckboxVariant, string> = {
  brand: "peer-focus-visible:ring-brand/40",
  warning: "peer-focus-visible:ring-orange-400/40",
};

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  variant?: CheckboxVariant;
  size?: CheckboxSize;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  variant = "brand",
  size = "md",
  disabled,
  className,
  id,
}: CheckboxProps) {
  const autoId = React.useId();
  const cbId = id ?? autoId;

  const control = (
    <span className="relative inline-flex shrink-0">
      <input
        id={cbId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex items-center justify-center rounded-md border-2 transition-colors",
          BOX[size],
          checked
            ? FILL[variant]
            : "border-gray-300 bg-white group-hover:border-gray-400",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
          RING[variant],
          disabled && "opacity-50",
        )}
      >
        <motion.span
          initial={false}
          animate={
            checked ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }
          }
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="text-white"
        >
          <Check className={cn(ICON[size], "stroke-3")} />
        </motion.span>
      </span>
    </span>
  );

  if (!label && !description) {
    return (
      <label
        htmlFor={cbId}
        className={cn(
          "group inline-flex",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          className,
        )}
      >
        {control}
      </label>
    );
  }

  return (
    <label
      htmlFor={cbId}
      className={cn(
        "group flex items-start gap-3",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <span className="mt-0.5">{control}</span>
      <div className="min-w-0">
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        {description && (
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        )}
      </div>
    </label>
  );
}
