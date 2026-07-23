"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

// ─── Clock constants ───────────────────────────────────────────────────────────

const SZ = 240;
const CX = 120;
const CY = 120;

// Outer ring: index 0 = 12 o'clock → hour value 12, index 1 = 1, …, 11
const OUTER_H = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Inner ring: index 0 = 12 o'clock → hour value 0, index 1 = 13, …
const INNER_H = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
// Minute steps shown on clock face
const MIN_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function polarXY(index: number, r: number) {
  const angle = (index / 12) * 2 * Math.PI - Math.PI / 2;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ClockTimePicker({
  value,
  onChange,
  placeholder = "Pilih waktu...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  upward?: boolean; // deprecated — kept for backward compat
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"hour" | "minute">("hour");
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [hourRaw, setHourRaw] = useState("08");
  const [minRaw, setMinRaw] = useState("00");
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize from value when picker opens
  useEffect(() => {
    if (!open) return;
    setPhase("hour");
    const [hStr = "8", mStr = "0"] = (value ?? "").split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const resolvedH = isNaN(h) ? 8 : h;
    const resolvedM = isNaN(m) ? 0 : m;
    setHour(resolvedH);
    setHourRaw(String(resolvedH).padStart(2, "0"));
    setMinute(resolvedM);
    setMinRaw(String(resolvedM).padStart(2, "0"));
  }, [open, value]);

  // Sync hour/minute display when clock-face selection changes
  useEffect(() => {
    setHourRaw(String(hour).padStart(2, "0"));
  }, [hour]);

  useEffect(() => {
    setMinRaw(String(minute).padStart(2, "0"));
  }, [minute]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const display = value ? value.slice(0, 5) : "";

  function confirm() {
    onChange(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
    setOpen(false);
  }

  function setNow() {
    const d = new Date();
    setHour(d.getHours());
    setMinute(d.getMinutes());
  }

  function handleHourClick(h: number) {
    setHour(h);
    setTimeout(() => setPhase("minute"), 380);
  }

  function handleHourRaw(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setHourRaw(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n >= 0 && n <= 23) setHour(n);
  }

  function handleHourBlur() {
    const n = parseInt(hourRaw, 10);
    const clamped = isNaN(n) ? 0 : Math.min(23, Math.max(0, n));
    setHour(clamped);
    setHourRaw(String(clamped).padStart(2, "0"));
  }

  function handleMinRaw(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMinRaw(digits);
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) setMinute(n);
  }

  function handleMinBlur() {
    const n = parseInt(minRaw, 10);
    const clamped = isNaN(n) ? 0 : Math.min(59, Math.max(0, n));
    setMinute(clamped);
    setMinRaw(String(clamped).padStart(2, "0"));
  }

  // ── Needle tip position (uses same polarXY as clock numbers — no CSS rotation) ─
  const outerIdx = OUTER_H.indexOf(hour);
  const innerIdx = INNER_H.indexOf(hour);
  const nearestMinStep = (Math.round(minute / 5) * 5) % 60;
  const minIdx = MIN_STEPS.indexOf(nearestMinStep);

  const needleTip = (() => {
    if (phase === "hour") {
      const idx = outerIdx !== -1 ? outerIdx : innerIdx !== -1 ? innerIdx : 0;
      const r = innerIdx !== -1 && outerIdx === -1 ? 54 : 82;
      return polarXY(idx, r);
    }
    return polarXY(minIdx === -1 ? 0 : minIdx, 82);
  })();

  // ── Popup content ────────────────────────────────────────────────────────────
  const popup = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-950/25"
      onClick={() => setOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-2xl p-px bg-linear-to-br from-white/90 via-purple-300/50 to-indigo-400/60 shadow-[0_14px_44px_-14px_rgba(79,70,229,0.45)]"
        style={{ width: 288 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[15px] overflow-hidden bg-linear-to-b from-white to-indigo-50/50">
        {/* ── Header ── */}
        <div className="bg-linear-to-br from-brand-start to-brand-end px-5 pt-4 pb-4">
          <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mb-2">
            Pilih Waktu
          </p>
          <div className="flex items-center gap-1.5">
            {/* Hour — editable input when in hour phase */}
            {phase === "hour" ? (
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={hourRaw}
                onChange={(e) => handleHourRaw(e.target.value)}
                onBlur={handleHourBlur}
                onFocus={(e) => e.target.select()}
                className="text-[42px] font-bold tabular-nums leading-none w-20.5 rounded-xl px-2.5 py-0.5 bg-white/20 text-white outline-none text-center"
              />
            ) : (
              <button
                onClick={() => setPhase("hour")}
                className="text-[42px] font-bold tabular-nums leading-none rounded-xl px-2.5 py-0.5 transition-colors text-white/60 hover:bg-white/15 hover:text-white"
              >
                {String(hour).padStart(2, "0")}
              </button>
            )}

            <span className="text-[42px] font-bold text-white/50 leading-none select-none">
              :
            </span>

            {/* Minute — editable input when in minute phase */}
            {phase === "minute" ? (
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={minRaw}
                onChange={(e) => handleMinRaw(e.target.value)}
                onBlur={handleMinBlur}
                onFocus={(e) => e.target.select()}
                className="text-[42px] font-bold tabular-nums leading-none w-20.5 rounded-xl px-2.5 py-0.5 bg-white/20 text-white outline-none text-center"
              />
            ) : (
              <button
                onClick={() => setPhase("minute")}
                className="text-[42px] font-bold tabular-nums leading-none rounded-xl px-2.5 py-0.5 transition-colors text-white/60 hover:bg-white/15 hover:text-white"
              >
                {String(minute).padStart(2, "0")}
              </button>
            )}
          </div>
        </div>

        {/* ── Clock face ── */}
        <div className="flex justify-center pt-3 pb-2 bg-gray-50/40">
          <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`}>
            {/* Background circle */}
            <circle cx={CX} cy={CY} r={112} fill="#ede9fe" />

            {/* Needle — animate tip coordinates directly, avoids CSS transform-origin ambiguity on SVG */}
            <motion.line
              x1={CX}
              y1={CY}
              initial={false}
              animate={{ x2: needleTip.x, y2: needleTip.y }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              stroke="#7c3aed"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <motion.circle
              r={4.5}
              fill="#7c3aed"
              initial={false}
              animate={{ cx: needleTip.x, cy: needleTip.y }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            />

            {/* Center pivot */}
            <circle cx={CX} cy={CY} r={4.5} fill="#7c3aed" />

            {/* ── Hour phase ── */}
            {phase === "hour" && (
              <>
                {/* Outer ring: 12, 1 … 11 */}
                {OUTER_H.map((h, i) => {
                  const { x, y } = polarXY(i, 90);
                  const sel = hour === h;
                  return (
                    <g
                      key={`oh${h}`}
                      onClick={() => handleHourClick(h)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={19}
                        className={
                          sel
                            ? "fill-brand"
                            : "fill-transparent hover:fill-brand/15"
                        }
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={13}
                        fontWeight={sel ? "700" : "400"}
                        style={{
                          pointerEvents: "none",
                          fill: sel ? "white" : "#374151",
                        }}
                      >
                        {String(h).padStart(2, "0")}
                      </text>
                    </g>
                  );
                })}

                {/* Inner ring: 0, 13 … 23 */}
                {INNER_H.map((h, i) => {
                  const { x, y } = polarXY(i, 59);
                  const sel = hour === h;
                  return (
                    <g
                      key={`ih${h}`}
                      onClick={() => handleHourClick(h)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={15}
                        className={
                          sel
                            ? "fill-brand"
                            : "fill-transparent hover:fill-brand/15"
                        }
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={10}
                        fontWeight={sel ? "700" : "400"}
                        style={{
                          pointerEvents: "none",
                          fill: sel ? "white" : "#6b7280",
                        }}
                      >
                        {String(h).padStart(2, "0")}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* ── Minute phase ── */}
            {phase === "minute" &&
              MIN_STEPS.map((m, i) => {
                const { x, y } = polarXY(i, 90);
                const sel = m === nearestMinStep;
                return (
                  <g
                    key={`m${m}`}
                    onClick={() => setMinute(m)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={19}
                      className={
                        sel
                          ? "fill-brand"
                          : "fill-transparent hover:fill-brand/15"
                      }
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={13}
                      fontWeight={sel ? "700" : "400"}
                      style={{
                        pointerEvents: "none",
                        fill: sel ? "white" : "#374151",
                      }}
                    >
                      {String(m).padStart(2, "0")}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* ── Phase dots ── */}
        <div className="flex justify-center gap-1.5 py-1.5">
          <button
            onClick={() => setPhase("hour")}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              phase === "hour"
                ? "bg-brand"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
          <button
            onClick={() => setPhase("minute")}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              phase === "minute"
                ? "bg-brand"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-4 pb-4 pt-0.5">
          <button
            type="button"
            onClick={setNow}
            className="text-sm text-brand font-medium hover:opacity-80 transition-opacity"
          >
            Sekarang
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={confirm}
              className="px-4 py-1.5 text-sm text-white bg-linear-to-br from-brand-start to-brand-end hover:brightness-110 font-medium rounded-lg transition-all"
            >
              OK
            </button>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="relative">
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm outline-none transition-all text-left bg-white cursor-pointer hover:border-gray-300 ${
          open ? "border-brand ring-2 ring-brand/20" : "border-gray-200"
        }`}
      >
        <span
          className={`flex items-center gap-2 ${display ? "text-gray-900 font-medium" : "text-gray-400"}`}
        >
          <Clock
            size={14}
            className={display ? "text-brand" : "text-gray-400"}
          />
          {display || placeholder}
        </span>
        <Clock
          size={14}
          className="text-gray-400 shrink-0 hidden"
          aria-hidden
        />
      </button>

      {/* ── Portal popup ── */}
      {mounted &&
        createPortal(
          <AnimatePresence>{open && popup}</AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
