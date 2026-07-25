# Bank Soal — Editor Soal Per-Tipe + Keputusan Arsitektur

Status: **Arsitektur disepakati. Editor per-tipe SELESAI (kode) 2026-07-25.**
Konteks: TOEFL ITP dulu; disiapkan agar mudah menambah keluarga ujian lain (IELTS, TOEFL iBT, TOEIC, Writing) tanpa membongkar skema.

---

## Bagian 1 — Keputusan Arsitektur (ADR)

### Keputusan
**Tetap SATU tabel `questions`** (single-table, ditambah diskriminator), **bukan** satu tabel per tipe soal.
Perbedaan bentuk tiap tipe ditangani di **layer aplikasi** (editor + renderer per-section), bukan dengan memecah tabel.

### Alasan (kenapa bukan tabel-per-tipe)
1. **Mayoritas kolom sama** antar tipe (`id, section, difficulty, status, correct_answer, explanation, created_by, passage_id, sort_order, tags, timestamps`). Yang beda cuma segelintir (stem, audio, cara opsi). Memecah = menduplikasi ~90% skema.
2. **Fitur lintas-tipe** (daftar/filter/search/pagination/statistik, RLS/isolasi data, draft↔tayang, kepemilikan) harus diulang per tabel atau pakai `UNION ALL` N tabel.
3. **Perakitan Ujian (Phase 3):** 1 ujian ITP = Listening + Structure + WE + Reading, dicomot lintas tipe. Kalau beda tabel, `exam_questions` jadi polymorphic FK (titik paling sakit).
4. **Migrasi berlipat:** menambah konsep bersama (mis. bobot/poin) = migrasi N tabel.
5. Memecah sejak awal **mengunci biaya duplikasi** yang tumbuh tiap ada fitur/tipe baru.

### Pola scalable (target akhir, bertahap)
- **Kolom inti bersama** (yang sudah ada).
- **Diskriminator**: sekarang `section`; nanti tambah **`exam_family`** (`toefl_itp`, `ielts`, `toefl_ibt`, `toeic`, …).
- **`payload JSONB`** untuk data khas tipe yang tak muat di kolom standar (mis. IELTS matching, TOEIC). Tambah tipe baru = tambah nilai diskriminator + bentuk payload, **tanpa tabel/migrasi struktur**. Index `GIN` bila perlu; partisi by `exam_family` bila volumenya besar (jauh nanti).

### Pengecualian yang sah
Tipe dengan **paradigma penilaian beda total** — **Writing/Speaking** (esai/rekaman, dinilai manusia/rubrik) — **tidak** cocok dengan model A/B/C/D + `correct_answer`. Tipe seperti ini **layak model/tabel tersendiri** (mis. `essay_submissions` + rubrik) saat kita sampai ke sana. Batas pemisahan = **beda paradigma penilaian**, bukan sekadar beda tipe pilihan ganda.

### Untuk SEKARANG
1. **Jangan pecah tabel.** Tetap `questions` + `question_passages`.
2. Kerjakan **editor & renderer per-section** (app layer) — memberi pengalaman "tiap tipe beda" tanpa fragmentasi DB.
3. **Tunda** `exam_family` + `payload JSONB` sampai benar-benar menambah keluarga ujian → hindari over-engineering.

---

## Bagian 2 — Spec Editor & Tampilan Peserta per Section (TOEFL ITP)

Referensi bentuk asli TOEFL ITP:
- **Listening:** pertanyaan **diucapkan di audio**; peserta hanya lihat **4 opsi** tercetak.
- **Structure:** kalimat **rumpang**; pilih opsi yang melengkapi.
- **Written Expression:** kalimat dengan **4 bagian bergaris bawah berlabel A–D**; pilih bagian yang **SALAH**. Opsi = kata berlabelnya (bukan daftar terpisah).
- **Reading:** teks bacaan (materi) + pertanyaan + 4 opsi.

| Section | Materi/Stimulus | Stem/Kalimat | Pilihan jawaban | Gambar | Tandai benar |
|---|---|---|---|---|---|
| **Listening** | Audio (standalone) / dari materi | ❌ *(di audio)*; opsional "Catatan" utk identifikasi admin (tak ke peserta) | **4 opsi teks/gambar** | ❌ sembunyikan | radio A–D |
| **Structure** | — / materi bersama | ✅ kalimat rumpang (teks biasa) | 4 opsi teks | opsional | radio A–D |
| **Written Expression** | — | ✅ kalimat + **4 kata bergaris bawah berlabel A–D** (UnderlineEditor "Tandai A/B/C/D") | ❌ *(opsi = kata berlabel)* | ❌ sembunyikan | pilih **label A–D yang salah** |
| **Reading** | **Materi (passage)** | ✅ stem rich-text | 4 opsi teks/gambar | opsional *(diagram)* | radio A–D |

