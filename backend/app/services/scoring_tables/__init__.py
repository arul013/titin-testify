"""
Learning Nexus CBT — Registry Tabel Konversi Skala (F1.4)

Tempat "colok" tabel konversi resmi per jenis tes. Setiap jenis tes non-TOEFL-ITP
punya satu modul (ielts.py, toefl_ibt.py) berisi tabel + flag OFFICIAL + SOURCE.

Kontrak:
- Selama `OFFICIAL=False` / tabel `None` → engine memakai **aproksimasi linear**
  (`linear_band`/`linear_scaled`) dan menandai hasil `provisional=True`.
- Saat tabel resmi tersedia: isi konstantanya + set `OFFICIAL=True`. Tak ada
  perubahan lain di engine/UI — angka langsung dipakai.

Catatan: konversi raw→band IELTS / raw→scaled iBT TIDAK baku resmi (di-equate per
versi tes). Angka yang diisi = milik institusi / tabel praktik, bersumber di modul.
"""

from . import ielts, toefl_ibt

REGISTRY = {
    "ielts_band": ielts,
    "toefl_ibt": toefl_ibt,
}


def round_to_step(x: float, step: float = 0.5) -> float:
    """Bulatkan ke kelipatan `step` terdekat (mis. 0.5 untuk band IELTS)."""
    if step <= 0:
        return x
    return round(round(x / step) * step, 2)


def linear_band(correct: int, total: int, band_max: float = 9.0, step: float = 0.5) -> float:
    """Aproksimasi band dari proporsi benar (dipakai saat tabel resmi belum ada)."""
    if total <= 0:
        return 0.0
    return round_to_step(correct / total * band_max, step)


def linear_scaled(correct: int, total: int, scaled_max: int = 30) -> int:
    """Aproksimasi skor terskala (0..scaled_max) dari proporsi benar."""
    if total <= 0:
        return 0
    return int(round(correct / total * scaled_max))
