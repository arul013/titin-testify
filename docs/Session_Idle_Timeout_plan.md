# Session Idle Timeout (Rencana)

Status: **rencana, 2026-08-08.** Progres: **Tahap 1 (Server) SELESAI kode 2026-08-08** —
migrasi `033_auth_sessions.sql` **nunggu dijalankan user**; Tahap 2 (Client) & 3 (Ujian) belum.

Batasi sesi berdasarkan **ketidakaktifan**: bila tak ada
aktivitas selama **30 menit** (termasuk saat perangkat sleep / tab ditutup / kondisi lain),
sesi **berakhir** dan semua peran (peserta, admin, super_admin) **wajib login kembali**.

Keputusan (diskusi 2026-08-08):
- **Enforcement: client + server-side penuh.** Klien auto-logout saat idle; server juga
  **menolak** request bila sesi sudah idle > 30 mnt (menutup celah access-token sisa).
- **Sesi dijaga saat ujian aktif.** Selama attempt berjalan, klien terus heartbeat →
  peserta yang sedang membaca soal panjang TIDAK ter-logout. Walk-away ditangani timer +
  auto-submit ujian yang sudah ada (M7).
- **Modal peringatan 60 detik** dengan tombol "Tetap Masuk" sebelum logout.

## 0. Prinsip
- **Wall-clock, bukan timer.** Jangan andalkan `setTimeout(30m)` (ter-pause saat sleep).
  Simpan **timestamp aktivitas terakhir** (epoch ms) dan bandingkan `now - last` — tahan sleep,
  tab-close, dan "kondisi lain".
- **Cek ≠ refresh (server).** App punya polling latar (lonceng notifikasi ±45 dtk). Bila server
  me-refresh last-activity di SETIAP request, sesi tak pernah idle. Karena itu: **setiap request
  hanya MENGECEK**; **hanya heartbeat khusus yang me-REFRESH** (dipicu aktivitas nyata, di-throttle).
- **Per-sesi, bukan per-user.** Kunci pakai `session_id` dari JWT Supabase → logout di satu
  device tak mengganggu device lain.
- **Best-effort & aman gagal.** Kegagalan store aktivitas tak boleh menggagalkan alur; namun
  bila ragu (record basi) → tolak (fail-safe ke logout).

## 1. Konstanta
- `IDLE_LIMIT = 30 menit` (server: `session_idle_minutes=30`; klien: `30*60_000` ms).
- `WARN_BEFORE = 60 detik` (klien; munculkan modal saat sisa ≤ 60 dtk).
- `HEARTBEAT_THROTTLE ≈ 60 detik` (klien; maksimum 1 heartbeat / interval saat aktif).
- `ACTIVITY_THROTTLE ≈ 15–30 detik` (klien; update `last_activity` lokal).
- `CHECK_INTERVAL ≈ 5–10 detik` (klien; evaluasi sisa waktu).

## 2. Backend

### 2.1 Migrasi `033_auth_sessions.sql` (dijalankan user)
```
auth_sessions
  session_id    text PRIMARY KEY          -- klaim `session_id` dari JWT Supabase
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  last_activity timestamptz NOT NULL DEFAULT now()
  created_at    timestamptz NOT NULL DEFAULT now()
```
Index `auth_sessions(user_id)`. RLS lockdown service-role (konsisten 019/024/032).

### 2.2 `services/session_activity_service.py`
- `check(session_id) -> None`: baca record.
  - Tak ada → INSERT `last_activity=now` (grace; mis. sesi lama sebelum fitur ini) → lolos.
  - Ada & `now - last_activity > IDLE_LIMIT` → **raise 401** "Sesi berakhir karena tidak aktif.".
  - Ada & masih segar → lolos (TIDAK menulis).
- `touch(session_id, user_id) -> None`: UPSERT `last_activity=now` (refresh). Dipakai login & heartbeat.
- `end(session_id) -> None`: DELETE (dipakai logout). Best-effort.
- Semua best-effort terhadap error koneksi (log + jangan crash), KECUALI kondisi "basi" yang
  memang harus menolak.

### 2.3 Hook di `dependencies.py :: get_current_user`
Setelah JWT tervalidasi & `user_id` didapat: ambil `session_id = payload.get("session_id")`
(fallback: lewati bila token lama tanpa klaim ini). Panggil `SessionActivityService.check(session_id)`
SEBELUM/juga saat memuat profil. Bila basi → 401 (klien menangani → logout).
> Biaya: 1 lookup PK per request (wajar; app sudah beberapa query/among request).

### 2.4 Endpoint & wiring
- `POST /api/auth/heartbeat` (`get_current_user`) → `touch(session_id, user_id)` → `{ok:true}`.
  (Lolos `check` dulu; sesi yang sudah basi tak bisa "dihidupkan" oleh heartbeat → 401.)
- `login` (auth_service/route): setelah sukses, `touch` untuk inisialisasi record dengan `session_id`
  token yang baru. (session_id diperoleh dari token yang di-generate; bila tak praktis di service,
  record akan otomatis dibuat saat request ber-auth pertama via `check` — grace.)
