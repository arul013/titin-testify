"use client";

/**
 * Learning Nexus Design System — Modal (glassmorphism)
 *
 * Struktur: panel flex-col dengan header sticky + body scroll + footer sticky,
 * di-cap `max-h-[85vh]` → konten pendek tak scroll, konten panjang hanya body
 * yang scroll (judul & tombol tetap kelihatan).
 *
 * Premium glass butuh warna di belakang untuk dibiaskan → backdrop = gradient
 * brand gelap + blob (indigo/ungu/fuchsia) yang dibiaskan panel (saturate blur).
 *
 * Varian:
 *   - "default" → light-glass, terbaca untuk FORM (teks gelap, konten solid).
 *   - "vivid"   → dark-glass dramatis untuk dialog KONTEN RINGAN (teks terang).
 *
 * Token-driven & presentational → siap ekstrak ke `@learning-nexus/design-system`.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/src/lib/cn";

export type ModalSize = "sm" | "md" | "lg";
export type ModalVariant = "default" | "vivid";

const SIZE: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

// FRAME = rim liquid: gradient border tipis (brand) + glow luar (halo brand)
// yang "mempertegas tiap sisi". GLASS = permukaan kaca di dalamnya.
const FRAME: Record<ModalVariant, string> = {
  default:
    "bg-linear-to-br from-white/90 via-purple-300/50 to-indigo-400/60 " +
    "shadow-[0_12px_50px_-10px_rgba(79,70,229,0.5)]",
  vivid:
    "bg-linear-to-br from-white/50 via-purple-300/40 to-fuchsia-400/50 " +
    "shadow-[0_12px_60px_-10px_rgba(147,51,234,0.6)]",
};

const GLASS: Record<ModalVariant, string> = {
  default:
    "bg-white/90 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-inset ring-white/70",
  vivid:
    "text-white bg-white/10 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-inset ring-white/20",
};

const HEADER: Record<
  ModalVariant,
  { title: string; desc: string; close: string; chip: string; divider: string }
> = {
  default: {
    title: "text-gray-900",
    desc: "text-gray-500",
    close: "text-gray-400 hover:bg-black/5 hover:text-gray-600",
    chip: "bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/40",
    divider: "border-black/5",
  },
  vivid: {
    title: "text-white",
    desc: "text-white/70",
    close: "text-white/60 hover:bg-white/10 hover:text-white",
    chip: "bg-white/15 text-white",
    divider: "border-white/10",
  },
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Ikon di header — dirender dalam chip. */
  icon?: React.ReactNode;
  children?: React.ReactNode;
  /** Tombol aksi (pinned di bawah). */
  footer?: React.ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  /** Klik backdrop menutup modal (default true). */
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  variant = "default",
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  const reduce = useReducedMotion();
  const h = HEADER[variant];

  // Portal ke <body> agar modal lolos dari stacking context induk (mis. <main>
  // yang overflow) — kalau tidak, footer/elemen lain bisa menembus di atasnya.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Escape untuk menutup
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Kunci scroll body saat modal terbuka
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // easeOutExpo — deselerasi halus, terasa "premium" tanpa pantulan
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const panelInitial = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96, y: 12 };
  const panelAnimate = reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 };
  const panelExit = reduce
    ? { opacity: 0, transition: { duration: 0.15 } }
    : {
        opacity: 0,
        scale: 0.98,
        y: 8,
        transition: { duration: 0.2, ease: "easeIn" as const },
      };

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease }}
          onClick={closeOnBackdrop ? onClose : undefined}
        >
          {/* Scrim ringan — halaman tetap terlihat (bukan backdrop pekat). Kesan
             "liquid" datang dari rim panel yang dipertegas, bukan dari backdrop. */}
          <div className="absolute inset-0 bg-slate-950/25" />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 w-full rounded-3xl p-px",
              FRAME[variant],
              SIZE[size],
              className,
            )}
            initial={panelInitial}
            animate={panelAnimate}
            exit={panelExit}
            transition={{
              duration: reduce ? 0.15 : 0.34,
              ease,
              delay: reduce ? 0 : 0.04,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[23px]",
                GLASS[variant],
              )}
            >
              {/* Sheen: cahaya lembut menyapu tepi atas kaca (kebanyakan di area padding) */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b to-transparent",
                  variant === "vivid" ? "from-white/20" : "from-white/60",
                )}
              />
              {(icon || title || description) && (
                <div
                  className={cn(
                    "flex shrink-0 items-start gap-3 p-6 pb-4",
                    (children || footer) && "border-b",
                    h.divider,
                  )}
                >
                  {icon && (
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        h.chip,
                      )}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    {title && (
                      <h3 className={cn("text-base font-semibold", h.title)}>
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className={cn("mt-0.5 text-sm", h.desc)}>
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup"
                    className={cn(
                      "-mr-1 -mt-1 rounded-lg p-1.5 transition-colors",
                      h.close,
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {children && (
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {children}
                </div>
              )}

              {footer && (
                <div
                  className={cn(
                    "flex shrink-0 flex-wrap justify-end gap-2 border-t p-6 pt-4",
                    h.divider,
                  )}
                >
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}
