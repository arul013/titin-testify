# Rencana — Exam Builder (Manajemen Ujian / Phase 3)

> Status: **Perencanaan** · Dibuat 2026-07-23 · Belum ada kode.
> Referensi: `Titin_Testify_Roadmap.md` (Phase 3), `docs/Bank_Soal_roadmap.md` (sumber soal).
> Semua nama tabel/endpoint di bawah adalah **usulan**, belum ada di kode.

## 1. Tujuan & ruang lingkup

Menu baru tempat admin **menyusun & menjadwalkan paket ujian** yang soalnya bersumber dari **Bank Soal**. Bank Soal = *gudang soal* (storage); Exam Builder = *perakit ujian*.

**Masuk lingkup (Phase 3):**
- Buat/edit "paket ujian": nama, deskripsi, durasi total, **passing grade (opsional)**, jadwal (window tanggal mulai–selesai).
- Tentukan **komposisi soal** per section — **fleksibel**: boleh 1 section saja / jumlah kecil (mis. "10 soal structure saja"); tidak wajib semua section (§9.6).
- Tentukan **sumber soal** dari Bank Soal secara **hybrid** (§5), dengan **grouping materi utuh** (§5).
- Tetapkan **peserta** via **whitelist** — 1 orang s/d massal (§9.4).
- Opsi randomisasi urutan **antar-unit** & acak pilihan jawaban (A/B/C/D).
- **Bobot fleksibel** (default setara; override opsional) (§9.6).
- Status paket: Draf / Tayang (jadwalkan).

**DI LUAR lingkup (fase lain, jangan dikerjakan di sini):**
- **Token ujian & anti-cheat / SEB** → **DITUNDA ke fase paling akhir** (§9.5). Kolom `token` disiapkan nullable tapi tak dipakai.
- **Phase 4 — Exam Engine** (lembar ujian peserta: layout 2 kolom, timer, autosave, autosubmit) — termasuk *enforcement* whitelist di `/ujian`.
- **Phase 6 — Hasil & progress report.**

## 2. Hubungan dengan Bank Soal, peran & RLS

- **Peran:** `super_admin`, `admin`, `peserta` (dari `profiles.role`).
- **RLS Bank Soal (dari `003_question_bank.sql`):** admin hanya melihat soal **buatannya sendiri**; super_admin melihat semua; peserta tidak punya akses. → **Exam Builder harus konsisten:** admin hanya bisa memilih soal dari bank miliknya (super_admin: semua). Terapkan pola RLS/otoritas yang sama untuk tabel exam.
- **Filter sumber wajib:** hanya soal `status = 'published'` (Tayang) yang boleh masuk ujian. Draf tidak boleh terpilih.
- **Pakai ulang, jangan bikin baru:** hook `useQuestions({ section, status, search, page, perPage })` (di `features/questions/hooks/useQuestions.ts`) sudah menyediakan pencarian + filter + pagination soal. Question picker Exam Builder **memakai ulang** hook ini. Untuk pratinjau soal, pakai ulang `QuestionPreview` + `renderExamText` (`features/questions/examText.tsx`).

## 3. Konsep & terminologi (lanjutkan gaya ramah Bank Soal)

Konsisten dengan keputusan Bank Soal: bahasa Indonesia ramah, istilah TOEFL section tetap, **Draf/Tayang**, **Mudah/Sedang/Sulit**, "Materi" untuk passage.

| Istilah teknis | Istilah UI |
|---|---|
| Exam / exam package | **Paket Ujian** |
| Participant / assignee | **Peserta** |
| Composition / blueprint | **Komposisi Soal** |
| Question pool | **Kumpulan Soal** |
| Attempt / session | **Sesi Pengerjaan** |
| Passing grade | **Nilai Kelulusan** |
| Schedule window | **Jadwal (Mulai–Selesai)** |
| Token | **Token Ujian** |

## 4. Model data (USULAN — migrasi `004_exams.sql`)

Ikuti pola `003_question_bank.sql` (UUID PK, `created_by` FK ke `profiles`, `status` draft/published, RLS, trigger `updated_at`).

