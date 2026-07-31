'use client';

import React from 'react';
import { Flag, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { renderExamText } from '@/features/questions/examText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/src/lib/cn';
import type { QuestionPayload } from './api';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const KEYS = ['a', 'b', 'c', 'd'] as const;

export interface PaletteItem {
  answered: boolean;
  flagged: boolean;
}

interface AnswerSheetProps {
  q: QuestionPayload;
  number: number; // nomor soal (1-based)
  selected: string | null;
  onSelect: (key: string) => void;
  /** mcq_multi: himpunan opsi terpilih + toggle. */
  multiSelected?: string[];
  onMultiToggle?: (key: string) => void;
  /** fill_blank/short_answer: jawaban teks. */
  textValue?: string;
  onTextChange?: (v: string) => void;
  onTextBlur?: () => void;
  /** matching: pasangan leftIdx→rightKey + ubah. */
  pairs?: Record<string, string>;
  onPairChange?: (leftIdx: number, rightKey: string) => void;
  flagged: boolean;
  onToggleFlag: () => void;
  palette: PaletteItem[];
  currentIndex: number;
  onJump: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const MULTI_KEYS = 'abcdefgh';

export const AnswerSheet: React.FC<AnswerSheetProps> = ({
  q,
  number,
  selected,
  onSelect,
  multiSelected = [],
  onMultiToggle,
  textValue = '',
  onTextChange,
  onTextBlur,
  pairs = {},
  onPairChange,
  flagged,
  onToggleFlag,
  palette,
  currentIndex,
  onJump,
  onPrev,
  onNext,
}) => {
  const total = palette.length;
  const isTFNG = q.question_type === 'true_false_ng';
  const isMulti = q.question_type === 'mcq_multi';
  const isTextAnswer = q.question_type === 'fill_blank' || q.question_type === 'short_answer';
  const isMatching = q.question_type === 'matching';
  const isOrdering = q.question_type === 'ordering';
  const wordLimit = q.content_json?.word_limit as string | undefined;
  const matchLeft = (q.content_json?.left as string[] | undefined) ?? [];
  const matchRight = (q.content_json?.right as string[] | undefined) ?? [];
  const orderItems = (q.content_json?.items as string[] | undefined) ?? [];
  const letterMode =
    !isTFNG && !isMulti && !isTextAnswer && !isMatching && !isOrdering && (q.section === 'written_expression' || !!q.options_image_url);

  // mcq_multi: opsi dari content_json.options (jumlah variabel) + batas "pilih N".
  const multiOptions = ((q.content_json?.options as string[] | undefined) ?? []).map((text, i) => ({
    key: MULTI_KEYS[i],
    label: MULTI_KEYS[i].toUpperCase(),
    text,
  }));
  const chooseN = (q.content_json?.choose as number | undefined) ?? 0;

  const options = isTFNG
    ? [
        { key: 'a', label: 'A', val: 'True' },
        { key: 'b', label: 'B', val: 'False' },
        { key: 'c', label: 'C', val: 'Not Given' },
      ]
    : [
        { key: 'a', label: 'A', val: q.option_a },
        { key: 'b', label: 'B', val: q.option_b },
        { key: 'c', label: 'C', val: q.option_c },
        { key: 'd', label: 'D', val: q.option_d },
      ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header lembar jawaban */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">
          Soal {number}
        </h3>
        <button
          type="button"
          onClick={onToggleFlag}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors',
            flagged
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-200 text-slate-500 hover:bg-slate-50',
          )}
        >
          <Flag className={cn('w-3.5 h-3.5', flagged && 'fill-amber-400 text-amber-500')} />
          {flagged ? 'Ditandai' : 'Tandai'}
        </button>
      </div>

      {/* Opsi */}
      {q.options_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={q.options_image_url}
          alt="Pilihan jawaban"
          className="max-w-full rounded-2xl border border-slate-200 shadow-sm"
        />
      )}

      {isOrdering ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-slate-500">Tentukan nomor urutan tiap langkah:</p>
          {orderItems.map((itemText, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
              <span className="flex-1 text-sm font-medium text-slate-700">
                {itemText ? renderExamText(itemText) : '—'}
              </span>
              <Select
                value={pairs[String(i)] ?? ''}
                onChange={(e) => onPairChange?.(i, e.target.value)}
                className="w-20 shrink-0"
              >
                <option value="">#</option>
                {orderItems.map((_, p) => (
                  <option key={p} value={String(p + 1)}>{p + 1}</option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      ) : isMatching ? (
        <div className="flex flex-col gap-2.5">
          {matchLeft.map((leftText, i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">
                {i + 1}. {leftText ? renderExamText(leftText) : '—'}
              </span>
              <Select value={pairs[String(i)] ?? ''} onChange={(e) => onPairChange?.(i, e.target.value)}>
                <option value="">— pilih —</option>
                {matchRight.map((rt, j) => (
                  <option key={j} value={MULTI_KEYS[j]}>
                    {MULTI_KEYS[j].toUpperCase()}. {rt}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      ) : isTextAnswer ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-slate-500">
            Ketik jawaban:
            {wordLimit && <span className="ml-1 font-bold text-brand uppercase">({wordLimit})</span>}
          </p>
          <Input
            value={textValue}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={() => onTextBlur?.()}
            placeholder="Tulis jawabanmu…"
          />
        </div>
      ) : isMulti ? (
        <div className="flex flex-col gap-2.5">
          {chooseN > 0 && (
            <p className="-mb-1 text-xs font-bold text-brand">
              Pilih {chooseN} jawaban · {multiSelected.length}/{chooseN} dipilih
            </p>
          )}
          {multiOptions.map((opt) => {
            const active = multiSelected.includes(opt.key);
            const atMax = chooseN > 0 && multiSelected.length >= chooseN && !active;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={atMax}
                onClick={() => onMultiToggle?.(opt.key)}
                className={cn(
                  'flex items-center gap-3.5 border-2 p-3.5 rounded-2xl text-left text-[15px] font-medium transition-all',
                  active
                    ? 'border-brand bg-brand/5 text-slate-900 shadow-sm'
                    : atMax
                      ? 'border-slate-100 bg-white text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center h-8 w-8 rounded-lg border-2 font-bold text-sm transition-colors',
                    active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-400',
                  )}
                >
                  {active ? <Check className="w-4 h-4" /> : opt.label}
                </span>
                <span className="flex-1 leading-normal">
                  {opt.text ? renderExamText(opt.text) : <span className="text-slate-300 italic">—</span>}
                </span>
              </button>
            );
          })}
        </div>
      ) : letterMode ? (
        <div className="grid grid-cols-4 gap-2.5">
          {KEYS.map((k, i) => {
            const active = selected === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelect(k)}
                className={cn(
                  'h-14 rounded-2xl border-2 flex items-center justify-center font-extrabold text-lg transition-all',
                  active
                    ? 'border-brand bg-brand text-white shadow-md shadow-brand/20'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-brand/40 hover:bg-brand/5',
                )}
              >
                {LETTERS[i]}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {options.map((opt) => {
            const active = selected === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelect(opt.key)}
                className={cn(
                  'flex items-center gap-3.5 border-2 p-3.5 rounded-2xl text-left text-[15px] font-medium transition-all',
                  active
                    ? 'border-brand bg-brand/5 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center font-bold text-sm h-8 w-8 rounded-xl border-2 transition-colors',
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 bg-white text-slate-500',
                  )}
                >
                  {opt.label}
                </span>
                <span className="flex-1 leading-normal">
                  {opt.val ? renderExamText(opt.val) : <span className="text-slate-300 italic">—</span>}
                </span>
                {active && <Check className="w-5 h-5 text-brand shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Navigasi prev/next */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex-1 font-bold flex items-center justify-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Sebelumnya
        </Button>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={currentIndex === total - 1}
          className="flex-1 font-bold flex items-center justify-center gap-1.5"
        >
          Berikutnya
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Peta soal */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peta Soal</span>
          <span className="text-xs text-slate-400">
            {palette.filter((p) => p.answered).length}/{total} terjawab
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {palette.map((p, i) => {
            const current = i === currentIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i)}
                className={cn(
                  'relative h-9 rounded-lg text-xs font-bold flex items-center justify-center border transition-all',
                  current
                    ? 'border-brand ring-2 ring-brand/40 bg-brand text-white'
                    : p.answered
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300',
                )}
              >
                {i + 1}
                {p.flagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand/10 border border-brand/30" /> Terjawab
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-200" /> Belum
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Ditandai
          </span>
        </div>
      </div>
    </div>
  );
};
