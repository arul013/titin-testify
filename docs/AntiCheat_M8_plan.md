# M8 — Anti-Cheat Perilaku (Rencana & Diskusi)

Status: **DISKUSI / rencana — 2026-08-05.** Bagian dari [Foundation_and_Roadmap](Foundation_and_Roadmap.md) milestone **M8**. Bergantung pada F1 (model) & F2 (security, RLS lockdown, audit).

> Keputusan lama (2026-08-01): **acak urutan soal/opsi per-peserta DICORET**. Anti-cheat difokuskan ke **jalur perilaku** (dokumen ini) + variasi via pool soal per-peserta.

---

## 0. Tujuan & Batasan

**Tujuan.** Mengurangi kecurangan yang mudah (pindah tab untuk mencari jawaban, menyalin soal keluar, menempel jawaban siap, mengerjakan paralel di banyak perangkat) dan **meninggalkan jejak audit** yang bisa ditinjau admin.

**Batasan (harus jujur).** Tidak ada anti-cheat berbasis browser yang 100% — peserta selalu bisa memakai **perangkat kedua** (HP) untuk mencari jawaban. M8 bersifat **deteren + bukti**, **bukan** pengganti pengawasan manusia/proctoring. Karena itu:

- **Server otoritatif.** Klien hanya *mendeteksi & melapor*; keputusan penting (auto-submit, kunci sesi) diputuskan server. Data klien tak dipercaya, tapi tetap dicatat sebagai sinyal.
- **Transparan ke peserta.** Peserta diberi tahu langkah anti-cheat yang aktif (di layar pra-ujian M7.1) — adil & mengurangi sengketa.
- **Per-ujian dapat dikonfigurasi.** Tidak semua ujian butuh fullscreen/blokir copy (mis. latihan santai). Admin memilih tingkat ketat.

---

## 1. Komponen

### 1.1 Konfigurasi per-ujian (`exams.anti_cheat` JSONB)
Admin memilih di Exam Builder. Contoh bentuk:
```json
{
  "track_focus": true,          // catat pindah-tab/blur
  "on_focus_loss": "warn",      // "warn" | "submit" — aksi saat blur/pindah (lihat 1.7)
  "focus_strikes": 1,           // jumlah pelanggaran sebelum aksi "submit" (redam false-positive)
  "require_fullscreen": false,  // paksa fullscreen + deteksi keluar
  "block_copy_paste": true,     // blokir copy/cut/paste/klik-kanan
  "detect_multi_screen": false, // deteksi layar ganda saat mulai (Window Management API, perlu izin)
  "single_session": false,      // satu sesi aktif (M8.2)
  "max_violations": 0,          // 0 = tak ada ambang global (soft); >0 = ambang (M8.3)
  "camera_capture": { "enabled": false, "interval_sec": 60 } // proctoring-lite (M8.4)
}
```
JSONB dipilih agar fleksibel menambah aturan tanpa migrasi kolom tiap kali. Default: semua `false`/`warn`/`0` (opt-in) — perilaku lama tak berubah kecuali admin mengaktifkan.

### 1.2 Deteksi klien (runner)
Berjalan di `ExamRunner` bila attempt punya `anti_cheat` aktif:
- **Fokus/tab** (`track_focus`): `document.visibilitychange` + `window.blur/focus` → event `focus_lost` (dengan durasi saat kembali). Peringatan ke peserta.
- **Fullscreen** (`require_fullscreen`): `element.requestFullscreen()` saat mulai; `fullscreenchange` mendeteksi keluar → banner "Kembali ke layar penuh" + tombol masuk lagi; event `fullscreen_exit`.
- **Copy/paste** (`block_copy_paste`): cegah `copy`/`cut`/`paste`/`contextmenu` (preventDefault) → event `copy_blocked`/`paste_blocked`. **Seleksi teks TETAP diizinkan** (agar bisa membaca soal panjang) — hanya penyalinan/tempel yang diblok.
- Semua event dikirim ke server **batch & best-effort** (tak menggagalkan ujian bila gagal kirim).

