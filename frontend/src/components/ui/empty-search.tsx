"use client";

/**
 * Learning Nexus Design System — EmptySearch
 *
 * Kondisi "pencarian tanpa hasil" — wrapper tipis di atas `EmptyState` dengan
 * ikon search, pesan yang menyebut query, dan tombol "Hapus pencarian" opsional.
 * Dipasangkan dengan `ListToolbar`.
 *
 * Contoh:
 *   <EmptySearch query={q} onClear={() => setQ("")} />
 *   <EmptySearch query={q} description="Coba kata kunci lain." />
 */

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

export interface EmptySearchProps {
  /** Kata kunci yang dicari — ditampilkan di judul. */
  query?: string;
  /** Bila diisi, tampilkan tombol "Hapus pencarian". */
  onClear?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  clearLabel?: React.ReactNode;
  className?: string;
}

export function EmptySearch({
  query,
  onClear,
  title,
  description,
  clearLabel = "Hapus pencarian",
  className,
}: EmptySearchProps) {
  return (
    <EmptyState
      className={className}
      icon={<Search />}
      title={
        title ?? (query ? <>Tidak ada hasil untuk &ldquo;{query}&rdquo;</> : "Tidak ada hasil")
      }
      description={description ?? "Coba kata kunci lain atau ubah filter."}
      action={
        onClear ? (
          <Button variant="secondary" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
