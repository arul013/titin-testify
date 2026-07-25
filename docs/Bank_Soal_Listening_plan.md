# Bank Soal — Soal Listening (Rencana)

Status: **SELESAI (kode) 2026-07-24** — #1–#6 dikerjakan; migration 009 dijalankan pemilik.
Blocker playback audio = **ISP Internet Positif hijack `r2.dev`** (bukan bug) → **DITUNDA ke tahap pra-produksi** (pasang R2 custom domain). Upload/simpan tetap jalan; bikin bank soal lanjut.
Tanggal: 2026-07-24 (blocker dikonfirmasi 2026-07-25).

## 1. Konteks & masalah

Soal Listening bertumpu pada **audio**. Dari sisi admin ada dua kasus pemakaian:

1. **1 audio → beberapa soal** — satu rekaman diputar, lalu beberapa soal mengacu ke audio itu.
2. **1 audio → 1 soal** — satu rekaman untuk satu soal saja.

Model data saat ini: kolom `audio_url` **hanya ada di Materi (`question_passages`)**, tidak ada di Soal (`questions`).
Akibatnya:

- Kasus 1 → **sudah didukung penuh** lewat **Materi Listening** (passage `type=listening` + beberapa soal anak).
- Kasus 2 → **belum ada jalur "Soal Tunggal ber-audio"** (soal standalone tak punya field audio).

### Blocker infra — DITUNDA ke tahap pra-produksi (di luar scope kode)

Saat memutar audio muncul `net::ERR_CERT_COMMON_NAME_INVALID` pada URL publik R2.

**Akar penyebab (dikonfirmasi 2026-07-25 via `openssl s_client`):** domain **`r2.dev` di-hijack oleh ISP Indonesia (Internet Positif)**. Sertifikat yang disajikan host `pub-<hash>.r2.dev` adalah `CN=internetpositif.id` (issuer Let's Encrypt, **sudah kadaluarsa**) — bukan cert `r2.dev`. Jadi bukan bug R2/Railway/kode; env `CLOUDFLARE_R2_PUBLIC_URL` sudah benar (`https://pub-2ca39…r2.dev`).

**Konsekuensi:**
- **Upload & simpan tetap jalan** (frontend → backend Railway → R2 via S3 endpoint `*.r2.cloudflarestorage.com`, tak lewat r2.dev). Jadi bikin bank soal Listening **bisa lanjut sekarang**.
- **Memutar** audio dari browser Indonesia **gagal** — dan ini juga akan kena ke **peserta ujian** (mereka di Indonesia). Maka `r2.dev` **tak layak produksi** untuk app ini (lagipula r2.dev rate-limited & memang bukan untuk produksi).

**Rencana eksekusi (paling akhir, saat siap production):**
1. Beli **1 domain** (paling simpel: **daftar langsung di Cloudflare → Register Domains** → DNS otomatis di Cloudflare). TLD bebas (`.com`/`.id`/`.xyz`…). **Jangan** beli di Vercel (DNS nyangkut di Vercel). `*.vercel.app` tak bisa dipakai (bukan milik sendiri).
2. R2 → bucket → **Settings → Custom Domains → Connect Domain** → mis. `media.<domain>` → tunggu **Active** (SSL otomatis).
3. Railway → set `CLOUDFLARE_R2_PUBLIC_URL = https://media.<domain>` (tanpa `/` akhir) → redeploy.
4. **Unggah ulang** audio/gambar lama (URL lama masih menunjuk `r2.dev`; host baru tak auto-update baris lama).
5. Verifikasi buka file publik dari WiFi ISP → harus putar tanpa peringatan cert.

**Alternatif tanpa beli domain (opsional, perlu riset):** pindah media ke **Supabase Storage** (`…supabase.co`) — nol biaya domain, tapi butuh ubah kode upload (backend R2→Supabase) & **tes dulu** apakah `supabase.co` lolos Internet Positif.

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
