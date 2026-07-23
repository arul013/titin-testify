"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import {
  ChevronDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import "react-day-picker/style.css";

const ID_MONTHS_SHORT: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "Mei",
  6: "Jun",
  7: "Jul",
  8: "Agt",
  9: "Sep",
  10: "Okt",
  11: "Nov",
  12: "Des",
};

const ID_MONTHS_FULL: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

function formatDisplay(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${ID_MONTHS_SHORT[month]} ${year}`;
}

function buildYearGrid(centerYear: number): number[] {
  const start = Math.floor(centerYear / 12) * 12;
  return Array.from({ length: 12 }, (_, i) => start + i);
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  upward?: boolean; // deprecated — kept for backward compat
  align?: "left" | "right"; // deprecated — kept for backward compat
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal publikasi...",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"calendar" | "year">("calendar");
  const [month, setMonth] = useState<Date>(
    value ? new Date(value + "T00:00:00") : new Date(),
  );

  const openDialog = () => {
    setMonth(value ? new Date(value + "T00:00:00") : new Date());
    setView("calendar");
    setOpen(true);
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const currentYear = month.getFullYear();
  const currentMonthNum = month.getMonth() + 1;
  const yearGrid = buildYearGrid(currentYear);
  const decadeStart = yearGrid[0];
  const decadeEnd = yearGrid[yearGrid.length - 1];

  const goToPrevDecade = () => {
    setMonth(new Date(decadeStart - 1, month.getMonth(), 1));
  };
  const goToNextDecade = () => {
    setMonth(new Date(decadeEnd + 1, month.getMonth(), 1));
  };

  const selectYear = (y: number) => {
    setMonth(new Date(y, month.getMonth(), 1));
    setView("calendar");
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={openDialog}
        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm outline-none transition-all text-left bg-white cursor-pointer hover:border-gray-300
          ${open ? "border-purple-400 ring-2 ring-purple-100" : "border-gray-200"}
        `}
      >
        <span
          className={`flex items-center gap-2 ${value ? "text-gray-900 font-medium" : "text-gray-400"}`}
        >
          <CalendarDays
            size={14}
            className={value ? "text-purple-500" : "text-gray-400"}
          />
          {value ? formatDisplay(value) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={handleClear}
              role="button"
              className="p-0.5 rounded text-gray-400 hover:text-red-400 transition-colors"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Centered dialog */}
      {open &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/25"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-71 rounded-2xl p-px bg-linear-to-br from-white/90 via-purple-300/50 to-indigo-400/60 shadow-[0_14px_44px_-14px_rgba(79,70,229,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-[15px] bg-linear-to-b from-white to-indigo-50/50 p-4 ring-1 ring-inset ring-white/60">
              <AnimatePresence mode="wait">
                {view === "year" ? (
                  /* ── Year grid view ── */
                  <motion.div
                    key="year"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Year grid header */}
                    <div className="flex items-center justify-between px-1 py-1 mb-3">
                      <button
                        type="button"
                        onClick={goToPrevDecade}
                        className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-sm font-semibold text-gray-800">
                        {decadeStart} – {decadeEnd}
                      </span>
                      <button
                        type="button"
                        onClick={goToNextDecade}
                        className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Year grid — 4×3 */}
                    <div className="grid grid-cols-4 gap-1.5 h-54">
                      {yearGrid.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => selectYear(y)}
                          className={`rounded-lg text-sm font-medium transition-colors py-2
                            ${
                              y === currentYear
                                ? "bg-purple-600 text-white"
                                : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                            }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>

                    {/* Month row — quick month pick after year is chosen */}
                    <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-gray-100">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMonth(new Date(currentYear, m - 1, 1));
                            setView("calendar");
                          }}
                          className={`rounded-lg text-[11px] font-medium py-1.5 transition-colors
                            ${
                              m === currentMonthNum
                                ? "bg-purple-100 text-purple-700"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                          {ID_MONTHS_SHORT[m]}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  /* ── Calendar view ── */
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DayPicker
                      mode="single"
                      selected={selected}
                      onSelect={handleSelect}
                      month={month}
                      onMonthChange={setMonth}
                      components={{
                        Chevron: ({ orientation }) =>
                          orientation === "left" ? (
                            <ChevronLeft size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          ),
                        MonthCaption: ({ calendarMonth }) => {
                          const d = calendarMonth.date;
                          const mo = d.getMonth() + 1;
                          const yr = d.getFullYear();
                          return (
                            <div className="flex items-center justify-between px-1 py-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setMonth(
                                    new Date(
                                      month.getFullYear(),
                                      month.getMonth() - 1,
                                      1,
                                    ),
                                  )
                                }
                                className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setView("year")}
                                className="text-sm font-semibold text-gray-800 hover:text-purple-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-purple-50"
                              >
                                {ID_MONTHS_FULL[mo]} {yr}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setMonth(
                                    new Date(
                                      month.getFullYear(),
                                      month.getMonth() + 1,
                                      1,
                                    ),
                                  )
                                }
                                className="p-1 rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          );
                        },
                      }}
                      classNames={{
                        root: "rdp-custom",
                        months: "flex flex-col",
                        month: "space-y-2",
                        month_caption: "hidden", // hidden — replaced by custom MonthCaption
                        nav: "hidden", // hidden — nav handled in MonthCaption
                        month_grid: "w-full border-collapse",
                        weekdays: "flex",
                        weekday:
                          "w-9 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide pb-1",
                        // Fixed height: 6 rows × 36px = 216px — dialog never resizes
                        weeks: "block h-[252px]",
                        week: "flex mt-1",
                        day: "w-9 h-9 p-0 flex items-center justify-center",
                        day_button: `w-8 h-8 rounded-lg text-sm transition-colors
                            hover:bg-purple-50 hover:text-purple-700
                            focus:outline-none focus:ring-2 focus:ring-purple-300`,
                        selected:
                          "[&>button]:!bg-purple-600 [&>button]:!text-white [&>button]:hover:!bg-purple-700 [&>button]:font-semibold",
                        today:
                          "[&>button]:font-bold [&>button]:text-purple-600 [&>button]:ring-1 [&>button]:ring-purple-300",
                        outside:
                          "[&>button]:text-gray-300 [&>button]:hover:bg-gray-50",
                        disabled:
                          "[&>button]:text-gray-200 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
                >
                  Hapus tanggal
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-xs text-purple-600 font-semibold hover:text-purple-700 transition-colors px-2 py-1 rounded hover:bg-purple-50"
                >
                  Hari ini
                </button>
              </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
