# Phase 4 — Exam Engine (Peserta Mengerjakan Ujian)

Status: **arah & keputusan disepakati; mulai dikoding.** Tanggal: 2026-07-26.
Terkait: `Exam_Builder_plan.md` (E0–E3), `Exam_Scoring_and_Types_plan.md` (skema penilaian, deterministik, no-shuffle).

## 1. Prinsip
- **Deterministik:** semua peserta mendapat **set soal & urutan yang sama** (authored). Urutan **bagian baku L → S/WE → R**; urutan soal dalam satu materi tetap.
- **Timer otoritatif server** (started_at + durasi). Client hanya menampilkan countdown.
- **Nilai via Skema Penilaian** (`scoring_schemes.compute`) yang sudah ada.
- **Nilai langsung tampil** ke peserta setelah submit (skor + lulus/tidak + rincian per bagian).
- **Anti-cheat (lockdown/kamera)** DITUNDA (paling akhir).

## 2. Keputusan (2026-07-26)
- **Snapshot set soal dibekukan saat Tayangkan (publish).** Konten soal + materi di-*copy* (denormalisasi) → ujian **kebal perubahan Bank Soal** setelah tayang (edit/hapus soal sumber tak mengubah ujian yang sudah tayang).
- **Skor langsung tampil** ke peserta.

## 3. Data model (P4.0)

**`exam_questions`** — snapshot soal terakit per ujian (dibekukan saat publish):
- `id`, `exam_id` (FK exams, cascade), `section`, `position` INT (urutan global), `source_question_id` UUID (FK questions **ON DELETE SET NULL** — sekadar jejak, konten sudah dibekukan), `correct_answer` (disimpan terpisah, **tak dikirim ke peserta**), `payload JSONB` (konten render peserta: stem/opsi/materi passage-audio-gambar, **tanpa** kunci jawaban). UNIQUE(exam_id, position).

**`exam_attempts`** — percobaan peserta:
- `id`, `exam_id`, `user_id`, `started_at`, `submitted_at`, `status` ('in_progress'|'submitted'|'expired'), `score` NUMERIC, `passed` BOOL, `total_questions`, `total_correct`, `score_detail` JSONB (per-section), `created_at`.

**`exam_attempt_answers`** — jawaban per soal:
- `id`, `attempt_id` (FK attempts, cascade), `exam_question_id` (FK exam_questions, cascade), `selected_answer` ('a'..'d'|NULL), `is_correct` BOOL, `updated_at`. UNIQUE(attempt_id, exam_question_id).

**RLS:** peserta akses attempt/answers miliknya sendiri; admin pemilik ujian boleh melihat; service-role bypass.

## 4. Rakit & bekukan saat publish (P4.1, backend)
Saat `publish_exam` (setelah validasi stok):
1. Untuk tiap bagian (urut L→S/WE→R), ambil unit sesuai **pool_units** (bila diisi) atau seluruh pool bagian (bila kosong), status **Tayang** saja.
2. Susun **deterministik** hingga target: materi utuh membawa semua soal anaknya (urutan sort_order), soal tunggal per unit. Isi `exam_questions` dengan `position` global + `payload` (snapshot konten + materi) + `correct_answer`.
3. Simpan; bila sudah pernah dibekukan (re-publish) → ganti snapshot.
- *(Untuk tes STANDAR/eksak nanti: validasi jumlah tepat. Sekarang Custom % → target/toleransi.)*

## 5. Endpoint peserta (P4.2, backend)
- **GET `/api/my-exams`** — daftar ujian yang menandai peserta (status published), + status attempt (belum/berjalan/selesai + skor), + jadwal WIB (bisa mulai / belum waktunya / sudah lewat).
- **POST `/api/my-exams/{exam_id}/start`** — mulai/lanjut attempt: cek jadwal & retake/sekali; buat attempt bila belum ada (atau lanjut yang in_progress). Return attempt + **soal tanpa kunci** (dari `exam_questions.payload`) + sisa waktu (dari started_at+durasi).
- **PUT `/api/attempts/{id}/answer`** — simpan jawaban satu soal (autosave).
- **POST `/api/attempts/{id}/submit`** — kunci attempt: hitung benar per bagian → `compute` skema → simpan score/passed/detail; set submitted. Return hasil. (Auto-submit saat deadline via server: submit setelah deadline tetap dinilai dgn jawaban tersimpan.)
- **GET `/api/attempts/{id}/result`** — hasil (skor, lulus, rincian) untuk halaman hasil.

