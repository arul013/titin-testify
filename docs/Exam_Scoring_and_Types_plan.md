# Manajemen Ujian — Jenis Ujian, Skema Penilaian & Opsi Pengerjaan (Rencana)

Status: **arah desain disepakati, belum dikoding.** Tanggal: 2026-07-25.
Terkait: `Exam_Builder_plan.md` (E0–E3 builder), `Bank_Soal_Question_Editor_per_type.md` (single-table + payload JSONB).

## 1. Masalah & tujuan

Penilaian **spesifik per jenis tes** dan **bukan skala 0–100**:
- **TOEFL ITP** → skala **310–677** (via tabel konversi resmi per bagian).
- **IELTS** → **band 0–9** per skill (via tabel), overall = rata-rata dibulatkan ke 0.5.
- **Custom / short test** (mis. TOEFL ITP 5 soal/skill) → tabel resmi **tak berlaku** (dikalibrasi untuk tes penuh).

Field "Nilai Kelulusan mis. 70" sekarang tak cocok untuk TOEFL/IELTS. Tujuan: **jenis ujian menentukan standar penilaian**, dan penilaian dikelola rapi & dapat dipakai ulang.

## 2. Model inti

**Ujian = Komposisi (bagian & jumlah soal) + Skema Penilaian (cara jawaban → skor → lulus/tidak).**

Skema penilaian ada **dua keluarga**:

| Keluarga | Untuk | Cara skor | Nilai kelulusan |
|---|---|---|---|
| **Standar (resmi)** | TOEFL ITP penuh, IELTS penuh | **Tabel konversi resmi** (raw benar → scaled) per bagian | skala aslinya (TOEFL **310–677**, IELTS band **0–9**) |
| **Custom / Praktis (%)** | Custom apa pun (termasuk TOEFL 5 soal/skill) | **% benar** (opsional berbobot per bagian) | **persen** (mis. ≥70%) |

**Konsekuensi kunci:**
- **TOEFL ITP penuh** (Listening 50 / Structure+WE 40 / Reading 50) → tabel resmi → 310–677.
- **Custom TOEFL** (jumlah soal bebas) → **% benar** (tabel resmi tidak dipakai).
- **IELTS**: Listening/Reading punya tabel band; **Writing/Speaking = free-response (rubrik, dinilai manusia)** → **di luar auto-scoring MCQ** (lihat §7).

## 3. Detail penilaian per jenis

- **TOEFL ITP:** raw benar per bagian → scaled (±31–68) via tabel resmi; total = (Σ 3 scaled ÷ 3) × 10 → 310–677. Butuh jumlah soal penuh (50/40/50).
- **IELTS (Academic/General):** Listening & Reading (40 soal) raw → band via tabel; overall = mean 4 skill dibulatkan 0.5. Writing/Speaking manual.
- **Custom %:** skor = Σ benar ÷ Σ soal × 100 (opsional berbobot per bagian). Lulus = persen. Berlaku untuk komposisi apa pun.

## 4. Modal "Pilih Jenis Ujian" (sebelum builder) — SETUJU

Langkah pertama Buat Ujian = modal pilih **TOEFL ITP / IELTS / Custom** (+ bila custom, pilih basis: mis. "Custom TOEFL", "Custom bebas"). Pilihan ini menentukan:
- **Skema penilaian** yang dipakai (menentukan skala & rumus).
- **Cara "Nilai Kelulusan" ditampilkan**: persen (0–100) / TOEFL (310–677) / IELTS band (0–9, step 0.5).
- Bagian & jumlah soal yang diharapkan (validasi komposisi).

## 4b. Komposisi — menyesuaikan jenis ujian (keputusan A–D, 2026-07-26)

Jenis ujian (§4) **me-reshape** step Komposisi & seterusnya. Komposisi & Penilaian **kopel erat** → dirancang sebagai satu sistem: **Jenis → Komposisi → Sumber → Peserta → Review + Penilaian.**

