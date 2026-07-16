"use client";

/**
 * Learning Nexus Design System — Breadcrumb
 *
 * Data-driven & presentational. Item terakhir (atau item tanpa `href`) = halaman
 * aktif. Link antara hover jadi brand (indigo). Extraction-safe: tidak import
 * `next/link` — lewatkan `linkComponent` (mis. Next `Link`) untuk navigasi SPA;
 * default `<a>` biasa.
 *
 * Contoh:
 *   import Link from "next/link";
 *   <Breadcrumb
 *     linkComponent={Link}
 *     items={[
 *       { label: "Portal", href: "/portal/dashboard" },
 *       { label: "Kelas Saya", href: "/portal/my-enrollments" },
 *       { label: studentName },   // aktif (tanpa href)
 *     ]}
 *   />
 */

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/cn";

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

function DefaultLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Komponen link (mis. Next `Link`) untuk navigasi SPA. Default `<a>`. */
  linkComponent?: LinkLike;
  className?: string;
}

export function Breadcrumb({
  items,
  linkComponent: LinkComp = DefaultLink,
  className,
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-2 text-sm", className)}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            )}
            {item.href && !isLast ? (
              <LinkComp
                href={item.href}
                className="text-gray-400 transition-colors hover:text-brand"
              >
                {item.label}
              </LinkComp>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "truncate",
                  isLast
                    ? "max-w-60 font-medium text-gray-700"
                    : "text-gray-400",
                )}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
