"use client";

/**
 * Learning Nexus Design System — ToggleGroup
 *
 * Sekumpulan chip toggle (single atau multi-select) — untuk pilih hari, kategori,
 * tag, jawaban kuis, dll. Data-driven & token-driven. Chip aktif = gradient brand
 * (premium), inaktif = solid abu clean. Feedback tekan halus (framer-motion).
 *
 * Single (default): `value: string` + `onChange: (v: string) => void`.
 * Multi: prop `multiple` + `value: string[]` + `onChange: (v: string[]) => void`
 * (urutan mengikuti `options`).
 *
 * Contoh:
 *   // multi (hari)
 *   <ToggleGroup multiple value={days} onChange={setDays}
 *     options={[{value:"1",label:"Sen"}, …]} />
 *   // single (jawaban)
 *   <ToggleGroup value={ans} onChange={setAns}
 *     options={[{value:"a",label:"A"},{value:"b",label:"B"}]} />
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/src/lib/cn";

export interface ToggleGroupOption {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type ToggleGroupSize = "sm" | "md";

interface ToggleGroupBase {
  options: ToggleGroupOption[];
  size?: ToggleGroupSize;
  className?: string;
}

export type ToggleGroupProps =
  | (ToggleGroupBase & {
      multiple: true;
      value: string[];
      onChange: (value: string[]) => void;
    })
  | (ToggleGroupBase & {
      multiple?: false;
      value: string;
      onChange: (value: string) => void;
    });

const SIZE: Record<ToggleGroupSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-sm",
};

export function ToggleGroup(props: ToggleGroupProps) {
  const { options, size = "md", className } = props;
  const reduce = useReducedMotion();

  const selected = new Set<string>(
    props.multiple ? props.value : props.value ? [props.value] : [],
  );

  function handle(v: string) {
    if (props.multiple) {
      const next = new Set(props.value);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      props.onChange(options.filter((o) => next.has(o.value)).map((o) => o.value));
    } else {
      props.onChange(props.value === v ? "" : v);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const active = selected.has(opt.value);
        return (
          <motion.button
            key={opt.value}
            type="button"
            disabled={opt.disabled}
            aria-pressed={active}
            onClick={() => !opt.disabled && handle(opt.value)}
            whileTap={reduce || opt.disabled ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-brand/40",
              SIZE[size],
              opt.disabled && "cursor-not-allowed opacity-40",
              active
                ? "bg-linear-to-br from-brand-start to-brand-end text-white shadow-sm shadow-indigo-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            {opt.icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{opt.icon}</span>}
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}
