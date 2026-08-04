# Learning Nexus CBT — Fondasi & Peta Jalan (Master)

Status: **rencana induk, 2026-07-28 — progres di-update 2026-08-01.** Menyatukan semua rencana: `Exam_Lifecycle_plan.md`, `Peserta_Portal_plan.md`, `Exam_Engine_Phase4_plan.md`, `Exam_Scoring_TOEFL_ITP.md`, `Exam_Test_Types_plan.md`, `Manual_Grading_F1.2_plan.md`, `Scale_Scoring_F1.4_plan.md`.

**Sudah dibangun di luar tabel F/M (fondasi peserta):** jenis tes multi (ITP/iBT/IELTS/TOEIC/Custom), Bank Soal, perakit ujian (Exam Builder), **mesin ujian peserta P4** (snapshot@publish, runner, autosave, timer, skor), **portal peserta P5** (Dashboard/Ujian Saya/Riwayat/Hasil+Pembahasan), Skema Penilaian. Ini basis untuk M2/M7/M8.

## 0. Tujuan & Prinsip
Membangun fondasi yang **solid, scalable, aman, mudah diaudit, dan profesional**, sehingga penambahan **jenis tes baru (IELTS, TOEFL iBT, TOEIC, kustom)** dan fitur lanjutan **tidak menuntut rombak fondasi/DB**. Data masih sedikit → ini momen tepat untuk migrasi & refactor fondasi (boleh panjang, boleh tambah kolom/tabel).

Prinsip:
- **Snapshot-at-publish** (sudah): ujian dibekukan, kunci tak bocor. Pertahankan & perluas.
- **Server-authoritative** untuk timer/skor/otorisasi. Klien tak dipercaya.
- **Auditable by design**: setiap aksi sensitif tercatat (siapa, kapan, sebelum→sesudah).
- **Extensible by data, not by rewrite**: perbedaan antar jenis tes diakomodasi lewat *data/konfigurasi*, bukan cabang kode/relasi baru tiap kali.
- **Least privilege & defense-in-depth** untuk keamanan.

---

## 1. Pilar Fondasi (lintas-fitur — dikerjakan lebih awal / paralel)

### F1 — Model Soal & Ujian yang Ekstensibel (kunci untuk IELTS/iBT)
Masalah sekarang: model soal mengasumsikan **pilihan ganda** (`option_a..d`, `correct_answer`). IELTS/iBT butuh **Writing/Speaking** (esai, rekaman audio), matching, ordering, fill-in, short answer → tak muat.
- **`question_type`** enum: `mcq_single`, `mcq_multi`, `true_false_ng`, `fill_blank`, `matching`, `ordering`, `short_answer`, `essay`, `speaking_audio`, … (extensible).
- **Konten & kunci fleksibel**: kolom umum tetap + **`content_json` / `answer_json` (JSONB)** untuk data spesifik-tipe (opsi dinamis, pasangan matching, rubrik, contoh jawaban). Revisi keputusan lama [[question-model-architecture]] yang menunda JSONB.
- **`scoring_type`**: `auto_key` (MCQ), `manual_rubric` (esai/speaking), `ai_assisted` (opsional nanti). Tabel **rubrics** + kriteria.
- **Skala nilai per jenis tes**: generalisasi tabel konversi (TOEFL ITP sudah ada) → mapping band IELTS 0–9, iBT 0–120, dsb. via konfigurasi `test_types`/`scoring_schemes`.
- **Timing per-section** (TOEFL/IELTS punya batas per-bagian, bukan hanya total): `exam_sections.time_limit_minutes` (opsional) + engine per-section.
- **Media jawaban**: `attempt_answers` mampu simpan teks panjang & `answer_audio_url` (R2). 
- **Alur penilaian manual**: antrean grading + peran **grader/rater**.