- **A. Jenis me-reshape Komposisi:**
  - **TOEFL ITP penuh (dan tes standar penuh lain)** → Komposisi **preset & terkunci** (mis. Listening 50 / Structure+WE 40 / Reading 50), urutan bagian baku. Admin tak bebas mengubah jumlah.
  - **Custom** → Komposisi **bebas** (pilih bagian & jumlah, seperti UI sekarang).
- **B. Eksak vs target:**
  - **Tes standar (skor resmi)** → komposisi **EKSAK**; validasi ketat (jumlah harus tepat, tak boleh "kurang lebih") karena tabel konversi butuh jumlah pasti.
  - **Custom (% benar)** → boleh **target/toleransi** (catatan "aktual bisa sedikit berbeda" hanya berlaku di sini; %-nya menyesuaikan jumlah aktual).
- **C. Letak modal "Pilih Jenis Ujian":** **paling awal, sebelum step Detail.** Seluruh wizard (Komposisi, Nilai Kelulusan, Review) menyesuaikan pilihan ini.
- **D. Custom TOEFL 5-soal/skill:** tetap **% benar** (bukan tabel resmi); Komposisi bebas.

> Materi = unit utuh (tak dipisah). Untuk tes standar eksak, seleksi unit harus menghasilkan jumlah tepat → validasi stok saat menyusun/menayangkan.

## 4c. Sumber Soal — deterministik + filter kuota (keputusan 2026-07-26)

- **Semua peserta mendapat soal yang SAMA** (deterministik). Admin/super admin menentukan penuh isi & urutan (seperti ETS/Cambridge). **Tidak ada** acak per peserta.
- **Dua cara mengisi tiap bagian ke target N:**
  - **Pilih manual:** admin memilih materi/soal tepat sampai N.
  - **Acak dari semua:** sistem memilih **satu set tetap** acak sampai N (sekali, saat tayang) → tetap **sama untuk semua** peserta.
- **Filter kuota (anti human-error) — di mode Pilih manual:**
  - **Sisa kuota** = N − (jumlah soal yang sudah dipilih). Soal tunggal = 1.
  - **Tampilkan hanya materi yang `jumlah soal ≤ sisa kuota`.** Yang melebihi → **disembunyikan**. **Live re-filter** tiap kali memilih.
  - Contoh: target 20 → tampil semua ≤20; pilih 8 lalu 7 (sisa 5) → materi 10-soal hilang.
  - Transparansi: tampilkan **"Sisa X / N"** + info **"Y materi disembunyikan (melebihi sisa)"**.
- **Berlaku sama untuk full test** (TOEFL ITP 50/40/50, IELTS) — bahkan lebih penting karena skor resmi butuh jumlah **eksak**.
- **Validasi eksak (tes standar):** komposisi wajib tepat N. Bila stok tak bisa dipenuhi pas (mis. sisa 3 tapi hanya ada materi 5/7-soal & tak ada soal tunggal) → **peringatan "stok tak bisa mencapai jumlah eksak"**.

## 4d. Dampak ke step Peserta, Review & Detail (audit 2026-07-26)

- **Peserta (`StepParticipants`):** AMAN — whitelist murni, tak terpengaruh. Tak ada perubahan.
- **Review (`StepReview`):**
  1. **Hapus** item "Pengacakan" + props `shuffleQuestions`/`shuffleOptions` + import `Shuffle`.
  2. **"Nilai Kelulusan" scheme-aware**: tampilkan skala/unit (`70%` / `500 (TOEFL)` / `6.5 band`).
  3. **Tambah "Jenis Ujian / Skema Penilaian"** di ringkasan.
  4. **Ketersediaan/Kesiapan** ikut deterministik+eksak: tes standar → cek terpilih **= target eksak** (bukan "tersedia ≥ target").
