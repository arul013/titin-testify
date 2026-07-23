'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder loading untuk tabel Bank Soal (materi & soal). */
export const BankSoalTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="flex flex-col gap-3 py-4" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-6 w-24 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    ))}
  </div>
);
