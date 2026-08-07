# Dashboard Admin & Super Admin (Rencana)

Status: **rencana, 2026-08-06.** Mengganti `DashboardPage` (route `/dashboard`) yang sekarang **hardcode** (angka 0/-, pengumuman statis, gaya peserta) dengan dashboard **role-aware** berbasis data nyata dari semua fitur yang sudah dibangun (M2–M8, F1). Peserta punya `/beranda` terpisah (tak diubah).

## 0. Prinsip
- **Role-aware & server-scoped.** Admin melihat **data miliknya** (`created_by = self`); Super Admin melihat **seluruh sistem** + blok khusus (pengguna, audit). Scoping ditentukan **server** (jangan percaya klien).
- **Action-first.** Yang paling atas = yang perlu ditindak (menunggu penilaian, jadwal, pelanggaran integritas).
- **Satu endpoint** `GET /api/dashboard/summary` (role-aware) → satu render bercabang di frontend.

## 1. Backend — `GET /api/dashboard/summary`
`require_admin`. Service `dashboard_service.py`. Untuk admin: filter `created_by`; super_admin: tanpa filter (semua) + isi blok `users`/`audit`.

Bentuk respons (`DashboardSummary`):
```
exams:        { total, published, draft, closed, archived }
questions:    { total, published }         # Bank Soal (soal)
passages_total
participants_total                         # peserta unik pada ujian (scope)
groups_total                               # grup/kelas peserta
pending_grading                            # attempt submitted & grading_status=pending
flagged_attempts                           # attempt violation_count > 0
active_exams: [ { exam_id, title, participants, submitted, avg_score } ]  # ujian Tayang teratas
# Super Admin saja (null utk admin):
users:        { total, admins, participants, active, inactive } | null
audit_recent: [ { actor_name, action, summary, created_at } ] | null
```

Agregasi (anti-N+1, hitung via query/COUNT bukan loop Python bila memungkinkan):
- exams by status → 1 query (scope) tally.
- questions/passages → COUNT (scope).
- participants_total → distinct user pada exam_participants untuk exam scope.
- groups_total → COUNT participant_groups (scope, belum-dihapus).
- pending_grading, flagged_attempts → COUNT exam_attempts (join exam scope).
- active_exams → ambil ≤5 ujian published (scope) + jumlah submitted + rata-rata.
- users (super) → COUNT profiles group by role + is_active.
- audit_recent (super) → 10 baris audit_events terbaru.

## 2. Frontend — `DashboardPage` (bercabang role)
Header sapaan + badge role (sudah ada). Ganti isi:

### Admin (cakupan sendiri)
- **Kartu statistik**: Ujian (total·Tayang·Draf) · Bank Soal (soal·Tayang) · Peserta & Grup · **⏳ Menunggu Penilaian**.
- **Perlu Tindakan**: N menunggu penilaian → Penilaian; ujian akan dibuka/ditutup → Manajemen Ujian; N attempt pelanggaran integritas → Hasil.
- **Ujian aktif terkini**: daftar ujian Tayang + jumlah mengerjakan + rata-rata + "Lihat Hasil".
- **Aksi cepat**: Buat Ujian · Tambah Soal · Kelola Grup.

### Super Admin (cakupan sistem) — SEMUA di atas (agregat sistem) PLUS
- **Pengguna**: total Admin/Peserta, aktif/nonaktif → Manajemen User.
- **Aktivitas Sistem (Audit)**: log terbaru (aktor · aksi · ringkasan · waktu).
- (opsional) rincian per jenis tes / per admin.

Perbedaan inti: cakupan data (sendiri vs sistem) + Super Admin dapat blok **Pengguna** & **Audit**.

## 3. Urutan build — ✅ SELESAI (2026-08-07, tanpa migrasi)
1. **Docs** (ini). ✅
2. **Admin** ✅ — `GET /api/dashboard/summary` (`dashboard_service`, role-aware) + `DashboardPage` dibangun ulang: kartu statistik (Ujian/Bank Soal/Peserta&Grup/Menunggu Penilaian), Ujian Aktif, Perlu Tindakan (grading + flagged), Aksi Cepat.
3. **Super Admin** ✅ — endpoint mengisi `users` + `audit_recent`; `DashboardPage` menambah kartu **Pengguna** (total/admin/peserta/aktif) + **Aktivitas Sistem** (timeline audit) hanya bila super_admin.

Backend: `models/dashboard.py`, `services/dashboard_service.py`, `routes/dashboard.py` (didaftar di main.py). Frontend: `features/dashboard/useDashboard.ts` + `DashboardPage.tsx`. tsc+eslint+import bersih.
