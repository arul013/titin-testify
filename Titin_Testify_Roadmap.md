# Titin Testify CBT Roadmap

## Goal

Membangun aplikasi Computer Based Test (CBT) untuk simulasi ujian dan
progress report yang dapat diakses melalui subdomain seperti
`cbt.titintestify.id`.

------------------------------------------------------------------------

# Phase 1 --- Foundation & User Management

## Authentication & Authorization
- [x] **Login Experience**:
  - [x] Login menggunakan Username & Password (tanpa email, tanpa placeholder).
  - [x] Form login profesional & interaktif (efek getar/warna merah & toast pop-up jika username atau password salah).
- [x] **Hak Akses & Redirection**:
  - [x] Hak akses berbasis peran (Super Admin, Admin, Peserta).
  - [x] **Peserta Dashboard Bypass**: Peserta tidak memerlukan dashboard statistik. Setelah login berhasil, peserta langsung diarahkan ke halaman daftar ujian `/ujian`. Jika peserta mencoba mengakses `/dashboard` secara manual, sistem akan langsung mengalihkan (redirect) mereka ke `/ujian`.
  - [x] Sidebar navigasi disesuaikan per role. Role peserta hanya melihat menu ujian CBT dan tombol keluar.
- [x] **Logout Overlay**:
  - [x] Logout dengan tampilan overlay pemuatan sesi (loading spinner) tepat di tengah-tengah layar (*dead center*).

## User Management & Password Control
- [x] **Pembatasan Super Admin (Owner Protection)**:
  - [x] Multi-Super Admin diperbolehkan demi redundansi operasional (back-up).
  - [x] Super Admin Utama (akun pertama / creator) dikunci secara mutlak di database & backend sehingga tidak bisa dihapus atau diubah rolenya oleh Super Admin lain.
  - [x] Pembuatan akun Super Admin baru diblokir baik di UI maupun API router demi keamanan.
- [x] **Tampilan Tab Manajemen User**:
  - [x] **Sisi Super Admin**: Menu Manajemen User memiliki 2 Tab (**Tab Admin** untuk mengelola data Admin, **Tab Peserta** untuk mengelola data Peserta).
  - [x] **Sisi Admin**: Hanya menampilkan **Tab Peserta** (tidak dapat melihat atau mengelola akun Admin lainnya).
- [x] **Visibilitas Password & Manajemen Akun**:
  - [x] **Success Modal Pasca Pembuatan**: Karena password disimpan secara terenkripsi (hash), saat user (Admin/Peserta) selesai dibuat secara manual atau massal, sistem menampilkan modal popup sukses berisi rangkuman username & password *plain text* dengan tombol "Salin Kredensial" dan "Bagikan ke WhatsApp".
  - [x] **Generate Peserta Masal (Bulk Generate)**: Admin/Super Admin dapat men-generate peserta ujian secara masal (bulk) berbasis list Nama Lengkap secara dinamis, otomatis meng-generate email dummy `${username}@testify.id` tanpa menampilkannya di UI, dan mengunduh berkas CSV rapi yang disederhanakan hanya berisi 3 kolom (**Nama Lengkap, Username, Password**).
  - [x] **Reset Password (Generate Ulang)**: Super Admin dapat melakukan reset password Admin lain secara acak, dan Admin/Super Admin dapat mereset password Peserta secara acak. Setelah reset berhasil, password acak baru akan ditampilkan dalam popup sukses beserta tombol Salin & Share WA.
  - [x] **Status Akun (Aktif/Suspend)**: Menyediakan switch/toggle status `Akun Akif` (`is_active` boolean) untuk mengaktifkan atau menonaktifkan akun. Jika status diset tidak aktif, backend akan langsung memblokir akses login akun tersebut.
- [x] **Force Change Password (Khusus Admin)**:
  - [x] Saat akun Admin baru dibuat oleh Super Admin atau saat password Admin direset oleh Super Admin, flag `force_change_password` akan di-set menjadi `true` di profil database.
  - [x] Saat login pertama kali, Admin yang memiliki flag `force_change_password = true` akan dipaksa masuk ke halaman `/change-password` untuk mengganti password mereka terlebih dahulu sebelum diperbolehkan mengakses halaman dashboard.
- [x] **Share Kredensial WhatsApp & Salin**:
  - [x] Memperbaiki bug truncation pada WhatsApp sharing. Format pesan di-encode secara ketat menggunakan `encodeURIComponent` dan menggunakan API WhatsApp resmi `https://api.whatsapp.com/send?text=...`.
  - [x] Format pesan untuk **Peserta**: menyertakan Username, Password baru/sementara, dan Link Ujian CBT.
  - [x] Format pesan untuk **Admin**: menyertakan Username, Password sementara, Link Dashboard Login, serta instruksi penggantian password pada login pertama.
  - [x] Disediakan tombol **"Salin Kredensial"** (Copy to Clipboard) sebagai cadangan jika WhatsApp tidak terpasang di perangkat.

