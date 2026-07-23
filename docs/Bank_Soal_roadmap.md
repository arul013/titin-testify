# Roadmap — Redesign Bank Soal (Ramah Pengguna Non-Teknis)

> Status: **Perencanaan** · Dibuat 2026-07-23 · Belum ada kode yang diubah.
> File terkait: `frontend/src/features/questions/**`, `frontend/src/app/(dashboard)/bank-soal/page.tsx`.

## 1. Tujuan

Halaman `/bank-soal` saat ini fungsional dan rapi, tetapi **berbicara seperti developer ke developer**: istilah model data (parent/child) bocor ke UI, dan di satu titik bahkan membocorkan infrastruktur (Cloudflare R2, `.env` backend) ke pengguna akhir.

Sasaran: pengguna membuka halaman ini dan **langsung paham alur & cara kerjanya tanpa perlu latar belakang teknis**.

## 2. Keputusan yang sudah dikunci

| Topik | Keputusan |
|---|---|
| **Target user** | Guru/admin **TOEFL**. Istilah bagian ujian TOEFL (*Listening, Structure, Written Expression, Reading*) **tetap** dalam bentuk asli — itu istilah domain yang mereka kenal. |
| **Yang dibuang** | Jargon software (Induk, Anak, Standalone, Group, R2, `.env`, URL manual). |
| **Draft/Published** | Diseragamkan menjadi **"Draf / Tayang"** di semua tempat. |
| **Tingkat kesulitan** | Diseragamkan menjadi **Mudah / Sedang / Sulit** (sekarang badge tabel pakai Easy/Medium/Hard, form pakai Indonesia — inkonsisten). |

## 3. Glosarium — jargon → bahasa manusia

| Sekarang (teknis) | Lokasi | Usulan (ramah) |
|---|---|---|
| Passage Induk | Tombol, judul modal | **Teks Bacaan / Audio** atau **Materi Soal** |
| Soal Standalone | Tombol tambah | **Soal Tunggal** / **Buat Soal** |
| Anak Pertanyaan / Soal Anak | Detail panel | **Soal dalam materi ini** |
| Tambah Soal Anak | Tombol | **Tambah Soal ke Materi Ini** |
| Mengelola Anak Pertanyaan dari Passage | Judul detail | **Kelola Soal untuk Materi Ini** |
| Listening Group / Reading Group | Tab, badge | **Kelompok Listening / Reading** (atau tanpa "Group") |
| Hapus Group | Tombol | **Hapus Materi Ini** |
| Kelola Soal | Tombol tabel | **Buka & Kelola** |
| Konten / Ringkasan | Header kolom | **Isi Materi** |
| Tipe Passage | Header kolom | **Jenis** |
| Kunci | Header kolom | **Jawaban** |
| Bagian (Section) | Header kolom | **Bagian** |
| Draft / Published | Badge status | **Draf / Tayang** |
| Pratinjau Soal (Preview Mode) | Judul modal | **Pratinjau Soal** |
| Section (label form) | Form soal | **Bagian Ujian** |
| Tag Topik | Form soal | **Label Topik** (+ contoh: "grammar, tenses") |

## 4. Pemetaan komponen — pakai ulang LN Design System

**Temuan penting:** Bank Soal dibuat dengan komponen bespoke, padahal `frontend/src/components/ui` sudah menyediakan versi resmi Design System. Menggantinya sekaligus menyeragamkan tampilan dengan menu lain.

| Bagian Bank Soal (sekarang) | Buatan tangan di | Komponen DS pengganti |
|---|---|---|
| Header judul + subjudul | `BankSoalHeader.tsx` (raw `<h1>`) | **`PageHeader`** (chip ikon gradient + actions slot) |
| Wrapper halaman `<div className="…py-2">` | `page.tsx` | **`PageContainer`** (ritme `space-y-6`, padding milik AdminShell) |
| Kartu statistik | `BankSoalStats.tsx` (Card manual) | **`StatCard`** |
| Tab navigasi (tombol manual) | `BankSoalFilters.tsx` | **`Tabs`** (indikator meluncur, keyboard nav) |
| Search + filter | `BankSoalFilters.tsx` | **`ListToolbar`** (search + sort + view) |
| Tabel passage & soal | `PassageTable.tsx`, `QuestionTable.tsx` | **`DataTable`** (opsional; lihat catatan) |
| Empty state ("Belum ada…") | teks polos di tabel | **`EmptyState`** / **`EmptySearch`** |
| Loading ("Memuat data…") | teks polos | **`Skeleton` / `SkeletonText` / `Spinner`** |
| `confirm()` native (hapus) | `useBankSoalPage.ts` | **`ConfirmDialog`** (sudah ada, tinggal dipakai) |
| Dropzone audio manual | `PassageForm.tsx` | **`FileUploader`** (varian dropzone) |
| Pilih jawaban benar (A/B/C/D) | `QuestionForm.tsx` (Select) | **`ToggleGroup`** (single-select chip) |
| Tombol "Kembali ke Daftar" | `PassageDetailPanel.tsx` | **`BackLink`** |
| Wizard "Buat Soal" (baru) | — | **`WorkflowStepper`** / **`Stepper`** |

