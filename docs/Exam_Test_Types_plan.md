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

## 4. Alur modal "Pilih Jenis Ujian" (2 tingkat)
Muncul **paling awal** saat *Buat Ujian* (sebelum Detail). Saat edit → jenis tampil badge (bisa diganti).

- **Tingkat 1 — pilih jenis:** kartu **ITP** · **iBT** *(soon)* · **IELTS** *(soon)* · **TOEIC** *(soon)* · **Custom**.
  - Kartu 'soon' tak bisa diklik (badge "Soon").
  - Pilih **ITP** → langsung **full test**: `test_type='itp'`, `exam_mode='full'`.
  - Pilih **Custom** → **Tingkat 2**.
- **Tingkat 2 (khusus Custom) — "Custom berbasis tes apa?":** ITP (aktif) · lainnya *(soon)*.
  - Pilih ITP → `test_type='itp'`, `exam_mode='custom'`.

Registry (`allow_custom`, `status`) yang menentukan kartu mana muncul/aktif → extensible.

## 5. Reshape wizard (per jenis tes + mode)
- **StepKomposisi:**
  - `full` → skill & jumlah **preset dari `test_type_skills.full_test_count`**, **terkunci** (read-only).
  - `custom` → hanya tampilkan **skill jenis tes terpilih**; jumlah **bebas**.
- **StepSource (Bank Soal builder):** hanya materi/soal dengan `test_type` = jenis tes ujian.
  Filter kuota §4c tetap berlaku (target dari komposisi).
- **StepReview:** tampilkan **Jenis Tes + Mode** (Full/Custom) + skema penilaian + passing.

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
4. **A4 — Frontend exam builder:** modal 2-tingkat + reshape Komposisi (filter skill + lock preset) +
   StepSource filter `test_type` + validasi eksak (mode full).
5. **A5 — Bank Soal:** soal membawa `test_type` (create set otomatis dari konteks; sekarang semua ITP);
   builder memfilter soal per jenis. *(UI reorg Bank Soal penuh = Fase B.)*

## 9. Fase B (menyusul)
- Penataan ulang UI Bank Soal per jenis tes (tab/filter, pengelompokan).
- Menambah jenis tes ke-2 sungguhan (mis. TOEIC MCQ) end-to-end.
- Penanganan **Speaking/Writing non-MCQ** (rekam/berkas + rubrik manusia) — proyek tersendiri.
- Skema penilaian STANDAR resmi (TOEFL ITP 310–677, IELTS band) saat tabel terverifikasi.

## 10. Aturan repo
- Jangan `git commit`/`git push` — hak pemilik. Migrasi dijalankan pemilik.
- Komponen UI: pakai DS `frontend/src/components/ui/` (cek dulu; input non-native; penuh-lebar).
