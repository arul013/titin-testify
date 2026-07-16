"use client";

/**
 * Learning Nexus Design System — EmptyState
 *
 * Kondisi kosong: ikon dalam chip brand-tint (satu-satunya percikan warna),
 * teks abu, whitespace lega, opsional CTA. Presentational & token-driven.
 *
 * Contoh:
 *   <EmptyState icon={<Users />} title="Belum ada kelas"
 *     description="Kelas yang ditugaskan akan muncul di sini."
 *     action={<Button>Tambah</Button>} />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15 [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
