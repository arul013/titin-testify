"use client";

/**
 * Learning Nexus Design System — ImagePreviewModal
 *
 * Penampil gambar overlay (lightbox) untuk URL langsung. Frame = glass premium LN
 * (rim gradient brand + panel frosted + glow), area gambar tetap netral (abu) agar
 * warna foto terbaca akurat. Presentational & reusable: cukup beri `src` + `title`.
 *
 * Contoh:
 *   {open && <ImagePreviewModal src={url} title="Screenshot Meeting" onClose={close} />}
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Download, Image as ImageIcon } from "lucide-react";

export interface ImagePreviewModalProps {
  src: string;
  title: string;
  description?: string;
  /** Ikon di chip header. Default ikon gambar. */
  icon?: React.ReactNode;
  /** URL unduh; default = src. Beri `null` untuk sembunyikan tombol unduh. */
  downloadUrl?: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({
  src,
  title,
  description,
  icon,
  downloadUrl,
  onClose,
}: ImagePreviewModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  const dl = downloadUrl === undefined ? src : downloadUrl;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      {/* FRAME — rim gradient brand + glow (pola premium LN) */}
      <motion.div
        className="w-full max-w-5xl rounded-3xl bg-linear-to-br from-white/90 via-purple-300/50 to-indigo-400/60 p-px shadow-[0_16px_60px_-12px_rgba(79,70,229,0.6)]"
        style={{ height: "90vh" }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* GLASS — permukaan kaca frosted */}
        <div className="flex h-full flex-col overflow-hidden rounded-[23px] bg-white/90 ring-1 ring-inset ring-white/70 backdrop-blur-2xl backdrop-saturate-150">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-black/5 px-5 py-3.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/40">
              {icon ?? <ImageIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {title}
              </p>
              {description && (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {description}
                </p>
              )}
            </div>
            {dl && (
              <a
                href={dl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/15"
              >
                <Download className="h-3.5 w-3.5" /> Unduh
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Area gambar — netral (abu) agar warna foto akurat */}
          <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={title}
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-black/5"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
