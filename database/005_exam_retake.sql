-- ============================================================
-- Learning Nexus CBT — Phase 3: Exam retake config
-- Run this SQL in Supabase SQL Editor (after 004_exams.sql)
--
-- Menambah opsi "boleh mengerjakan ulang" pada paket ujian.
-- Default FALSE = peserta hanya boleh mengerjakan sekali.
-- Penegakan (mengunci tombol Mulai bila sudah pernah selesai) dilakukan
-- di Phase 4 (Exam Engine) yang memiliki tabel attempts.
-- ============================================================

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exams.allow_retake IS 'TRUE = peserta boleh mengerjakan ulang; FALSE = sekali saja (default)';