------------------------------------------------------------------------

# Phase 2 --- Question Bank (Bank Soal) [DONE]

## Kebijakan Privasi & RLS (Data Isolation)
- `[x]` **Data Isolation**: Admin A hanya bisa melihat, mengubah, dan menghapus soal buatannya sendiri. Soal antar Admin terisolasi penuh.
- `[x]` **Otoritas Super Admin**: Super Admin dapat melihat dan mengelola semua soal yang dibuat oleh semua Admin di sistem.
- `[x]` **Implementasi**: Keamanan dijamin secara native menggunakan Row-Level Security (RLS) di database Supabase.

## Varian Soal & Skema Database (Parent-Child Pattern)
Struktur database menggunakan pola hubungan tabel induk-anak (`question_passages` ke `questions`) untuk mendukung variasi Multiple Choice:

- `[x]` **3.1 Soal Listening**:
  - Menyediakan audio player untuk mendengarkan audio ujian.
  - *Varian A*: 1 audio untuk 1 pertanyaan (berdiri sendiri).
  - *Varian B*: 1 audio untuk banyak pertanyaan (misal 1-10 pertanyaan sharing audio yang sama).
- `[x]` **3.2 Structure & Written Expression**:
  - *Structure*: Kalimat rumpang dengan blank kosong. Terdiri dari varian 1 teks untuk 1 pertanyaan dan 1 teks panjang untuk beberapa blank pertanyaan.
  - *Written Expression*: 1 teks pendek dengan beberapa kata bergaris bawah untuk 1 pertanyaan (mencari kata yang tidak tepat/salah).
- `[x]` **3.3 Soal Reading**:
  - Teks bacaan panjang diletakkan pada tabel induk (`question_passages`).
  - Mendukung 1 teks bacaan panjang yang ditautkan ke banyak anak pertanyaan (3 hingga 10 pertanyaan).

------------------------------------------------------------------------

# Phase 3 --- Exam Management (Manajemen Ujian)

## Paket Ujian & Jadwal
- Nama ujian, passing grade, durasi pengerjaan.
- Randomisasi soal dan acak pilihan jawaban (opsi A/B/C/D).
- Penjadwalan tanggal aktif ujian.
- Token ujian untuk memulai sesi (opsional).

------------------------------------------------------------------------

# Phase 4 --- Exam Engine (Lembar Ujian Peserta)

## 2-Column Responsive Layout (Halaman Ujian)
Tampilan pengerjaan ujian peserta dirancang dalam layout desktop 2 kolom yang modern, bersih, dan ergonomis:
- **Kolom Kiri (Soal / Pertanyaan)**:
  - Berisi materi soal seperti: Pemutar Audio Listening, teks bacaan panjang (Reading Passage), teks Structure, serta kalimat pertanyaan utama.
  - Memiliki area scroll terpisah (*scrollable container*) agar peserta dapat membaca teks panjang tanpa kehilangan fokus navigasi.
- **Kolom Kanan (Lembar Jawaban & Navigasi)**:
  - Panel Pilihan Ganda (A, B, C, D) yang bersih dan responsif.
  - Panel Navigasi Soal (berisi grid nomor-nomor soal untuk melompat ke nomor tertentu, tanda ragu-ragu, dan penunjuk soal yang sudah/belum dijawab).
  - Indikator Timer Ujian (waktu berjalan mundur) di bagian atas kanan.

## Sistem Pengerjaan
- Auto-save jawaban ke database setiap kali peserta memilih jawaban (mencegah kehilangan data jika mati listrik/jaringan terputus).
- Peringatan durasi sisa waktu.
- Auto-submit saat waktu pengerjaan habis.

------------------------------------------------------------------------

# Phase 5 --- Anti Cheat

## Safe Exam Browser (SEB) & Fitur Pengaman
- Hanya mengizinkan domain CBT untuk diakses.
- Fullscreen mode.
- Pencegahan beralih jendela/tab browser.
- Konfigurasi kunci enkripsi SEB per ujian.

------------------------------------------------------------------------

# Phase 6 --- Result & Progress Report

## Hasil Ujian
- Kalkulasi otomatis nilai, jumlah benar, jumlah salah, persentase kelulusan.
- Riwayat hasil ujian peserta.

## Progress Report (Dashboard)
- Grafik perkembangan nilai peserta dari waktu ke waktu.
- Rangkuman nilai rata-rata dan pencapaian tertinggi.

------------------------------------------------------------------------

# Future Ideas

- AI Analysis (analisis topik kelemahan peserta)
- Essay scoring otomatis menggunakan LLM
- Webcam Proctoring (pendeteksian wajah mencurigakan)
- Screen Recording selama ujian berlangsung
- Leaderboard kelulusan peserta
