"use client";

/**
 * Learning Nexus Design System — Input & Textarea
 *
 * Konten solid (putih). Saat FOCUS: rim gradient brand (indigo→ungu, sama seperti
 * tombol primary) + glow lembut — statis, tanpa animasi. Presentational &
 * token-driven → siap ekstrak ke `@learning-nexus/design-system`.
 *
 * Contoh:
 *   <Input label="Topik" placeholder="Grammar…" required />
 *   <Input label="Email" type="email" error="Email tidak valid" />
 *   <Textarea label="Catatan" rows={3} hint="Opsional" />
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";

const CONTROL_BASE =
  "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-gray-800 " +
  "placeholder:text-gray-400 outline-none transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70";

// Rim gradient brand + glow — muncul halus saat focus (via group-focus-within).
function FocusRing() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 rounded-[14px] bg-brand/25 opacity-0 blur-md transition-opacity duration-200 group-focus-within:opacity-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[13px] bg-linear-to-br from-brand-start to-brand-end opacity-0 transition-opacity duration-200 group-focus-within:opacity-100"
      />
    </>
  );
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function FieldMessage({ error, hint }: { error?: React.ReactNode; hint?: React.ReactNode }) {
  if (error) return <p className="mt-1 text-xs text-red-500">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-gray-400">{hint}</p>;
  return null;
}

function borderClasses(hasError?: boolean) {
  return hasError
    ? "border-red-300 focus:ring-2 focus:ring-red-400/40"
    : "border-gray-200 focus:border-transparent";
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** class untuk wrapper terluar (label + control + message). */
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightIcon, containerClassName, className, id, required, ...props },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <div className={containerClassName}>
      {label && (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="group relative">
        {!error && <FocusRing />}
        <div className="relative z-10">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={cn(
              CONTROL_BASE,
              borderClasses(!!error),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </span>
          )}
        </div>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, containerClassName, className, id, required, ...props },
  ref,
) {
  const autoId = React.useId();
  const areaId = id ?? autoId;
  return (
    <div className={containerClassName}>
      {label && (
        <FieldLabel htmlFor={areaId} required={required}>
          {label}
        </FieldLabel>
      )}
      <div className="group relative">
        {!error && <FocusRing />}
        <textarea
          ref={ref}
          id={areaId}
          required={required}
          className={cn(CONTROL_BASE, "relative z-10 block resize-none", borderClasses(!!error), className)}
          {...props}
        />
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});
