"use client";

/**
 * Learning Nexus Design System — StatCard
 *
 * Kartu metrik ringkas: angka besar + label (+ ikon opsional). Solid & token-driven
 * (konten data-dense = solid, bukan glass — sesuai prinsip DS). Dipakai di dashboard
 * KPI, ringkasan check-in, cockpit, dll.
 *
 * Contoh:
 *   <StatCard label="Tutor Aktif" value="8 / 12" valueClassName="text-brand" />
 *   <StatCard label="Total Sesi" value={124} icon={<Video className="h-4 w-4" />} />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Ikon opsional dalam chip brand-tint. */
  icon?: React.ReactNode;
  /** Warna angka (class Tailwind). Default brand. */
  valueClassName?: string;
  align?: "center" | "left";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  valueClassName,
  align = "center",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-inset ring-black/5",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand",
            align === "center" ? "mx-auto" : "",
          )}
        >
          {icon}
        </div>
      )}
      <p className={cn("text-2xl font-bold", valueClassName ?? "text-brand")}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{label}</p>
    </div>
  );
}
