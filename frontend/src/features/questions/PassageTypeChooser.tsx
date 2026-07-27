'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Layers, Music, FileText, AlignLeft, PencilLine, ChevronRight } from 'lucide-react';
import type { BankSoalSection } from './hooks/useBankSoalPage';

interface PassageTypeChooserProps {
  open: boolean;
  onClose: () => void;
  onChoose: (type: string) => void;
  /** Bagian jenis tes ruang → pilihan jenis materi. */
  sections: BankSoalSection[];
}

// Ikon & deskripsi untuk kode bagian yang dikenal (fallback generik untuk kode baru).
const KNOWN: Record<string, { desc: string; icon: React.ReactNode }> = {
  reading: {
    desc: 'Teks bacaan panjang yang dibagi beberapa soal.',
    icon: <FileText className="w-5 h-5" />,
  },
  listening: {
    desc: 'Audio yang diputar, lalu soal mengacu ke audio itu.',
    icon: <Music className="w-5 h-5" />,
  },
  structure: {
    desc: 'Teks/kalimat bersama untuk beberapa soal Structure.',
    icon: <AlignLeft className="w-5 h-5" />,
  },
  written_expression: {
    desc: 'Kalimat bergaris bawah untuk beberapa soal.',
    icon: <PencilLine className="w-5 h-5" />,
  },
};

/**
 * Modal ringan: hanya memilih JENIS materi. Setelah dipilih, builder materi
 * halaman-penuh (2-panel) yang dibuka untuk mengisi kontennya.
 */
export const PassageTypeChooser: React.FC<PassageTypeChooserProps> = ({ open, onClose, onChoose, sections }) => {
  const TYPES = sections.map((s) => ({
    value: s.code,
    label: s.name,
    desc: KNOWN[s.code]?.desc ?? 'Materi bersama untuk beberapa soal pada bagian ini.',
    icon: KNOWN[s.code]?.icon ?? <Layers className="w-5 h-5" />,
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pilih Jenis Materi"
      description="Materi adalah teks/audio bersama yang dipakai beberapa soal. Pilih jenisnya dulu."
      icon={<Layers className="w-5 h-5" />}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChoose(t.value)}
            className="group flex items-start gap-3 text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              {t.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-800">{t.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
              </span>
              <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
};
