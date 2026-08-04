-- ============================================================
-- Learning Nexus CBT — Template Ujian (M4 Bagian B)
-- Run in Supabase SQL Editor (after 022_perf_indexes.sql)
--
-- Menandai sebuah baris `exams` sebagai TEMPLATE: resep ujian yang
-- bisa dipakai ulang (komposisi section + pool_units + skema nilai),
-- tanpa jadwal/peserta/percobaan. Template dikecualikan dari daftar
-- ujian aktif dan dipakai untuk membuat ujian baru dengan cepat.
-- ============================================================

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exams.is_template IS
    'TRUE = resep template (dikecualikan dari daftar ujian aktif, dipakai untuk membuat ujian baru).';

-- Index parsial: mempercepat filter daftar ujian aktif (is_template = FALSE)
-- dan pengambilan daftar template (is_template = TRUE).
CREATE INDEX IF NOT EXISTS idx_exams_is_template
    ON exams(is_template)
    WHERE deleted_at IS NULL;
