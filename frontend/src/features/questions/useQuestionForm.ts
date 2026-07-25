'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import type { Question } from './hooks/useQuestions';

export interface UseQuestionFormArgs {
  initialData?: Question | null;
  passageId?: string | null;
  defaultSection?: string;
}

/**
 * Sumber tunggal state + logika satu soal (section-aware). Dipakai ulang oleh
 * builder halaman-penuh (Soal Tunggal) & kartu inline (soal dalam materi).
 */
export function useQuestionForm({ initialData, passageId, defaultSection }: UseQuestionFormArgs) {
  const [section, setSection] = useState(initialData?.section || defaultSection || 'listening');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'medium');
  const [questionText, setQuestionText] = useState(initialData?.question_text || '');
  const [optionA, setOptionA] = useState(initialData?.option_a || '');
  const [optionB, setOptionB] = useState(initialData?.option_b || '');
  const [optionC, setOptionC] = useState(initialData?.option_c || '');
  const [optionD, setOptionD] = useState(initialData?.option_d || '');
  const [correctAnswer, setCorrectAnswer] = useState(initialData?.correct_answer || 'a');
  const [explanation, setExplanation] = useState(initialData?.explanation || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [useImage, setUseImage] = useState(!!initialData?.image_url);
  const [answerFormat, setAnswerFormat] = useState(initialData?.options_image_url ? 'image' : 'text');
  const [optionsImageUrl, setOptionsImageUrl] = useState(initialData?.options_image_url || '');
  const [audioUrl, setAudioUrl] = useState(initialData?.audio_url || '');
  const [showAudioUrlInput, setShowAudioUrlInput] = useState(!!initialData?.audio_url);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingOptionsImage, setIsUploadingOptionsImage] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!initialData;
  const answerLabels = ['A', 'B', 'C', 'D'];
  const answerValues = [optionA, optionB, optionC, optionD];
  const optionSetters = [setOptionA, setOptionB, setOptionC, setOptionD];

  // Bentuk editor menyesuaikan tipe soal (TOEFL ITP).
  const isListeningStandalone = section === 'listening' && !passageId;
  const isListening = section === 'listening';
  const isWE = section === 'written_expression';
  const showImageOption = section === 'reading' || section === 'structure';
  const allowImageAnswers = section === 'listening' || section === 'reading';
  const effectiveFormat = isWE ? 'we' : allowImageAnswers ? answerFormat : 'text';

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  /** Validasi manual (pengganti `required` native) — per section. */
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};

    if (isWE) {
      const hasLabel = (l: string) => new RegExp(`\\]\\{${l}\\}`, 'i').test(questionText);
      if (!(hasLabel('A') && hasLabel('B') && hasLabel('C') && hasLabel('D'))) {
        e.questionText = 'Tandai 4 bagian berlabel A, B, C, dan D pada kalimat.';
      }
    } else if (!isListening && !questionText.trim()) {
      e.questionText = 'Pertanyaan wajib diisi.';
    }

    if (!isWE) {
      if (effectiveFormat === 'text') {
        answerLabels.forEach((label, i) => {
          if (!answerValues[i].trim()) e[`option${label}`] = `Opsi ${label} wajib diisi.`;
        });
      } else if (effectiveFormat === 'image' && !optionsImageUrl) {
        e.optionsImage = 'Unggah gambar pilihan jawaban dulu.';
      }
    }

    if (showImageOption && useImage && !imageUrl) e.image = 'Unggah gambar soal, atau matikan opsi gambar.';
    if (isListeningStandalone && !audioUrl) e.audio = 'Unggah audio untuk soal Listening ini.';
    return e;
  };

  /**
   * Jalankan validasi: set errors + scroll ke field pertama yang error + toast.
   * `idPrefix` menyesuaikan konteks (mis. unik per-kartu inline). Return true bila valid.
   */
  const submitValidate = (idPrefix = 'qf'): boolean => {
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error('Lengkapi dulu bagian yang ditandai merah.');
      const first = Object.keys(found)[0];
      requestAnimationFrame(() =>
        document.getElementById(`${idPrefix}-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      );
      return false;
    }
    setErrors({});
    return true;
  };

  // Dirty = ada perubahan dari kondisi awal (untuk guard "buang perubahan?").
  const snapshot = () =>
    JSON.stringify([
      section, difficulty, questionText, optionA, optionB, optionC, optionD,
      correctAnswer, explanation, status, imageUrl, useImage, answerFormat, optionsImageUrl, audioUrl,
    ]);
  const [initialSnapshot, setInitialSnapshot] = useState(snapshot);
  const dirty = snapshot() !== initialSnapshot;
  /** Tandai kondisi saat ini sebagai "tersimpan" → reset flag dirty. */
  const markSaved = () => setInitialSnapshot(snapshot());

  /** Unggah 1 gambar ke R2, kembalikan URL (atau null bila gagal). */
  const doUploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('File yang diunggah harus berformat gambar (jpg, png, webp, dsb).');
      return null;
    }
    try {
      const storedToken = localStorage.getItem('cbt_access_token');
      const formData = new FormData();
      formData.append('file', file);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/questions/upload-image`, {
        method: 'POST',
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        body: formData,
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || 'Gagal mengunggah gambar ke server.');
      toast.success('Gambar berhasil diunggah.');
      return responseData.image_url as string;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengunggah gambar. Coba lagi, atau hubungi admin bila masalah berlanjut.'));
      return null;
    }
  };

  /** Unggah file audio ke R2 (untuk Soal Tunggal Listening). */
  const uploadAudioFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('File yang diunggah harus berformat audio (mp3, wav, m4a, dsb).');
      return;
    }
    setIsUploadingAudio(true);
    try {
      const storedToken = localStorage.getItem('cbt_access_token');
      const formData = new FormData();
      formData.append('file', file);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/questions/upload-audio`, {
        method: 'POST',
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        body: formData,
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || 'Gagal mengunggah file audio ke server.');
      setAudioUrl(responseData.audio_url);
      clearError('audio');
      toast.success('Audio berhasil diunggah.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengunggah audio. Coba lagi, atau hubungi admin bila masalah berlanjut.'));
    } finally {
      setIsUploadingAudio(false);
    }
  };

  /** Payload untuk create/update (dikirim ke backend). */
  const buildPayload = (): Record<string, unknown> => ({
    passage_id: passageId || null,
    section,
    difficulty,
    question_text: questionText,
    option_a: isWE ? '' : optionA,
    option_b: isWE ? '' : optionB,
    option_c: isWE ? '' : optionC,
    option_d: isWE ? '' : optionD,
    correct_answer: correctAnswer,
    explanation: explanation || null,
    image_url: showImageOption ? imageUrl || null : null,
    options_image_url: effectiveFormat === 'image' ? optionsImageUrl || null : null,
    // '' saat bukan listening-standalone → backend menghapus audio soal.
    audio_url: isListeningStandalone ? audioUrl : '',
    status,
  });

  /** Objek Question untuk live preview (QuestionView). */
  const buildDraft = (): Question => ({
    id: initialData?.id ?? 'draft',
    created_by: initialData?.created_by ?? '',
    passage_id: passageId ?? null,
    section,
    difficulty,
    question_text: questionText,
    option_a: isWE ? '' : optionA,
    option_b: isWE ? '' : optionB,
    option_c: isWE ? '' : optionC,
    option_d: isWE ? '' : optionD,
    correct_answer: correctAnswer,
    explanation: explanation || null,
    image_url: showImageOption ? imageUrl || null : null,
    options_image_url: effectiveFormat === 'image' ? optionsImageUrl || null : null,
    audio_url: isListeningStandalone ? audioUrl || null : null,
    status,
    tags: initialData?.tags ?? [],
    sort_order: initialData?.sort_order ?? 0,
    creator_name: initialData?.creator_name,
    created_at: '',
    updated_at: '',
  });

  return {
    // values + setters
    section, setSection,
    difficulty, setDifficulty,
    questionText, setQuestionText,
    optionA, optionB, optionC, optionD,
    correctAnswer, setCorrectAnswer,
    explanation, setExplanation,
    status, setStatus,
    imageUrl, setImageUrl,
    useImage, setUseImage,
    answerFormat, setAnswerFormat,
    optionsImageUrl, setOptionsImageUrl,
    audioUrl, setAudioUrl,
    showAudioUrlInput, setShowAudioUrlInput,
    // uploads
    isUploadingImage, setIsUploadingImage,
    isUploadingOptionsImage, setIsUploadingOptionsImage,
    isUploadingAudio,
    doUploadImage, uploadAudioFile,
    // errors
    errors, setErrors, clearError,
    // derived
    isEditing, answerLabels, answerValues, optionSetters,
    isListening, isListeningStandalone, isWE, showImageOption, allowImageAnswers, effectiveFormat,
    // ops
    validate, submitValidate, dirty, markSaved, buildPayload, buildDraft,
  };
}

export type QuestionForm = ReturnType<typeof useQuestionForm>;
