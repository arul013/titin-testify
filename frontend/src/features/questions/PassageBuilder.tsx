"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { FileUploader } from "@/components/ui/file-uploader";
import { UnderlineEditor } from "./UnderlineEditor";
import { RichPassageEditor } from "./RichPassageEditor";
import { PassageView } from "./PassageView";
import { renderExamText } from "./examText";
import { BankSoalBuilder } from "./BankSoalBuilder";
import {
  Music,
  FileText,
  ChevronDown,
  Image as ImageIcon,
  X,
  Lightbulb,
  CornerDownLeft,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { Passage } from "./hooks/useQuestions";

interface PassageBuilderProps {
  initialData?: Passage | null;
  /** Jenis materi untuk record baru (dipilih lewat modal sebelum builder dibuka). */
  defaultType?: string;
  onCancel: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draf" },
  { value: "published", label: "Tayang" },
];

const TYPE_META: Record<string, { label: string; short: string }> = {
  listening: {
    label: "Listening Comprehension (Audio)",
    short: "Materi Soal (Audio)",
  },
  reading: {
    label: "Reading Comprehension (Teks)",
    short: "Materi Soal (Teks Bacaan)",
  },
  structure: {
    label: "Structure Section (Teks)",
    short: "Materi Soal (Structure)",
  },
  written_expression: {
    label: "Written Expression (Teks)",
    short: "Materi Soal (Written Expression)",
  },
};

export const PassageBuilder: React.FC<PassageBuilderProps> = ({
  initialData,
  defaultType,
  onCancel,
  onSubmit,
}) => {
  const type = initialData?.type || defaultType || "reading";
  const [content, setContent] = useState(initialData?.content || "");
  const [audioUrl, setAudioUrl] = useState(initialData?.audio_url || "");
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");
  const [useImage, setUseImage] = useState(!!initialData?.image_url);
  const [imagePosition, setImagePosition] = useState(
    initialData?.image_position || "below",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Jalur "tempel URL audio" — opsi lanjutan (admin teknis). Tersembunyi default;
  // otomatis terbuka bila record lama memang sudah punya URL manual.
  const [showAudioUrlInput, setShowAudioUrlInput] = useState(
    !!initialData?.audio_url,
  );

  const isEditing = !!initialData;
  const meta = TYPE_META[type] ?? { label: type, short: "Materi Soal" };

  const uploadAudioFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error(
        "File yang diunggah harus berformat audio (mp3, wav, m4a, dsb).",
      );
      return;
    }
    setIsUploading(true);
    try {
      const storedToken = localStorage.getItem("cbt_access_token");
      const formData = new FormData();
      formData.append("file", file);
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_BASE_URL}/api/questions/upload-audio`,
        {
          method: "POST",
          headers: storedToken
            ? { Authorization: `Bearer ${storedToken}` }
            : {},
          body: formData,
        },
      );
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(
          responseData.detail || "Gagal mengunggah file audio ke server.",
        );
      setAudioUrl(responseData.audio_url);
      toast.success("Audio berhasil diunggah.");
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Gagal mengunggah audio. Coba lagi, atau hubungi admin bila masalah berlanjut.",
        ),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(
        "File yang diunggah harus berformat gambar (jpg, png, webp, dsb).",
      );
      return;
    }
    setIsUploadingImage(true);
    try {
      const storedToken = localStorage.getItem("cbt_access_token");
      const formData = new FormData();
      formData.append("file", file);
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_BASE_URL}/api/questions/upload-image`,
        {
          method: "POST",
          headers: storedToken
            ? { Authorization: `Bearer ${storedToken}` }
            : {},
          body: formData,
        },
      );
      const responseData = await response.json();
      if (!response.ok)
        throw new Error(
          responseData.detail || "Gagal mengunggah gambar ke server.",
        );
      setImageUrl(responseData.image_url);
      toast.success("Gambar berhasil diunggah.");
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          "Gagal mengunggah gambar. Coba lagi, atau hubungi admin bila masalah berlanjut.",
        ),
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        content: type === "listening" ? content || null : content,
        audio_url: type === "listening" ? audioUrl : null,
        // Kirim '' (bukan null) saat gambar dimatikan agar backend menghapusnya
        // (update passage hanya menerapkan field yang bukan-None).
        image_url: useImage ? imageUrl : "",
        image_position: imagePosition,
        status,
      });
      onCancel();
    } catch {
      // error di-handle parent (toast)
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Panel editor (kiri) ───────────────────────────────────
  const editor = (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-5 ${type === "reading" ? "min-h-full" : ""}`}
    >
      {/* Jenis materi (terkunci) + status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Jenis Materi
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            {type === "listening" ? (
              <Music className="w-4 h-4 text-indigo-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span className="text-sm font-semibold text-slate-700 truncate">
              {meta.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Jenis materi ditetapkan saat membuat dan tidak bisa diubah.
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Status
          </label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">
            <span className="font-bold">Draf</span> disimpan tapi belum dipakai
            · <span className="font-bold">Tayang</span> berarti materi siap
            digunakan.
          </p>
        </div>
      </div>

      {/* Listening — pengaturan audio */}
      {type === "listening" && (
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-4">
          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-4 h-4 text-indigo-600" />
            Pengaturan Audio Listening
          </h4>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Unggah File Audio
            </label>
            <FileUploader
              variant="dropzone"
              accept="audio/*"
              disabled={isUploading}
              icon={<Music />}
              label="Klik atau seret file audio ke sini"
              hint="Format mp3, wav, m4a, dan sejenisnya"
              onFilesSelected={([f]) => uploadAudioFile(f)}
              onError={(m) => toast.error(m)}
            />
            {isUploading && (
              <p className="text-[10px] text-indigo-600 animate-pulse mt-1">
                Mengunggah audio...
              </p>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowAudioUrlInput((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showAudioUrlInput ? "rotate-180" : ""}`}
              />
              Opsi lanjutan: tempel URL audio
            </button>
            {showAudioUrlInput && (
              <div className="mt-2">
                <Input
                  value={audioUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAudioUrl(e.target.value)
                  }
                  placeholder="https://example.com/audio.mp3"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tempel tautan audio bila Anda sudah punya file di layanan
                  lain.
                </p>
              </div>
            )}
          </div>
          {audioUrl && (
            <div className="pt-2 border-t border-indigo-100">
              <p className="text-[10px] font-bold text-slate-500 mb-1">
                Preview Player:
              </p>
              <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>
      )}

      {/* Teks bacaan / transkrip */}
      <div
        className={
          type === "reading" ? "flex flex-col flex-1 min-h-[50vh]" : ""
        }
      >
        <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          {type === "listening"
            ? "Teks Transkrip / Catatan Pembantu (Opsional)"
            : "Teks Bacaan"}
        </label>
        {type === "written_expression" ? (
          <>
            <UnderlineEditor
              variant="plain"
              value={content}
              onChange={setContent}
              rows={6}
              required
              showPreview={false}
              placeholder="Tulis kalimat, lalu blok kata dan klik Garis bawahi untuk menandai bagian yang digarisbawahi."
            />
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Blok kata pada teks, lalu klik <strong>Garis bawahi</strong> untuk
              menandai bagian yang akan tampil bergaris bawah bagi peserta.
            </p>
          </>
        ) : type === "reading" ? (
          <>
            <div className="flex-1 min-h-0">
              <RichPassageEditor
                value={content}
                onChange={setContent}
                rows={12}
                required
                showPreview={false}
                fill
                placeholder={
                  "Tulis atau tempel teks bacaan.\nPisahkan tiap paragraf dengan satu baris kosong (baris pertamanya otomatis menjorok).\nBlok kata lalu klik Tebal / Miring / Garis bawah untuk memformat."
                }
              />
            </div>
            <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 flex flex-col gap-2">
              <p className="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Lightbulb className="w-3.5 h-3.5" /> Tips menulis teks bacaan
              </p>
              <ul className="flex flex-col gap-2 text-[11px] text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-slate-700">Paragraf baru?</strong>{" "}
                    Tekan{" "}
                    <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                      Enter
                    </kbd>{" "}
                    <strong>dua kali</strong> (sisakan satu baris kosong). Baris
                    pertama tiap paragraf otomatis <strong>menjorok</strong> —
                    persis gaya bacaan TOEFL.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Hash className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-slate-700">Nomor baris</strong>{" "}
                    muncul otomatis di sisi kiri setiap <strong>5 baris</strong>{" "}
                    — tak perlu kamu ketik.
                  </span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <Textarea
            rows={10}
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setContent(e.target.value)
            }
            placeholder="Tulis teks bacaan di sini..."
            required={type !== "listening"}
          />
        )}
      </div>

      {/* Gambar materi (opsional, via checkbox) — untuk passage berbasis teks */}
      {type !== "listening" && (
        <div>
          <Checkbox
            checked={useImage}
            onChange={(v) => {
              setUseImage(v);
              if (!v) setImageUrl("");
            }}
            label={
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Materi ini
                memakai gambar
              </span>
            }
          />
          {useImage && (
            <div className="mt-3 flex flex-col gap-3">
              {imageUrl ? (
                <div className="relative inline-block w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Gambar materi"
                    className="max-h-48 rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    title="Hapus gambar"
                    className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <FileUploader
                  variant="dropzone"
                  accept="image/*"
                  disabled={isUploadingImage}
                  icon={<ImageIcon />}
                  label="Klik atau seret gambar ke sini"
                  hint="Format jpg, png, webp, dan sejenisnya"
                  onFilesSelected={([f]) => uploadImageFile(f)}
                  onError={(m) => toast.error(m)}
                />
              )}
              {isUploadingImage && (
                <p className="text-[10px] text-indigo-600 animate-pulse">
                  Mengunggah gambar...
                </p>
              )}

              {/* Posisi gambar relatif teks */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-slate-600">
                  Posisi gambar:
                </span>
                <ToggleGroup
                  size="sm"
                  value={imagePosition}
                  onChange={(v) => v && setImagePosition(v)}
                  options={[
                    { value: "below", label: "Di bawah teks" },
                    { value: "above", label: "Di atas teks" },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEditing ? "Simpan Materi" : "Tambah Materi"}
        </Button>
      </div>
    </form>
  );

  // ─── Panel preview (kanan) — materi seperti dilihat peserta ─
  const showImg = useImage && !!imageUrl;
  const hasBody = !!(content || audioUrl || showImg);
  const imgNode = showImg ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key="img"
      src={imageUrl}
      alt="Gambar materi"
      className="max-w-full rounded-xl border border-slate-200/50 shadow-sm"
    />
  ) : null;
  const textNode = content ? (
    <div
      key="text"
      className="text-slate-700 text-sm leading-loose whitespace-pre-wrap font-sans bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm"
    >
      {type === "reading" ? (
        <PassageView content={content} />
      ) : (
        renderExamText(content)
      )}
    </div>
  ) : null;
  const preview = () => (
    <div className="flex flex-col gap-4 bg-slate-50/70 border border-slate-100 p-5 rounded-2xl">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
        {type === "listening" ? (
          <Music className="w-4 h-4 text-slate-400" />
        ) : (
          <FileText className="w-4 h-4 text-slate-400" />
        )}
        {meta.short}
      </h3>

      {!hasBody ? (
        <div className="text-slate-400 text-xs italic flex items-center justify-center h-48 border border-dashed border-slate-200 rounded-xl bg-white">
          Isi materi di panel kiri untuk melihat pratinjaunya di sini.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {audioUrl && (
            <div className="bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                <Music className="w-4 h-4 text-indigo-600" />
                Listening Audio Player
              </div>
              <audio src={audioUrl} controls className="w-full h-8" />
            </div>
          )}
          {imagePosition === "above"
            ? [imgNode, textNode]
            : [textNode, imgNode]}
        </div>
      )}
    </div>
  );

  return (
    <BankSoalBuilder
      title={isEditing ? "Edit Materi" : "Buat Materi"}
      onCancel={onCancel}
      editor={editor}
      preview={preview}
    />
  );
};