### Perbedaan utama dari kondisi sekarang
- **Listening:** buang input stem + checkbox gambar → cukup **audio + 4 opsi**. (Audio soal standalone sudah ada.)
- **Written Expression:** **hapus 4 kotak "Isi opsi A–D"** (redundan). Opsi berasal dari 4 kata berlabel di kalimat; admin cukup pilih **label yang jawabannya** (`correct_answer` = huruf label). Tanpa perubahan skema.
- **Structure & Reading:** sudah mendekati benar; rapikan label & visibilitas gambar.

### Tampilan peserta (`QuestionView`, dipakai ulang Phase 4)
- **Listening:** player audio + 4 opsi. **Tanpa stem.**
- **Written Expression:** kalimat dengan garis bawah berlabel A–D; peserta pilih A–D. **Tanpa daftar opsi terpisah.**
- **Structure:** kalimat rumpang + 4 opsi.
- **Reading:** passage + stem + 4 opsi.

---

## Bagian 3 — Rencana Implementasi (app layer, tanpa pecah tabel)

1. **Backend (longgarkan agar per-section valid):**
   - `question_text`: dari `Field(..., min_length=1)` → **boleh kosong** (`default=""`) supaya Listening tak wajib stem. Validasi "wajib" dipindah ke frontend per-section.
   - Opsi A–D sudah `default=""` (aman untuk WE yang tak pakai opsi terpisah).
   - Tidak ada kolom baru.
2. **QuestionBuilder — visibilitas per `section`:**
   - **Stem:** Listening → sembunyikan (atau field opsional "Catatan"); WE → UnderlineEditor labeled; Reading → UnderlineEditor rich; Structure → Textarea (label "Kalimat rumpang").
   - **Audio:** Listening standalone (sudah ada).
   - **Checkbox gambar:** hanya Reading (+ Structure opsional); sembunyikan Listening & WE.
   - **Blok Opsi Jawaban:** sembunyikan untuk WE; sebagai gantinya **picker "label yang salah" (A–D)** dari kata berlabel. Toggle Teks/Gambar hanya Listening & Reading (Structure teks).
   - **Validasi per-section** (pola B3): Listening → opsi terisi (+ audio bila standalone); Structure → stem + opsi; WE → kalimat punya 4 label + 1 dipilih; Reading → stem + opsi.
3. **QuestionView — render per `section`** sesuai tabel "Tampilan peserta".
4. **Verifikasi:** build + tsc + eslint.

### Urutan kerja (bertahap)
1. **Listening** (sedang dibuka): buang stem + gambar → audio + opsi.
2. **Written Expression:** hapus 4 kotak opsi → picker label A–D.
3. **Structure & Reading:** rapikan label + visibilitas gambar.

### Progres — SELESAI (kode) 2026-07-25
- **Backend:** `CreateQuestionRequest.question_text` `Field(..., min_length=1)` → **`Field(default="")`** (Listening boleh kosong). Tak ada kolom baru.
- **QuestionBuilder** (section-aware via flag `isListening/isWE/showImageOption/allowImageAnswers/effectiveFormat`):
  - **Stem:** Listening → Textarea **"Catatan Pertanyaan (opsional)"** (+ hint "tak ditampilkan ke peserta"); WE → UnderlineEditor labeled ("tandai 4 bagian A–D"); Structure → Textarea "Kalimat (dengan bagian rumpang)"; Reading → UnderlineEditor rich.
  - **Checkbox gambar:** hanya `showImageOption` (Reading/Structure); Listening & WE tak lihat.
  - **Opsi:** WE → **picker label A–D "bagian yang SALAH"** (tanpa 4 kotak opsi). Lainnya → opsi teks/gambar; toggle Teks/Gambar hanya `allowImageAnswers` (Listening/Reading), Structure teks saja.
  - **Validasi per-section:** WE wajib 4 label A–D di kalimat; Reading/Structure wajib stem; Listening catatan opsional; opsi/gambar/audio sesuai konteks.
  - **Payload/draft:** WE → `option_a..d=''`; `options_image_url` ikut `effectiveFormat`; `image_url` hanya bila `showImageOption`.
- **QuestionView (tampilan peserta):** Listening → instruksi "Dengarkan audio…" tanpa stem; WE → kalimat berlabel + chip A–D (benar disorot) tanpa daftar opsi; Structure/Reading → stem + opsi seperti biasa.
- Verifikasi: backend compile, frontend build + tsc + eslint bersih.
- **Migrasi lama:** soal WE lama yang punya `option_a..d` → kotaknya tak tampil lagi; saat disimpan `option_a..d` dikosongkan (kalimat berlabel + `correct_answer` tetap). Soal Listening lama dgn `question_text` → tampil sebagai Catatan (tak ke peserta).

---

## Bagian 4 — Di luar scope (ditunda)
- `exam_family` (diskriminator keluarga ujian) + `payload JSONB` → saat menambah IELTS/iBT/TOEIC.
- Model tersendiri untuk **Writing/Speaking** (free-response, rubrik).
- Blocker playback audio R2 (ISP Internet Positif) — lihat `Bank_Soal_Listening_plan.md` (ditunda ke pra-produksi).

## Catatan
- Preview `QuestionView` = tampilan peserta → dipakai ulang Phase 4 (Exam Engine).
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik.
