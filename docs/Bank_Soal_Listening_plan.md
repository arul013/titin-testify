# Bank Soal — Soal Listening (Rencana)

Status: **SELESAI (kode) 2026-07-24** — #1–#6 dikerjakan; migration 009 dijalankan pemilik. Blocker cert R2 ditangani pemilik (infra).
Tanggal: 2026-07-24.

## 1. Konteks & masalah

Soal Listening bertumpu pada **audio**. Dari sisi admin ada dua kasus pemakaian:

1. **1 audio → beberapa soal** — satu rekaman diputar, lalu beberapa soal mengacu ke audio itu.
2. **1 audio → 1 soal** — satu rekaman untuk satu soal saja.

Model data saat ini: kolom `audio_url` **hanya ada di Materi (`question_passages`)**, tidak ada di Soal (`questions`).
Akibatnya:

- Kasus 1 → **sudah didukung penuh** lewat **Materi Listening** (passage `type=listening` + beberapa soal anak).
- Kasus 2 → **belum ada jalur "Soal Tunggal ber-audio"** (soal standalone tak punya field audio).

### Blocker infra (di luar scope kode)

Saat upload audio muncul `net::ERR_CERT_COMMON_NAME_INVALID` pada URL publik R2.
**File berhasil ter-upload**; yang gagal adalah memutar URL publiknya (sertifikat TLS host tak cocok).

- URL dibangun backend: `audio_url = {CLOUDFLARE_R2_PUBLIC_URL}/listening/{uuid}.mp3` → host **murni dari env**, bukan bug kode.
- Penyebab umum: env diisi endpoint S3 `*.r2.cloudflarestorage.com` (wildcard tak menutup dua label), custom domain SSL belum jadi, atau Public Development URL belum aktif.
- **Perbaikan di sisi R2/Railway** (bukan kode): pakai `https://pub-<hash>.r2.dev` yang benar **atau** custom domain ber-SSL valid sebagai `CLOUDFLARE_R2_PUBLIC_URL`.
- Ditangani sendiri oleh pemilik. Listening tak bisa **diputar** sampai URL publik valid, tapi ini tak menghalangi implementasi fitur.

## 2. Keputusan (2026-07-24)

- **Kasus 1 (1 audio → banyak soal):** tetap pakai **Materi Listening** yang sudah ada. Tidak diubah.
- **Kasus 2 (1 audio → 1 soal):** **tambah kolom `audio_url` ke `questions`** → Soal Tunggal Listening bisa punya audio sendiri (mental model 1:1, satu langkah).
- Aturan: **audio soal hanya untuk Listening + standalone** (tanpa `passage_id`). Bila soal berada dalam Materi Listening, audio berasal dari materi → uploader audio pada soal **disembunyikan**, `audio_url` soal `null`.

## 3. Perubahan data

Migration **`009_question_audio.sql`** (dijalankan pemilik):

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url TEXT;
COMMENT ON COLUMN questions.audio_url IS
  'URL audio untuk Soal Tunggal Listening (standalone). Null bila soal memakai audio dari materi.';
```

## 4. Implementasi

1. **DB:** migration `009_question_audio.sql` (di atas).
2. **Backend** (`app/models/question.py`, `app/services/question_service.py`):
   - `audio_url: Optional[str]` di `CreateQuestionRequest`, `UpdateQuestionRequest`, `QuestionResponse`.
   - Sertakan `audio_url` di semua insert/update + semua konstruksi `QuestionResponse` (create/update/list/get_passage_with_questions).
3. **Tipe FE** (`features/questions/hooks/useQuestions.ts`): `Question.audio_url: string | null`.
4. **QuestionBuilder** (`features/questions/QuestionBuilder.tsx`):
   - State `audioUrl` + upload via endpoint `/api/questions/upload-audio` (pola sama PassageBuilder: dropzone + opsi lanjutan tempel URL + preview player).
   - Tampilkan blok audio **hanya bila** `section === 'listening' && !passageId`.
   - Payload `audio_url`: kirim nilai saat listening-standalone; selain itu `''`/null (kosongkan).
   - Validasi (B3 pattern): listening-standalone **wajib** audio → pesan inline + scroll.
5. **QuestionView** (`features/questions/QuestionView.tsx`):
   - Untuk soal standalone ber-audio (`!passage && question.audio_url`): kolom Materi menampilkan **player audio** + label "Materi Soal (Audio)" (ikon Music), bukan placeholder "berdiri sendiri".
   - Otomatis dipakai ulang di **Pratinjau**, **panel preview builder**, dan **lembar ujian Phase 4**.
6. **Verifikasi:** build + tsc + eslint bersih.

## 5. Di luar scope

- Alur Materi Listening (kasus 1) tidak diubah.
- Perbaikan sertifikat/URL publik R2 (infra, di sisi pemilik).
- Countdown / mesin ujian (Phase 4).

## 6. Catatan

- Preview (`QuestionView`) = tampilan peserta → investasi dipakai ulang Phase 4.
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik. Migration dijalankan pemilik sendiri.
