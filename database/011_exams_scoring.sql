-- ============================================================
-- Learning Nexus CBT — Manajemen Ujian: integrasi Skema Penilaian
-- Run this SQL in Supabase SQL Editor (after 010_scoring_schemes.sql)
--
-- Fase B: ujian menunjuk sebuah Skema Penilaian; nilai kelulusan dalam skala
-- skema (bukan lagi 0–100 polos). Fitur pengacakan DIHAPUS (ujian deterministik,
-- keputusan 2026-07-26) → buang kolom shuffle_*.
-- ============================================================

-- Tambah referensi skema + nilai kelulusan berskala-skema
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS scoring_scheme_id UUID REFERENCES scoring_schemes(id) ON DELETE SET NULL;
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS passing_value NUMERIC;   -- NULL = tanpa ambang lulus; skala mengikuti skema

COMMENT ON COLUMN exams.scoring_scheme_id IS 'Skema penilaian yang dipakai ujian ini (NULL = belum dipilih)';
COMMENT ON COLUMN exams.passing_value IS 'Nilai kelulusan dalam skala skema (NULL = tidak memakai)';

-- Pindahkan nilai kelulusan lama (0–100) → passing_value (anggap persen)
UPDATE exams SET passing_value = passing_grade
    WHERE passing_value IS NULL AND passing_grade IS NOT NULL;

-- Hapus kolom lama yang tak dipakai lagi
ALTER TABLE exams DROP COLUMN IF EXISTS passing_grade;
ALTER TABLE exams DROP COLUMN IF EXISTS shuffle_questions;
ALTER TABLE exams DROP COLUMN IF EXISTS shuffle_options;

CREATE INDEX IF NOT EXISTS idx_exams_scoring_scheme ON exams(scoring_scheme_id);