```
exams
  id UUID PK
  created_by UUID FK profiles
  title, description
  duration_minutes INT              -- total waktu
  passing_grade INT NULL            -- OPSIONAL (boleh kosong) — 0..100
  shuffle_questions BOOL            -- acak antar-UNIT (materi/soal), tak memecah materi
  shuffle_options BOOL              -- acak A/B/C/D
  status ENUM('draft','published')
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ   -- window jadwal
  token VARCHAR NULL                -- DISIAPKAN tapi TIDAK DIPAKAI dulu (anti-cheat = fase akhir)
  created_at, updated_at

exam_sections                       -- komposisi per section (blueprint) — boleh subset section saja
  id UUID PK
  exam_id UUID FK exams (ON DELETE CASCADE)
  section ENUM('listening','structure','written_expression','reading')
  target_count INT                  -- TARGET total soal section ini (dipenuhi campuran unit; total aktual bisa ≠ target krn materi utuh)
  weight NUMERIC NULL               -- bobot opsional (default: semua soal setara)
  -- (opsional) difficulty_mix / tag filter untuk mempersempit pool

exam_pool_units                     -- HYBRID: unit terpilih/dipersempit (materi utuh atau soal tunggal)
  id UUID PK
  exam_id UUID FK exams (ON DELETE CASCADE)
  passage_id UUID NULL              -- terisi → seluruh soal materi ini ikut (unit utuh)
  question_id UUID NULL             -- terisi → soal tunggal (standalone)
  -- (salah satu dari passage_id / question_id terisi)

exam_participants                   -- WHITELIST peserta
  id UUID PK
  exam_id UUID FK exams (ON DELETE CASCADE)
  user_id UUID FK profiles
  UNIQUE(exam_id, user_id)

exam_attempt_questions              -- snapshot soal per sesi peserta (WAJIB untuk audit/nilai)
  attempt_id, question_id, passage_id NULL, unit_index, order_in_unit, shuffled_option_map
```

> **Snapshot itu penting & harus menjaga grouping:** saat sesi peserta mulai, kunci daftar soal yang ia terima — **soal satu materi tersimpan berurutan dalam satu unit** (agar tampil berdampingan di lembar ujian Phase 4), dan nilai/review tetap konsisten walau bank berubah kemudian.

## 5. ⭐ Keputusan kunci: bagaimana soal masuk ke ujian? — DIPUTUSKAN (2026-07-23)

**Pendekatan = HYBRID.** Admin set **jumlah soal per section** + boleh **mempersempit pool** (filter tag/kesulitan, atau centang manual subset materi/soal). Sistem melakukan **draw + snapshot per sesi peserta**. Fleksibel dari "kontrol penuh (pilih manual)" sampai "acak dari pool".

**Grouping = MATERI UTUH (unit tak terpisah).** Dalam satu sesi bisa bercampur **soal individual** DAN **soal bermateri**, dan **soal satu materi tidak boleh dipisah**. Contoh nyata (dari user):
- Listening: ada 1 audio → 1 soal, ada juga 1 audio → 5–8 soal.
- Reading: sama — 1 bacaan → 1 soal, atau 1 bacaan → beberapa soal.

**Implikasi ke "jumlah soal per section":** angka itu = **target total soal** untuk section tsb, dipenuhi oleh campuran **soal individual (unit=1)** + **materi utuh (unit=jumlah anaknya)**. Konsekuensi desain:
- Draw/pemilihan bekerja pada **unit** (materi utuh atau soal tunggal), lalu **hitung total anaknya** hingga mencapai/mendekati target. Karena materi bisa 5–8 soal, total bisa **tidak persis** sama target → UI harus menampilkan total aktual (mis. "target 20 → terpilih 21 soal dari 4 unit") dan biarkan admin menyesuaikan.
- Snapshot per sesi menyimpan **urutan materi + soal-soalnya berurutan** (soal satu materi tampil berdampingan di lembar ujian, sesuai layout Phase 4).
- Acak urutan (`shuffle_questions`) mengacak **antar-unit**, bukan memecah soal dalam satu materi.

## 6. Arsitektur frontend (usulan)

