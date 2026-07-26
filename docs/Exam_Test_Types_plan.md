# Multi-Jenis-Tes (Test Types) — Rencana & Arsitektur

Status: **arah & keputusan disepakati; Fase A mulai dari DB.** Tanggal: 2026-07-26.
Terkait: `Exam_Scoring_and_Types_plan.md` (§4b/§4c), `Exam_Engine_Phase4_plan.md`.

## 1. Latar & tujuan
Aplikasi semula ber-asumsi **ITP** (4 section = skill ITP). Kita naikkan **Jenis Tes** menjadi
dimensi paling atas → aplikasi jadi **platform multi-jenis-tes** yang profesional & extensible.

**Taksonomi:** `Jenis Tes → Skill → Soal`. Skill & Soal & Ujian **milik satu jenis tes**.
Bank Soal, Komposisi, dan pemilihan Sumber semuanya **terfilter per jenis tes**.

## 2. Keputusan terkunci (2026-07-26)
1. **Phasing A/B** disepakati (kerangka + ITP dulu; sisanya "soon"; reorg Bank Soal penuh di Fase B).
2. **Registry jenis tes = TABEL DB + menu admin "Kelola Jenis Ujian"** (admin bisa tambah sendiri;
   bukan enum keras). Extensible tanpa migrasi baru.
3. **Custom selalu berbasis satu jenis tes.** Sekarang **Custom → ITP** saja; iBT/IELTS/TOEIC = **"soon"**.
4. **Soal lama ditandai `test_type='itp'`.** Prinsip: scalable + best practice + profesional.
5. **Preset ITP full test:** Listening **50**, Structure **15**, Written Expression **25**, Reading **50**
   (seksi ITP "Structure & Written Expression 40" dipetakan 15+25). Total **140**.

## 3. Data model (migration `013_test_types.sql`)
- **`test_types`**: `code` (itp/ibt/ielts/toeic/…), `name`, `description`, `status`
  ('active'|'soon'|'disabled'), `allow_custom`, `sort_order`, `is_builtin`. Registry data (admin-CRUD).
- **`test_type_skills`**: `test_type_id` FK, `code` (listening/structure/…/speaking/writing),
  `name`, `scorable` (Speaking/Writing = FALSE), `full_test_count` (preset full test), `sort_order`.
  UNIQUE(test_type_id, code).
- **`questions.test_type`** (default 'itp', data lama → itp). CHECK `section` **dilonggarkan**
  (skill valid dinamis per jenis tes → divalidasi app terhadap `test_type_skills`).
- **`exam_sections`**: CHECK `section` dilonggarkan (idem).
- **`exams.test_type`** + **`exams.exam_mode`** ('full' | 'custom').
  - `full` = preset terkunci + **validasi EKSAK**.
  - `custom` = komposisi bebas + **toleran (%)**.
- **RLS:** `test_types`/`test_type_skills` hanya admin (SELECT/INSERT/UPDATE), DELETE non-builtin;
  service-role bypass. Seed: ITP active (+skills preset), iBT/IELTS/TOEIC 'soon' (tanpa skill dulu).

Skill diidentifikasi oleh pasangan **(test_type, section)** → kode 'listening' boleh dipakai di
banyak jenis tes tanpa tabrakan.

## 4. Alur modal "Pilih Jenis Ujian" (2 langkah) — REVISI 2026-07-26
**Source of truth = menu "Jenis Ujian" (super admin).** Modal muncul saat *Buat Ujian*.
**Hanya jenis berstatus `active` yang tampil di modal ini** — 'soon'/'disabled' TIDAK ditampilkan
(mereka hanya muncul di menu Jenis Ujian sebagai "Segera hadir").

- **Langkah 1 — pilih jenis tes** (hanya yang aktif). Bila cuma **1 jenis aktif → langsung ke Langkah 2** (hemat klik).
- **Langkah 2 — pilih mode:**
  - **Tes Lengkap** (`exam_mode='full'`) → komposisi **resmi & terkunci** (preset), untuk ujian sungguhan.
  - **Latihan** (`exam_mode='custom'`) → komposisi **default = preset, tapi bebas diubah**; nilai persentase.

Tidak ada lagi kartu "Custom" terpisah maupun tingkat "Custom berbasis tes apa". Model lama dibuang
karena membingungkan. **Centang `allow_custom` di form Jenis Ujian DIHAPUS** — tiap jenis aktif otomatis
bisa dua-duanya (kolom DB `allow_custom` disisakan, default true, untuk pembatasan per-jenis di masa depan).

## 5. Reshape wizard (per jenis tes + mode)
- **StepKomposisi:**
  - `full` (Tes Lengkap) → skill & jumlah **preset dari `test_type_skills.full_test_count`**, **terkunci** (read-only).
  - `custom` (Latihan) → skill jenis tes terpilih, **komposisi PRA-TERISI dari preset** (bukan kosong) + **bebas diubah**.
    Preset dibawa ke builder via prop `initialCounts` dari `ManajemenUjianPage` (dihitung dari `t.skills`).
