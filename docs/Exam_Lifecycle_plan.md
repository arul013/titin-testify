# Siklus Hidup & Guard Edit Ujian (Milestone M1)

Status: **disepakati 2026-07-28, dikoding bertahap (review antar-langkah).** Belum mulai koding.
Terkait: `Peserta_Portal_plan.md`, `Exam_Engine_Phase4_plan.md`.

## Latar (bug yang ditemukan)
- Status ujian cuma `draft`/`published` → ujian tak pernah "terkunci".
- `update_exam` **tanpa guard** → admin bisa "Kelola" ujian yang sudah dikerjakan & ubah waktu diam-diam → ujian terbuka lagi.
- Timer attempt = `started_at + duration`, **tak dibatasi `ends_at`** → ubah `ends_at` bikin perilaku aneh; peserta bisa kehilangan akses lanjut.
- Tak ada auto-submit/expire (attempt `in_progress` menggantung selamanya).
- Tak ada visibilitas admin atas progres peserta.

## Keputusan (2026-07-28)
1. **Model = satu-run + Duplikat.** Ujian yang sudah punya percobaan tak boleh dibuka-ulang diam-diam; untuk jalankan lagi → **Duplikat** jadi ujian baru. Perpanjang waktu = aksi **eksplisit** ber-guard.
2. **`ends_at` = dinding keras.** `deadline = min(started_at + duration, ends_at)`.
3. **Saat ada percobaan, admin hanya boleh:** perpanjang `ends_at` + tambah peserta (+ judul/deskripsi). Sisanya **terkunci** (komposisi/pool/soal/durasi/starts_at/exam_mode/scoring/allow_retake/hapus-peserta).
4. **Mulai dari M1 (lifecycle + guard edit).**

### Penyempurnaan yang dipakai
- **Dasar penguncian = ADA percobaan** (bukan semata `ends_at` lewat). Sebab: yang perlu dilindungi adalah ujian yang sudah dikerjakan. Ujian tanpa percobaan yang `ends_at`-nya lewat tetap boleh diedit/republish (tak ada yang dirugikan). Auto-close saat `ends_at` lewat = urusan job expire (milestone terpisah).
- `is_locked(exam)` = `status ∈ {closed, archived}` **OR** `has_attempts`.

## Desain
### Status
`ExamStatus` (khusus exam, TIDAK memakai `ContentStatus` milik soal): `draft` → `published` → `closed` → `archived`. Kolom `status` (text) tetap; migrasi data tak perlu.
- **draft**: bebas edit + re-freeze saat publish.
- **published, belum ada percobaan**: masih bebas edit (re-freeze saat republish) — perilaku sekarang.
- **published, ada percobaan**: **edit terbatas** (perpanjang `ends_at` + tambah peserta + judul/deskripsi). Aksi eksplisit + konfirmasi.
- **closed**: read-only (hanya arsip/duplikat). Manual "Tutup" atau via job saat `ends_at` lewat (nanti).
- **archived**: tersembunyi dari daftar aktif; bisa un-arsip/duplikat/hapus.

### Guard `update_exam` (backend)
- Deteksi `has_attempts` (count `exam_attempts`).
- `closed/archived` → tolak semua edit konten (400) kecuali transisi status resmi.
- `published + has_attempts` → whitelist field: `ends_at` (hanya **memperpanjang**: `new >= now` & `new >= ends_at` lama), `participant_ids` (hanya **union/tambah**, tak boleh hapus), `title`, `description`, `show_review`. Field lain diubah → 400 dengan pesan jelas.
- `ends_at` clamp di `start_attempt` (dan submit): `deadline = min(started+duration, ends_at)`.

### Endpoint baru
- `POST /api/exams/{id}/close` → set `closed` (guard: owner, status=published).
- `POST /api/exams/{id}/archive` & `/unarchive`.
- `POST /api/exams/{id}/duplicate` → clone jadi draft baru (copy sections/pool_units/participants/scalar; reset status=draft, tanpa snapshot/percobaan, jadwal dikosongkan/di-carry sesuai pilihan).

### Frontend
- Badge status (Draf/Tayang/Selesai/Arsip) di daftar & detail.
- "Kelola" pada ujian ber-percobaan → **mode terbatas**: hanya step Jadwal (perpanjang) + Peserta (tambah) yang aktif; lainnya read-only + notice. Ujian `closed`/`archived` → tak bisa "Kelola".
- Aksi **Duplikat**, **Tutup**, **Arsipkan** (+ `ConfirmDialog`).
- Dialog konfirmasi untuk perubahan jadwal sensitif.

## Sub-langkah (review antar-langkah)
1. **M1.0 — Backend**: `ExamStatus`; guard `update_exam`; clamp `ends_at` di attempt; endpoint close/archive/unarchive/duplicate.
2. **M1.1 — Frontend**: badge status + gating "Kelola" (mode terbatas) + aksi Duplikat/Tutup/Arsip + konfirmasi.

## Berikutnya (setelah M1, urutan menyusul)
- **M2 — Monitoring peserta** (#3): endpoint + panel progres (belum mulai/sedang/selesai, skor, sisa waktu, ringkasan) + analitik per-soal.
- **M3 — Auto-submit/expire job** (cron finalisasi attempt kedaluwarsa; auto-close saat `ends_at` lewat).
- Lalu: notifikasi, layar pra-ujian, anti-cheat (acak urutan soal/opsi per-peserta, deteksi pindah-tab).

## Aturan repo
- Jangan `git commit`/`git push` (hak user). Migrasi dijalankan user.
- Pakai komponen DS; komponen baru minta izin.
