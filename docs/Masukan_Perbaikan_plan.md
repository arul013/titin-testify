# Masukan & Perbaikan (Rencana)

Status: **rencana, 2026-08-08.** Menu **internal** baru bagi admin & super_admin untuk
mencatat hal yang perlu **diperbaiki**, **diubah logic-nya**, atau **fitur baru** pada
aplikasi ini. Bentuknya papan/list ringan (bukan Jira) — setiap item punya judul +
deskripsi lengkap, kategori, prioritas, dan status. **Bukan** feedback dari peserta;
peserta tidak melihat menu ini.

Route frontend: `/masukan` (nama menu di sidebar: **"Masukan & Perbaikan"**).

## 0. Prinsip
- **Internal admin-only.** Semua endpoint `require_admin`. Peserta tak punya akses.
- **Kolaboratif tapi terkontrol.** Semua admin bisa **membuat** & **berdiskusi/vote**;
  namun **edit/hapus/ubah-status** hanya oleh **pembuat** — kecuali **super_admin**
  yang boleh mengelola semua item. Penentuan hak dilakukan **server** (jangan percaya klien).
- **Ringan & bertahap.** Bangun inti dulu, lalu notifikasi, komentar, voting.
- **Reuse.** Editor rich text + upload gambar ke R2 memakai infrastruktur yang sudah ada
  (`upload_media`); notifikasi memakai sistem M6; semua UI memakai komponen DS.

## 1. Taksonomi
- **Kategori** (`category`): `bug` 🐛 Bug/Perbaikan · `logic` 🔧 Perubahan Logic ·
  `feature` ✨ Fitur Baru · `ui` 🎨 UI/UX · `other` 📝 Lainnya.
- **Prioritas** (`priority`): `critical` Kritis · `high` Tinggi · `medium` Sedang · `low` Rendah.
- **Status** (`status`): `open` Terbuka · `in_progress` Dikerjakan · `done` Selesai ·
  `rejected` Ditolak/Ditunda.

## 2. Model data — migrasi `032_feedback.sql` (dijalankan user)

```
feedback_items
  id            uuid pk default gen_random_uuid()
  title         text not null
  description   text not null           -- HTML rich text (disanitasi saat render)
  category      text not null default 'other'   -- bug|logic|feature|ui|other
  priority      text not null default 'medium'  -- critical|high|medium|low
  status        text not null default 'open'    -- open|in_progress|done|rejected
  created_by    uuid not null references profiles(id)
  comment_count int  not null default 0   -- denormalisasi (di-maintain server)
  vote_count    int  not null default 0   -- denormalisasi (di-maintain server)
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()

feedback_comments                        -- Fase 3
  id           uuid pk
  feedback_id  uuid not null references feedback_items(id) on delete cascade
  author_id    uuid not null references profiles(id)
  body         text not null            -- teks polos (ringan)
  created_at   timestamptz not null default now()

feedback_votes                           -- Fase 4
  feedback_id  uuid not null references feedback_items(id) on delete cascade
  user_id      uuid not null references profiles(id)
  created_at   timestamptz not null default now()
  primary key (feedback_id, user_id)     -- 1 orang 1 suara
```

Indeks: `feedback_items(status)`, `feedback_items(created_by)`, `feedback_items(created_at desc)`,
`feedback_comments(feedback_id, created_at)`. RLS: **service-role only** (konsisten dgn F2);
akses lewat backend `get_supabase_admin()`.

`comment_count`/`vote_count` di-*maintain* di service (increment/decrement saat tambah/hapus
komentar & vote) agar list tak perlu subquery per baris (anti-N+1).

## 3. Matriks hak akses (ditegakkan server)

| Aksi | Admin (pembuat) | Admin (bukan pembuat) | Super Admin |
|---|:--:|:--:|:--:|
| Lihat daftar & detail | ✅ | ✅ | ✅ |
| Buat item | ✅ | ✅ | ✅ |
| Edit isi / kategori / prioritas | ✅ | ❌ | ✅ |
| Ubah status | ✅ | ❌ | ✅ |
| Hapus item | ✅ | ❌ | ✅ |
| Komentar | ✅ | ✅ | ✅ |
| Hapus komentar | ✅ (miliknya) | ❌ | ✅ (semua) |
| Vote 👍 | ✅ | ✅ | ✅ |

Helper server: `can_manage(item, user) = (item.created_by == user.id) or user.role == 'super_admin'`.

## 4. Backend — route & service
`routes/feedback.py` (`require_admin`), `services/feedback_service.py`, `models/feedback.py`.