- `logout`: `end(session_id)` agar record bersih (opsional; record juga akan basi sendiri).
- Config: `session_idle_minutes: int = 30` di `app/config.py`.

## 3. Frontend

### 3.1 `features/auth/useIdleTimeout.ts`
Dipasang di `AuthProvider` (aktif hanya bila ada `user`).
- Simpan `cbt_last_activity` (epoch ms) di localStorage. Update saat aktivitas
  (`mousemove/keydown/click/scroll/touchstart`), di-throttle `ACTIVITY_THROTTLE`.
- Kirim `POST /api/auth/heartbeat` di-throttle `HEARTBEAT_THROTTLE` saat aktif & saat regain-focus.
- Evaluator (interval `CHECK_INTERVAL` + `visibilitychange`/`focus`/`online` + `storage`):
  hitung `remaining = IDLE_LIMIT - (now - lastActivity)`.
  - `remaining <= 0` → panggil `logout()`.
  - `0 < remaining <= WARN_BEFORE` → tampilkan `SessionTimeoutModal` (hitung mundur).
  - else → sembunyikan modal.
- **Lintas-tab**: `storage` event pada `cbt_last_activity` → semua tab sinkron; aktivitas satu tab
  me-reset semua.
- Pola bebas lint react-compiler: efek hanya subscribe/cleanup; hindari setState sinkron di body
  (pakai callback event / interval).

### 3.2 `features/auth/SessionTimeoutModal.tsx`
Modal DS (size sm) + hitung-mundur `mm:ss` + tombol **"Tetap Masuk"** (reset `cbt_last_activity=now`
+ kirim heartbeat + sembunyikan modal) dan tombol **"Keluar"** (logout langsung). Tak bisa ditutup
via backdrop (biar tegas). Tak muncul saat mode ujian aktif.

### 3.3 Integrasi ujian (jaga sesi)
- `ExamRunner` menandai attempt aktif via flag localStorage `cbt_exam_active` (set saat mount/attempt
  berjalan, hapus saat submit/unmount).
- `useIdleTimeout`: bila `cbt_exam_active` truthy → anggap selalu aktif (auto-refresh `cbt_last_activity`
  + heartbeat berkala), TIDAK pernah warn/logout. Peserta benar-benar pergi → timer + auto-submit ujian
  (M7) yang menutup.

### 3.4 `lib/api.ts` — penanganan 401 idle
Pada respons `401` saat ada token tersimpan: bersihkan `cbt_access_token`/`cbt_user` + hard-redirect
`/login` (hindari loop bila sudah di `/login`). Ini menutup jalur enforcement server bila timer klien
belum sempat jalan. Tampilkan pesan singkat "Sesi berakhir, silakan masuk lagi." (query/toast).

## 4. Urut eksekusi
1. **Server:** ✅ **SELESAI (2026-08-08).** migrasi `033_auth_sessions.sql` + `session_activity_service.py`
   (`check`/`touch`/`end` + `extract_session_id`) + hook `check()` di `get_current_user` +
   `POST /api/auth/heartbeat` + `logout→end` + config `session_idle_minutes=30`. Import backend bersih
   (106 routes). **Migrasi 033 nunggu dijalankan user.**
2. **Client:** `useIdleTimeout` + `SessionTimeoutModal` + pasang di `AuthProvider` + handler 401 di `api`. *(belum)*
3. **Ujian:** flag `cbt_exam_active` di `ExamRunner` + penyesuaian idle-hook. *(belum)*
Tiap tahap: `tsc`+`eslint`+import backend bersih. Migrasi dijalankan **user**.

### Catatan implementasi Tahap 1
- `check(session_id, user_id)`: record belum ada → grace-create `now` (sesi lama tak langsung ditendang);
  basi → hapus record + **401** "Sesi berakhir karena tidak aktif."; segar → lolos tanpa tulis.
- `login` **tidak** meng-`touch` eksplisit — record dibuat via grace-create saat request ber-auth pertama
  (mis. `/api/auth/me` tepat setelah login). `logout` memanggil `end()`.
- `heartbeat` dijaga `get_current_user` dulu → sesi basi tetap 401 (tak bisa dihidupkan).
- `extract_session_id` membaca klaim `session_id` tanpa verifikasi (token sudah tervalidasi di pemanggil).

## 5. Edge & catatan
- **Sesi lama (sebelum fitur):** `check` membuat record `now` saat request pertama → grace, tak
  langsung menendang.
- **Beberapa tab:** aman via `storage` + timestamp bersama.
- **Multi-instance backend:** aman karena state di DB (bukan memori proses).
- **Jam klien dimundurkan:** enforcement server tetap berjalan (pakai `now()` server) → tetap aman.
- **Peringatan saat ujian:** dinonaktifkan (flag `cbt_exam_active`).
- **Tidak mengubah** TTL token Supabase; kita menambah lapisan idle di atasnya.
