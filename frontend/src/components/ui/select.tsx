"use client";

/**
 * Learning Nexus Design System — Custom Select Component (Non-Native)
 *
 * Menggantikan select native HTML dengan dropdown kustom sepenuhnya.
 * - Desain premium dengan liquid focus ring border gradient & shadow glow.
 * - Panel opsi (options panel) muncul tepat di bawah input, melengkapi frame input dengan rapi.
 * - Fitur: Auto-detect & parse option children (backward-compatible), click outside listener,
 *   dan pilihan aktif disorot dengan warna brand + checkmark.
 */

import * as React from "react";
import { cn } from "@/src/lib/cn";
import { ChevronDown, Check } from "lucide-react";

const CONTROL_BASE =
  "w-full rounded-xl border bg-white pl-4 pr-10 py-2.5 text-sm text-gray-800 " +
  "outline-none transition-all cursor-pointer text-left block truncate " +
  "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70 select-none";

function FocusRing({ isOpen }: { isOpen: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-0.5 rounded-[14px] bg-brand/25 opacity-0 blur-md transition-opacity duration-200",
          isOpen && "opacity-100"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-px rounded-[13px] bg-linear-to-br from-brand-start to-brand-end opacity-0 transition-opacity duration-200",
          isOpen && "opacity-100"
        )}
      />
    </>
  );
}

function FieldLabel({
  required,
  children,
}: {
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
}

function FieldMessage({ error, hint }: { error?: React.ReactNode; hint?: React.ReactNode }) {
  if (error) return <p className="mt-1 text-xs text-red-500">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-gray-400">{hint}</p>;
  return null;
}

function borderClasses(isOpen: boolean, hasError?: boolean) {
  if (hasError) {
    return "border-red-300 ring-2 ring-red-400/40";
  }
  return isOpen ? "border-indigo-500/80 ring-2 ring-indigo-500/10 z-20" : "border-gray-200 hover:border-gray-300";
}

export interface SelectProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  leftIcon?: React.ReactNode;
  value?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    leftIcon,
    value,
    onChange,
    name,
    disabled = false,
    required = false,
    className,
    containerClassName,
    children,
  },
  ref
) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse children options
  const options: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const optionElement = child as React.ReactElement<{
        value?: string | number;
        children?: React.ReactNode;
      }>;
      options.push({
        value: String(optionElement.props.value || ""),
        label: String(optionElement.props.children || ""),
      });
    }
  });

  // Ambil label untuk value terpilih
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : "Pilih opsi...";

  // Tutup dropdown saat klik di luar komponen
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectOption = (optValue: string) => {
    if (disabled) return;
    if (onChange) {
      onChange({
        target: {
          value: optValue,
          name: name,
        },
      });
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", isOpen ? "z-30" : "z-10", containerClassName)}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      
      <div className="relative">
        <FocusRing isOpen={isOpen} />
        
        <div className="relative z-10">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </span>
          )}
          
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              CONTROL_BASE,
              borderClasses(isOpen, !!error),
              leftIcon && "pl-10",
              className
            )}
          >
            <span className="block truncate pr-4">{displayLabel}</span>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </span>
          </button>

          {/* Custom Dropdown Options Panel */}
          {isOpen && options.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-indigo-500/80 bg-white p-1.5 shadow-lg shadow-indigo-100/40 animate-in fade-in slide-in-from-top-1 duration-150 outline-none">
              <div className="flex flex-col gap-0.5">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption(opt.value)}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-sm rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/75 text-indigo-700 font-semibold"
                          : "text-gray-700 hover:bg-slate-50 hover:text-gray-900"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});