- **Detail (`StepDetail`):** **hapus** checkbox "Acak urutan soal" & "Acak pilihan jawaban"; **"Nilai Kelulusan"** jadi scheme-aware (label/validasi ikut skema).
- **Hook/Backend/DB:** `useExams` + model `exams` — **hapus** `shuffle_questions`/`shuffle_options`; **ganti** `passing_grade` → `scoring_scheme_id` (FK) + `passing_value` + `passing_enabled`. Migration ubah tabel `exams`.

## 5. Menu "Skema Penilaian" (dibangun SEKARANG — keputusan user)

Menu baru (reference data, dipakai ulang banyak ujian):
- **Bawaan (read-only):** TOEFL ITP, IELTS — tabel konversi resmi (di-seed).
- **Custom (CRUD):** admin definisikan: bagian + jumlah soal + cara skor (%/berbobot/tabel) + ambang lulus + skala.
- **Alat "Hitung Skor" (poin 3 user):** input jumlah soal & benar/salah per bagian → **otomatis menghitung skor** menurut skema mana pun (TOEFL/IELTS/custom). Berguna untuk penilaian manual/verifikasi, terpisah dari mesin ujian live.

Ujian tinggal **menunjuk** sebuah skema (`scoring_scheme_id`) + `passing_value` dalam skala skema.

## 6. Opsi Pengerjaan (KEPUTUSAN FINAL 2026-07-26)

**Prinsip: admin/super admin menentukan penuh urutan soal & urutan opsi.** Otentik seperti tes asli (TOEFL/IELTS tak mengacak opsi; urutan bagian & Listening Part A→B→C baku).

- **HAPUS "Acak urutan soal"** dan **HAPUS "Acak pilihan jawaban"** dari Opsi Pengerjaan.
  - Alasan: mengacak merusak keaslian & niat penulis (posisi A/B/C/D bermakna). Kompleksitas mapping tak sepadan.
- **Ujian DETERMINISTIK:** semua peserta mendapat **soal yang sama**, urutan authored — seperti ETS/Cambridge. **Tidak ada** pool-randomization/acak per peserta.
- **Anti-cheat BUKAN via pengacakan** → via **exam browser lockdown + kamera** (lihat §6b, Phase 4+).
- **Opsi Pengerjaan yang tersisa: hanya "Izinkan mengerjakan ulang"** (retake).
- **Catatan implementasi:** hapus dua checkbox acak dari step builder + field terkait (`shuffle_questions`/`shuffle_options`) bila ada; engine Phase 4 hanya menyusun soal sesuai urutan authored + urutan bagian baku.

## 6b. Anti-cheat (rencana Phase 4+, keputusan 2026-07-26)

Bukan lewat pengacakan (ujian deterministik). Fitur proktoring, digarap setelah alur ujian inti (Phase 4).

- **Exam browser lockdown (web):** Fullscreen API + **deteksi pindah-tab/keluar** (`visibilitychange`/`blur`) → catat pelanggaran + peringatan / auto-submit setelah N kali; nonaktifkan copy & klik-kanan; guard navigasi/back.
  - **Batas jujur:** web **tak bisa mengunci keras** (tak bisa cegah Alt-Tab / aplikasi lain) → ini **deteksi + deterensi**. Hard-lockdown sejati butuh app desktop/kiosk (mis. Electron/Safe Exam Browser) — scope besar, jauh nanti.
- **Kamera live snapshot (~tiap 1 menit):** `getUserMedia` → simpan ke storage → admin review. Perhatikan **izin/privasi peserta** (wajib diberitahu) & **biaya storage**. Sifatnya bukti/deterensi, bukan pencegahan.

## 7. Implikasi data

- **`scoring_schemes`** (tabel baru): `id, name, family('standard'|'custom'), test_type('toefl_itp'|'ielts'|'custom'), config JSONB, is_builtin bool, created_by, timestamps`.
  - `config` JSONB menampung: bagian, jumlah soal, tabel konversi/rumus, skala min/max, aturan agregasi. (Konsisten dgn prinsip payload-JSONB pada [[question-model-architecture]].)
  - Seed built-in: TOEFL ITP, IELTS (is_builtin=true, read-only).
