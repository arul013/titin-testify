import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keamanan (F2.d): kunci invariant anti-XSS — larang dangerouslySetInnerHTML.
  // Konten admin (soal/passage/pembahasan) dirender via React text node (auto-escape).
  // Bila suatu saat butuh HTML kaya, WAJIB lewat sanitizer allowlist + izin eksplisit.
  {
    rules: {
      "react/no-danger": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
