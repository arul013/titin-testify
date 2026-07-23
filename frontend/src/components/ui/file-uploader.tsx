"use client";

/**
 * Learning Nexus Design System — FileUploader
 *
 * Pemilih file PRESENTATIONAL: cuma meng-emit `File[]` lewat `onFilesSelected`
 * (validasi `accept`/`maxSizeMB`) — LOGIKA UPLOAD (R2 presigned/proxy) tetap di
 * fitur, sesuai prinsip DS (tanpa business logic / tanpa fetch). `<input type=
 * "file">` = perkecualian native yang diizinkan.
 *
 * Varian:
 *   - "dropzone" (default) → area drag-and-drop + klik.
 *   - "button"             → tombol pemicu dialog file.
 *
 * Contoh:
 *   <FileUploader accept="image/*" maxSizeMB={5}
 *     hint="PNG, JPG — maks 5MB"
 *     onFilesSelected={([f]) => uploadImage(f)}
 *     onError={(m) => toast.error(m)} />
 *
 *   <FileUploader variant="button" accept=".pdf" label="Unggah SK"
 *     onFilesSelected={([f]) => uploadPdf(f)} />
 */

import * as React from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Button } from "./button";

export interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  /** Validasi ukuran maksimum per file (MB). Lewat → `onError`. */
  maxSizeMB?: number;
  /** Atribut accept native (mis. "image/*,.pdf"). */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  variant?: "dropzone" | "button";
  /** Teks utama (dropzone) / label tombol. */
  label?: React.ReactNode;
  /** Teks sekunder di bawah label (dropzone). */
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  onError?: (message: string) => void;
  className?: string;
}

export function FileUploader({
  onFilesSelected,
  maxSizeMB,
  accept,
  multiple = false,
  disabled = false,
  variant = "dropzone",
  label,
  hint,
  icon,
  onError,
  className,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function emit(list: FileList | null) {
    if (!list || list.length === 0) return;
    let files = Array.from(list);
    if (!multiple) files = files.slice(0, 1);
    if (maxSizeMB != null) {
      const limit = maxSizeMB * 1024 * 1024;
      if (files.some((f) => f.size > limit)) {
        onError?.(`Ukuran file maksimal ${maxSizeMB}MB`);
        return;
      }
    }
    onFilesSelected(files);
  }

  function openDialog() {
    if (!disabled) inputRef.current?.click();
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      className="hidden"
      onChange={(e) => {
        emit(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (variant === "button") {
    return (
      <>
        {hiddenInput}
        <Button
          variant="secondary"
          leftIcon={icon ?? <UploadCloud className="h-4 w-4" />}
          disabled={disabled}
          onClick={openDialog}
          className={className}
        >
          {label ?? "Pilih file"}
        </Button>
      </>
    );
  }

  return (
    <>
      {hiddenInput}
      <button
        type="button"
        disabled={disabled}
        onClick={openDialog}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) emit(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand/40",
          dragging
            ? "border-brand bg-brand/5"
            : "border-gray-200 hover:border-brand/40 hover:bg-gray-50/60",
          disabled && "cursor-not-allowed opacity-60 hover:border-gray-200 hover:bg-transparent",
          className,
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand [&_svg]:h-5 [&_svg]:w-5">
          {icon ?? <UploadCloud />}
        </div>
        <p className="text-sm font-medium text-gray-700">
          {label ?? "Seret file ke sini atau klik untuk pilih"}
        </p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </button>
    </>
  );
}
