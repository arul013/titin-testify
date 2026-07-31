'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
import type { Question } from './hooks/useQuestions';

const MULTI_KEYS = 'abcdefgh';

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
  const [questionType, setQuestionType] = useState(initialData?.question_type || 'mcq_single');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 'medium');

  // mcq_multi: opsi jumlah-variabel + himpunan benar (disimpan sebagai INDEX; keys a/b/… saat build).
  const _initOpts = (initialData?.content_json?.options as string[] | undefined);
  const _initCorrect = ((initialData?.answer_json?.correct as string[] | undefined) ?? [])
    .map((k) => MULTI_KEYS.indexOf(k))
    .filter((i) => i >= 0);
  const [multiOptions, setMultiOptions] = useState<string[]>(
    _initOpts && _initOpts.length ? _initOpts : ['', '', '', ''],
  );
  const [multiCorrect, setMultiCorrect] = useState<number[]>(_initCorrect);
  const updateMultiOption = (i: number, text: string) =>
    setMultiOptions((p) => p.map((o, idx) => (idx === i ? text : o)));
  const addMultiOption = () => setMultiOptions((p) => (p.length < 8 ? [...p, ''] : p));
  const removeMultiOption = (i: number) => {
    setMultiOptions((p) => p.filter((_, idx) => idx !== i));
    setMultiCorrect((c) => c.filter((idx) => idx !== i).map((idx) => (idx > i ? idx - 1 : idx)));
  };
  const toggleMultiCorrect = (i: number) =>
    setMultiCorrect((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));

  // fill_blank: daftar jawaban yang diterima (cocokkan teks peserta, case-insensitive).
  const _initAccept = (initialData?.answer_json?.accept as string[] | undefined) ?? [''];
  const [acceptList, setAcceptList] = useState<string[]>(_initAccept.length ? _initAccept : ['']);
  const updateAccept = (i: number, v: string) =>
    setAcceptList((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addAccept = () => setAcceptList((p) => [...p, '']);
  const removeAccept = (i: number) => setAcceptList((p) => p.filter((_, idx) => idx !== i));
  // short_answer / essay: batas kata opsional (mis. "NO MORE THAN THREE WORDS" / "±250 kata").
  const [wordLimit, setWordLimit] = useState<string>(
    (initialData?.content_json?.word_limit as string | undefined) ?? '',
  );

  // essay (manual): rubrik penilaian + poin maks (diturunkan dari max_total rubrik).
  const [rubricId, setRubricId] = useState<string>(initialData?.rubric_id ?? '');
  const [essayMaxScore, setEssayMaxScore] = useState<number>(
    typeof initialData?.max_score === 'number' && initialData.scoring_mode === 'manual'
      ? initialData.max_score
      : 1,
  );

  // matching: item kiri, opsi kanan (key a/b/… by index), pasangan benar (leftIdx→rightKey).
  const _initLeft = (initialData?.content_json?.left as string[] | undefined);
  const _initRight = (initialData?.content_json?.right as string[] | undefined);
  const [matchLeft, setMatchLeft] = useState<string[]>(_initLeft?.length ? _initLeft : ['', '']);
  const [matchRight, setMatchRight] = useState<string[]>(_initRight?.length ? _initRight : ['', '']);
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>(
    (initialData?.answer_json?.pairs as Record<string, string> | undefined) ?? {},
  );
  const updateLeft = (i: number, v: string) => setMatchLeft((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addLeft = () => setMatchLeft((p) => (p.length < 10 ? [...p, ''] : p));
  const removeLeft = (i: number) => {
    setMatchLeft((p) => p.filter((_, idx) => idx !== i));
    setMatchPairs((pr) => {
      const next: Record<string, string> = {};
      Object.entries(pr).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki === i) return;
        next[String(ki > i ? ki - 1 : ki)] = v;
      });
      return next;
    });
  };
  const updateRight = (j: number, v: string) => setMatchRight((p) => p.map((x, idx) => (idx === j ? v : x)));
  const addRight = () => setMatchRight((p) => (p.length < 8 ? [...p, ''] : p));
  const removeRight = (j: number) => {
    setMatchRight((p) => p.filter((_, idx) => idx !== j));
    setMatchPairs((pr) => {
      const next: Record<string, string> = {};
      Object.entries(pr).forEach(([k, v]) => {
        const vi = MULTI_KEYS.indexOf(v);
        if (vi === j) return; // menunjuk opsi yang dihapus → kosongkan
        next[k] = vi > j ? MULTI_KEYS[vi - 1] : v;
      });
      return next;
    });
  };
  const setMatchPair = (leftIdx: number, rightKey: string) =>
    setMatchPairs((pr) => ({ ...pr, [String(leftIdx)]: rightKey }));

  // ordering: daftar langkah + posisi benar (itemIdx→nomor 1-based).
  const _initItems = (initialData?.content_json?.items as string[] | undefined);
  const [orderItems, setOrderItems] = useState<string[]>(_initItems?.length ? _initItems : ['', '']);
  const [orderPos, setOrderPos] = useState<Record<string, string>>(
    (initialData?.answer_json?.positions as Record<string, string> | undefined) ?? {},
  );
  const updateOrderItem = (i: number, v: string) => setOrderItems((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addOrderItem = () => setOrderItems((p) => (p.length < 10 ? [...p, ''] : p));
  const removeOrderItem = (i: number) => {
    setOrderItems((p) => p.filter((_, idx) => idx !== i));
    setOrderPos((pr) => {
      const next: Record<string, string> = {};
      Object.entries(pr).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki === i) return;
        next[String(ki > i ? ki - 1 : ki)] = v;
      });
      return next;
    });
  };
  const setOrderPosition = (i: number, pos: string) =>
    setOrderPos((pr) => ({ ...pr, [String(i)]: pos }));
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

  // Bentuk editor menyesuaikan tipe soal.
  const isTFNG = questionType === 'true_false_ng';   // True/False/Not Given (opsi tetap a/b/c)
  const isMulti = questionType === 'mcq_multi';       // pilih N (opsi jumlah-variabel)
  const isFill = questionType === 'fill_blank';       // isian teks
  const isShort = questionType === 'short_answer';    // jawaban singkat (teks + batas kata)
  const isTextAnswer = isFill || isShort;             // jawaban teks bebas (cocokkan daftar diterima)
  const isMatching = questionType === 'matching';     // pasangkan kiri↔kanan
  const isOrdering = questionType === 'ordering';      // urutkan langkah
  const isEssay = questionType === 'essay';            // esai/writing (dinilai manual via rubrik)
  const isFixedType = isTFNG || isMulti || isTextAnswer || isMatching || isOrdering || isEssay;
  const isListeningStandalone = section === 'listening' && !passageId;
  const isListening = section === 'listening';
  const isWE = !isFixedType && section === 'written_expression';
  const showImageOption = section === 'reading' || section === 'structure';
  const allowImageAnswers = !isFixedType && (section === 'listening' || section === 'reading');
  const effectiveFormat = isTFNG ? 'tfng' : isMulti ? 'multi' : isTextAnswer ? 'textans' : isMatching ? 'matching' : isOrdering ? 'ordering' : isEssay ? 'essay' : isWE ? 'we' : allowImageAnswers ? answerFormat : 'text';

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
    } else if (isTFNG) {
      if (!questionText.trim()) e.questionText = 'Pernyataan (statement) wajib diisi.';
    } else if (isMulti) {
      if (!questionText.trim()) e.questionText = 'Pertanyaan wajib diisi.';
      if (multiOptions.filter((o) => o.trim()).length < 2) e.multiOptions = 'Isi minimal 2 opsi.';
      else if (multiOptions.some((o) => !o.trim())) e.multiOptions = 'Semua opsi harus terisi (atau hapus yang kosong).';
      if (multiCorrect.length < 1) e.multiCorrect = 'Tandai minimal satu jawaban benar.';
    } else if (isTextAnswer) {
      if (!questionText.trim()) e.questionText = 'Pertanyaan/kalimat wajib diisi.';
      if (acceptList.filter((a) => a.trim()).length < 1) e.accept = 'Isi minimal satu jawaban yang diterima.';
    } else if (isMatching) {
      if (matchLeft.filter((x) => x.trim()).length < 2) e.matchLeft = 'Isi minimal 2 item kiri.';
      else if (matchLeft.some((x) => !x.trim())) e.matchLeft = 'Semua item kiri harus terisi.';
      if (matchRight.filter((x) => x.trim()).length < 2) e.matchRight = 'Isi minimal 2 opsi kanan.';
      else if (matchRight.some((x) => !x.trim())) e.matchRight = 'Semua opsi kanan harus terisi.';
      if (matchLeft.some((_, i) => !matchPairs[String(i)])) e.matchPairs = 'Tentukan pasangan benar untuk semua item kiri.';
    } else if (isEssay) {
      if (!questionText.trim()) e.questionText = 'Perintah/soal esai wajib diisi.';
      if (!rubricId) e.rubric = 'Pilih rubrik penilaian untuk soal esai.';
    } else if (isOrdering) {
      if (orderItems.filter((x) => x.trim()).length < 2) e.orderItems = 'Isi minimal 2 langkah.';
      else if (orderItems.some((x) => !x.trim())) e.orderItems = 'Semua langkah harus terisi.';
      const posVals = orderItems.map((_, i) => orderPos[String(i)]);
      if (posVals.some((v) => !v)) e.orderPos = 'Tentukan nomor urutan untuk semua langkah.';
      else {
        const nums = posVals.map(Number).sort((a, b) => a - b);
        if (!nums.every((n, idx) => n === idx + 1)) e.orderPos = 'Nomor urutan harus 1..N tanpa duplikat.';
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
      section, questionType, difficulty, questionText, optionA, optionB, optionC, optionD,
      correctAnswer, explanation, status, imageUrl, useImage, answerFormat, optionsImageUrl, audioUrl,
      multiOptions, multiCorrect, acceptList, wordLimit, matchLeft, matchRight, matchPairs,
      orderItems, orderPos, rubricId, essayMaxScore,
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
  // Tipe khusus tak memakai kolom teks opsi lama (a–d).
  const noOptionText = isWE || isFixedType;
  // mcq_multi: opsi + jumlah-pilih di content_json (publik); kunci di answer_json (rahasia).
  const contentJson = isMulti
    ? { options: multiOptions, choose: multiCorrect.length }
    : isMatching
      ? { left: matchLeft, right: matchRight }
      : isOrdering
        ? { items: orderItems }
        : (isShort || isEssay) && wordLimit.trim()
          ? { word_limit: wordLimit.trim() }
          : null;
  const answerJson = isMulti
    ? { correct: multiCorrect.map((i) => MULTI_KEYS[i]) }
    : isTextAnswer
      ? { accept: acceptList.map((s) => s.trim()).filter(Boolean) }
      : isMatching
        ? { pairs: matchPairs }
        : isOrdering
          ? { positions: orderPos }
          : null;
  const buildPayload = (): Record<string, unknown> => ({
    passage_id: passageId || null,
    section,
    difficulty,
    question_type: questionType,
    content_json: contentJson,
    answer_json: answerJson,
    // F1.2: essay dinilai manual (poin = max_total rubrik); tipe lain auto (1 poin).
    scoring_mode: isEssay ? 'manual' : 'auto',
    rubric_id: isEssay ? rubricId || null : null,
    max_score: isEssay ? essayMaxScore : 1,
    question_text: questionText,
    option_a: noOptionText ? '' : optionA,
    option_b: noOptionText ? '' : optionB,
    option_c: noOptionText ? '' : optionC,
    option_d: noOptionText ? '' : optionD,
    correct_answer: isMulti ? null : correctAnswer,
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
    question_type: questionType,
    content_json: contentJson,
    answer_json: answerJson,
    question_text: questionText,
    option_a: noOptionText ? '' : optionA,
    option_b: noOptionText ? '' : optionB,
    option_c: noOptionText ? '' : optionC,
    option_d: noOptionText ? '' : optionD,
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
    questionType, setQuestionType, isTFNG, isMulti, isFill, isShort, isTextAnswer, isMatching, isOrdering, isEssay,
    rubricId, setRubricId, essayMaxScore, setEssayMaxScore,
    multiOptions, multiCorrect,
    updateMultiOption, addMultiOption, removeMultiOption, toggleMultiCorrect,
    acceptList, updateAccept, addAccept, removeAccept,
    wordLimit, setWordLimit,
    matchLeft, matchRight, matchPairs,
    updateLeft, addLeft, removeLeft, updateRight, addRight, removeRight, setMatchPair,
    orderItems, orderPos, updateOrderItem, addOrderItem, removeOrderItem, setOrderPosition,
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