### 1.3 Penyimpanan event (`attempt_events`) — tabel BARU
Beda sifat dari `audit_events` (yang untuk aksi admin, low-volume): event perilaku **high-volume, aktor peserta, per-attempt**. Tabel sendiri lebih bersih & mudah di-query per attempt.
```sql
attempt_events (
  id, attempt_id -> exam_attempts, user_id -> profiles,
  type,        -- focus_lost | fullscreen_exit | copy_blocked | paste_blocked | ...
  detail JSONB,-- mis. {"away_ms": 4200}
  created_at
)  -- RLS lockdown service-role; index (attempt_id, created_at)
```
Plus agregat cepat: `exam_attempts.violation_count INTEGER DEFAULT 0` (di-increment saat lapor) untuk badge & ambang tanpa COUNT tiap render.

### 1.4 Satu sesi aktif (`single_session`) — M8.2
- Kolom `exam_attempts.session_token`. `start()` menghasilkan token baru & mengembalikannya ke klien.
- Endpoint **heartbeat** ringan (mis. tiap 15–30 dtk) mengirim token; bila token server ≠ token klien (attempt dibuka di tab/perangkat lain yang meng-*claim* token baru) → klien lama **dikunci** ("Ujian dibuka di tempat lain").
- Lebih kompleks (butuh heartbeat + UX lockout) → **fase terpisah**.

### 1.5 Keputusan / enforcement
- **Default SOFT**: log + peringatan peserta + laporan admin. Tidak mengubah nilai/menutup ujian.
- **Opsional (M8.3)**: `max_violations > 0` → server menandai attempt **flagged** dan/atau **auto-submit** saat ambang terlampaui. Semua tetap tercatat.

### 1.7 Auto-submit saat pindah/blur & kasus dua layar (pertimbangan)

**Auto-submit saat blur/pindah tab — bisa, tapi hati-hati:**
- Teknisnya klien tinggal memanggil `submit` saat `visibilitychange`/`blur`. Server tetap yang mengeksekusi (aksi submit sah).
- **"Pakai AI" tak bisa dideteksi langsung** — browser tak melihat isi window/aplikasi/perangkat lain. Kita hanya tahu **tab ujian kehilangan fokus**; "pakai AI" adalah **kesimpulan** dari meninggalkan ujian.
- **False-positive tinggi** bila auto-submit di blur pertama (notifikasi OS, alt-tab tak sengaja, dialog, screen reader, HP berdering). → gunakan `on_focus_loss: "submit"` + `focus_strikes`/tenggang, dan **umumkan jelas** di layar pra-ujian.

**Kasus 1 komputer 2 layar (mouse ke layar sebelah):**
- Browser **tidak bisa** melacak posisi kursor antar-monitor / jumlah monitor tanpa izin.
- **Terdeteksi**: (a) **klik/interaksi** di layar kedua → jendela ujian kehilangan fokus (`blur`/`visibilitychange`); (b) `mouseleave` dari jendela (sinyal lemah); (c) **Window Management API** `getScreenDetails()` (perlu izin) untuk mendeteksi **ada layar ganda saat mulai** → peringatkan/menolak. **Fullscreen** memperkuat: interaksi layar lain menjatuhkan fokus/fullscreen.
- **Tak terdeteksi**: sekadar **melirik** layar kedua tanpa mengklik; dan **perangkat kedua (HP)** — apa pun konfigurasinya.
- Kesimpulan: interaksi bisa ditangkap; pengawasan penuh butuh **proctoring kamera** (ditunda). M8 tetap deteren + bukti.

### 1.8 Kamera — capture berkala ("proctoring-lite") — M8.4

Bukan rekam video: **ambil foto peserta secara berkala** (mis. tiap 60 dtk) sebagai deteren + bukti. Preview LIVE ditampilkan agar peserta merasa dipantau (efek psikologis nyata karena memang sedang on-camera & gambarnya diambil).

**Config per-ujian** (bagian dari `exams.anti_cheat`):
```json
"camera_capture": { "enabled": false, "interval_sec": 60 }
```

