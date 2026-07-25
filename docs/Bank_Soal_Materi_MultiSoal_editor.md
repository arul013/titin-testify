# Bank Soal — Editor Multi-Soal per Materi (Paket B)

Status: **SELESAI (kode) 2026-07-25.** Model simpan per-kartu, reorder ▲▼, preview via modal (default disepakati).

## Progres (SELESAI 2026-07-25)
- **Refactor:** `useQuestionForm.ts` (hook state+logika+validasi+buildPayload/Draft+markSaved) & `QuestionFields.tsx` (body section-aware, `idPrefix` unik) diekstrak dari `QuestionBuilder` → builder halaman-penuh (Soal Tunggal) kini tipis & pakai keduanya. Perilaku sama.
- **Editor inline:** `QuestionCard.tsx` (kartu bernomor: header nomor+ringkasan+reorder ▲▼+preview+hapus+collapse; body difficulty/status + `QuestionFields` + Simpan) & `MateriQuestionsEditor.tsx` (daftar kartu urut `sort_order` + draft + tombol Tambah Soal). `PassageDetailPanel` memakainya; stimulus (audio/passage) dibuat **sticky**; tombol "Tambah Soal ke Materi" di header dihapus (jadi inline).
- **Hook:** `createPassageQuestion`/`updatePassageQuestion`/`deletePassageQuestion`/`reorderPassageQuestions` (pakai endpoint lama + `sort_order`, reorder normalisasi sort_order=posisi). Simpan kartu selalu set `sort_order=nomor-1`.
- **page.tsx:** FAB "Buat Soal" disembunyikan di detail materi (sudah ada tambah inline). Full-page builder tetap untuk Soal Tunggal & edit dari tab "Semua Soal".
- Ownership: dienforce backend (403 → toast) — UI kartu tak menyaring per-owner.
- Verifikasi: build + tsc + eslint bersih.

Tanggal: 2026-07-25.

## 1. Masalah & tujuan

Untuk **satu materi dengan banyak soal berurutan** — terutama **Listening** (1 audio → 3–5 pertanyaan diucapkan berurutan) dan **Reading** (1 passage → banyak soal) — **urutan set-opsi yang diinput harus sama persis dengan urutan pertanyaan di audio/urutan soal**. Kalau meleset seurutan → opsi nyangkut ke pertanyaan yang salah → **miss**.

Alur sekarang (tambah soal **satu-satu** lewat builder halaman-penuh) membuat admin **kehilangan konteks urutan**: tak ada nomor "Soal ke-N", tak melihat soal yang sudah ada, audio tak di depan mata saat mengetik opsi → **disorientasi → human error**.

**Tujuan:** admin melihat **audio/passage + semua soal berurutan (bernomor) sekaligus di satu halaman**, bisa tambah/urutkan/hapus tanpa keluar konteks.

## 2. Desain — editor multi-soal inline (di halaman Materi)

Mengubah panel **"Kelola Soal untuk Materi Ini"** menjadi **editor inline multi-soal**:

- **Stimulus pinned (sticky) di atas:** player **audio** (Listening) / **teks passage** (Reading) selalu terlihat saat scroll.
- **Daftar kartu soal bernomor** urut `sort_order`: **Soal 1, 2, 3, …**
  - Kartu **section-aware** (pakai logika per-tipe yang sudah ada):
    - **Listening:** opsi A–D + tandai benar + catatan opsional (tanpa stem/gambar).
    - **Reading:** stem + opsi A–D + tandai benar + gambar opsional.
  - Kartu bisa **collapse/expand**; ada **indikator "belum disimpan"**.
  - Validasi inline reuse pola B3 (pesan merah + fokus).
- **Aksi:**
  - **➕ Tambah Soal** → kartu baru di **urutan terakhir** (`sort_order = N+1`), langsung expanded.
  - **Reorder naik/turun** (tombol ▲▼) → tukar `sort_order` dengan tetangganya.
  - **Hapus** kartu (konfirmasi).
  - **Simpan per-kartu** (create/update) — feedback jelas per soal.
- **Pratinjau peserta:** tombol "Pratinjau" per kartu → buka modal `QuestionPreview` (split materi|soal) yang sudah ada.

## 3. Data & backend

- **Tanpa kolom/endpoint baru** (pragmatis): pakai endpoint yang ada — `POST` create, `PUT` update, `DELETE`, semuanya sudah menerima `sort_order`.
- **Reorder** = update `sort_order` dua kartu bersebelahan (2 panggilan `PUT`). *(Opsional nanti: endpoint bulk-reorder bila terasa lambat.)*
- **Simpan per-kartu** menghindari kompleksitas diff/batch. Tiap kartu punya `id` setelah tersimpan; kartu baru = draft (belum ada `id`) sampai disimpan.

## 4. Refactor pendukung

Ekstrak **`QuestionFields`** (komponen section-aware berisi field soal + validasi) dari `QuestionBuilder`, agar dipakai ulang oleh:
- **Builder halaman-penuh** (Soal Tunggal) — tetap ada.
- **Kartu inline** (soal dalam materi).

Tujuan: satu sumber kebenaran untuk field per-tipe (hindari duplikasi & drift). Perilaku builder lama harus tetap sama (regression check).

## 5. Scope

- Berlaku untuk materi **Listening & Reading** (Structure materi opsional; WE umumnya standalone).
- **Soal Tunggal** tetap pakai builder halaman-penuh (tak berubah).
- Editor per-tipe (Listening/WE/Structure/Reading) yang sudah selesai → dipakai ulang di kartu.

## 6. Tahapan implementasi

1. **Refactor:** ekstrak `QuestionFields` dari `QuestionBuilder` (perilaku tetap, build hijau).
2. **Editor inline:** ubah `PassageDetailPanel` → daftar kartu bernomor + stimulus pinned + Tambah/Simpan per-kartu (create/update via endpoint lama).
3. **Reorder + polish:** tombol ▲▼ (swap `sort_order`), hapus + konfirmasi, indikator belum-disimpan, pratinjau per-kartu, empty/loading.
4. Build + tsc + eslint.

## 7. Keputusan yang perlu dikonfirmasi
- **Model simpan:** per-kartu (rekomendasi, tanpa backend baru) vs "Simpan Semua" (batch).
- **Reorder:** tombol ▲▼ (simpel, rekomendasi) vs drag-drop (perlu lib/logika lebih).
- **Live preview:** modal `QuestionPreview` per-kartu (reuse) vs preview inline di kartu.

## 8. Catatan
- Preview `QuestionView` = tampilan peserta → dipakai ulang Phase 4.
- Ikut keputusan arsitektur single-table ([[question-model-architecture]]) — tak ada pemecahan tabel.
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik.
