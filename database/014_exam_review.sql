-- ============================================================
-- Learning Nexus CBT — Pembahasan/Review Ujian (Fase P5.0)
-- Run in Supabase SQL Editor (after 013_test_types.sql)
--
-- Menambah kendali "tampilkan pembahasan & kunci jawaban ke peserta setelah
-- ujian selesai" (per ujian), serta membekukan pembahasan soal ke snapshot.
--
-- Integritas: ujian deterministik → kunci jawaban TAK pernah bocor saat ujian.
-- Pembahasan hanya dibuka di endpoint review bila show_review = true DAN attempt
-- sudah submitted.
-- ============================================================

-- Toggle per ujian (default OFF = aman untuk tes resmi). App menyetel default
-- cerdas: Latihan (custom) → true, Tes Lengkap (full) → false.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_review BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN exams.show_review IS 'Tampilkan pembahasan & kunci jawaban ke peserta setelah ujian selesai (Riwayat).';

-- Pembahasan soal dibekukan saat publish (denormalisasi, konsisten snapshot).
-- TIDAK disertakan di payload peserta saat ujian; hanya dibuka di endpoint review.
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
COMMENT ON COLUMN exam_questions.explanation IS 'Pembahasan soal (dibekukan saat publish; dibuka hanya di endpoint review bila exams.show_review).';
