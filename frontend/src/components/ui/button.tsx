"use client";

/**
 * Learning Nexus Design System — Button
 *
 * Token-driven & presentational (tanpa next/link, tanpa business logic) supaya
 * mudah diekstrak ke `@learning-nexus/design-system` nanti. Warna brand berasal
 * dari token `@theme` di globals.css (--color-brand-*, --radius-btn).
 *
 * Contoh:
 *   <Button onClick={save} loading={saving}>Simpan</Button>
 *   <Button variant="secondary" leftIcon={<Pencil className="w-4 h-4" />}>Ubah</Button>
 *   <Button variant="danger" size="sm">Hapus</Button>
 *   <Button variant="success" leftIcon={<Send className="w-4 h-4" />}>Bagikan</Button>
 *   <Button variant="ghost">Batal</Button>
 */

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/src/lib/cn";

export type ButtonVariant =
  | "primary"    // CTA utama — gradient brand
  | "secondary"  // aksi netral di samping primary — outline
  | "ghost"      // aksi minimal / batal — teks saja
  | "danger"     // irreversible — Hapus, Batalkan
  | "warning"    // perlu perhatian, non-destruktif
  | "success";   // konfirmasi positif — Bagikan, Approve

export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-brand-start to-brand-end text-white shadow-sm " +
    "hover:brightness-110 hover:shadow-md focus-visible:ring-brand/40",
  secondary:
    "bg-white text-gray-700 border border-gray-200 " +
    "hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-300",
  ghost:
    "text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400",
  warning:
    "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400",
  success:
    "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-400",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
  lg: "text-base px-6 py-3 gap-2",
};

const SPINNER: Record<ButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tampilkan spinner & disable saat proses async. */
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    type = "button",
    className,
    children,
    ...props
  },
  ref,
) {
  const reduceMotion = useReducedMotion();
  // Feedback tekan hanya saat bisa diklik & motion diizinkan — ringan (transform GPU)
  const interactive = !disabled && !loading && !reduceMotion;

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-btn",
        "transition-colors cursor-pointer select-none whitespace-nowrap",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className={cn("animate-spin", SPINNER[size])} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </motion.button>
  );
});