### F2 — Keamanan (Security Hardening)
- **Model otorisasi tertulis & konsisten**: audit semua endpoint (ownership `_assert_owner`, `require_admin`, scoping super_admin vs admin).
- **RLS Supabase sebagai defense-in-depth**: backend pakai service-role (bypass RLS) → tambah kebijakan RLS agar akses langsung/anon tetap aman. Minimal: peserta hanya lihat data miliknya; kunci/pembahasan tak pernah terekspos sebelum syarat terpenuhi.
- **AuthN**: kebijakan password, rotasi refresh-token + revocation, lockout brute-force + rate-limit login (audit fitur security yang sudah ada).
- **Rate limiting** global (per-IP/per-user) untuk endpoint sensitif (login, start, submit).
- **Upload aman** (audio/gambar ke R2): validasi content-type & ukuran, signed URL, nama file acak, tak percaya ekstensi.
- **Sanitasi input & anti-XSS**: konten rich-text (passage/pembahasan) dirender aman (`renderExamText` di-audit); escape output.
- **Rahasia & transport**: env/secrets, HTTPS, CORS ketat, header keamanan.
- **Integritas ujian**: timer server, no-leak kunci (sudah). ~~Acak urutan soal/opsi per-peserta~~ — **DICORET (keputusan 2026-08-01)**: tak sesuai tes terstandar (urutan Reading/Listening/Structure bermakna; acak justru merusak logika), manfaat tipis vs kompleksitas snapshot-per-peserta. Anti-cheat difokuskan ke jalur perilaku (M8) + variasi via **pool soal per-peserta**. Bila kelak ada ujian MCQ serempak tatap-muka soal identik, cukup tambah opsi **acak pilihan A–D** per-ujian (bukan urutan soal).
- **PII & retensi**: klasifikasi data pribadi, kebijakan retensi/hapus.

### F3 — Auditability & Integritas Data
- **`audit_events`** (append-only): `actor_id, action, entity_type, entity_id, before_json, after_json, ip, user_agent, created_at`. Immutable (tak boleh update/delete).
- **Jejak aktor**: `created_by/updated_by/updated_at` konsisten di semua tabel penting; **riwayat transisi status** ujian.
- **Soft-delete** (bukan hard-delete) untuk exam/attempt/soal yang pernah dipakai — data historis tak hilang; `deleted_at`.
- **Optimistic concurrency** pada edit ujian (kolom `version` / cek `updated_at`) → cegah dua admin saling menimpa.
- **Idempotency** untuk aksi kritikal (submit, start) — cegah dobel.

### F4 — Skalabilitas & Kualitas Teknis
- **Bereskan N+1 query** (mis. `_units_for_section` query per-passage/soal dalam loop → batch/`in_`). Penting saat data besar.
- **Index & pagination** menyeluruh; hitung agregat via query, bukan Python loop.
- **Infra background job** (cron/queue) untuk: expire/auto-submit, grading, notifikasi, ekspor. (Dasar untuk M3/M6.)
- **Observability**: structured logging + request-id, error tracking, metrik dasar.
- **Disiplin migrasi**: file migrasi bernomor, reversible, dijalankan user.

---

## 2. Peta Jalan Milestone (fungsional)

**Progres terkini (update 2026-08-01; semua kode belum di-commit oleh AI — user commit sendiri):**
- **F3 (auditability)** ✅ infra — `audit_events` append-only, soft-delete, optimistic concurrency (migrasi 016). *Catatan: emit audit di setiap aksi mutasi masih tumbuh seiring fitur (M1 sudah emit).*
- **M1 (lifecycle + guard edit)** ✅ — status closed/archived, guard `update_exam`, clamp `ends_at`, close/archive/duplicate, mode Kelola-terbatas (migrasi 017).
- **F2 (security)** ✅ sprint — authz audit, rate-limit+lockout, upload aman, anti-XSS, **RLS lockdown** (migrasi 018,019). Sisa = task pra-domain (CORS ketat, Cloudflare WAF, `RATE_LIMIT_STORAGE_URI=redis`). Lihat `Security_Hardening_plan.md`.
- **F1 (model soal ekstensibel)** ✅ inti — lihat rincian sub-fase di bawah. Ini juga **merealisasikan M9** (tipe non-MCQ + grading).
  - **F1.0** skema (`question_type`+`content_json`/`answer_json`+`scoring_mode`+`rubric_id`+`max_score`, tabel `rubrics`) ✅ (migrasi 020).
  - **F1.1** 6 tipe auto-scored (mcq_single/multi, true_false_ng, fill_blank, short_answer, matching, ordering) — builder+runner+skor ✅.
  - **F1.2** grading manual: rubrik CRUD + tipe `essay` + antrean/UI penilai + skor poin `Σawarded/Σmax` + gating "Menunggu Penilaian" ✅. Doc `Manual_Grading_F1.2_plan.md`.
  - **F1.3** speaking (jawaban audio) ⏸️ **DITUNDA** — blocker sertifikat R2.
  - **F1.4a** skala/band per jenis tes — **fondasi/seam ✅** (`resolve_scale` + registry tabel `scoring_tables/`); logika band IELTS/iBT ⏸️ **DITUNDA** (nunggu tabel konversi + jenis tes aktif). Doc `Scale_Scoring_F1.4_plan.md`.
  - **F1.4b** timing per-bagian (opt-in, kunci berurutan gaya iBT: authoring + backend otoritatif + runner) ✅ (migrasi 021).
