"use client";

import React, { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ImagePlus,
  Eye,
  Pencil,
} from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { renderFeedbackText } from "./feedbackText";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Unggah gambar ke R2 (reuse endpoint Bank Soal, admin-only). Kembalikan URL. */
async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("cbt_access_token");
  const form = new FormData();
  form.append("file", file);
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${base}/api/questions/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Gagal mengunggah gambar.");
  return data.image_url as string;
}

/**
 * Editor deskripsi Masukan & Perbaikan: Textarea + toolbar penanda
 * (**tebal**, *miring*, __garis__, daftar) + sisip gambar (→ R2) + pratinjau.
 * Disimpan sebagai teks bertanda, dirender AMAN oleh `renderFeedbackText`.
 */
export const FeedbackDescriptionEditor: React.FC<Props> = ({
  value,
  onChange,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const wrap = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const selected = value.slice(start, end);
    const next =
      value.slice(0, start) + marker + selected + marker + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + marker.length + selected.length + marker.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const insertAtLineStart = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const appendSnippet = (snippet: string) => {
    const glue = value && !value.endsWith("\n") ? "\n" : "";
    onChange(value + glue + snippet + "\n");
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (jpg, png, webp, dsb).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      appendSnippet(`![${file.name}](${url})`);
      toast.success("Gambar disisipkan.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal mengunggah gambar."));
    } finally {
      setUploading(false);
    }
  };

  const btnClass =
    "h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-brand hover:bg-indigo-50 hover:border-indigo-300 transition-colors inline-flex items-center gap-1.5";

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
        <button type="button" onClick={() => wrap("**")} title="Tebal" className={btnClass}>
          <Bold className="w-3.5 h-3.5" /> Tebal
        </button>
        <button type="button" onClick={() => wrap("*")} title="Miring" className={btnClass}>
          <Italic className="w-3.5 h-3.5" /> Miring
        </button>
        <button type="button" onClick={() => wrap("__")} title="Garis" className={btnClass}>
          <Underline className="w-3.5 h-3.5" /> Garis
        </button>
        <button type="button" onClick={() => insertAtLineStart("- ")} title="Daftar" className={btnClass}>
          <List className="w-3.5 h-3.5" /> Daftar
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Sisipkan gambar"
          className="h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-brand hover:bg-indigo-50 hover:border-indigo-300 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <ImagePlus className="w-3.5 h-3.5" />{" "}
          {uploading ? "Mengunggah…" : "Gambar"}
        </button>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto h-7 px-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
        >
          {preview ? (
            <Pencil className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {preview ? "Tulis" : "Pratinjau"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickImage}
        />
      </div>

      {preview ? (
        <div className="min-h-40 rounded-xl border border-slate-200 bg-white p-3.5">
          {renderFeedbackText(value)}
        </div>
      ) : (
        <Textarea
          ref={ref}
          rows={9}
          value={value}
          placeholder="Jelaskan detail perbaikan / perubahan logic / fitur baru. Blok kata lalu klik tombol format; pisahkan paragraf dengan baris kosong; gunakan '- ' untuk daftar."
          className="text-sm leading-relaxed"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
          }
        />
      )}
      <p className="text-[11px] text-slate-400">
        Format: <span className="font-mono">**tebal**</span>,{" "}
        <span className="font-mono">*miring*</span>,{" "}
        <span className="font-mono">__garis__</span>, daftar dengan{" "}
        <span className="font-mono">- </span>.
      </p>
    </div>
  );
};
