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

## F1.4b — Timing per-bagian
Keputusan (2026-08-01): **opt-in** (aktif bila SEMUA bagian aktif diisi batas waktu); **kunci per-bagian berurutan**; **gaya iBT** (boleh maju awal, sisa hangus, bagian berikutnya mulai timer sendiri dari nol; auto-advance saat habis; tak bisa mundur). Bila tak ada batas per-bagian → tetap 1 timer global + navigasi bebas (perilaku lama).

- **F1.4b.1 — Authoring ✅** (2026-08-01, belum commit): `ExamSectionInput/Response.time_limit_minutes`; persist di create/update/duplicate/load exam_service. Builder `StepComposition` input "Batas waktu bagian (menit)" per-bagian + banner status mode per-bagian; `ExamBuilder` state `sectionTimes` + payload; `useExams.ExamSection.time_limit_minutes`. Tanpa migrasi (kolom `exam_sections.time_limit_minutes` sudah ada dari 020).
- **F1.4b.2 — Backend runner ✅** (2026-08-01, belum commit; migrasi `021_section_timing.sql` sudah dijalankan user): helper `_section_timing_config` (mode per-bagian bila SEMUA bagian bersoal punya batas), `_init_section_state`, `_advance_expired` (auto-advance berantai deterministik: next.started_at = deadline sebelumnya), `_section_timing_view`. `start_attempt` init/resume state + `section_timing` di response. Endpoint `POST /api/attempts/{id}/advance` (`AdvanceSectionRequest.section`; kunci bagian aktif, mulai berikutnya dari now — maju awal sisa hangus; cegah lompat-ganda). `save_answer` tolak (403) bagian terkunci. `SectionTiming` model. Logika terverifikasi unit-test.
- **F1.4b.3 — Frontend runner ✅** (2026-08-01, belum commit): `api.ts` (`SectionTiming` + `StartAttemptResponse.section_timing` + `attemptsApi.advance`). `ExamRunner` mode per-bagian: hanya soal bagian aktif (filter `section`), timer per-bagian (+global sebagai backstop), bilah progres bagian (lock icon), tombol "Selesai & Lanjut" (non-terakhir, konfirmasi irreversible → `/advance`) vs "Kumpulkan" (terakhir → submit), auto-advance saat timer 0 (bagian terakhir → finished → auto-submit), palette/answered per-bagian, tak bisa mundur. Fallback penuh ke perilaku lama bila `section_timing` null. tsc/diagnostics bersih. **F1.4b LENGKAP end-to-end.**

## Aturan
- Jangan commit/push (hak user). Jangan tulis angka konversi tanpa sumber. Skala baru = tambah di `resolve_scale` + modul tabel, TANPA rombak engine.
