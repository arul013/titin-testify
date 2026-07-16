"use client";

import { NumericFormat } from "react-number-format";

interface CurrencyInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Numeric input dengan live thousand-separator formatting (titik, locale ID).
 * value dan onChange menggunakan raw digit string ("8000000"), bukan display string.
 * Handles: cursor position, paste, backspace over separator, Ctrl+Z, mobile keyboard.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className,
  id,
}: CurrencyInputProps) {
  const baseClass =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";

  return (
    <NumericFormat
      id={id}
      value={value === "" ? "" : value}
      onValueChange={(values) => {
        onChange(values.value); // values.value = raw digits, e.g. "8000000"
      }}
      thousandSeparator="."
      decimalSeparator=","
      allowNegative={false}
      decimalScale={0}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className ?? baseClass}
      inputMode="numeric"
    />
  );
}