> **Catatan DataTable:** `QuestionTable`/`PassageTable` punya sel kaya (badge section, tag, tombol aksi per baris). `DataTable` mendukung `render` per kolom, jadi bisa dipakai — tapi migrasi ini opsional (P3) agar tidak menambah risiko di fase awal.
>
> **Catatan alias import:** ✅ TERVERIFIKASI aman — di `tsconfig.json` baik `@/*` maupun `@/src/*` sama-sama menunjuk ke `./src/*`, jadi komponen DS bisa di-import dari file Bank Soal tanpa masalah.

## 5. Kebocoran teknis (WAJIB ditutup — prioritas tertinggi)

Di `frontend/src/features/questions/PassageForm.tsx`:

- [x] **~baris 81** — toast sukses menyebut "Cloudflare R2" → sekarang "Audio berhasil diunggah."
- [x] **~baris 84** — pesan error menyebut "kredensial R2 di .env backend" → sekarang pesan netral ("Gagal mengunggah audio. Coba lagi, atau hubungi admin bila masalah berlanjut.").
- [x] **~baris 155–161** — field "URL Audio Langsung" → dipindah ke balik toggle "Opsi lanjutan: tempel URL audio" (tersembunyi default; otomatis terbuka bila record lama sudah punya URL). Unggah file kini penuh-lebar sebagai jalur utama.

> Nomor baris = snapshot 2026-07-23, verifikasi ulang sebelum edit.

## 6. Roadmap bertahap

### P0 — Tutup kebocoran teknis (risiko kecil, hanya teks/visibilitas) ✅ SELESAI (2026-07-23)
- [x] Bereskan 3 poin di bagian §5.

### P1 — Bahasa ramah + konsistensi (mayoritas ganti teks) ✅ SELESAI (2026-07-23)
- [x] Terapkan seluruh glosarium §3 di semua komponen `features/questions`. Istilah "Passage" → **"Materi"** konsisten (tombol, tab, tabel, form, panel detail, toast, konfirmasi).
- [x] Seragamkan kesulitan → Mudah/Sedang/Sulit (badge `QuestionTable`, filter, preview; form sudah Indonesia).
- [x] Seragamkan status → Draf/Tayang di semua badge/filter/form + micro-copy penjelasan di `QuestionForm` & `PassageForm` (memakai frasa aman: "Draf disimpan tapi belum dipakai · Tayang berarti soal/materi siap digunakan").
- [x] Empty state di-perbaiki **copy**-nya jadi membimbing (masih inline text). **Swap ke komponen DS `EmptyState`/`EmptySearch` dipindah ke P2** agar P1 tetap murni teks / risiko minimal.

Catatan verifikasi P1: `tsc --noEmit` bersih untuk `features/questions`; diagnostics IDE hanya menyisakan hint lama `FormEvent is deprecated`.

