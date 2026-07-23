"use client";

/**
 * Learning Nexus Design System — DataTable (ringan, presentational)
 *
 * Tabel data-driven untuk kasus sederhana (orders, registry, dll). Kolom via
 * `columns` (header + `render` sel + `sortable`/`align`/`width`), baris via
 * `rows`. SORTING dikontrol pemanggil: DataTable hanya menggambar panah &
 * memanggil `onSortChange` — parent yang mengurutkan `rows`. Tidak memaksa
 * migrasi tabel bespoke kompleks (mis. tabel KPI dengan progress bar).
 *
 * Contoh:
 *   <DataTable
 *     columns={[
 *       { key: "name", header: "Nama", sortable: true },
 *       { key: "total", header: "Total", align: "right", render: (r) => rupiah(r.total) },
 *     ]}
 *     rows={rows}
 *     rowKey={(r) => r.id}
 *     sort={sort}
 *     onSortChange={setSort}
 *     onRowClick={(r) => router.push(`/orders/${r.id}`)}
 *     empty={<EmptySearch query={q} onClear={clear} />}
 *   />
 */

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/src/lib/cn";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Isi sel. Default: `row[key]` sebagai string. */
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Class tambahan untuk header + sel kolom ini. */
  className?: string;
  /** Lebar kolom (mis. "120px" / "20%"). */
  width?: string;
}

export interface DataTableSort {
  key: string;
  dir: "asc" | "desc";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort) => void;
  /** Ditampilkan saat `rows` kosong. */
  empty?: React.ReactNode;
  /** Padding sel lebih rapat. */
  dense?: boolean;
  className?: string;
}

const ALIGN: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const JUSTIFY: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function DataTable<T extends object>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  empty,
  dense = false,
  className,
}: DataTableProps<T>) {
  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !onSortChange) return;
    const dir: "asc" | "desc" =
      sort?.key === col.key && sort.dir === "asc" ? "desc" : "asc";
    onSortChange({ key: col.key, dir });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {columns.map((col) => {
                const align = col.align ?? "left";
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => toggleSort(col)}
                    className={cn(
                      "px-4 py-3 text-xs font-medium text-gray-400",
                      ALIGN[align],
                      col.sortable && "cursor-pointer select-none hover:text-gray-600",
                      col.className,
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        JUSTIFY[align],
                        active && "text-brand",
                      )}
                    >
                      {col.header}
                      {col.sortable &&
                        (active ? (
                          sort!.dir === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronDown className="h-3 w-3 opacity-30" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {empty ?? (
                    <div className="py-10 text-center text-sm text-gray-400">
                      Belum ada data.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-gray-50 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-brand/5",
                  )}
                >
                  {columns.map((col) => {
                    const align = col.align ?? "left";
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          dense ? "px-4 py-2" : "px-4 py-3.5",
                          "text-gray-700",
                          ALIGN[align],
                          col.className,
                        )}
                      >
                        {col.render
                          ? col.render(row, i)
                          : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