**UI peserta (runner):**
- Kotak **preview LIVE** kecil (mis. pojok) dari `getUserMedia({ video })` + indikator titik merah + label.
- **Wajib aktif**: ujian tak bisa dimulai sebelum izin kamera diberikan & stream jalan (dicek di layar pra-ujian M7.1). Bila kamera dimatikan/di-*revoke* di tengah ujian → dihitung strike (warn→submit) + dicatat.
- **Wording (penting — jujur tapi tegas):** JANGAN klaim "video sedang direkam" bila hanya foto berkala. Pakai mis. **"🔴 Kamera aktif — sesi dipantau. Foto diambil berkala untuk verifikasi integritas."** Live self-view + titik merah sudah cukup memberi efek gentar tanpa klaim palsu (menghindari titik lemah bila ada sengketa).

**Capture & unggah:**
- `<canvas>` menggambar frame dari `<video>` → JPEG kualitas rendah (hemat) → unggah ke object storage.
- **Best-effort** (seperti M7.2): gagal unggah tak boleh memblok ujian; antre/retry ringan.
- Simpan metadata di tabel `attempt_captures` (`id, attempt_id, user_id, storage_key/url, captured_at`) — RLS lockdown.

**Privasi / persetujuan / retensi (WAJIB — pilar F2 PII):**
- **Persetujuan eksplisit** khusus kamera di layar pra-ujian (checkbox terpisah dari pakta integritas): apa yang diambil, seberapa sering, siapa yang melihat, untuk apa.
- **Akses ketat**: hanya **pemilik ujian + super_admin** yang bisa melihat foto (signed URL/proxied, bukan publik).
- **Retensi/auto-hapus**: foto dibersihkan otomatis setelah jendela peninjauan (mis. X hari pasca-nilai) — job internal (pola M3/M6).
- **Minimisasi data**: JPEG kecil; tanpa ML/face-recognition (cukup capture + tinjau manual admin). Face-presence detection = opsional jauh di kemudian hari.

**Blocker/dependensi — ✅ TERATASI (2026-08-06):**
- Ditambahkan abstraksi `services/storage_service.py` → `upload_media(...)` yang memilih backend via `STORAGE_BACKEND` (`auto`/`r2`/`supabase`). Bila R2 (domain/sertifikat) bermasalah, set **`STORAGE_BACKEND=supabase`** → pakai **Supabase Storage** (bucket publik auto-dibuat, URL HTTPS valid otomatis; media dirender via `<img>`/`<audio>` polos → tanpa perubahan frontend/allowlist). Ini melepas ketergantungan setup custom-domain/cert R2.
- Sisa M8.4 (capture kamera) tinggal: endpoint upload capture (peserta) reuse `upload_media(folder="proctor")` + tabel `attempt_captures` + UI preview/kirim + consent/retensi. Storage sudah bukan blocker.

**Sisi admin:** galeri foto per attempt di bagian "Integritas" review (grid thumbnail + waktu), akses owner/super_admin saja.

### 1.6 Visibilitas admin
- **Bagian "Integritas"** di review attempt (drill-down M2): hitungan per jenis + timeline event.
- **Badge "N pelanggaran"** di daftar hasil (ExamResultsPage) untuk attempt ber-`violation_count > 0`.
- (Opsional) kolom pelanggaran di ekspor CSV.

---

## 2. Fase

