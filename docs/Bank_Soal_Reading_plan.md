# Rencana — Personalisasi Bank Soal untuk Reading (rich text, nomor baris, gambar)

> Status: **Perencanaan** · Dibuat 2026-07-23 · Belum ada kode.
> Sumber: `Practice Test A - with Answer.pdf` (5 passage, 50 soal reading).
> Terkait: `docs/Bank_Soal_roadmap.md`, model `question_passages` + `questions` (`003_question_bank.sql`).

## 1. Latar belakang (hasil screening PDF)

Soal Reading punya fitur yang belum didukung Bank Soal:
- **Nomor baris** passage tiap 5 baris (dipakai soal: "the word X **in line 12**…").
- **Rich text** dalam passage: **bold**, *italic*, <u>underline</u>.
- **Gambar** pada soal (mis. diagram no. 36) — dan disepakati juga pada passage.
- Tipe soal reading: vocabulary-in-context, reference, main idea, detail, NOT/EXCEPT, inference, purpose/organization (cukup lewat `tags`; belum perlu field khusus).
- Kunci jawaban di PDF = highlight kuning → **di-skip** (bukan bagian fitur).

## 2. Keputusan (dikunci 2026-07-23)

1. **Nomor baris = dari line-break yang diinput penulis.** Penulis menentukan pemenggalan baris (sesuai sumber); sistem menomori tiap 5 baris & render lebar konsisten → referensi "line N" stabil, tak bergeser antar layar.
2. **Editor rich-text = toolbar blok-teks + live preview** (senada `UnderlineEditor` Written Expression). Simpan sebagai **teks bertanda (marker)**, bukan HTML WYSIWYG.
3. **Gambar = di soal DAN passage** (`image_url` pada `questions` dan `question_passages`).

## 3. Spesifikasi marker (format teks tersimpan)

Perluas keluarga marker yang sudah dipakai WE, konsisten:
- `**teks**` → **bold**
- `*teks*` → *italic*
- `__teks__` → <u>underline</u> (sudah dipakai WE)
- `[teks]{A}` → underline berlabel A/B/C/D (khusus Written Expression — tetap)
- **Baris** = karakter newline `\n` pada `content`. Tiap `\n` = satu baris bernomor. Nomor tampil tiap kelipatan 5.

Perender bersama `renderExamText` (`features/questions/examText.tsx`) diperluas → tangani `**`, `*`, `__`, `[..]{A}` + mode **bernomor baris** untuk reading.

Catatan parsing: proses `**bold**` sebelum `*italic*`; hati-hati escape/urutan regex. Konten reading dirender per-baris (split `\n`) dengan kolom nomor di margin.

## 4. Perubahan skema (migrasi `006_reading_media.sql`)

```
ALTER TABLE questions           ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE question_passages   ADD COLUMN IF NOT EXISTS image_url TEXT;
```
- `content` (TEXT) tetap — menyimpan teks bertanda + line-break. Nomor baris dirender, tidak disimpan.
- Tidak ada kolom "line number" (dihitung saat render dari `\n`).

## 5. Backend

- `models/question.py`: `image_url: Optional[str]` di Create/Update/Response untuk **question** & **passage**.
- `services/question_service.py`: sertakan `image_url` di insert/update/response builder (question & passage).
- **Upload gambar**: tambah endpoint (mis. `POST /api/questions/upload-image`) mereuse infrastruktur upload R2 yang sudah dipakai audio (`routes/upload.py` / handler audio). Validasi tipe image, kembalikan `image_url`.

## 6. Frontend

- **Perender**: perluas `examText.tsx` → `renderRichText(content, { lineNumbers })` untuk bold/italic/underline + mode nomor baris. Dipakai `QuestionPreview` (passage & stem) + nanti lembar ujian (Phase 4).
- **Editor passage reading**: komponen baru `RichPassageEditor` (toolbar B/I/U, textarea line-break, live preview bernomor). Dipakai `PassageForm` saat `type === 'reading'` (WE tetap pakai `UnderlineEditor`).
- **Gambar**:
  - `PassageForm`: unggah gambar passage (reuse `FileUploader` varian image) → `image_url`.
  - `QuestionForm`: unggah gambar soal → `image_url`; render di preview & (opsional) bold pada stem.
