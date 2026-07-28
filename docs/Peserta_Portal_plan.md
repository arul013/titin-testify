# Portal Peserta (Fase P5)

Status: **disepakati, dikoding bertahap (review antar-step).** Tanggal: 2026-07-28.
Terkait: `Exam_Engine_Phase4_plan.md` (mesin ujian), `Exam_Scoring_TOEFL_ITP.md`, `Exam_Test_Types_plan.md`.

## 1. Struktur: 3 menu (sidebar peserta)
Pola LMS profesional: **home → to-do → done**.

1. **Dashboard** (home ringan/glanceable):
   - Kartu **"Ujian Berikutnya"** (paling menonjol): sedang berlangsung → Lanjutkan + sisa waktu; tersedia → Mulai; mendatang → countdown ke pembukaan; kosong → "tidak ada ujian aktif".
   - Statistik ringkas: ditugaskan · selesai · skor terakhir / rata-rata.
   - Hasil terbaru (skor + Lulus/Belum) → tautan ke Riwayat.
   - Shortcut ke Ujian Saya & Riwayat.
2. **Ujian Saya** (aktif/actionable): berlangsung, tersedia, mendatang (+countdown), bisa diulang. **Tidak** menampilkan ujian selesai yang tak bisa diulang.
3. **Riwayat Ujian** (read-only): ujian selesai + skor + Lulus/Belum → detail hasil; **pembahasan bila diizinkan admin**.

## 2. Keputusan (2026-07-28)
- **Pembahasan & kunci jawaban** = **diatur admin per ujian** (`exams.show_review`). Default cerdas: **Latihan → ON**, **Tes Lengkap → OFF**. Admin bisa override.
- **Retake** = **tak terbatas** (perilaku sekarang; `allow_retake` boolean). Tak ada batas jumlah dulu.
- **Dashboard peserta** = **dibangun** (3 menu penuh).

## 3. Integritas: kenapa pembahasan dikendalikan
Ujian **deterministik** (semua peserta soal SAMA). Bila satu peserta melihat kunci + pembahasan lalu membagikannya → peserta lain yang mengerjakan ujian sama bisa curang. Maka kunci jawaban **tak pernah bocor saat ujian**; pembahasan hanya dibuka **setelah submit** DAN bila `show_review = true`.

## 4. Fondasi data (P5.0)
- **`exams.show_review`** BOOLEAN DEFAULT FALSE — toggle di step Detail. Default app: Latihan true, Tes Lengkap false.
- **`exam_questions.explanation`** TEXT — pembahasan **dibekukan saat publish** (denormalisasi, konsisten prinsip snapshot). **Tak** disertakan di `payload` peserta (yang dikirim saat ujian); hanya dibuka di endpoint review.
- `exam_questions.correct_answer` sudah ada (kunci, disimpan terpisah) → dipakai review.
- **Endpoint review**: `GET /api/attempts/{id}/review` → per soal: payload + jawaban peserta + kunci + benar/salah + pembahasan. **Guard**: attempt milik user + status submitted + `exam.show_review = true`.

## 5. Sub-fase
1. **P5.0 — Backend pembahasan** ✅ SELESAI 2026-07-28 (compile bersih, belum di-commit; migration `014_exam_review.sql` **menunggu user jalankan**):
   - Migration 014: `exams.show_review` BOOL + `exam_questions.explanation` TEXT.
   - `exam.py`/`exam_service.py`: `show_review` di Create/Update/Response; assembly (`_assemble_and_freeze`) **bekukan `explanation`** ke exam_questions (TAK ke payload).
   - Endpoint **`GET /api/attempts/{id}/review`** (`review_attempt`): per soal + kunci + jawaban + benar/salah + pembahasan; guard (owned + submitted + `exam.show_review`). Model `AttemptReviewQuestion`/`AttemptReviewResponse`. `AttemptResultResponse` +`show_review`.
   - Frontend admin: StepDetail toggle "Tampilkan pembahasan…" (default Latihan ON / Tes Lengkap OFF), ExamBuilder state+payload, `useExams.Exam`+`show_review`.
2. **P5.1 — Sidebar + route peserta** ✅ SELESAI 2026-07-28 (diagnostics bersih, belum di-commit):
   - Route: **`/beranda`** (Dashboard, `PesertaBerandaPage`), **`/ujian`** (Ujian Saya, tetap `MyExamsPage`), **`/riwayat`** (`RiwayatPage`). Beranda & Riwayat masih **placeholder** (diisi P5.4 & P5.3).
   - Sidebar peserta: Dashboard(/beranda) · Ujian Saya(/ujian) · Riwayat Ujian(/riwayat). ("Ujian CBT" → "Ujian Saya".)
   - Guard `layout.tsx`: `pesertaAllowed` = /beranda | /ujian | /riwayat; default redirect peserta → **/beranda**. Login & change-password redirect peserta → /beranda.
3. **P5.2 — Ujian Saya** ✅ SELESAI 2026-07-28 (diagnostics bersih, belum di-commit):
   - `MyExamsPage` di-refactor: welcome banner dihapus (pindah ke Dashboard/P5.4), pakai `PageHeader` (kartu) + `PageContainer`.
   - **Actionable-only**: `bucketOf(e)` → `in_progress` | `available` | `retake` (submitted+allow_retake+can_start) | `upcoming` | `null`. Ujian selesai-tak-bisa-diulang & ended = `null` (tak ditampilkan, ada di Riwayat).
   - Dua grup ber-header: **Perlu Dikerjakan** (in_progress→available→retake, grid s/d 3 kolom) & **Akan Datang** (upcoming, urut `starts_at`).
   - **Countdown** hook baru `useCountdown(targetIso, onDone)` (derive-saat-render + tick 1 dtk, aman react-compiler); kartu upcoming tampil "Dibuka dalam HH:MM:SS" (+`Nh` bila ≥1 hari); `onDone`→`refetch` saat pembukaan tiba.
   - Komponen baru (feature-level, bukan DS): `ExamCard` (in_progress di-highlight amber; CTA Lanjutkan/Mulai/Ulangi) + `useCountdown` hook. EmptyState "Tidak ada ujian aktif".
4. **P5.3 — Riwayat Ujian** (daftar selesai + detail hasil + pembahasan bila diizinkan, pakai endpoint review).
5. **P5.4 — Dashboard peserta** (home glanceable).

## 6. Di luar scope P5 (dibahas terpisah nanti)
- **Anti-cheat** (lockdown/deteksi pindah-tab/kamera) — desain & DB tersendiri.
- **Poles UI layar ujian** (ExamRunner/AnswerSheet) ke standar premium.

## 7. Aturan repo
- Jangan `git commit`/`git push` — hak pemilik. Migration dijalankan pemilik.
- UI wajib pakai komponen DS `frontend/src/components/ui/`; komponen baru minta izin dulu.
- Kunci jawaban/pembahasan **tak pernah** dikirim ke peserta sebelum submit / bila show_review=false.
