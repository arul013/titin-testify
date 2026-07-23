"use client";

/**
 * Learning Nexus — Floating Action Button (liquid-glass, on-brand).
 *
 * FAB adalah lapisan mengambang → glassmorphism dipakai di sini (sesuai prinsip DS:
 * glass hanya untuk overlay/floating). Tombol utama = gradient brand dengan sheen
 * kaca + glow; speed-dial minis & label = frosted white glass.
 *
 * Single action → pill yang mengembang saat hover. Multiple → Speed Dial.
 */

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

export interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface FABProps {
  /** Single action → plain FAB. Multiple actions → Speed Dial. */
  actions: FABAction[];
  /** Extra bottom offset (e.g. if there's a footer bar). Defaults to "2rem". */
  bottom?: string;
}

// Kilau kaca atas — kesan "liquid glass" di atas fill gradient brand.
function Sheen() {
  return (
    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-linear-to-b from-white/30 to-transparent" />
  );
}

// ─── Single-action FAB (liquid-glass, on-brand) ───────────────────────────────

function SingleFAB({ action }: { action: FABAction }) {
  const [hovered, setHovered] = useState(false);
  const labelLen = action.label.length;
  const expandedWidth = Math.max(172, 130 + labelLen * 7);

  return (
    <motion.button
      onClick={action.onClick}
      disabled={action.disabled}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={[
        "group relative flex h-14 items-center overflow-hidden rounded-full text-white cursor-pointer",
        "bg-linear-to-br from-brand-start to-brand-end",
        "ring-1 ring-inset ring-white/25",
        "shadow-[0_12px_34px_-10px_rgba(124,58,237,0.65)] hover:shadow-[0_16px_46px_-10px_rgba(124,58,237,0.85)]",
        "transition-shadow duration-300",
        "disabled:from-gray-400 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed",
      ].join(" ")}
      animate={{ width: hovered ? expandedWidth : 56, paddingRight: hovered ? 22 : 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.95 }}
      style={{ willChange: "width, transform" }}
    >
      <Sheen />
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <Plus className="h-6 w-6 drop-shadow-sm" />
      </div>
      <motion.span
        className="relative whitespace-nowrap text-sm font-semibold"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.18, delay: hovered ? 0.08 : 0 }}
      >
        {action.label}
      </motion.span>
    </motion.button>
  );
}

// ─── Speed Dial FAB (multiple actions) ────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const actionVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26, delay: i * 0.06 },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: 8,
    scale: 0.9,
    transition: { duration: 0.14, delay: i * 0.03, ease: "easeIn" as const },
  }),
};

function SpeedDialFAB({ actions }: { actions: FABAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Reverse so first action is closest to main button
  const reversed = [...actions].reverse();

  return (
    <>
      {/* Backdrop — frost lembut agar konten di belakang meredup */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[2px]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div ref={ref} className="relative z-50 flex flex-col items-end gap-3">
        {/* Speed dial actions */}
        <AnimatePresence>
          {open && (
            <div className="flex flex-col items-end gap-2.5">
              {reversed.map((action, i) => (
                <motion.div
                  key={action.label}
                  custom={reversed.length - 1 - i}
                  variants={actionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center gap-3"
                >
                  {/* Label chip — frosted light glass */}
                  <div className="select-none whitespace-nowrap rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md ring-1 ring-inset ring-black/5 backdrop-blur-xl">
                    {action.label}
                  </div>
                  {/* Mini action button — frosted white glass, ikon brand */}
                  <button
                    onClick={() => {
                      if (!action.disabled) {
                        action.onClick();
                        setOpen(false);
                      }
                    }}
                    disabled={action.disabled}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-brand shadow-lg ring-1 ring-inset ring-white/60 backdrop-blur-xl transition-all hover:bg-white hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {action.icon}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB button — brand liquid glass */}
        <motion.button
          onClick={() => setOpen((v) => !v)}
          className={[
            "relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-white",
            "bg-linear-to-br from-brand-start to-brand-end",
            "ring-1 ring-inset ring-white/25",
            "shadow-[0_12px_34px_-10px_rgba(124,58,237,0.65)] hover:shadow-[0_16px_46px_-10px_rgba(124,58,237,0.85)]",
            "transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2",
          ].join(" ")}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          whileTap={{ scale: 0.93 }}
          style={{ willChange: "transform" }}
        >
          <Sheen />
          <Plus className="relative h-6 w-6 drop-shadow-sm" />
        </motion.button>
      </div>
    </>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────────

export function FAB({ actions, bottom = "2rem" }: FABProps) {
  if (actions.length === 0) return null;

  return (
    <motion.div
      className="fixed right-8 z-50"
      style={{ bottom }}
      initial={{ opacity: 0, scale: 0.6, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 24, delay: 0.1 }}
    >
      {actions.length === 1 ? (
        <SingleFAB action={actions[0]} />
      ) : (
        <SpeedDialFAB actions={actions} />
      )}
    </motion.div>
  );
}
