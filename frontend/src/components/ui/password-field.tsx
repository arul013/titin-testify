'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Sparkles, Copy } from 'lucide-react';
import { Input } from './input';
import { toast } from './toast';
import { copyToClipboard } from '@/lib/clipboard';
import { generatePassword } from '@/lib/password';

interface PasswordFieldProps {
  value: string;
  onChange: (val: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Tampilkan password sejak awal (mis. saat sudah auto-generate). */
  defaultVisible?: boolean;
  /** Tampilkan tombol generate password acak. */
  showGenerate?: boolean;
  /** Tampilkan tombol salin (saat ada nilai). */
  showCopy?: boolean;
  /** Class tambahan untuk elemen <input> (mis. warna teks di background gelap). */
  className?: string;
}

/**
 * Input password dengan toggle lihat/sembunyi, tombol generate acak, dan salin.
 * Dibangun di atas <Input> agar konsisten dengan design system.
 */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  value,
  onChange,
  label,
  placeholder,
  required,
  disabled,
  hint,
  error,
  defaultVisible = false,
  showGenerate = true,
  showCopy = true,
  className,
}) => {
  const [visible, setVisible] = useState(defaultVisible);

  // Sesuaikan padding kanan dengan jumlah tombol yang tampil.
  const trailingCount = (showGenerate ? 1 : 0) + (showCopy && value ? 1 : 0) + 1;
  const padClass = trailingCount >= 3 ? 'pr-24' : trailingCount === 2 ? 'pr-16' : 'pr-11';
  const inputClassName = `${padClass} font-mono ${className ?? ''}`.trim();

  const handleGenerate = () => {
    onChange(generatePassword());
    setVisible(true);
  };

  const handleCopy = async () => {
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) toast.success('Password disalin ke clipboard');
    else toast.error('Gagal menyalin password');
  };

  const iconBtn =
    'p-1 rounded-md text-gray-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <Input
      type={visible ? 'text' : 'password'}
      label={label}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      hint={hint}
      error={error}
      className={inputClassName}
      rightIcon={
        <div className="flex items-center gap-0.5">
          {showGenerate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled}
              title="Generate password acak"
              aria-label="Generate password acak"
              className={iconBtn}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}
          {showCopy && value && (
            <button
              type="button"
              onClick={handleCopy}
              title="Salin password"
              aria-label="Salin password"
              className={iconBtn}
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            title={visible ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
            className={iconBtn}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      }
    />
  );
};
