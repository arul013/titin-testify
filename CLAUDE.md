# Project Rules — Titin Testify (Learning Nexus CBT)

## 🚫 HARD RULE: Git commit & push HANYA oleh pemilik (user)

- **JANGAN PERNAH** menjalankan `git commit` atau `git push` — dalam keadaan apa pun, tanpa pengecualian.
- Ini berlaku walaupun user bilang "selesaikan", "beresi", atau memberi izin umum di masa lalu. Izin untuk commit/push harus **eksplisit per permintaan** dan tetap, **user yang mengeksekusi sendiri**.
- Jika perubahan sudah siap, **berhenti di situ**: tinggalkan perubahan di working tree, lalu beri tahu user bahwa perubahan siap di-commit/push. Boleh **menyarankan** pesan commit, tapi jangan menjalankannya.
- Perintah git lain yang tidak mengubah riwayat/remote boleh (mis. `git status`, `git diff`, `git log`, `git add` hanya bila diminta untuk menyiapkan). Yang dilarang keras: `git commit`, `git push`, `git commit --amend`, `git rebase`, `git reset --hard` pada commit yang sudah ada, dan operasi apa pun yang menulis ke remote.
