'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Music, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import type { Passage } from './hooks/useQuestions';

interface PassageFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  initialData?: Passage | null;
  defaultType?: string;
}

const TYPE_OPTIONS = [
  { value: 'listening', label: 'Listening Comprehension (Audio)' },
  { value: 'reading', label: 'Reading Comprehension (Text)' },
  { value: 'structure', label: 'Structure Section (Text)' },
  { value: 'written_expression', label: 'Written Expression (Text)' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

export const PassageForm: React.FC<PassageFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  defaultType,
}) => {
  // State di-init langsung dari props. Parent memberi `key` unik agar form
  // remount (state fresh) tiap kali record berbeda dibuka — tidak perlu effect sinkronisasi.
  const [type, setType] = useState(initialData?.type || defaultType || 'reading');
  const [content, setContent] = useState(initialData?.content || '');
  const [audioUrl, setAudioUrl] = useState(initialData?.audio_url || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = !!initialData;

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate is audio
    if (!file.type.startsWith('audio/')) {
      toast.error('File yang diunggah harus berformat audio (mp3, wav, m4a, dsb).');
      return;
    }

    setIsUploading(true);
    try {
      const storedToken = localStorage.getItem('cbt_access_token');
      const formData = new FormData();
      formData.append('file', file);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/questions/upload-audio`, {
        method: 'POST',
        headers: storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {},
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || 'Gagal mengunggah file audio ke server.');
      }

      setAudioUrl(responseData.audio_url);
      toast.success('Audio berhasil diunggah ke Cloudflare R2!');
    } catch (err) {
      console.error('Error uploading audio:', err);
      toast.error(getErrorMessage(err, 'Gagal mengunggah file audio. Pastikan kredensial R2 di .env backend sudah benar.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        content: type === 'listening' ? (content || null) : content,
        audio_url: type === 'listening' ? audioUrl : null,
        status,
      });
      onClose();
    } catch {
      // Error handled by toast in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Passage Induk' : 'Tambah Passage Induk Baru'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Type & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Jenis Passage</label>
            <Select value={type} onChange={(e) => setType(e.target.value)} disabled={isEditing}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Status Publikasi</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Listening Specific fields */}
        {type === 'listening' && (
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-4 h-4 text-indigo-600" />
              Pengaturan Audio Listening
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Unggah File Audio</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer bg-white hover:bg-indigo-50/20 hover:border-indigo-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Music className="w-6 h-6 text-indigo-500 mb-1" />
                      <p className="text-[10px] text-slate-500 font-medium">Klik untuk pilih file audio</p>
                    </div>
                    <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} disabled={isUploading} />
                  </label>
                </div>
                {isUploading && <p className="text-[10px] text-indigo-600 animate-pulse mt-1">Mengunggah audio...</p>}
              </div>

              <div className="flex flex-col justify-end">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">URL Audio Langsung</label>
                <Input
                  value={audioUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {audioUrl && (
              <div className="pt-2 border-t border-indigo-100">
                <p className="text-[10px] font-bold text-slate-500 mb-1">Preview Player:</p>
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}
          </div>
        )}

        {/* Text Content */}
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            {type === 'listening' ? 'Teks Transkrip / Catatan Pembantu (Opsional)' : 'Teks Bacaan / Passage'}
          </label>
          <Textarea
            rows={10}
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder={
              type === 'written_expression'
                ? "Tulis kalimat di sini. Gunakan format __kata__ untuk menandai kata yang digarisbawahi. Contoh:\nShe __have__ (A) lived in Jakarta __since__ (B) five years __and__ (C) likes __it__ (D)."
                : "Tulis teks bacaan di sini..."
            }
            required={type !== 'listening'}
          />
          {type === 'written_expression' && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <strong>Format Penulisan:</strong> Gunakan dobel underscore sebelum dan sesudah kata untuk merender garis bawah. 
                Sistem akan memformatnya otomatis menjadi <span className="underline font-bold">seperti ini</span> untuk kenyamanan peserta ujian.
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Simpan Passage' : 'Tambah Passage'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