Ikuti pola Bank Soal (smart hook + dumb components + DS):
```
src/features/exams/
  hooks/useExams.ts            -- list/create/update/delete paket ujian (pola useQuestions)
  hooks/useExamBuilder.ts      -- state builder 1 paket (pola useBankSoalPage)
  ExamTable.tsx                -- daftar paket ujian
  ExamBuilderStepper.tsx       -- wizard multi-langkah (pakai WorkflowStepper DS)
  steps/StepDetail.tsx         -- nama, durasi, passing grade, jadwal, token
  steps/StepComposition.tsx    -- komposisi per section (jumlah soal) + pool
  steps/StepQuestionPicker.tsx -- pilih/persempit soal (REUSE useQuestions + seleksi baris)
  steps/StepParticipants.tsx   -- whitelist peserta (REUSE data user peserta)
  steps/StepReview.tsx         -- ringkasan + Tayangkan
src/app/(dashboard)/manajemen-ujian/page.tsx
```

Komponen DS yang dipakai ulang: `PageHeader`, `PageContainer`, `StatCard`, `Tabs`, `WorkflowStepper`/`Stepper`, `ConfirmDialog`, `EmptyState`, `Skeleton`, `ToggleGroup`, `DataTable` **+ layer seleksi** (untuk picker), `FAB`. Reuse fitur: `useQuestions`, `QuestionPreview`, `renderExamText`.

## 7. Backend (usulan — ikuti pola FastAPI yang ada)

Mirror struktur Bank Soal: `models/exam.py`, `services/exam_service.py`, `routes/exams.py`, migrasi `database/004_exams.sql`.

Endpoint usulan:
```
GET    /api/exams                 list paket (filter status/search/page)
POST   /api/exams                 buat paket (+ sections + participants)
GET    /api/exams/{id}            detail paket
PUT    /api/exams/{id}            update
DELETE /api/exams/{id}
POST   /api/exams/{id}/publish    set Tayang (validasi di bawah)
GET    /api/exams/{id}/pool-preview   stok tersedia per section dalam UNIT (materi utuh + soal tunggal) & total soal
```
Validasi penting saat Tayang: stok bank **Tayang** cukup untuk memenuhi target tiap section (berbasis unit, materi utuh); `starts_at < ends_at`; **passing_grade opsional** (jika diisi harus 0–100); **minimal 1 peserta**; minimal 1 section dengan target > 0.

## 8. Alur UI (wizard "Buat Paket Ujian")

1. **Detail** — nama, deskripsi, durasi, **nilai kelulusan (opsional)**, jadwal mulai/selesai, opsi acak (urutan antar-unit & pilihan jawaban). (Token TIDAK di sini — fase akhir.)
2. **Komposisi** — pilih section yang dipakai (**boleh satu saja**), isi **target jumlah soal** per section; tampilkan **stok tersedia** dari bank Tayang dalam bentuk **unit** (mis. "Reading: 3 materi + 5 soal tunggal = 26 soal tersedia; target 20"). Peringatkan bila stok kurang; tampilkan **total aktual** karena materi utuh bisa membuat total ≠ target.
3. **Sumber soal (hybrid)** — biarkan acak dari seluruh pool section, ATAU persempit (filter tag/kesulitan), ATAU centang manual **unit** (materi utuh / soal tunggal) lewat **question picker** (reuse `useQuestions` + `QuestionPreview`).
4. **Peserta (whitelist)** — (opsional: input dulu perkiraan jumlah peserta sbg panduan) lalu buka daftar **peserta yang sudah ada** dari Manajemen User → search + multi-select (1 orang, beberapa, atau "pilih semua"). Hanya yang ditandai yang nanti bisa ujian.
5. **Review & Tayangkan** — ringkasan (komposisi + total aktual + jumlah peserta + jadwal), validasi, tombol **Tayangkan**.

## 9. Keputusan (DIPUTUSKAN 2026-07-23)