- **F4 (skalabilitas)** ✅ **INTI SELESAI** (2026-08-01): **N+1 diberesi** — `list_exams`/`_build_summaries` (3N→3 query batch), `_units_for_section` (freeze: per-pid loop → batch `in_()`), `submit_attempt` (N UPDATE → 1 upsert); **index** kolom hot (migrasi 022, FK join/filter); pagination list utama sudah ada; **observability** — `middleware/observability.py` (request-id via ContextVar + honor `X-Request-ID`, access log terstruktur, lib chatty diredam); **background job (endpoint internal + cron eksternal)** — `POST /api/internal/jobs/expire-attempts` (dijaga `INTERNAL_JOB_SECRET`, `secrets.compare_digest`) → `expire_stale_attempts` finalisasi attempt `in_progress` yang deadline-nya lewat (reuse submit). **Sisa (opsional/nanti):** jadwalkan cron (task deploy), job notif/export, paginasi roster peserta.

| Milestone | Isi | Bergantung | Status |
|---|---|---|---|
| **M2** | **Monitoring peserta + analitik** (hasil per peserta; ringkasan; statistik per-soal: p-value & daya beda; ekspor). | — | ✅ **SELESAI** (2026-08-04): M2.1 hasil admin (daftar+drill-down review, authz pemilik+super_admin, audit) + M2.2 analitik (distribusi skor, item-analysis p-value/daya-beda, flag soal) + ekspor CSV. Endpoint `/api/admin/exams/{id}/results|analytics|results.csv`, `/api/admin/attempts/{id}/review`. Review pakai tab per-section + filter salah/kosong + navigator. PDF = cetak browser. |
| **F1** | **Model soal ekstensibel** — fondasi IELTS/iBT. | — | ✅ **inti selesai** (F1.3 + band F1.4a ditunda) |
| **F4** | **Skalabilitas**: N+1, pagination, background job, observability. | — | ✅ inti selesai (jobs/obs/N+1/index ✅; notif/export job nanti) |
| **M3** | **Auto-submit/expire job** (finalisasi attempt kedaluwarsa; auto-close saat `ends_at` lewat) + infra job (F4). | F4 | 🟡 **endpoint siap** (`/api/internal/jobs/expire-attempts`); tinggal **jadwalkan cron** (deploy) |
| **M4** | **Duplikat & template ujian**; tandai soal **"dipakai di N ujian"** (cegah/peringatan edit soal live). | — | ✅ **SELESAI** (2026-08-04, migrasi 023 nunggu user): (A) guard hapus soal/materi **409** bila dipakai ujian + badge "Dipakai di N ujian" di Bank Soal (`used_in_exams`, batch anti-N+1; `delete_passage` cek soal anak yg ikut CASCADE). (B) template ujian — `exams.is_template` (mig. 023), `_clone_exam` seam, `save_as_template`/`create_from_template`, route `save-as-template`/`use-template` + `GET /api/exams?templates=true` (audit `exam.template.create`/`exam.from_template`); UI: menu "Jadikan Template" + toolbar "Dari Template" → `TemplatePickerModal`. Duplikat sudah dari M1. |
| **M5** | **Manajemen peserta**: assign per **grup/kelas** (cohort), **perpanjangan waktu per-peserta** (akomodasi), re-invite. | — | 🟡 **M5.1 grup SELESAI** (2026-08-04, migrasi 024 nunggu user): tabel `participant_groups`+`participant_group_members` (RLS lockdown), CRUD `/api/participant-groups` (+audit), UI `GroupManagerModal` di StepParticipants (buat dari pilihan / Gunakan→tambah ke pilihan / perbarui-ke-pilihan / hapus). **M5.2** akomodasi & **M5.3** re-invite menyusul. **Keputusan (2026-08-04): akomodasi M5.2 menggeser `ends_at` +extra_minutes utk peserta ybs** (bukan dinding keras). |
| **M6** | **Notifikasi** (ujian ditugaskan / akan dibuka / pengingat) — in-app + email. | F4 (job) | rencana |
| **M7** | **Layar pra-ujian** (instruksi, durasi, jumlah soal, **pakta integritas**) + **ketahanan koneksi** (indikator tersimpan, auto-resume) + **aksesibilitas** (ukuran font/kontras). | — | rencana |
| **M8** | **Anti-cheat**: deteksi pindah-tab/blur, fullscreen lock, cegah copy-paste, satu-sesi-aktif, log ke `audit_events`, (opsional) proctoring. (Acak urutan soal/opsi per-peserta DICORET 2026-08-01 — lihat §Security.) | F1, F2 | rencana |
| **M9** | **Tipe soal non-MCQ + alur grading** (IELTS Writing/Speaking, matching, dst.). | F1 | ✅ **sebagian besar** via F1.1+F1.2 (sisa: speaking F1.3) |

