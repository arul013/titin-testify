"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lock } from "lucide-react";

export interface WorkflowStep {
  label: string;
  sub?: string;
  state: "complete" | "active" | "locked";
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  title?: string;
  /** Override outer wrapper className. Defaults to standalone card style. */
  className?: string;
  /** If provided, each non-locked step becomes clickable. Called with 0-based index. */
  onStepClick?: (idx: number) => void;
  /** 0-based index of the step currently being viewed — adds an extra ring highlight. */
  viewingIdx?: number;
}

export function WorkflowStepper({
  steps,
  title = "Alur Proses",
  className,
  onStepClick,
  viewingIdx,
}: WorkflowStepperProps) {
  return (
    <div className={className ?? "bg-white rounded-2xl border border-gray-100 p-5"}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
        {title}
      </p>
      <div className="flex items-start">
        {steps.map((step, idx) => {
          const isComplete = step.state === "complete";
          const isActive = step.state === "active";
          const isLocked = step.state === "locked";
          const isLast = idx === steps.length - 1;
          const isViewing = viewingIdx === idx && !isLocked;
          const canClick = !!onStepClick && !isLocked;

          const circle = (
            <div
              className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isViewing
                  ? "ring-2 ring-purple-500 ring-offset-2"
                  : isActive
                    ? "ring-2 ring-purple-500 ring-offset-1"
                    : ""
              } ${
                isComplete
                  ? "bg-purple-600 border-purple-600"
                  : isActive
                    ? "bg-purple-50 border-purple-400"
                    : "bg-gray-50 border-gray-200"
              }`}
            >
              {isActive && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              ) : isActive ? (
                <span className="text-[10px] font-bold text-purple-600 relative z-10">
                  {idx + 1}
                </span>
              ) : (
                <Lock className="w-3 h-3 text-gray-300" />
              )}
            </div>
          );

          const label = (
            <p
              className={`text-[11px] font-semibold text-center whitespace-nowrap ${
                !isLocked ? "text-gray-700" : "text-gray-300"
              }`}
            >
              {step.label}
            </p>
          );

          const sub = step.sub ? (
            <p
              className={`text-[9px] whitespace-nowrap ${
                isComplete
                  ? "text-gray-400"
                  : isActive
                    ? "text-purple-500"
                    : "text-gray-300"
              }`}
            >
              {step.sub}
            </p>
          ) : null;

          const nodeContent = (
            <>
              {circle}
              {label}
              {sub}
            </>
          );

          return (
            <Fragment key={idx}>
              {/* Step node — button if clickable, div otherwise */}
              {canClick ? (
                <button
                  type="button"
                  onClick={() => onStepClick(idx)}
                  className="flex flex-col items-center gap-1.5 shrink-0 min-w-20"
                >
                  {nodeContent}
                </button>
              ) : (
                <div className={`flex flex-col items-center gap-1.5 shrink-0 min-w-20 ${isLocked && onStepClick ? "cursor-not-allowed" : ""}`}>
                  {nodeContent}
                </div>
              )}

              {/* Connector */}
              {!isLast && (
                <div className="flex-1 mt-3 h-px bg-gray-100 self-start overflow-hidden relative">
                  {isComplete && (
                    <>
                      <motion.div
                        className="absolute inset-0 h-full bg-purple-300 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute top-0 h-full w-2/5 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)",
                        }}
                        animate={{ x: ["-100%", "250%"] }}
                        transition={{
                          duration: 1.5,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 2.5,
                          delay: idx * 0.7,
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