## 6. UI peserta (P4.3, frontend `/ujian`)
- **Daftar ujian** (ganti mock): kartu ujian + status (siap/berjalan/selesai+skor) + tombol Mulai/Lanjut/Lihat Hasil + info jadwal.
- **Layar mengerjakan:** header **countdown**; navigasi soal (nomor + prev/next); render materi **interaktif** (audio player, passage, WE kalimat berlabel) memakai ulang `QuestionView` versi *interactive* (opsi A/B/C/D bisa dipilih; tanpa highlight kunci). Autosave jawaban. Tombol **Submit** + konfirmasi. Auto-submit saat waktu habis.
- **Halaman hasil:** skor + lulus/tidak + rincian per bagian (+ retake bila diizinkan).

## 7. Aturan
- **Jadwal WIB:** tak bisa mulai sebelum `starts_at` / setelah `ends_at`.
- **Retake:** `allow_retake` → boleh attempt baru; bila mati → satu attempt (blok bila sudah submitted).
- **Resume:** attempt in_progress bisa dilanjut; sisa waktu dihitung server (started_at + durasi − now). Habis → expired/auto-submit.
- **Keamanan:** kunci jawaban & `correct_answer` **tak pernah** dikirim ke peserta sebelum submit.

## 8. Sub-fase
1. **P4.0 — DB** (`012_exam_engine.sql`: 3 tabel + RLS). ✅ SELESAI.
2. **P4.1 — Rakit & bekukan saat publish** (backend). ✅ SELESAI 2026-07-26 — `exam_service`: `_assemble_and_freeze` (urutan bagian L→S/WE→R, materi utuh + soal tunggal, isi to target, snapshot `payload` **tanpa kunci** + `correct_answer` terpisah), dipanggil di `publish_exam` **hanya bila belum ada percobaan** (jaga integritas). Rebuild bersih tiap publish (bila 0 attempt).
3. **P4.2 — Endpoint peserta** ✅ SELESAI 2026-07-26 — `models/exam_attempt.py`, `services/exam_attempt_service.py`, `routes/exam_attempts.py` (register main). GET `/api/my-exams`, POST `/api/my-exams/{id}/start` (soal tanpa kunci + sisa waktu), PUT `/api/attempts/{id}/answer` (autosave), POST `/api/attempts/{id}/submit` (grade via `ScoringSchemeService.compute_score`, idempotent), GET `/api/attempts/{id}/result`. Auth `get_current_user`. Cek peserta+jadwal+retake. `correct_answer` tak pernah di payload peserta.
4. **P4.3 — UI peserta** ✅ SELESAI 2026-07-26. Full-screen, **kiri Soal / kanan Lembar Jawaban** (ala ETS layout, **warna brand Learning Nexus** — bukan navy ETS). File: `features/attempts/api.ts` (tipe+panggilan), `hooks/useMyExams.ts`, `SoalPanel.tsx` (materi/passage/audio+stem per-tipe), `AnswerSheet.tsx` (opsi A–D klik di kanan + ⚑ Tandai + peta soal + prev/next), `ExamRunner.tsx` (orkestrator: start→timer server→autosave→auto-submit→konfirmasi Kumpulkan). Route: `/ujian` (daftar real ganti mock), `/ujian/kerjakan/[examId]` (runner, resume via start idempotent), `/ujian/hasil/[attemptId]` (skor+lulus+rincian per bagian). **Layout fix:** guard peserta `pathname.startsWith('/ujian')` (dari `=== '/ujian'`) agar sub-route tak blank. ⚑ Tandai = client-only localStorage. Belum di-commit.

## 9. Di luar scope
- Anti-cheat lockdown/kamera (paling akhir).
- Skema STANDAR resmi (TOEFL/IELTS) — tunggu tabel terverifikasi; grading standar menyusul.

## 10. Catatan
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik. Migration dijalankan pemilik.
