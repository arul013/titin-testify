"use client";

/**
 * Learning Nexus Design System — ListToolbar
 *
 * Toolbar untuk halaman list: Search + Sort (popover) + toggle Grid/List.
 * Presentational & token-driven. Sesuai prinsip DS: popover Sort = lapisan
 * mengambang → glass penuh; kontrol inline (search & toggle) = frosted rapi
 * (bg-white/80 + blur) agar teks tetap tajam, bukan glass yang muddy.
 *
 * Sort dimodelkan sebagai daftar opsi dengan `value` opaque (mis. "date-desc")
 * supaya komponen tetap generik — konsumen yang memetakan value → field/dir.
 *
 * Contoh:
 *   <ListToolbar
 *     search={search} onSearchChange={setSearch} searchPlaceholder="Cari materi..."
 *     sortOptions={SORT_OPTIONS} sortValue={sort} onSortChange={setSort}
 *     view={view} onViewChange={setView}
 *   />
 */

import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  Check,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/src/lib/cn";

export type ListView = "grid" | "list";

export interface SortOption {
  value: string;
  label: string;
}

export interface ListToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;

  sortOptions: SortOption[];
  sortValue: string;
  onSortChange: (value: string) => void;

  /** Toggle Grid/List — hanya dirender bila `view` & `onViewChange` diisi. */
  view?: ListView;
  onViewChange?: (v: ListView) => void;

  className?: string;
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Cari...",
  sortOptions,
  sortValue,
  onSortChange,
  view,
  onViewChange,
  className,
}: ListToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <SortMenu options={sortOptions} value={sortValue} onChange={onSortChange} />
      {view && onViewChange && (
        <ViewToggle value={view} onChange={onViewChange} />
      )}
    </div>
  );
}

// ─── Search ───────────────────────────────────────────────────────────────────

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-55 flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl bg-white/80 pl-10 pr-9 text-sm text-gray-800 shadow-sm outline-none ring-1 ring-inset ring-black/5 backdrop-blur-xl transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-brand/40"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => onChange("")}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sort (glass popover) ──────────────────────────────────────────────────────

function SortMenu({
  options,
  value,
  onChange,
}: {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-xl bg-white/80 px-3.5 text-sm font-medium text-gray-600 shadow-sm outline-none ring-1 ring-inset ring-black/5 backdrop-blur-xl transition hover:ring-black/10 focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <ArrowUpDown className="h-4 w-4 text-gray-400" />
        <span className="hidden sm:inline">{selected?.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-30 mt-2 w-48 origin-top-right overflow-hidden rounded-2xl bg-white/80 p-1 shadow-[0_20px_50px_-12px_rgba(2,6,23,0.25)] ring-1 ring-inset ring-white/60 backdrop-blur-2xl"
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-gray-700 hover:bg-black/5",
                  )}
                >
                  {opt.label}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle Grid/List (segmented, indikator geser) ─────────────────────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: ListView;
  onChange: (v: ListView) => void;
}) {
  const uid = useId();
  const opts: { v: ListView; Icon: typeof LayoutGrid; label: string }[] = [
    { v: "grid", Icon: LayoutGrid, label: "Tampilan grid" },
    { v: "list", Icon: List, label: "Tampilan list" },
  ];

  return (
    <div className="flex h-11 items-center gap-1 rounded-xl bg-white/70 p-1 shadow-sm ring-1 ring-inset ring-black/5 backdrop-blur-xl">
      {opts.map(({ v, Icon, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {active && (
              <motion.span
                layoutId={`${uid}-view-indicator`}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-linear-to-br from-brand-start to-brand-end shadow-sm"
              />
            )}
            <Icon
              className={cn(
                "relative h-4 w-4 transition-colors",
                active ? "text-white" : "text-gray-400",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