- `GET  /api/feedback` — list. Query: `status`, `category`, `priority`, `q` (cari judul/isi),
  `sort` (`recent` | `priority` | `votes`), paginasi. Tiap item menyertakan `created_by_name`
  dan `can_manage` (dihitung server utk user aktif) + `has_voted` (Fase 4).
- `POST /api/feedback` — buat (title, description, category, priority). → notif `feedback_created` (Fase 2).
- `GET  /api/feedback/{id}` — detail (deskripsi penuh + komentar bila Fase 3).
- `PATCH /api/feedback/{id}` — edit isi/kategori/prioritas. Guard `can_manage`.
- `PATCH /api/feedback/{id}/status` — ubah status. Guard `can_manage`. → notif `feedback_status_changed` (Fase 2).
- `DELETE /api/feedback/{id}` — hapus. Guard `can_manage`.
- `POST /api/feedback/{id}/comments` / `DELETE /api/feedback/comments/{cid}` — Fase 3.
- `POST /api/feedback/{id}/vote` / `DELETE /api/feedback/{id}/vote` — Fase 4 (toggle).

Upload gambar deskripsi: pakai route upload yang sudah ada (admin-only, `upload_media`,
folder mis. `feedback/`). Deskripsi HTML **disanitasi** saat render (konsisten kebijakan XSS F2).

## 5. Frontend — `features/feedback/`
`page.tsx` tipis → `<MasukanPage />`. Struktur:
- `MasukanPage.tsx` (orkestrasi + state + fetch).
- `useFeedback.ts` (list/detail/mutasi + tipe `FeedbackItem`).
- `FeedbackCard.tsx` (kartu list), `FeedbackFormModal.tsx` (buat/edit, rich editor + gambar),
  `FeedbackDetailModal.tsx` (deskripsi penuh + status + komentar), `StatusBadge`/`CategoryBadge` (pakai `Badge` DS).

Tata letak (semua komponen DS, **penuh-lebar**):
- `PageHeader` (judul + subjudul).
- `ListToolbar`: search + filter **status / kategori / prioritas** + **urutkan** (Terbaru / Prioritas / Vote terbanyak).
- **List kartu**: judul · badge (kategori · prioritas · status) · cuplikan deskripsi ·
  pembuat & tanggal · 👍`vote_count` · 💬`comment_count`. Klik → modal detail.
- **FAB** untuk tambah (konvensi kita).
- **Modal detail**: deskripsi penuh (render HTML tersanitasi) · pengubah status (dropdown DS,
  hanya bila `can_manage`) · tombol Edit/Hapus (bila `can_manage`) · daftar komentar + kotak
  komentar (Fase 3) · tombol vote (Fase 4).

Sidebar: tambah entri menu **"Masukan & Perbaikan"** (route `/masukan`), tampil untuk
`admin` & `super_admin` (gating role yang sama dengan menu admin lain). Ikon: `MessageSquarePlus`/`Lightbulb`.

## 6. Notifikasi (Fase 2, reuse M6)
Event baru pada tabel `notifications`:
- `feedback_created` → ke semua admin/super_admin **kecuali pembuat**.
- `feedback_status_changed` → ke pembuat item (bila yang mengubah orang lain) — hindari spam.

Perlu diperhatikan volume; batasi penerima sesuai di atas. Deep-link lonceng → `/masukan` (buka item terkait).

## 7. Urutan fase
1. **Fase 1 — Inti:** migrasi `feedback_items` + CRUD + rich text/gambar + status + filter/sort + hak akses + sidebar. *(langsung dapat dipakai)*
2. **Fase 2 — Notifikasi in-app** (M6): 2 event di atas + deep-link.
3. **Fase 3 — Komentar/diskusi:** tabel `feedback_comments` + endpoint + UI utas + maintain `comment_count`.
4. **Fase 4 — Voting 👍:** tabel `feedback_votes` + toggle + `has_voted` + urut per vote + maintain `vote_count`.

Tiap fase: `tsc` + `eslint` + import backend bersih sebelum lanjut. Migrasi dijalankan **user**.

## 8. Keputusan yang terkunci (dari diskusi 2026-08-08)
- Nama menu: **"Masukan & Perbaikan"**.
- Hak edit/hapus/ubah-status: **pembuat + super_admin** (admin lain read-only atas item bukan miliknya).
- Deskripsi: **rich text + gambar** (upload R2).
- Fitur ekstra: **semua** (notifikasi, komentar, voting) — dibangun **bertahap** setelah inti.
