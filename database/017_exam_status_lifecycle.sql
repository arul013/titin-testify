-- ============================================================
-- Learning Nexus CBT — Siklus Hidup Ujian (M1.0)
-- Run in Supabase SQL Editor (after 016_foundation_audit.sql)
--
-- Longgarkan CHECK status exams agar menerima state baru:
--   draft → published → closed → archived
-- (Sebelumnya hanya 'draft','published'.)
-- ============================================================

ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_status_check;

ALTER TABLE exams
    ADD CONSTRAINT exams_status_check
    CHECK (status IN ('draft', 'published', 'closed', 'archived'));

COMMENT ON COLUMN exams.status IS 'Siklus hidup ujian: draft → published → closed → archived.';
