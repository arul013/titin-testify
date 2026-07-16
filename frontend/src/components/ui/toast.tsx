"use client";

/**
 * Learning Nexus Design System — Toast (glassmorphism)
 *
 * Wrapper tipis di atas `sonner` dengan gaya glass LN: panel frosted putih +
 * blur + ring tipis, tint semantik halus per tipe (success = brand, error =
 * merah, dst) — bersih, tidak norak. Render `<Toaster />` sekali di shell;
 * pakai `toast.success(...)` / `toast.error(...)` seperti biasa.
 *
 * Contoh:
 *   import { toast } from "@/src/components/ui/toast";
 *   toast.success("Tersimpan");
 */

import { Toaster as SonnerToaster } from "sonner";
import "sonner/dist/styles.css";

export { toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          // Base: kaca frosted putih + blur + ring tipis
          toast:
            "!rounded-2xl !border !border-white/60 !bg-white/85 !backdrop-blur-xl " +
            "!shadow-lg !shadow-indigo-950/10 !ring-1 !ring-black/5 !text-gray-800 !text-sm",
          title: "!font-semibold",
          description: "!text-gray-500 !font-normal",
          // Tint semantik halus (ring + warna ikon) — LN: success = brand
          success: "!ring-brand/25 [&_[data-icon]_svg]:!text-brand",
          error: "!ring-red-400/30 [&_[data-icon]_svg]:!text-red-500",
          warning: "!ring-amber-400/30 [&_[data-icon]_svg]:!text-amber-500",
          info: "!ring-blue-400/30 [&_[data-icon]_svg]:!text-blue-500",
          closeButton:
            "!bg-white/80 !border-white/60 !text-gray-400 hover:!text-gray-600 !backdrop-blur-sm",
        },
      }}
    />
  );
}