Urutan default: **M1 → (F3/F4 secukupnya) → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9**. F1/F2 sudah disuntik sebagai sprint fondasi. **Selesai s/d M4** (M3 tinggal jadwalkan cron di deploy). **Kandidat berikutnya: M5 (manajemen peserta: grup/perpanjangan/re-invite) atau M8 (anti-cheat perilaku).**

---

## 3. Peta Saran → Rencana (semua kini tercakup)
1. Lifecycle + **audit log** → **M1 + F3**. ✅ (audit log ditambahkan sbg F3)
2. Auto-submit/expire job → **M3** (+ infra F4).
3. Monitoring peserta + analitik + ekspor → **M2**.
4. Duplikat/template + "dipakai di N ujian" → **M4** (duplicate juga sebagian di M1).
5. Manajemen peserta (grup, perpanjangan per-peserta, re-invite) → **M5**.
6. Notifikasi → **M6**.
7. Layar pra-ujian + ketahanan koneksi + aksesibilitas → **M7**.
8. Ketahanan/timer server-authoritative → sudah ada, dipertegas di **M3/M7**.
- **Tambahan penting yang belum masuk list-mu tapi krusial**: F1 (model soal ekstensibel utk IELTS), F2 (security/RLS/rate-limit/upload), F3 (audit log/soft-delete/concurrency), F4 (N+1/observability/jobs).

---

## 4. Keputusan Fondasi (DIPUTUSKAN 2026-07-28)
1. **F1 model soal ekstensibel = SEKARANG (fondasi dulu)** — dibangun lebih awal agar IELTS/iBT tak menuntut rombak.
2. **Security/audit (F2/F3) = PENUH sebagai sprint** — RLS + `audit_events` + soft-delete + rate-limit + optimistic concurrency.
3. **Langkah pertama = Audit-log (F3) BARENGAN M1** — bangun `audit_events` + soft-delete dulu, lalu M1 langsung emit audit + guard.

### Urutan konkret (review antar-langkah)
- **F3.0** — Migrasi `015_foundation_audit.sql`: tabel `audit_events` (append-only) + `deleted_at` (exams/questions/question_passages) + `version` (exams) + `updated_by`. Service `audit_service.py`. *(user jalankan migrasi)*
- **F3.1** — Soft-delete di-wire (delete → `deleted_at`; query filter `deleted_at IS NULL`) + cek optimistic concurrency saat update exam.
- **M1.0** — `ExamStatus` (draft→published→closed→archived) + guard `update_exam` + clamp `ends_at` + endpoint close/archive/unarchive/duplicate — **emit audit events**.
- **M1.1** — Frontend: badge status + "Kelola" mode-terbatas + aksi Duplikat/Tutup/Arsip + konfirmasi.
- **F2** — Sprint keamanan: RLS defense-in-depth, rate-limit/lockout, rotasi token, upload aman, anti-XSS.
- **F1** — Sprint model soal ekstensibel (migrasi besar: `question_type`, `content_json`/`answer_json`, `scoring_type`, rubrics, band per jenis tes, timing per-section, media jawaban) + builder/engine/grader.
- **F4 + M2..M9** — sesuai §2 (N+1/observability/jobs disisipkan bersama M2/M3).

## 5. Aturan repo
- Jangan `git commit`/`git push` (hak user). Migrasi DB dijalankan user; tiap perubahan skema = file migrasi bernomor + reversible.
- Pakai komponen DS; komponen baru minta izin.
- Kunci/pembahasan tak pernah bocor sebelum syarat terpenuhi.
