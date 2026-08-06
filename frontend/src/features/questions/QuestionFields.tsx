'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { FileUploader } from '@/components/ui/file-uploader';
import { UnderlineEditor } from './UnderlineEditor';
import { X, BookOpen, HelpCircle, Image as ImageIcon, Music, ChevronDown, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useRubrics } from '@/features/scoring/useRubrics';
import type { QuestionForm } from './useQuestionForm';

interface QuestionFieldsProps {
  form: QuestionForm;
  /** Prefix id anchor (unik per konteks; mis. per-kartu inline). Default 'qf'. */
  idPrefix?: string;
}

/**
 * Field-field satu soal (section-aware) — audio, stem/kalimat, gambar, pilihan
 * jawaban, pembahasan. Tidak termasuk baris Bagian/Tingkat/Status & footer;
 * itu diatur pemanggil (builder halaman-penuh / kartu inline).
 */
export const QuestionFields: React.FC<QuestionFieldsProps> = ({ form, idPrefix = 'qf' }) => {
  const {
    section, questionText, setQuestionText,
    questionType, setQuestionType, isTFNG, isMulti, isTextAnswer, isShort, isMatching, isOrdering, isEssay,
    isManualType,
    rubricId, setRubricId, setEssayMaxScore,
    multiOptions, multiCorrect, updateMultiOption, addMultiOption, removeMultiOption, toggleMultiCorrect,
    acceptList, updateAccept, addAccept, removeAccept,
    wordLimit, setWordLimit,
    matchLeft, matchRight, matchPairs, updateLeft, addLeft, removeLeft, updateRight, addRight, removeRight, setMatchPair,
    orderItems, orderPos, updateOrderItem, addOrderItem, removeOrderItem, setOrderPosition,
    correctAnswer, setCorrectAnswer,
    explanation, setExplanation,
    imageUrl, setImageUrl, useImage, setUseImage,
    answerFormat, setAnswerFormat, optionsImageUrl, setOptionsImageUrl,
    audioUrl, setAudioUrl, showAudioUrlInput, setShowAudioUrlInput,
    isUploadingImage, setIsUploadingImage, isUploadingOptionsImage, setIsUploadingOptionsImage,
    isUploadingAudio, doUploadImage, uploadAudioFile,
    errors, clearError,
    answerLabels, answerValues, optionSetters,
    isListening, isListeningStandalone, isWE, showImageOption, allowImageAnswers, effectiveFormat,
  } = form;

  // Pustaka rubrik untuk soal esai (dinilai manual).
  const { rubrics } = useRubrics();

  return (
    <>
      {/* Tipe soal (F1) — menentukan bentuk editor jawaban */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipe Soal</label>
        <Select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
          <option value="mcq_single">Pilihan Ganda (1 jawaban)</option>
          <option value="mcq_multi">Pilihan Ganda (pilih beberapa)</option>
          <option value="true_false_ng">True / False / Not Given</option>
          <option value="fill_blank">Isian (Fill in the Blank)</option>
          <option value="short_answer">Jawaban Singkat (Short Answer)</option>
          <option value="matching">Menjodohkan (Matching)</option>
          <option value="ordering">Mengurutkan (Ordering)</option>
          <option value="essay">Esai / Writing (dinilai manual)</option>
          <option value="speaking">Speaking (rekam audio, dinilai manual)</option>
        </Select>
      </div>

      {/* Audio soal — hanya Listening yang berdiri sendiri (di dalam materi → audio dari materi) */}
      {isListeningStandalone && (
        <div id={`${idPrefix}-audio`} className="scroll-mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col gap-4">
          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-4 h-4 text-indigo-600" />
            Audio Soal (Listening)
          </h4>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Unggah File Audio</label>
            <FileUploader
              variant="dropzone"
              accept="audio/*"
              maxSizeMB={50}
              disabled={isUploadingAudio}
              icon={<Music />}
              label="Klik atau seret file audio ke sini"
              hint="Format mp3, wav, m4a, dsb — maks 50 MB"
              onFilesSelected={([f]) => uploadAudioFile(f)}
              onError={(m) => toast.error(m)}
            />
            {isUploadingAudio && <p className="text-[10px] text-indigo-600 animate-pulse mt-1">Mengunggah audio...</p>}
            {errors.audio && <p className="mt-1.5 text-xs text-red-500">{errors.audio}</p>}
          </div>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setAudioUrl(e.target.value);
                    clearError('audio');
                  }}
                  placeholder="https://example.com/audio.mp3"
                  className="font-mono text-xs"
                />
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

      {/* Stem / kalimat — bentuk menyesuaikan tipe soal */}
      <div id={`${idPrefix}-questionText`} className="scroll-mt-4">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
          {isWE
            ? 'Kalimat Soal — tandai 4 bagian A–D'
            : isListening
              ? 'Catatan Pertanyaan (opsional)'
              : section === 'structure'
                ? 'Kalimat (dengan bagian rumpang)'
                : 'Pertanyaan'}
        </label>
        {isWE ? (
          <UnderlineEditor
            variant="labeled"
            value={questionText}
            onChange={(v) => { setQuestionText(v); clearError('questionText'); }}
            rows={4}
            showPreview={false}
            placeholder="Tulis kalimat, lalu blok 4 kata dan klik Tandai A/B/C/D pada tiap bagian."
          />
        ) : section === 'reading' ? (
          <UnderlineEditor
            variant="rich"
            value={questionText}
            onChange={(v) => { setQuestionText(v); clearError('questionText'); }}
            rows={3}
            showPreview={false}
            placeholder="Tulis pertanyaan. Blok kata lalu klik Tebal/Miring/Garis bawah bila perlu."
          />
        ) : isListening ? (
          <Textarea
            rows={2}
            value={questionText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setQuestionText(e.target.value); clearError('questionText'); }}
            placeholder="Mis. transkrip singkat pertanyaan untuk memudahkan pencarian…"
          />
        ) : (
          <Textarea
            rows={3}
            value={questionText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setQuestionText(e.target.value); clearError('questionText'); }}
            placeholder="Mis. The committee ___ the proposal last week."
            error={errors.questionText}
          />
        )}
        {isListening && (
          <p className="mt-1 text-[10px] text-slate-400">
            Tidak ditampilkan ke peserta — hanya untuk identifikasi di daftar soal (pertanyaan aslinya ada di audio).
          </p>
        )}
        {errors.questionText && (isWE || section === 'reading') && (
          <p className="mt-1.5 text-xs text-red-500">{errors.questionText}</p>
        )}
      </div>

      {/* Gambar soal (opsional, via checkbox) — hanya Reading & Structure */}
      {showImageOption && (
        <div id={`${idPrefix}-image`} className="scroll-mt-4">
          <Checkbox
            checked={useImage}
            onChange={(v) => {
              setUseImage(v);
              if (!v) {
                setImageUrl('');
                clearError('image');
              }
            }}
            label={
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Soal ini memakai gambar
              </span>
            }
          />
          {useImage && (
            <div className="mt-3">
              {imageUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Gambar soal" className="max-h-48 rounded-xl border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
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
                  maxSizeMB={10}
                  disabled={isUploadingImage}
                  icon={<ImageIcon />}
                  label="Klik atau seret gambar ke sini"
                  hint="Format jpg, png, webp, dsb — maks 10 MB"
                  onFilesSelected={async ([f]) => {
                    setIsUploadingImage(true);
                    const url = await doUploadImage(f);
                    if (url) {
                      setImageUrl(url);
                      clearError('image');
                    }
                    setIsUploadingImage(false);
                  }}
                  onError={(m) => toast.error(m)}
                />
              )}
              {isUploadingImage && <p className="text-[10px] text-indigo-600 animate-pulse mt-1">Mengunggah gambar...</p>}
              {errors.image && <p className="mt-1.5 text-xs text-red-500">{errors.image}</p>}
            </div>
          )}
        </div>
      )}

      {/* Pilihan jawaban — bentuk menyesuaikan tipe soal */}
      {isWE ? (
        <div id={`${idPrefix}-weAnswer`} className="scroll-mt-4">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Jawaban benar — bagian yang SALAH</label>
          <p className="text-[11px] text-slate-400 mb-2">
            Pilih label (A–D) dari kata yang kamu tandai di kalimat. Itulah bagian yang dianggap salah oleh peserta.
          </p>
          <div className="flex flex-wrap gap-2">
            {['a', 'b', 'c', 'd'].map((key, i) => {
              const isCorrect = correctAnswer === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCorrectAnswer(key)}
                  className={`h-10 w-10 rounded-xl border-2 font-extrabold transition-colors ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {answerLabels[i]}
                </button>
              );
            })}
          </div>
        </div>
      ) : isTFNG ? (
        <div id={`${idPrefix}-tfngAnswer`} className="scroll-mt-4">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Jawaban benar</label>
          <p className="text-[11px] text-slate-400 mb-2">
            Pilih True / False / Not Given untuk pernyataan di atas.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[{ k: 'a', l: 'True' }, { k: 'b', l: 'False' }, { k: 'c', l: 'Not Given' }].map(({ k, l }) => {
              const isCorrect = correctAnswer === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setCorrectAnswer(k)}
                  className={`h-11 rounded-xl border-2 text-sm font-bold transition-colors ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      ) : isMulti ? (
        <div id={`${idPrefix}-multiAnswer`} className="scroll-mt-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-xs font-bold text-slate-600">Pilihan Jawaban (tandai yang benar)</label>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">
              Peserta memilih {multiCorrect.length || '—'} jawaban
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Centang di kiri opsi untuk menandai jawaban benar. Jumlah &ldquo;pilih N&rdquo; otomatis = banyaknya yang ditandai benar.
          </p>
          <div className="flex flex-col gap-2">
            {multiOptions.map((opt, i) => {
              const isCorrect = multiCorrect.includes(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors ${
                    isCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-100'
                  }`}
                >
                  <Checkbox checked={isCorrect} onChange={() => toggleMultiCorrect(i)} />
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">
                    {'ABCDEFGH'[i]}
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => updateMultiOption(i, e.target.value)}
                    placeholder={`Opsi ${'ABCDEFGH'[i]}`}
                    className="flex-1"
                  />
                  {multiOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMultiOption(i)}
                      title="Hapus opsi"
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/40 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {multiOptions.length < 8 && (
            <button
              type="button"
              onClick={addMultiOption}
              className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
            >
              + Tambah opsi
            </button>
          )}
          {errors.multiOptions && <p className="mt-1.5 text-xs text-red-500">{errors.multiOptions}</p>}
          {errors.multiCorrect && <p className="mt-1.5 text-xs text-red-500">{errors.multiCorrect}</p>}
        </div>
      ) : isTextAnswer ? (
        <div id={`${idPrefix}-accept`} className="scroll-mt-4">
          {isShort && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Batas kata (opsional)</label>
              <Input
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                placeholder="Mis. NO MORE THAN THREE WORDS"
              />
              <p className="mt-1 text-[10px] text-slate-400">Ditampilkan ke peserta sebagai petunjuk (tak dinilai otomatis).</p>
            </div>
          )}
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Jawaban yang diterima</label>
          <p className="text-[11px] text-slate-400 mb-2">
            Tulis semua variasi yang dianggap benar (mis. &ldquo;colour&rdquo;, &ldquo;color&rdquo;). Pencocokan tak peka huruf besar/kecil.
          </p>
          <div className="flex flex-col gap-2">
            {acceptList.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={a}
                  onChange={(e) => updateAccept(i, e.target.value)}
                  placeholder={`Jawaban ${i + 1}`}
                  className="flex-1"
                />
                {acceptList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAccept(i)}
                    title="Hapus"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/40 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addAccept}
            className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
          >
            + Tambah variasi jawaban
          </button>
          {errors.accept && <p className="mt-1.5 text-xs text-red-500">{errors.accept}</p>}
        </div>
      ) : isMatching ? (
        <div id={`${idPrefix}-matchAnswer`} className="scroll-mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Opsi Kanan (pilihan)</label>
            <div className="flex flex-col gap-2">
              {matchRight.map((r, j) => (
                <div key={j} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{'ABCDEFGH'[j]}</span>
                  <Input value={r} onChange={(e) => updateRight(j, e.target.value)} placeholder={`Opsi ${'ABCDEFGH'[j]}`} className="flex-1" />
                  {matchRight.length > 2 && (
                    <button type="button" onClick={() => removeRight(j)} title="Hapus" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/40 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {matchRight.length < 8 && (
              <button type="button" onClick={addRight} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">+ Tambah opsi</button>
            )}
            {errors.matchRight && <p className="mt-1.5 text-xs text-red-500">{errors.matchRight}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Item Kiri (jodohkan ke opsi benar)</label>
            <div className="flex flex-col gap-2">
              {matchLeft.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <Input value={l} onChange={(e) => updateLeft(i, e.target.value)} placeholder={`Item ${i + 1}`} className="flex-1" />
                  <Select value={matchPairs[String(i)] ?? ''} onChange={(e) => setMatchPair(i, e.target.value)} className="w-24 shrink-0">
                    <option value="">Kunci</option>
                    {matchRight.map((_, j) => (
                      <option key={j} value={'abcdefgh'[j]}>{'ABCDEFGH'[j]}</option>
                    ))}
                  </Select>
                  {matchLeft.length > 2 && (
                    <button type="button" onClick={() => removeLeft(i)} title="Hapus" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/40 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {matchLeft.length < 10 && (
              <button type="button" onClick={addLeft} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">+ Tambah item</button>
            )}
            {errors.matchLeft && <p className="mt-1.5 text-xs text-red-500">{errors.matchLeft}</p>}
            {errors.matchPairs && <p className="mt-1.5 text-xs text-red-500">{errors.matchPairs}</p>}
          </div>
        </div>
      ) : isOrdering ? (
        <div id={`${idPrefix}-orderAnswer`} className="scroll-mt-4">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Langkah & Urutan Benar</label>
          <p className="text-[11px] text-slate-400 mb-2">
            Masukkan tiap langkah lalu tetapkan nomor urutan benarnya (1..N, tanpa duplikat). Peserta akan mengurutkannya.
          </p>
          <div className="flex flex-col gap-2">
            {orderItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={it} onChange={(e) => updateOrderItem(i, e.target.value)} placeholder={`Langkah ${i + 1}`} className="flex-1" />
                <Select value={orderPos[String(i)] ?? ''} onChange={(e) => setOrderPosition(i, e.target.value)} className="w-20 shrink-0">
                  <option value="">#</option>
                  {orderItems.map((_, p) => (
                    <option key={p} value={String(p + 1)}>{p + 1}</option>
                  ))}
                </Select>
                {orderItems.length > 2 && (
                  <button type="button" onClick={() => removeOrderItem(i)} title="Hapus" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50/40 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {orderItems.length < 10 && (
            <button type="button" onClick={addOrderItem} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">+ Tambah langkah</button>
          )}
          {errors.orderItems && <p className="mt-1.5 text-xs text-red-500">{errors.orderItems}</p>}
          {errors.orderPos && <p className="mt-1.5 text-xs text-red-500">{errors.orderPos}</p>}
        </div>
      ) : isManualType ? (
        <div id={`${idPrefix}-rubric`} className="scroll-mt-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 flex items-start gap-2.5">
            <ClipboardCheck className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              {isEssay ? (
                <>Soal esai <strong>dinilai manual</strong> memakai rubrik. Peserta mengetik jawaban panjang;
                  skor diberi penilai (admin) berdasarkan kriteria rubrik.</>
              ) : (
                <>Soal speaking <strong>dinilai manual</strong> memakai rubrik. Peserta <strong>merekam audio</strong>;
                  penilai (admin) memutar rekaman & memberi skor berdasarkan kriteria rubrik.</>
              )}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Rubrik penilaian</label>
            <Select
              value={rubricId}
              onChange={(e) => {
                const id = e.target.value;
                setRubricId(id);
                const r = rubrics.find((x) => x.id === id);
                setEssayMaxScore(r ? r.max_total : 1);
                clearError('rubric');
              }}
            >
              <option value="">— pilih rubrik —</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (maks {r.max_total})
                </option>
              ))}
            </Select>
            {rubrics.length === 0 && (
              <p className="mt-1 text-[10px] text-slate-400">
                Belum ada rubrik. Buat dulu di menu Skema Penilaian → Rubrik Penilaian.
              </p>
            )}
            {errors.rubric && <p className="mt-1.5 text-xs text-red-500">{errors.rubric}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Panduan panjang jawaban (opsional)</label>
            <Input
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              placeholder="Mis. Tulis ±250 kata"
            />
            <p className="mt-1 text-[10px] text-slate-400">Ditampilkan ke peserta sebagai petunjuk (tak membatasi otomatis).</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <label className="text-xs font-bold text-slate-600">Pilihan Jawaban</label>
            {allowImageAnswers && (
              <ToggleGroup
                size="sm"
                value={answerFormat}
                onChange={(v) => v && setAnswerFormat(v)}
                options={[
                  { value: 'text', label: 'Teks' },
                  { value: 'image', label: 'Gambar' },
                ]}
              />
            )}
          </div>

          {effectiveFormat === 'text' ? (
            <>
              <p className="text-[11px] text-slate-400 mb-2">Tandai lingkaran pada jawaban yang benar.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['a', 'b', 'c', 'd'].map((key, i) => {
                  const isCorrect = correctAnswer === key;
                  return (
                    <div
                      key={key}
                      id={`${idPrefix}-option${answerLabels[i]}`}
                      className={`scroll-mt-4 rounded-2xl border p-3 transition-colors ${
                        isCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-600">Opsi {answerLabels[i]}</span>
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer(key)}
                          className="inline-flex items-center gap-1.5"
                          title="Tandai sebagai jawaban benar"
                        >
                          <span
                            className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}
                          >
                            {isCorrect && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                          <span
                            className={`text-[11px] font-bold ${
                              isCorrect ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {isCorrect ? 'Jawaban benar' : 'Tandai benar'}
                          </span>
                        </button>
                      </div>
                      <Input
                        value={answerValues[i]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          optionSetters[i](e.target.value);
                          clearError(`option${answerLabels[i]}`);
                        }}
                        placeholder={`Isi opsi ${answerLabels[i]}...`}
                        error={errors[`option${answerLabels[i]}`]}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div id={`${idPrefix}-optionsImage`} className="scroll-mt-4 flex flex-col gap-3">
              <p className="text-[11px] text-slate-400">
                Unggah <strong>satu gambar</strong> yang memuat pilihan A/B/C/D, lalu tandai huruf yang benar.
              </p>
              {optionsImageUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optionsImageUrl} alt="Gambar pilihan jawaban" className="max-h-60 rounded-xl border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => setOptionsImageUrl('')}
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
                  disabled={isUploadingOptionsImage}
                  icon={<ImageIcon />}
                  label="Klik atau seret gambar pilihan jawaban ke sini"
                  hint="Satu gambar berisi label A/B/C/D"
                  onFilesSelected={async ([f]) => {
                    setIsUploadingOptionsImage(true);
                    const url = await doUploadImage(f);
                    if (url) {
                      setOptionsImageUrl(url);
                      clearError('optionsImage');
                    }
                    setIsUploadingOptionsImage(false);
                  }}
                  onError={(m) => toast.error(m)}
                />
              )}
              {isUploadingOptionsImage && (
                <p className="text-[10px] text-indigo-600 animate-pulse">Mengunggah gambar...</p>
              )}
              {errors.optionsImage && <p className="text-xs text-red-500">{errors.optionsImage}</p>}

              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1.5">
                  Jawaban benar (sesuai label pada gambar):
                </p>
                <div className="flex flex-wrap gap-2">
                  {['a', 'b', 'c', 'd'].map((key, i) => {
                    const isCorrect = correctAnswer === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCorrectAnswer(key)}
                        className={`h-10 w-10 rounded-xl border-2 font-extrabold transition-colors ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {answerLabels[i]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pembahasan */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <BookOpen className="w-3.5 h-3.5 inline mr-1" />
          Pembahasan (Opsional)
        </label>
        <Textarea
          rows={2}
          value={explanation}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExplanation(e.target.value)}
          placeholder="Penjelasan jawaban benar..."
        />
      </div>
    </>
  );
};
