"use client";

/**
 * Learning Nexus Design System — Sidebar
 *
 * Sidebar "light glass" mengambang ala Mac Settings + sentuhan brand LN
 * (tint indigo, chip ikon, pill aktif gradient). Presentational & token-driven —
 * semua data (menu, role, badge, status) di-inject dari luar; komponen ini hanya
 * merender tampilannya. Siap ekstrak ke `@learning-nexus/design-system`.
 *
 * Susunan umum:
 *   <SidebarBackdrop open onClose />
 *   <Sidebar open>
 *     <SidebarBrand title="Learning Nexus" badge="Portal" onClose />
 *     <SidebarProfile name subtitle avatar onClick … />
 *     <SidebarNav>
 *       <SidebarSection label="…">
 *         <SidebarNavItem icon label active badge onClick />
 *         <SidebarCollapsible icon label active badge>…</SidebarCollapsible>
 *       </SidebarSection>
 *     </SidebarNav>
 *   </Sidebar>
 */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/src/lib/cn";

// ── Container (floating glass panel) ─────────────────────────────────────────
export function Sidebar({
  open = false,
  className,
  children,
  credit,
}: {
  /** Off-canvas di mobile; di desktop selalu tampil (lg:static). */
  open?: boolean;
  className?: string;
  children: React.ReactNode;
  /**
   * Kredit di dasar sidebar. Default (undefined) = mark Learning Nexus —
   * SELALU muncul di setiap sidebar LN. `null` untuk menyembunyikan, atau isi
   * ReactNode sendiri untuk mengganti.
   */
  credit?: React.ReactNode;
}) {
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 flex h-full w-60 flex-col overflow-hidden",
        "bg-indigo-50/70 backdrop-blur-2xl ring-1 ring-inset ring-white/60",
        "transform transition-transform duration-200 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:z-auto lg:m-2.5 lg:h-auto lg:rounded-3xl",
        "lg:border lg:border-white/70 lg:shadow-xl lg:shadow-indigo-950/5",
        className,
      )}
    >
      {children}
      {credit === undefined ? (
        <SidebarFooter>
          © Learning Nexus · <span className="text-gray-500">by Hasrul Sani</span>
        </SidebarFooter>
      ) : (
        credit
      )}
    </aside>
  );
}

// ── Mobile backdrop ──────────────────────────────────────────────────────────
export function SidebarBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />;
}

// ── Brand header ─────────────────────────────────────────────────────────────
export function SidebarBrand({
  title,
  badge,
  onClose,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-5">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold tracking-tight text-gray-900">{title}</span>
        {badge && (
          <span className="rounded bg-linear-to-br from-brand-start to-brand-end px-1.5 py-0.5 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 lg:hidden" aria-label="Tutup menu">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ── Profile card ─────────────────────────────────────────────────────────────
export function SidebarProfile({
  name,
  subtitle,
  avatar,
  onClick,
  ringColorHex,
  ringColorClass,
  ringPulse,
  title,
}: {
  name: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Konten avatar (inisial / <img>) — dibungkus lingkaran gradient brand. */
  avatar: React.ReactNode;
  onClick?: () => void;
  /** Ring status opsional (mis. kehadiran). Hex untuk ping, class untuk ring warna. */
  ringColorHex?: string;
  ringColorClass?: string;
  ringPulse?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-white/80"
    >
      <div className="relative h-9 w-9 shrink-0">
        {ringPulse && ringColorHex && (
          <span className="absolute inset-0 animate-ping rounded-full opacity-70" style={{ backgroundColor: ringColorHex }} />
        )}
        <div
          className={cn(
            "relative z-10 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-brand-start to-brand-end",
            ringColorClass && `ring-2 ring-offset-2 ring-offset-white ${ringColorClass}`,
          )}
        >
          {avatar}
        </div>
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
      </div>
    </button>
  );
}

// ── Nav scroll area ──────────────────────────────────────────────────────────
export function SidebarNav({ children, className }: { children: React.ReactNode; className?: string }) {
  return <nav className={cn("flex-1 space-y-0.5 overflow-y-auto px-3 py-4", className)}>{children}</nav>;
}

// ── Footer (kredit mini, mengendap di dasar sidebar) ─────────────────────────
export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("shrink-0 border-t border-black/5 px-5 py-3.5 text-[11px] leading-relaxed text-gray-400", className)}>
      {children}
    </div>
  );
}

// ── Section (label + group) ──────────────────────────────────────────────────
export function SidebarSection({
  label,
  children,
  className,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ── Chip ikon (internal) ─────────────────────────────────────────────────────
function NavChip({
  variant,
  indent,
  children,
}: {
  variant: "idle" | "onGradient" | "brand";
  indent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg transition-colors",
        indent ? "h-6 w-6" : "h-7 w-7",
        variant === "onGradient" && "bg-white/25 text-white",
        variant === "brand" && "bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/30",
        variant === "idle" && "bg-white text-gray-500 shadow-sm ring-1 ring-black/5 group-hover/nav:text-gray-800",
      )}
    >
      {children}
    </span>
  );
}

// ── Badge notif (internal) ───────────────────────────────────────────────────
function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ── Nav item ─────────────────────────────────────────────────────────────────
export function SidebarNavItem({
  icon,
  label,
  active = false,
  badge = 0,
  onClick,
  indent = false,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/nav flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors duration-100",
        active
          ? "bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/30"
          : "text-gray-600 hover:bg-black/5 hover:text-gray-900",
      )}
    >
      <NavChip variant={active ? "onGradient" : "idle"} indent={indent}>
        {icon}
      </NavChip>
      <span className="flex-1 text-left">{label}</span>
      <NavBadge count={badge} />
    </button>
  );
}

// ── Collapsible group ────────────────────────────────────────────────────────
export function SidebarCollapsible({
  icon,
  label,
  active = false,
  badge = 0,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group/nav flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors duration-100",
          active ? "bg-black/5 text-gray-900" : "text-gray-600 hover:bg-black/5 hover:text-gray-900",
        )}
      >
        <NavChip variant={active ? "brand" : "idle"}>{icon}</NavChip>
        <span className="flex min-w-0 flex-1 items-center gap-1 text-left">
          <span className="truncate">{label}</span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="shrink-0"
          >
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </motion.span>
        </span>
        <NavBadge count={badge} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 ml-3 space-y-0.5 border-l border-black/10 pl-3 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
