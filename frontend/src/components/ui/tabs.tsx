"use client";

/**
 * Learning Nexus Design System — Tabs (segmented, animated)
 *
 * Segmented control dengan indikator aktif yang MELUNCUR mulus antar-tab
 * (Framer Motion `layoutId`). Track netral/muted, hanya pill aktif yang membawa
 * warna → clean, premium, tetap pattern LN (varian `brand` = gradient indigo→ungu).
 * Controlled & presentational — extraction-safe.
 *
 * Contoh:
 *   <Tabs
 *     value={tab}
 *     onChange={setTab}
 *     tabs={[
 *       { id: "aktif", label: "Aktif" },
 *       { id: "review", label: "Testimoni", badge: 3 },
 *       { id: "riwayat", label: "Riwayat", icon: <History /> },
 *     ]}
 *   />
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/src/lib/cn";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: number;
  icon?: React.ReactNode;
}

export type TabsVariant = "brand" | "glass";

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** "brand" = pill gradient LN (default), "glass" = pill putih frosted. */
  variant?: TabsVariant;
  className?: string;
}

const INDICATOR: Record<TabsVariant, string> = {
  brand: "bg-linear-to-br from-brand-start to-brand-end shadow-sm shadow-indigo-500/30",
  glass: "bg-white/90 shadow-sm ring-1 ring-black/5 backdrop-blur",
};

const ACTIVE_TEXT: Record<TabsVariant, string> = {
  brand: "text-white",
  glass: "text-gray-900",
};

export function Tabs({ tabs, value, onChange, variant = "brand", className }: TabsProps) {
  const indicatorId = React.useId();

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === value);
    if (i < 0) return;
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
    onChange(tabs[next].id);
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-xl bg-gray-100/80 p-1 ring-1 ring-black/5 backdrop-blur-sm",
        className,
      )}
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
              active ? ACTIVE_TEXT[variant] : "text-gray-500 hover:text-gray-800",
            )}
          >
            {active && (
              <motion.span
                layoutId={indicatorId}
                aria-hidden
                className={cn("absolute inset-0 z-0 rounded-lg", INDICATOR[variant])}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {t.icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{t.icon}</span>}
              {t.label}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    active
                      ? variant === "brand"
                        ? "bg-white/25 text-white"
                        : "bg-brand/10 text-brand"
                      : "bg-gray-200 text-gray-500",
                  )}
                >
                  {t.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
