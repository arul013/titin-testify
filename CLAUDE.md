# Project Rules — Titin Testify (Learning Nexus CBT)

## 🚫 HARD RULE: Git commit & push HANYA oleh pemilik (user)

- **JANGAN PERNAH** menjalankan `git commit` atau `git push` — dalam keadaan apa pun, tanpa pengecualian.
- Ini berlaku walaupun user bilang "selesaikan", "beresi", atau memberi izin umum di masa lalu. Izin untuk commit/push harus **eksplisit per permintaan** dan tetap, **user yang mengeksekusi sendiri**.
- Jika perubahan sudah siap, **berhenti di situ**: tinggalkan perubahan di working tree, lalu beri tahu user bahwa perubahan siap di-commit/push. Boleh **menyarankan** pesan commit, tapi jangan menjalankannya.
- Perintah git lain yang tidak mengubah riwayat/remote boleh (mis. `git status`, `git diff`, `git log`, `git add` hanya bila diminta untuk menyiapkan). Yang dilarang keras: `git commit`, `git push`, `git commit --amend`, `git rebase`, `git reset --hard` pada commit yang sudah ada, dan operasi apa pun yang menulis ke remote.

## 🚫 HARD RULE: UI harus penuh-lebar (JANGAN setengah layar)

- **JANGAN PERNAH** membuat UI yang hanya memakai setengah/sebagian lebar dan menyisakan white space besar di sisi kanan. Konten harus **memanfaatkan lebar penuh** kontainernya.
- Hindari membatasi lebar konten form/panel dengan `max-w-*` sempit (mis. `max-w-2xl`) sehingga muncul area kosong. Pakai layout responsif (grid multi-kolom, `flex`, dsb.) agar ruang terisi rapi.
- Pengecualian: elemen yang memang seharusnya ringkas (mis. tab bar, tombol, chip) boleh content-width — gunakan `self-start`/`w-fit`, jangan biarkan ter-stretch penuh dengan latar kosong.

## 🚫 HARD RULE: DILARANG komponen/kontrol NATIVE untuk input

- **JANGAN PERNAH** memakai kontrol input native yang punya widget bawaan browser: `<input type="number">` (panah spinner), `<select>`/`<option>` native, `<input type="date">`, `type="datetime-local">`, `type="time">`, `type="month">`, `type="week">`. Alasan: tampilan tidak konsisten & mudah ter-klik tak sengaja.
- Untuk angka: pakai **input teks manual** (mis. komponen `Input` dengan `inputMode="numeric"` + filter digit). Untuk pilihan: pakai komponen **`Select`** DS (sudah custom, non-native). Untuk tanggal/jam: pakai **`DatePicker`** dan **`ClockTimePicker`** DS.
- Bila menemukan input native yang tersisa di kode, **hapus/ganti** dengan komponen DS yang sesuai.

## 🚫 HARD RULE: Selalu cek komponen DS dulu; JANGAN bikin komponen baru tanpa izin

- **SEBELUM** membuat atau memakai komponen UI apa pun, **WAJIB cek dulu** `frontend/src/components/ui/`. Kalau sudah ada komponennya, **pakai yang itu** (jangan buat versi bespoke/native).
- Kalau komponen yang dibutuhkan **belum ada**, **JANGAN** langsung membuat/memakai komponen native atau komponen baru. **Tanyakan dulu ke user** apakah boleh membuat komponen baru (dan seperti apa), baru lanjut.
