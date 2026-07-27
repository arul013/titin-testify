# Penilaian Otomatis — TOEFL ITP & Nilai 0–100

Status: **disepakati, mulai dikoding.** Tanggal: 2026-07-27.
Sumber tabel: dokumen resmi "Menghitung Skor TOEFL ITP PBT" (disediakan pemilik).
Terkait: `Exam_Scoring_and_Types_plan.md`, `Exam_Test_Types_plan.md`, `Exam_Engine_Phase4_plan.md`.

## 1. Prinsip: skor ditentukan otomatis oleh (jenis tes + mode)
Admin **tidak lagi memilih "Skema Penilaian" manual**. Skor ditentukan otomatis:

| Mode ujian | Metode skor | Skala | Nilai kelulusan |
|---|---|---|---|
| **Tes Lengkap ITP** (Listening 50, Structure 15, WE 25, Reading 50) | **TOEFL ITP Resmi** (tabel konversi) | **217–677** | skor TOEFL, default **500** |
| **Latihan** (komposisi apa pun) | **Nilai 0–100** | **0–100** | nilai 0–100 (opsional) |

- **Skor Resmi TOEFL ITP HANYA untuk Tes Lengkap ITP.** Tak muncul di Latihan.
- **Latihan → Nilai 0–100** = `round(total_benar / total_soal × 100)`. Contoh: 8/10 → **Nilai 80**. Dilabeli **"Nilai"** (bukan "80%").
- Jenis tes lain (iBT/IELTS/TOEIC) belum punya skor resmi → sementara semua ujiannya pakai Nilai 0–100.

## 2. Algoritma TOEFL ITP Resmi
1. Hitung **jumlah benar** per **grup skor** (3 grup):
   - **Listening** (= skill `listening`, 0–50).
   - **Structure & Written Expression** = `structure` + `written_expression` **digabung** (0–40).
   - **Reading** (= skill `reading`, 0–50).
2. Konversi tiap grup → nilai (tabel §3).
3. **(L + S&WE + R) × 10 ÷ 3**, lalu **bulatkan** ke bilangan bulat terdekat = skor TOEFL.
4. Lulus = `skor ≥ passing_value`.

**Contoh (terverifikasi):** L 37→55, S&WE 30→54, R 38→54 → 163 ×10 = 1630 ÷3 = 543,33 → **543**.
**Rentang:** min (0/0/0) = (24+20+21)×10/3 = 217; max (50/40/50) = (68+68+67)×10/3 = 677.

> Catatan: Structure & WE hanya sampai **40** soal (Structure 15 + WE 25). Kolom S&WE di tabel kosong untuk jumlah benar 41–50.

## 3. Tabel Konversi TOEFL ITP PBT (transkrip persis)
`jumlah_benar → Listening | Structure&WE | Reading` (— = tak berlaku, S&WE maks 40):

| Benar | Listening | S&WE | Reading |
|---:|---:|---:|---:|
| 50 | 68 | — | 67 |
| 49 | 67 | — | 66 |
| 48 | 66 | — | 65 |
| 47 | 65 | — | 63 |
| 46 | 63 | — | 61 |
| 45 | 62 | — | 60 |
| 44 | 61 | — | 59 |
| 43 | 60 | — | 58 |
| 42 | 59 | — | 57 |
| 41 | 58 | — | 56 |
| 40 | 57 | 68 | 55 |
| 39 | 57 | 67 | 54 |
| 38 | 56 | 65 | 54 |
| 37 | 55 | 63 | 53 |
| 36 | 54 | 61 | 52 |
| 35 | 54 | 60 | 52 |
| 34 | 53 | 58 | 51 |
| 33 | 52 | 57 | 50 |
| 32 | 52 | 56 | 49 |
| 31 | 51 | 55 | 48 |
| 30 | 51 | 54 | 48 |
| 29 | 50 | 53 | 47 |
| 28 | 49 | 52 | 46 |
| 27 | 49 | 51 | 46 |
| 26 | 48 | 50 | 45 |
| 25 | 48 | 49 | 44 |
| 24 | 47 | 48 | 43 |
| 23 | 47 | 47 | 43 |
| 22 | 46 | 46 | 42 |
| 21 | 45 | 45 | 41 |
| 20 | 45 | 44 | 40 |
| 19 | 44 | 43 | 39 |
| 18 | 43 | 42 | 38 |
| 17 | 42 | 41 | 37 |
| 16 | 41 | 40 | 36 |
| 15 | 41 | 40 | 35 |
| 14 | 39 | 38 | 34 |
| 13 | 38 | 37 | 32 |
| 12 | 37 | 36 | 31 |
| 11 | 35 | 35 | 30 |
| 10 | 33 | 33 | 29 |
| 9 | 32 | 31 | 28 |
| 8 | 32 | 29 | 28 |
| 7 | 31 | 27 | 27 |
| 6 | 30 | 26 | 26 |
| 5 | 29 | 25 | 25 |
| 4 | 28 | 23 | 24 |
| 3 | 27 | 22 | 23 |
| 2 | 26 | 21 | 23 |
| 1 | 25 | 20 | 22 |
| 0 | 24 | 20 | 21 |

## 4. Rencana implementasi
1. **Backend** — modul skor (`app/services/scoring.py` atau di scoring service):
   - 3 tabel konversi (Listening/S&WE/Reading) sebagai konstanta (transkrip di atas).
   - `compute_exam_score(test_type, exam_mode, per_section, passing_value)`:
     - Tes Lengkap ITP → algoritma resmi (gabung S&WE, konversi, ×10÷3, bulatkan), `scale_unit='toefl_itp'`.
     - Selain itu → Nilai 0–100 (`round(benar/total×100)`), `scale_unit='nilai'`.
   - `submit_attempt` memanggil ini (menggantikan compute berbasis scheme_id).
2. **Exam builder**:
   - **Buang dropdown "Skema Penilaian"** manual. Skor otomatis per mode.
   - **Nilai Kelulusan** menyesuaikan unit: Tes Lengkap → skor TOEFL (default 500); Latihan → 0–100 (opsional).
   - `validate()` tak lagi mewajibkan scheme; hapus dependensi `scoring_scheme_id`.
3. **Hasil peserta**: skor akhir + rincian per grup (Listening/S&WE/Reading → konversi) untuk ITP; Nilai + benar/total untuk Latihan.
4. **Menu Skema Penilaian → Kalkulator "Hitung Skor TOEFL ITP"**: input jumlah benar per bagian → tampilkan konversi + skor. Bagian custom-scheme lama dirapikan/dihapus.
5. **Kolom DB**: `exams.scoring_scheme_id` dibiarkan (nullable, tak dipakai); `passing_value` tetap dipakai. **Tak perlu migrasi baru** (skor digerakkan kode).

## 5. Aturan
- Tabel konversi **wajib persis** dari dokumen resmi — jangan diubah/dikarang.
- Pembulatan: ke **bilangan bulat terdekat** (round half up). 543,33 → 543; 543,67 → 544.
- Jenis tes selain ITP: skor resmi menyusul saat tabel resminya tersedia; sementara Nilai 0–100.
- Jangan `git commit`/`git push` — hak pemilik.