- `QuestionPreview` & `QuestionTable`: tampilkan gambar bila ada; render passage reading dengan nomor baris + format.

## 7. Rencana bertahap

- **R0 — Skema & backend** ✅ **SELESAI — 2026-07-23.**
  - Migrasi `database/006_reading_media.sql` (ADD `image_url` ke `questions` & `question_passages`). ⚠️ **User perlu jalankan di Supabase.**
  - Backend: `image_url` di `models/question.py` (Create/Update/Response soal & passage) + `services/question_service.py` (semua insert/update/response). Endpoint baru `POST /api/questions/upload-image` (reuse R2, validasi image → `image_url`).
  - Frontend: tipe `image_url` ditambah di `Question` & `Passage` (`useQuestions.ts`) — kontrak data, belum ada UI.
  - Verifikasi: backend compile/import OK (2 route upload terdaftar); frontend build sukses.
- **R1 — Perender** ✅ **SELESAI — 2026-07-23.**
  - `examText.tsx`: parser inline diperluas → `**bold**`, `*italic*`, `__underline__`, `[kata]{A}` (urutan alternasi: labeled→bold→underline→italic). `renderExamText` = render inline; **`renderPassageLines(content)`** = passage per-baris (`\n`) + nomor baris tiap 5 (gutter slate).
  - `QuestionPreview`: passage `reading` → `renderPassageLines` (bernomor); lainnya → `renderExamText`. Stem & opsi selalu `renderExamText` (dukung bold di stem reading). **Gambar** passage & soal dirender (`image_url`).
  - `QuestionTable.cleanHTML`: buang juga `**`/`*` di cuplikan.
  - Verifikasi: build sukses, diagnostics nol (hint `<img>` dibungkam untuk gambar R2 user).
- **R2 — Editor passage reading** ✅ **SELESAI — 2026-07-23.**
  - Komponen baru `RichPassageEditor.tsx` — toolbar **Tebal/Miring/Garis bawah** (blok kata → sisip `**`/`*`/`__`) + textarea (line-break = baris) + **live preview bernomor** (`renderPassageLines`).
  - `PassageForm`: `type === 'reading'` → `RichPassageEditor`; WE tetap `UnderlineEditor`; structure/lainnya tetap `Textarea`. Ditambah bagian **Gambar Materi (opsional)** (untuk semua passage non-listening): unggah via `FileUploader` → `POST /upload-image` → `image_url`, preview + tombol hapus. Payload kirim `image_url`.
  - Verifikasi: build sukses, diagnostics `RichPassageEditor` nol (PassageForm hanya hint lama `FormEvent`).
- **R3 — Gambar soal (+ bold stem)** ✅ **SELESAI — 2026-07-23.**
  - `UnderlineEditor` dapat varian **`rich`** (tombol Tebal/Miring/Garis bawah → `**`/`*`/`__`).
  - `QuestionForm`: stem `section === 'reading'` → `UnderlineEditor variant="rich"`; + bagian **Gambar Soal (opsional)** (unggah `/upload-image` → `image_url`, preview + hapus). Payload kirim `image_url`.
  - Verifikasi: build sukses, diagnostics nol (QuestionForm hanya hint lama `FormEvent`).

**➡️ Personalisasi Reading (R0–R3) SELESAI.** Sisa: render passage bernomor + gambar untuk **peserta** dilakukan di Phase 4 (Exam Engine).

## 8. Keputusan terbuka / catatan
- Apakah editor rich-text juga dipakai untuk passage **Structure** (teks) — atau khusus Reading dulu? (default: Reading dulu; Structure menyusul bila perlu.)
- Perlu field sub-tipe reading (vocab/inference/…) untuk analitik nanti? (default: pakai `tags` dulu.)
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik.