- **`exams`**: tambah `scoring_scheme_id` (FK) + `passing_value` (dalam skala skema) + `passing_enabled`. (Mengganti makna "nilai kelulusan 0–100".)
- **Free-response (Writing/Speaking):** model tersendiri saat digarap (di luar scope ini).

## 8. Phasing (usulan)

1. **Fase A — Fondasi penilaian (scope: Custom % dulu) — SELESAI kode 2026-07-26:**
   - Migration **`010_scoring_schemes.sql`** (tabel + RLS + seed bawaan "Persentase (semua bagian setara)"). *(Skema STANDAR resmi TOEFL/IELTS ditunda sampai ada tabel konversi terverifikasi — angka jangan dikarang.)*
   - Backend: `models/scoring_scheme.py`, `services/scoring_scheme_service.py` (CRUD + `compute` Custom %), `routes/scoring_schemes.py` (register di main).
   - Frontend: menu **Skema Penilaian** (`/skema-penilaian` + sidebar) — list (bawaan+custom), buat/ubah/hapus custom %, **alat Hitung Skor** (input jumlah&benar per bagian → skor %). Hook `useScoringSchemes`.
   - **Belum:** kolom `exams.scoring_scheme_id/passing_value` (masuk Fase B); skema resmi TOEFL/IELTS (tunggu tabel).
2. **Fase B — Integrasi builder ujian — SELESAI kode 2026-07-26:**
   - Migration **`011_exams_scoring.sql`**: `exams` + `scoring_scheme_id` (FK→scoring_schemes, ON DELETE SET NULL) + `passing_value` NUMERIC; **hapus** `passing_grade`, `shuffle_questions`, `shuffle_options` (migrasi nilai lama → passing_value).
   - Backend: `models/exam.py` + `services/exam_service.py` (create/update/response) pakai `scoring_scheme_id`/`passing_value`.
   - Frontend: `useExams` tipe; **StepDetail** = Select **Skema Penilaian** (wajib) + "Nilai Kelulusan" **scheme-aware** (label/unit ikut `config.passing_unit`) + **hapus 2 checkbox acak** (sisa retake); **StepReview** = item Skema + passing berskala, **hapus Pengacakan**; `ExamTable` pakai `passing_value`. Validasi: skema wajib dipilih.
   - **Deviasi terencana:** scheme picker ditaruh **di StepDetail** (bukan modal terpisah "Pilih Jenis Ujian") karena baru ada keluarga Custom %. **Ditunda** sampai ada skema STANDAR: modal jenis paling-awal + **preset/lock komposisi per jenis** + **validasi eksak** (§4b/§4c).
   - Verifikasi: backend compile, frontend build+tsc+eslint bersih.
3. **Fase C — Bersihkan Opsi Pengerjaan:** hapus 2 checkbox acak (urutan soal & pilihan jawaban) + field terkait; sisakan "Izinkan mengerjakan ulang". Anti-cheat = pool randomization (sudah ada).
4. **Fase D — Mesin skor live** (Phase 4): saat peserta selesai → hitung skor via skema → lulus/tidak. Penyusunan soal ikut urutan authored + urutan bagian baku (tanpa acak).

## 9. Di luar scope (ditunda)
- Writing/Speaking (free-response, rubrik manusia).
- Mesin ujian peserta / countdown (Phase 4).
- Tabel konversi resmi harus diverifikasi dari sumber ETS/IELTS saat implementasi (angka jangan dikarang).

## 10. Keputusan yang masih terbuka
- **Cakupan Fase A pertama:** Custom % dulu, atau sekalian tanam tabel TOEFL ITP resmi? *(User belum memilih; default rekomendasi: Custom % + kerangka skema dulu, tabel resmi menyusul dengan angka terverifikasi.)*

## 11. Catatan
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik. Migration dijalankan pemilik.
- Angka tabel konversi (TOEFL/IELTS) **wajib dari sumber resmi** — tidak boleh dikarang.
