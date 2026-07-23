'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FileUploader } from '@/components/ui/file-uploader';
import { UnderlineEditor } from './UnderlineEditor';
import { Music, FileText, ChevronDown } from 'lucide-react';
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
  { value: 'draft', label: 'Draf' },
  { value: 'published', label: 'Tayang' },
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
  // Jalur "tempel URL audio" adalah opsi lanjutan (untuk admin teknis). Tersembunyi
  // secara default; otomatis terbuka bila record lama memang sudah punya URL manual.
  const [showAudioUrlInput, setShowAudioUrlInput] = useState(!!initialData?.audio_url);

  const isEditing = !!initialData;

  const uploadAudioFile = async (file: File) => {
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
      toast.success('Audio berhasil diunggah.');
    } catch (err) {
      console.error('Error uploading audio:', err);
      toast.error(getErrorMessage(err, 'Gagal mengunggah audio. Coba lagi, atau hubungi admin bila masalah berlanjut.'));
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
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Materi' : 'Tambah Materi Baru'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Type & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Jenis Materi</label>
            <Select value={type} onChange={(e) => setType(e.target.value)} disabled={isEditing}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">
              <span className="font-bold">Draf</span> disimpan tapi belum dipakai ·{' '}
              <span className="font-bold">Tayang</span> berarti materi siap digunakan.
            </p>
          </div>
        </div>

        {/* Listening Specific fields */}
        {type === 'listening' && (
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-4 h-4 text-indigo-600" />
              Pengaturan Audio Listening
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Unggah File Audio</label>
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
              {isUploading && <p className="text-[10px] text-indigo-600 animate-pulse mt-1">Mengunggah audio...</p>}
            </div>

            {/* Opsi lanjutan: tempel URL audio (untuk admin teknis) — tersembunyi default */}
            <div>
              <button
                type="button"
                onClick={() => setShowAudioUrlInput((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAudioUrlInput ? 'rotate-180' : ''}`} />
                Opsi lanjutan: tempel URL audio
              </button>
              {showAudioUrlInput && (
                <div className="mt-2">
                  <Input
                    value={audioUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tempel tautan audio bila Anda sudah punya file di layanan lain.
                  </p>
                </div>
              )}
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
            {type === 'listening' ? 'Teks Transkrip / Catatan Pembantu (Opsional)' : 'Teks Bacaan'}
          </label>
          {type === 'written_expression' ? (
            <>
              <UnderlineEditor
                variant="plain"
                value={content}
                onChange={setContent}
                rows={6}
                required
                placeholder="Tulis kalimat, lalu blok kata dan klik Garis bawahi untuk menandai bagian yang digarisbawahi."
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Blok kata pada teks, lalu klik <strong>Garis bawahi</strong> untuk menandai bagian yang
                akan tampil bergaris bawah bagi peserta.
              </p>
            </>
          ) : (
            <Textarea
              rows={10}
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder="Tulis teks bacaan di sini..."
              required={type !== 'listening'}
            />
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Simpan Materi' : 'Tambah Materi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