### P2 — Peningkatan alur & keseragaman DS ✅ SELESAI (2026-07-23)
- [x] Ganti header → `PageHeader`, wrapper → `PageContainer`. **Keputusan user: ikut DS penuh sekarang** (Bank Soal jadi pionir; dashboard/users/ujian masih header lama — kandidat migrasi berikutnya). `BankSoalHeader.tsx` & `BankSoalToolbar.tsx` **dihapus** (tak terpakai lagi).
- [x] Ganti stats → `StatCard` (`BankSoalStats`), tab → `Tabs` (`BankSoalFilters`), loading → `Skeleton` (komponen baru `BankSoalTableSkeleton`, dipakai di `PassageTable`, `PassageDetailPanel`, & tabel soal di `page.tsx`).
- [x] Ganti empty state inline → komponen DS `EmptyState` (`PassageTable` & `QuestionTable`).
- [x] Ganti `confirm()` native → `ConfirmDialog`. Alur pindah ke hook (`pendingDelete`/`isDeleting`/`requestDelete*`/`confirmDelete`/`cancelDelete`); dialog dirender di `page.tsx`.
- [x] Ganti dropzone audio → `FileUploader` (`PassageForm`); pilih jawaban benar → `ToggleGroup` (`QuestionForm`).
- [x] Satukan 2 tombol tambah menjadi **satu entri "Buat Soal"**. **Iterasi final (keputusan user):** memakai komponen baru **`FAB`** varian *speed-dial 2 aksi* ("Soal Tunggal" & "Soal + Materi Bersama") yang **menggantikan** tombol header sekaligus modal pilihan. Modal `BankSoalCreateChooser` sempat dibuat lalu **dihapus** karena FAB speed-dial sudah mencakup percabangannya tanpa redundansi. (Tetap deviasi dari `WorkflowStepper` — percabangan 1 langkah.)
  - Catatan tata letak: `PageContainer` diberi `pb-24` agar konten bawah (pagination) tak tertutup FAB (`fixed bottom-right`), karena `(dashboard)/layout.tsx` memakai `<main>` custom tanpa `pb` khusus FAB.

Catatan verifikasi P2: `npm run build` (compile + TypeScript) **sukses**, `eslint` bersih, diagnostics IDE nol untuk file yang diubah.

### P3 — Fase lanjutan (effort besar) — editor SELESAI (2026-07-23)
- [x] Editor visual untuk Written Expression (mengganti sintaks `__kata__` / `[word]{A}` dengan tombol "garis bawahi kata terpilih").
  - Komponen baru **`UnderlineEditor.tsx`**: textarea + toolbar (blok teks → klik tombol menyisipkan markup) + **live preview**. Varian `labeled` (tombol A/B/C/D → `[kata]{X}`, dipakai di soal WE `QuestionForm`) & `plain` (tombol Garis bawahi → `__kata__`, dipakai di materi WE `PassageForm`).
  - Perender bersama baru **`examText.tsx`** (`renderExamText`) yang mengerti KEDUA format. `QuestionPreview` sekarang memakainya (fungsi lokal `renderTextWithUnderlines` dibuang).
  - **Perbaikan bug lama:** dulu `PassageForm` menyuruh `__kata__` tapi `QuestionPreview` merender materi WE dengan parser `[kata]{A}` saja → `__kata__` tak muncul bergaris bawah. Perender bersama kini menangani keduanya, jadi konsisten.
- [~] (Opsional) Migrasi `QuestionTable`/`PassageTable` ke `DataTable` — **DITUTUP, sengaja tidak dikerjakan (2026-07-23).**
  - **Alasan:** `DataTable` hanya menambah keseragaman visual + sort-by-kolom; tidak menambah skalabilitas nyata (tak ada virtualization/server-pagination — pagination Bank Soal sudah ditangani `useQuestions` + `Pagination`). Tabel bespoke sekarang sudah jalan, role-aware, dan selnya kaya (badge/tag/aksi). Menukarnya = risiko regresi demi manfaat tipis (prinsip YAGNI).
  - **Catatan arsitektur (untuk Exam Builder / Phase 3):** momen tepat berinvestasi ke "tabel/daftar soal bersama" adalah saat membangun **question picker** di Exam Builder (butuh **seleksi baris** yang `DataTable` belum punya). Saat itu: **pakai ulang `useQuestions`** sebagai sumber (jangan fetch baru), filter wajib `status='published'` (Tayang) + `section`. Detail lengkap ada di **`docs/Exam_Builder_plan.md`**.

## 7. Pertanyaan terbuka / keputusan menunggu
- Perilaku sebenarnya "Tayang": apakah langsung dipakai di ujian aktif? (menentukan micro-copy). — halaman `/ujian` masih **mock** (belum merender soal), jadi format WE baru dipakai di `QuestionPreview` saja.
- Apakah field URL audio manual masih diperlukan sama sekali (untuk admin teknis), atau dibuang total?
- ~~Opsi migrasi `DataTable`~~ → **DITUTUP** (lihat P3). Investasi tabel-bersama dipindah ke Exam Builder (question picker dengan seleksi).

## 8. Catatan
- **Aturan repo:** jangan pernah `git commit`/`git push` — itu hak pemilik. Perubahan ditinggalkan di working tree saja.