| Fase | Isi | Migrasi |
|---|---|---|
| **M8.1** | Fondasi + deteksi + log + laporan admin (SOFT). Config `exams.anti_cheat` + toggle di builder; tabel `attempt_events` + `violation_count`; endpoint lapor (batch); deteksi klien (focus/blur, copy-paste, fullscreen) + peringatan peserta; bagian Integritas di review + badge di daftar hasil. | `028` (anti_cheat + attempt_events + violation_count) |
| **M8.2** | ✅ **SELESAI** (2026-08-06, mig 029). Satu sesi aktif: `exam_attempts.session_token` (di-generate tiap `start()` bila `single_session`) + `POST /api/attempts/{id}/heartbeat` (bandingkan token; `active=false`→superseded) + overlay lockout "dibuka di tempat lain" (Ambil Alih=reload / Kembali). Toggle di builder + pengumuman pra-ujian. | `029` (session_token) |
| **M8.3** | ✅ **SELESAI** (2026-08-06). Ambang `max_violations` → auto-submit (server hitung di `report_events`, runner `useAntiCheat` honor `auto_submit`). `violation_count` kini hanya menghitung pelanggaran **serius** (`focus_lost`/`fullscreen_exit`; copy/paste hanya dilog) → ambang bermakna. Input di builder (StepDetail) + pengumuman pra-ujian. | — (pakai kolom yang ada) |
| **M8.4** | ✅ **SELESAI** (2026-08-06, mig 030). Kamera capture berkala: `camera_capture{enabled,interval_sec}` di config+builder; `POST /api/attempts/{id}/capture` (peserta, JPEG/PNG≤3MB → `upload_media(folder='proctor')` R2) + tabel `attempt_captures`; runner `useCameraProctor` (preview LIVE + foto tiap N dtk); PreExamGate wajib kamera+consent; galeri admin di IntegrityCard; retensi `POST /api/internal/jobs/purge-captures` (>30 hari, hapus objek+baris). | `030` (`attempt_captures` + `camera_capture`) |

Rekomendasi urutan: **M8.1 → M8.2 → M8.3**, lalu **M8.4 setelah storage (R2) beres**. M8.1 sudah memberi nilai penuh (deteren + bukti + laporan) tanpa risiko mengubah alur nilai. M8.4 bergantung storage + consent/retensi (F2 PII).

---

## 3. Keputusan (2026-08-05)

- ✅ **Aksi saat blur/pindah** = **auto-submit setelah 1 peringatan** (`on_focus_loss: "submit"`, `focus_strikes: 1`): pelanggaran ke-1 → peringatan keras; pelanggaran ke-2 → ujian dikumpulkan otomatis. Diumumkan di layar pra-ujian.
- ✅ **Deteksi layar ganda saat mulai** = **YA** (`detect_multi_screen: true`): saat mulai, minta izin Window Management API & cek; bila ≥2 layar → minta peserta menonaktifkan layar kedua sebelum lanjut (perlu izin, tak 100%).
- ✅ **Kamera capture berkala** = **DIMASUKKAN** sebagai fase tersendiri **M8.4** (bukan rekam video; foto tiap ~60 dtk + preview LIVE + wajib aktif). Wording jujur ("dipantau/foto berkala", bukan klaim "merekam video"). WAJIB consent + akses ketat + retensi/auto-hapus. **Prasyarat: object storage (R2/Supabase) siap** (blocker sama dg F1.3 audio).
- ⏳ **Cakupan & urutan** (M8.1 dulu vs beresi storage dulu untuk M8.4) — masih didiskusikan.

**Masih perlu disepakati (lanjut diskusi):**
- Peristiwa mana yang menghitung "strike" (memicu warn→submit): fokus hilang & keluar fullscreen = strike; percobaan copy/paste = dicatat saja (sudah diblok), tidak memicu submit. (rekomendasi)
- Copy-paste: blokir copy/cut/paste/klik-kanan tapi **izinkan seleksi teks** (rekomendasi).
- Fullscreen keluar: perlakukan sebagai strike (warn→submit) atau sekadar minta masuk lagi.
- Single session (M8.2): sekarang atau nanti.

> Prinsip: aksi keras (auto-submit) selalu **opt-in per-ujian + diumumkan ke peserta**, dengan 1 peringatan sebagai tenggang. Deteksi **best-effort**; keputusan final di **server**.

---

## 4. Catatan teknis

- Deteksi klien mudah di-bypass (dev tools) — itu sebabnya **server yang menyimpan & memutuskan**, dan nilainya sebagai **bukti audit** + deteren, bukan pencegah mutlak.
- Event lapor harus **throttle/dedupe** (mis. jangan kirim 100 event `focus_lost` beruntun) agar tak membanjiri DB.
- `attempt_events` mengikuti **RLS lockdown** (service-role only) seperti tabel lain (migrasi 019).
- Peserta yang koneksinya putus (M7.2) tetap harus bisa mengerjakan — pelaporan anti-cheat **best-effort**, tak boleh memblok jawaban.
