"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDecade(centerYear: number): number[] {
  const start = Math.floor(centerYear / 12) * 12;
  return Array.from({ length: 12 }, (_, i) => start + i);
}

// ─── YearPicker ───────────────────────────────────────────────────────────────

interface YearPickerProps {
  value: number;
  onChange: (year: number) => void;
  placeholder?: string;
}

export function YearPicker({
  value,
  onChange,
  placeholder = "Pilih tahun...",
}: YearPickerProps) {
  const [open, setOpen] = useState(false);
  const [decade, setDecade] = useState(() =>
    buildDecade(value || new Date().getFullYear()),
  );

  const decadeStart = decade[0];
  const decadeEnd = decade[decade.length - 1];

  const openPicker = () => {
    setDecade(buildDecade(value || new Date().getFullYear()));
    setOpen(true);
  };

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const selectYear = (y: number) => {
    onChange(y);
    setOpen(false);
  };

  const goThisYear = () => {
    const y = new Date().getFullYear();
    onChange(y);
    setDecade(buildDecade(y));
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger button — konsisten dengan DatePicker */}
      <button
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm outline-none transition-all bg-white cursor-pointer hover:border-gray-300 text-left
          ${open ? "border-purple-400 ring-2 ring-purple-100" : "border-gray-200"}`}
      >
        <CalendarDays
          size={14}
          className={value ? "text-purple-500" : "text-gray-400"}
        />
        <span
          className={`flex-1 font-semibold ${value ? "text-gray-900" : "text-gray-400"}`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Portal — sama persis dengan DatePicker */}
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl p-4 w-64"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decade navigation */}
              <div className="flex items-center justify-between px-1 py-1 mb-3">
                <button
                  type="button"
                  onClick={() => setDecade(buildDecade(decadeStart - 1))}
                  className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-800">
                  {decadeStart} – {decadeEnd}
                </span>
                <button
                  type="button"
                  onClick={() => setDecade(buildDecade(decadeEnd + 1))}
                  className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Year grid — 4×3 */}
              <div className="grid grid-cols-4 gap-1.5">
                {decade.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`rounded-lg text-sm font-medium py-2.5 transition-colors
                    ${
                      y === value
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-3 mt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={goThisYear}
                  className="text-xs text-purple-600 font-semibold hover:text-purple-700 transition-colors px-2 py-1 rounded hover:bg-purple-50"
                >
                  Tahun ini
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
