import React from "react";
import { cn } from "@/src/lib/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className,
  ...props
}) => {
  const styles: Record<BadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/50",
    danger: "bg-red-50 text-red-700 border border-red-200/50",
    info: "bg-indigo-50 text-indigo-700 border border-indigo-200/50",
    neutral: "bg-slate-50 text-slate-700 border border-slate-200/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide capitalize transition-colors",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