- **StepSource (Bank Soal builder):** hanya materi/soal dengan `test_type` = jenis tes ujian.
  Filter kuota §4c tetap berlaku (target dari komposisi).
- **StepReview:** tampilkan **Jenis Tes + Mode** ("Tes Lengkap"/"Latihan") + skema penilaian + passing.

## 6. Validasi eksak (mode `full` / tes standar)
- Komposisi terkunci = preset → target pasti.
- **StepSource wajib terpilih tepat = target** tiap skill (bukan ≤). Kurang/tak pas → blok Lanjut + pesan.
- **Backend `publish_exam`**: untuk `exam_mode='full'`, snapshot per skill **harus = target eksak**;
  bila stok tak bisa memenuhi pas → tolak (400) "stok tak bisa mencapai jumlah eksak".
- **Mode `custom`** tetap toleran (skor % menyesuaikan jumlah aktual).

## 7. Skema penilaian (menyambung tabel resmi nanti)
- Sementara tabel resmi TOEFL ITP belum ada → ujian ITP (full/custom) memakai **skema Custom %**,
  diberi catatan "skor resmi menyusul". Saat tabel resmi masuk (skema STANDAR), tinggal dipasang ke
  jenis tes tanpa bongkar ulang. **Angka konversi WAJIB dari sumber resmi — jangan dikarang.**

## 8. Sub-fase Fase A
1. **A1 — DB** (`013_test_types.sql`): test_types + test_type_skills + tag questions/passages/exams + RLS + seed. ✅ **DIBUAT (menunggu user jalankan).**
2. **A2 — Backend** ✅ SELESAI 2026-07-26 (compile/diagnostics bersih, belum di-commit):
   - `models/test_type.py` + `services/test_type_service.py` (CRUD + `get_skills_by_code`) + `routes/test_types.py` (`/api/test-types`, admin) → register main.
   - `questions` & `question_passages` bawa `test_type` (insert/update/response + filter `?test_type=`; soal **mewarisi** test_type dari materi induk).
   - `exams` bawa `test_type` + `exam_mode`; `publish_exam` **validasi eksak** untuk mode `full` (jumlah terakit per bagian harus = target, else 400 + snapshot dibatalkan); pool assembly + availability **discope per `test_type`**.
3. **A3 — Frontend menu admin "Kelola Jenis Ujian"** (CRUD jenis + skill + preset + status).
4. **A4 — Frontend exam builder** ✅ SELESAI 2026-07-26; **DIREVISI ke model Resmi/Latihan** (lihat §4/§5):
   - `PilihJenisUjianModal` **2 langkah**: (1) pilih jenis tes **aktif saja** (soon disembunyikan; 1 aktif → auto ke langkah 2), (2) pilih **Tes Lengkap** (`full`) / **Latihan** (`custom`). Kartu "Custom" terpisah DIBUANG.
   - `ManajemenUjianPage` kirim `initialCounts` (preset dari `t.skills`) → ujian **Latihan** pra-terisi standar, bukan kosong.
   - `ExamBuilder` terima `testTypeCode`+`examMode`+`initialCounts`; resolve skill via `useTestTypes`; badge "Tes Lengkap"/"Latihan"; `buildPayload` kirim `test_type`+`exam_mode`; sections dari skill.
   - `StepComposition` skills-driven: **full** = preset terkunci (read-only), **custom/Latihan** = pra-terisi preset + bebas diubah/matikan bagian.
   - `StepSource` prop `testType` (filter Bank Soal via `?test_type=`) + `exact` (badge "perlu tepat N"); `useQuestions`/`usePassages` tambah param `testType`.
   - `StepReview` tampilkan Jenis Ujian + mode ("Tes Lengkap"/"Latihan"). `useExams.Exam` tambah `test_type`+`exam_mode`.
   - Form **Jenis Ujian**: centang `allow_custom` **DIHAPUS** dari UI (setiap jenis aktif otomatis bisa dua mode). Validasi eksak keras tetap di backend `publish_exam`.
5. **A5 — Bank Soal:** untuk Fase A **cukup default `test_type='itp'`** (semua soal ITP; backend set default). **Selektor/filter jenis tes di Bank Soal ditunda** sampai ada jenis tes aktif ke-2 (Fase B).

## 9. Fase B (menyusul)
- Penataan ulang UI Bank Soal per jenis tes (tab/filter, pengelompokan).
- Menambah jenis tes ke-2 sungguhan (mis. TOEIC MCQ) end-to-end.
- Penanganan **Speaking/Writing non-MCQ** (rekam/berkas + rubrik manusia) — proyek tersendiri.
- Skema penilaian STANDAR resmi (TOEFL ITP 310–677, IELTS band) saat tabel terverifikasi.

## 10. Aturan repo
- Jangan `git commit`/`git push` — hak pemilik. Migrasi dijalankan pemilik.
- Komponen UI: pakai DS `frontend/src/components/ui/` (cek dulu; input non-native; penuh-lebar).