1. **Cara pemilihan soal → HYBRID** (§5).
2. **Grouping → MATERI UTUH**, boleh bercampur soal individual + bermateri dalam 1 sesi (§5).
3. **Route menu → `/manajemen-ujian`** (menu peserta tetap `/ujian`).
4. **Peserta → fleksibel (1 orang s/d massal), berbasis whitelist.**
   - Alur: saat membuat ujian, admin memilih peserta dari **data peserta yang sudah dibuat/generate** di Manajemen User (search + multi-select; bisa pilih 1, beberapa, atau semua). (Opsional UX: input dulu "berapa peserta" sebagai panduan, lalu buka daftar pilih.)
   - **Enforcement whitelist:** hanya peserta yang **ditandai** yang melihat sesi ujian di `/ujian`. Peserta yang tidak ditandai — walau login — **tidak melihat sesi ujian apa pun** untuk paket itu. (Enforcement final dilakukan Phase 4 saat `/ujian` jadi live; Exam Builder menyimpan daftar peserta = sumber kebenarannya.)
   - Belum perlu konsep "kelas/grup" formal sekarang — cukup pilih satuan/massal dari daftar peserta.
5. **Token & anti-cheat → DITUNDA ke paling akhir.** Dikerjakan setelah semua modul inti selesai (bank soal, dashboard, manajemen user, manajemen ujian, lembar ujian, auto-nilai ke portal admin). → **Buang `token` dari lingkup awal**; kolomnya boleh disiapkan (nullable) tapi tidak dipakai dulu.
6. **Passing grade & bobot → FLEKSIBEL, tidak fix.**
   - Kasus nyata: tutor sering menguji hanya 5 soal, 10 soal, "5 soal reading saja", atau "10 soal structure saja". → **Komposisi boleh 1 section saja / jumlah kecil**; tidak ada kewajiban mengisi semua section.
   - **Passing grade opsional** (nullable) — admin isi bila perlu, boleh dikosongkan.
   - **Bobot fleksibel:** default semua soal bobot sama; sediakan opsi override (mis. bobot per section) tapi jangan dipaksakan.

## 10. Rencana bertahap (§9 sudah dijawab — siap dieksekusi)

- **E0 — Skema & backend dasar** ✅ **SELESAI (kode) — 2026-07-23.**
  - Migrasi `database/004_exams.sql`: `exams`, `exam_sections`, `exam_pool_units`, `exam_participants` + RLS (helper `check_exam_owner`, pola `003`) + trigger `updated_at`. **`exam_attempt_questions` DITUNDA ke Phase 4** (data runtime, bukan authoring).
  - Backend FastAPI: `app/models/exam.py`, `app/services/exam_service.py`, `app/routes/exams.py` (CRUD: GET list, POST create, GET detail, PUT update, DELETE) + terdaftar di `main.py`.
  - Isolasi data & guard `require_admin` konsisten (admin lihat miliknya, super_admin semua). Validasi: peserta harus akun role `peserta`; pool unit tepat satu dari passage/question.
  - **Verifikasi:** `py_compile` + import modul OK, 5 route terdaftar. **BELUM diuji live** (butuh env Supabase + server).
  - ⚠️ **Aksi user:** jalankan `database/004_exams.sql` di **Supabase SQL Editor** (seperti `003`) sebelum endpoint bisa dipakai.
- **E1 — Builder inti (frontend):** route `/manajemen-ujian`, wizard Detail + Komposisi (fleksibel, boleh 1 section) + Peserta (whitelist), simpan sebagai Draf. Reuse DS + `useQuestions`.
- **E2 — Question picker hybrid + pool unit:** biarkan-acak / persempit / pilih manual **unit** (materi utuh). Layer seleksi di atas tabel soal (reuse `useQuestions` + `QuestionPreview`).
- **E3 — Validasi & Tayangkan:** pool-preview berbasis unit, cek stok/jadwal/peserta, publish, daftar paket + status Draf/Tayang.
- **E4 — Handoff ke Exam Engine (Phase 4):** kontrak data sesi + **snapshot per peserta menjaga grouping materi**; enforcement whitelist di `/ujian`.

## 11. Catatan
- **Aturan repo:** jangan pernah `git commit`/`git push` — hak pemilik. Perubahan ditinggalkan di working tree.
- Dokumen ini **rencana**, bukan kontrak final. Perbarui saat §9 diputuskan.
