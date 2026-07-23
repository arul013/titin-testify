"use client";

/**
 * Learning Nexus Design System — DocumentPreviewModal
 *
 * Pratinjau dokumen in-page (bukan tab baru) untuk URL langsung — pola sama seperti
 * HRD Drive: PDF/CSV/TXT via DocViewer (pdfjs lokal), Office (DOCX/XLSX/PPTX) via
 * Office Online, gambar/video/audio native. Frame = glass premium LN.
 *
 * Contoh:
 *   {file && <DocumentPreviewModal url={u} name={n} mimeType={m} downloadUrl={d} onClose={close} />}
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { X, Download, Loader2, File as FileIcon } from "lucide-react";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

const OFFICE_ONLINE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);
const DOC_VIEWER_MIMES = new Set(["application/pdf", "text/csv", "text/plain"]);
const IMAGE_MIMES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "image/bmp",
]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/wav", "audio/ogg"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

function mimeToFileType(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "text/csv": "csv",
    "text/plain": "txt",
  };
  return map[mime] ?? "pdf";
}

function PreviewLoader() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" /> Memuat pratinjau...
    </div>
  );
}

interface DocViewerWrapperProps {
  uri: string;
  fileType: string;
}
const DocViewerDynamic = dynamic(
  () =>
    import("@cyntler/react-doc-viewer").then((mod) => {
      const DocViewer = mod.default;
      const { DocViewerRenderers } = mod;
      function DocViewerWrapper({ uri, fileType }: DocViewerWrapperProps) {
        return (
          <DocViewer
            documents={[{ uri, fileType }]}
            pluginRenderers={DocViewerRenderers}
            config={{
              header: { disableHeader: true, disableFileName: true },
              pdfZoom: { defaultZoom: 1, zoomJump: 0.2 },
              pdfVerticalScrollByDefault: true,
            }}
            style={{ height: "100%", width: "100%", minHeight: "600px" }}
          />
        );
      }
      DocViewerWrapper.displayName = "DocViewerWrapper";
      return { default: DocViewerWrapper };
    }),
  { ssr: false, loading: () => <PreviewLoader /> },
);

export interface DocumentPreviewModalProps {
  url: string;
  name: string;
  mimeType: string | null;
  /** URL unduh langsung (attachment). Default = url. */
  downloadUrl?: string | null;
  onClose: () => void;
}

export function DocumentPreviewModal({
  url,
  name,
  mimeType,
  downloadUrl,
  onClose,
}: DocumentPreviewModalProps) {
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

  const mime = (mimeType ?? "").toLowerCase();
  const dl = downloadUrl ?? url;

  function renderPreview() {
    if (IMAGE_MIMES.has(mime)) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto bg-slate-50 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={name} className="max-h-full max-w-full rounded-lg object-contain shadow-sm ring-1 ring-black/5" />
        </div>
      );
    }
    if (OFFICE_ONLINE_MIMES.has(mime)) {
      const src = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
      return <iframe src={src} className="absolute inset-0 h-full w-full border-0" title={name} allowFullScreen />;
    }
    if (VIDEO_MIMES.has(mime)) {
      return (
        <div className="flex h-full items-center justify-center bg-black">
          <video controls playsInline src={url} className="max-h-full max-w-full" />
        </div>
      );
    }
    if (AUDIO_MIMES.has(mime)) {
      return (
        <div className="flex h-full items-center justify-center bg-slate-50">
          <audio controls className="w-80 max-w-full">
            <source src={url} type={mime} />
          </audio>
        </div>
      );
    }
    if (DOC_VIEWER_MIMES.has(mime)) {
      return (
        <div className="absolute inset-0 overflow-auto">
          <DocViewerDynamic uri={url} fileType={mimeToFileType(mime)} />
        </div>
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileIcon className="h-12 w-12 text-gray-200" />
        <p className="text-sm text-gray-400">Format ini tidak bisa ditampilkan di browser.</p>
        <a href={dl} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-105">
          Unduh untuk melihat
        </a>
      </div>
    );
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-5xl rounded-3xl bg-linear-to-br from-white/90 via-purple-300/50 to-indigo-400/60 p-px shadow-[0_16px_60px_-12px_rgba(79,70,229,0.6)]"
        style={{ height: "90vh" }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[23px] bg-white ring-1 ring-inset ring-white/70">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-black/5 bg-white/90 px-5 py-3.5 backdrop-blur-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/40">
              <FileIcon className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{name}</p>
            <a
              href={dl}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/15"
            >
              <Download className="h-3.5 w-3.5" /> Unduh
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Area preview */}
          <div className="relative flex-1 overflow-hidden">{renderPreview()}</div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
