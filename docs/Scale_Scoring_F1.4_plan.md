# F1.4 — Skala/Band per Jenis Tes + Timing per-Bagian

Status: **desain disepakati 2026-08-01.** Bagian dari pilar F1 ([[question-model-f1]]).
Dua fitur independen: **F1.4a** (skala/band skor) + **F1.4b** (timing per-bagian di runner).

## Keputusan (2026-08-01)
1. **Skala = tabel tersandi (dispatcher).** Tabel konversi diverifikasi di kode (seperti ITP), dipilih via `resolve_scale(test_type, exam_mode)`. Bukan data-driven admin.
2. **Timing = kunci per-bagian berurutan.** Tiap bagian timer sendiri; habis → auto-lanjut, tak bisa balik (mirip iBT/IELTS asli).
3. **Kerjakan F1.4a dulu**, timing (F1.4b) menyusul.
4. **IELTS & iBT masih "soon" + tabel belum ada** → bangun **fondasi/seam** sekarang; angka konversi + aktivasi jenis tes menyusul. Provisional pakai aproksimasi linear + flag (opsi (i)).

## Arsitektur skala (F1.4a)
`resolve_scale(test_type, exam_mode)` = titik ekstensi tunggal → `'toefl_itp' | 'nilai' | (nanti) 'ielts_band' | 'toefl_ibt'`.
- **IELTS** (`ielts_band`): tiap bagian → band 0–9. Auto (L/R) `raw→band` via tabel; manual (W/S) `awarded_score` rubrik = band langsung. **Overall = rata-rata 4 band, bulat ke 0.5.**
- **iBT** (`toefl_ibt`): tiap bagian → 0–30 (auto tabel/linear; manual awarded). **Total = jumlah → 0–120.**
- **Sinergi F1.2**: bagian rubrik menyumbang band/skala dari `awarded_score` → agregasi terjadi di `_recompute_and_maybe_complete` yang sama; skor tetap ditahan sampai grading selesai. Tak ada mekanisme "menahan" baru.

## Tabel konversi "menyusul" (pola pluggable)
Paket `backend/app/services/scoring_tables/` = tempat colok tabel:
- `ielts.py` / `toefl_ibt.py` — `OFFICIAL` flag + `SOURCE` + tabel (`None` bila belum ada).
- `__init__.py` — `REGISTRY` + helper `linear_band`/`linear_scaled`/`round_to_step`.
- **Kontrak**: `OFFICIAL=False`/tabel `None` → engine pakai aproksimasi linear + `provisional=True`. Saat tabel resmi ada: isi konstanta + `OFFICIAL=True` → langsung dipakai, tanpa ubah engine/UI.
- Catatan kejujuran: raw→band IELTS / raw→scaled iBT TIDAK baku resmi (di-equate per versi). Angka = milik institusi/praktik, bersumber di modul.

## Status implementasi
- **F1.4a.0 — Fondasi/seam ✅** (2026-08-01, belum commit): `resolve_scale()` seam (`is_official_itp` delegasi ke situ; `compute_exam_score` lewat `scale`), paket `scoring_tables/` (registry + stub ielts/ibt PROVISIONAL + helper linear). Regresi ITP(677)/Nilai(70) aman. **Belum ada logika band** (ditunda: butuh tabel + jenis tes aktif).

## Ditunda (sampai tabel & jenis tes IELTS/iBT aktif)
- **F1.4a.1** — Longgarkan identitas `section` (enum `QuestionSection` 4-nilai TOEFL → data-driven via `test_type_skills`) agar bagian IELTS/iBT (writing/speaking) jalan di seluruh stack. DB CHECK sudah di-drop (F1.0); sisa: Pydantic + validasi.
- **F1.4a.2** — Implement `ielts_band`/`toefl_ibt` di `compute_exam_score`: agregasi band per-bagian (auto tabel-atau-linear + manual awarded), overall (rata-rata/jumlah), `provisional` flag. Kirim per-bagian lebih kaya (`correct`/`awarded`/`max`/`manual?`) dari submit + `_recompute`.
- **F1.4a.3** — Result UI: tampilkan band/scaled per-bagian + overall (generalisasi tampilan `converted` ITP) + badge "skala sementara" saat provisional.

## F1.4b — Timing per-bagian (nanti)
- Model: `exam_sections.time_limit_minutes` (kolom sudah ada, belum diwire).
- Enforcement: **kunci per-bagian berurutan** — runner ubah dari navigasi-bebas 1-timer → alur per-bagian, timer per-bagian, auto-advance saat habis, tak bisa mundur ke bagian lampau. Fallback: bila section tak set timer → pakai durasi global.

## Aturan
- Jangan commit/push (hak user). Jangan tulis angka konversi tanpa sumber. Skala baru = tambah di `resolve_scale` + modul tabel, TANPA rombak engine.
