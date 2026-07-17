/** Angka acak [0,1) yang kuat (pakai crypto bila tersedia). */
function secureRandom(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / 2 ** 32;
  }
  return Math.random();
}

// Karakter tanpa yang ambigu (tidak ada I, O, l, o, 0, 1).
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%*?';

/**
 * Buat password acak yang kuat: minimal satu huruf besar, kecil, angka, dan
 * simbol. Default 12 karakter, tanpa karakter yang mudah tertukar.
 */
export function generatePassword(length = 12): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const pick = (set: string) => set[Math.floor(secureRandom() * set.length)];

  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < length) chars.push(pick(all));

  // Acak urutan (Fisher–Yates) agar posisi karakter wajib tidak tertebak.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(secureRandom() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
