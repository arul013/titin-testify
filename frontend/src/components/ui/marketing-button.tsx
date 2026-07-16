"use client";

import { cn } from "@/src/lib/cn";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import * as React from "react";

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary";
  href?: string;
  target?: string;
  showArrow?: boolean;
}

export function Button({
  className,
  variant = "secondary",
  href,
  target,
  showArrow = false,
  children,
  ...props
}: ButtonProps) {
  const content = (
    <span className="relative flex items-center gap-2">
      {children}
      {showArrow && (
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      )}
    </span>
  );

  if (variant === "primary") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <button
          className={cn(
            "group relative bg-linear-to-r from-purple-600 via-purple-700 to-purple-800",
            "hover:from-purple-700 hover:via-purple-800 hover:to-purple-900",
            "text-white text-lg font-semibold rounded-xl px-6 py-2",
            "shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 overflow-hidden",
            "inline-flex items-center justify-center tracking-tight",
            className,
          )}
          {...props}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-purple-400 to-purple-600 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {href ? (
            <a href={href} target={target} rel="noopener noreferrer">
              {content}
            </a>
          ) : (
            content
          )}
        </button>
      </motion.div>
    );
  }

  // Secondary variant — no bg, no border
  return (
    <button
      className={cn(
        "group text-black text-lg font-semibold px-6 py-2",
        "hover:opacity-80 transition-opacity duration-200",
        "inline-flex items-center justify-center tracking-tight cursor-pointer",
        className,
      )}
      {...props}
    >
      {href ? (
        <a href={href} target={target} rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        content
      )}
    </button>
  );
}
