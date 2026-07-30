# Security Hardening (F2) — Rencana & Temuan

Status: **mulai 2026-07-30, dikoding bertahap (review antar-sub-fase).** Pilar F2 dari `Foundation_and_Roadmap.md`.
Prinsip: least-privilege, defense-in-depth, jangan percaya klien, server-authoritative.

## Sub-fase
- **F2.a — Audit otorisasi endpoint** ✅ (lihat temuan) — pastikan tiap endpoint punya guard + ownership benar.
- **F2.b — Rate-limit & anti-brute-force** ✅ (butuh `pip install` + migrasi 018) — batasi login & endpoint sensitif; lockout per-akun.
- **F2.c — Upload aman** — batas ukuran, validasi tipe kuat (magic bytes), nama acak (sudah), tolak ekstensi berbahaya.
- **F2.d — Sanitasi anti-XSS** ✅ — **hasil: sudah aman by design.** `dangerouslySetInnerHTML`/`innerHTML` = **0**; tak ada lib markdown→HTML; `renderExamText`+`PassageView` render konten admin sbg **React text node (auto-escape)** → `<script>` jadi teks. `href` dinamis hanya di komponen DS navigasi/preview (bukan free-text). **Guard ditambahkan:** ESLint `react/no-danger: error` (`eslint.config.mjs`) → `dangerouslySetInnerHTML` masa depan gagal lint. Opsional (belum): validasi skema URL utk media yang di-*paste* (http(s) only) — bukan XSS (src img/audio tak eksekusi js), sekadar hygiene.
- **F2.e — RLS Supabase (Opsi A: tutup data API publik)** ✅ (butuh migrasi 019) — service-role-only.
  - **Temuan**: frontend tak pernah query data (`.from()`=0), semua via backend service-role; RLS aktif di semua tabel kecuali `audit_events`; TAPI policy lama beri `authenticated` akses langsung → **peserta bisa PATCH exam_attempts (score/status) / ubah jawaban pasca-submit via anon URL + token-nya**, bypass backend. Lubang curang + `audit_events` tanpa RLS.
  - **Prasyarat kode** (biar lockdown tak matikan login): `auth_service` baca `profiles` di `login` & `refresh_token` dipindah ke **admin (service-role)**; `change_password` & `get_current_user` sudah service-role. → tak ada jalur backend yang butuh RLS authenticated.
  - **Migrasi `019_rls_lockdown.sql`**: DO-block per tabel — ENABLE RLS + DROP semua policy + CREATE `service_role_all` + `REVOKE ALL FROM anon, authenticated`. Termasuk `audit_events`. Hasil: data API publik tertutup total; backend & auth tetap jalan.
- Lintas: CORS diperketat, security headers, secrets, error tak bocor detail.

## F2.a — Temuan audit otorisasi (2026-07-30)
Semua endpoint **sudah** punya guard (`require_admin`/`require_super_admin`/`get_current_user`). Ownership dicek di service.
- **exams**: ownership via `_assert_owner`/`_fetch_owned` ✅
- **questions/passages**: get/update/delete cek `created_by` (403 non-pemilik non-super) ✅
- **exam_attempts** (peserta): cek kepemilikan attempt + terdaftar sbg peserta ✅
- **users**: create sudah dibatasi di route (admin→peserta; super_admin-only utk super_admin) ✅; delete & change_role = super_admin-only ✅; reset_password admin→peserta ✅.
  - **GAP DIPERBAIKI**: `update_user` sebelumnya `_current_user` (tak dibatasi) → **admin bisa mengubah akun admin/super_admin**. Fix: `update_user(..., actor_role)` — admin hanya boleh ubah **peserta** (403 selain itu). Route kirim `current_user.role`.

### Keputusan (2026-07-30)
- **`test_types` → super_admin-only untuk mutasi** ✅ DITERAPKAN. create/update/delete kini `require_super_admin` (konfigurasi global tanpa ownership); **list tetap `require_admin`** (admin masih bisa membaca/memakai).
- **`scoring_schemes` → TIDAK diubah.** Ternyata sudah aman: skema **bawaan** tak bisa diubah/dihapus (403), admin hanya bisa mutasi skema **buatan sendiri** (ownership 403). Bukan config global murni → super_admin-only justru menghapus fitur sah. Biarkan.
- CORS → lihat checklist pra-domain di bawah.

## Catatan permukaan (untuk sub-fase berikут)
- **Rate-limit**: TIDAK ada (tak ada slowapi/lockout). Login rawan brute-force. → F2.b
- **Upload** (`routes/upload.py`): cek `content_type.startswith(audio/|image/)` (client-set, bisa dipalsukan), nama file uuid ✅, **tanpa batas ukuran** (DoS). → F2.c
- **XSS**: `renderExamText`/`PassageView` merender konten admin ke peserta — audit escaping. → F2.d
- **RLS**: backend `get_supabase_admin()` (service-role) → bypass RLS. → F2.e

## ✅ Checklist SEBELUM migrasi ke domain resmi (jangan lupa)
- [ ] **Perketat CORS**: hapus/persempit `allow_origin_regex=*.vercel.app`; whitelist origin domain resmi saja (mis. `https://cbt.learningnexus.co.id`). Disepakati 2026-07-30 (ditunda sampai domain final ada). File: `app/middleware/cors.py`.
- [ ] Review `settings.frontend_url` & origin production.
- [ ] Pastikan security headers (HSTS, dst.) aktif di edge/proxy domain resmi.
- [ ] **Cloudflare WAF + rate-limit di edge** (lapis volumetrik/DDoS) — melengkapi rate-limit app.
- [ ] **Set `RATE_LIMIT_STORAGE_URI=redis://…` (Upstash)** di env produksi bila backend multi-instance (dev pakai `memory://`).

## Aturan
- Jangan commit/push (hak user). Migrasi (RLS) dijalankan user.
