# Titin Testify — Learning Nexus CBT

Aplikasi **Computer Based Test (CBT)** untuk latihan & simulasi ujian. Terdiri dari:

- **Backend** — FastAPI (Python) + Supabase (Auth & Database) + Cloudflare R2 (penyimpanan audio listening)
- **Frontend** — Next.js 16 + React 19 + Tailwind CSS 4

---

## 📁 Struktur Project

```
learning-nexus-exam/
├── backend/          # API FastAPI (Python 3.12)
│   ├── app/
│   │   ├── main.py           # Entry point FastAPI
│   │   ├── config.py         # Konfigurasi dari .env
│   │   ├── database.py       # Koneksi Supabase
│   │   ├── dependencies.py   # Dependency (auth guard, dll)
│   │   ├── middleware/       # CORS
│   │   ├── models/           # Pydantic models (user, question)
│   │   ├── routes/           # Endpoint: auth, users, questions, upload
│   │   └── services/         # Logika bisnis
│   └── requirements.txt
├── frontend/         # Aplikasi Next.js (TypeScript)
│   └── src/
│       ├── app/              # Halaman (login, dashboard, bank-soal, ujian, users)
│       ├── components/       # Komponen UI
│       └── features/         # Fitur (auth, dll)
└── database/         # Skema SQL Supabase (dijalankan berurutan)
    ├── 001_profiles.sql
    ├── 002_add_force_change_password.sql
    └── 003_question_bank.sql
```

---

## 🚀 Menjalankan Secara Lokal

### 1. Backend (FastAPI)

```bash
cd backend

# Aktifkan virtual environment (sudah ada di folder venv/)
source venv/bin/activate

# Kalau venv belum ada / dependency belum lengkap:
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Siapkan environment variables
cp .env.example .env
# lalu isi .env dengan nilai asli (lihat bagian Environment Variables di bawah)

# Jalankan server (mode dev, auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend berjalan di **http://localhost:8000**
Dokumentasi API otomatis: **http://localhost:8000/api/docs**

### 2. Frontend (Next.js)

```bash
cd frontend

# Install dependency (kalau node_modules belum ada)
npm install

# Siapkan environment variables
cp .env.local.example .env.local
# lalu isi .env.local

# Jalankan server dev
npm run dev
```

Frontend berjalan di **http://localhost:3000**

### 3. Database (Supabase)

Jalankan file SQL di folder `database/` **secara berurutan** (001 → 002 → 003) lewat SQL Editor di dashboard Supabase.

---

## 🔐 Environment Variables

### `backend/.env`

| Variable | Keterangan |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_KEY` | Anon key Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (admin) |
| `SUPABASE_JWT_SECRET` | JWT secret untuk verifikasi token |
| `CLOUDFLARE_R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Access Key ID dari R2 API Token |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Secret Access Key dari R2 API Token |
| `CLOUDFLARE_R2_BUCKET_NAME` | Nama bucket (mis. `titin_testify`) |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public URL bucket (`https://pub-xxxx.r2.dev`) |
| `FRONTEND_URL` | URL frontend untuk CORS (default `http://localhost:3000`) |

> ⚠️ **`.env` berisi kredensial rahasia dan TIDAK di-commit** (sudah diatur di `.gitignore`). Gunakan `.env.example` sebagai template.

---

## 🛠️ Catatan Pengembangan

- **Interpreter Python**: setelah `git clone`, buat ulang `venv` (folder ini tidak ikut di-commit) lalu `pip install -r requirements.txt`. File `.vscode/settings.json` sudah mengarahkan VS Code ke `backend/venv`.
- **Next.js 16**: versi ini punya beberapa perubahan dari versi yang umum — baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode baru.
- Cek kesehatan API: `GET http://localhost:8000/api/health`

---

## 📦 Tech Stack

**Backend:** FastAPI · Uvicorn · Pydantic · Supabase · boto3 (Cloudflare R2) · python-jose
**Frontend:** Next.js 16 · React 19 · Tailwind CSS 4 · Framer Motion · Supabase JS · Lucide · Sonner
