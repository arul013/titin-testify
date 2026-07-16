'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Kontrol pagination sederhana (Sebelum / Berikut). Tidak dirender jika hanya 1 halaman. */
export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPrev, onNext }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
      <span className="text-xs font-semibold text-slate-500 font-sans">
        Halaman {page} dari {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Sebelum
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={onNext}>
          Berikut <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
