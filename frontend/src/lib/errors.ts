/**
 * Ekstrak pesan error yang aman dari nilai `unknown` (hasil dari catch clause).
 * Menghindari penggunaan `any` sekaligus menangani Error, string, dan bentuk lain.
 */
export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
