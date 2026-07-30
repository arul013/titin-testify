-- ============================================================
-- Learning Nexus CBT — Perbaikan constraint pool untuk SUBSET MATERI (#4)
-- Run in Supabase SQL Editor (after 014_exam_review.sql)
--
-- Konteks: fitur "pilih sebagian soal dalam materi" menyimpan unit pool dengan
-- KEDUA kolom terisi: {passage_id, question_id} = satu soal spesifik di dalam
-- materi. Constraint lama `exam_pool_unit_exactly_one` (tepat SATU terisi)
-- MENOLAK baris tersebut → penyimpanan gagal. Longgarkan jadi "minimal satu".
--
-- Kombinasi valid setelah ini:
--   - passage_id saja        → materi utuh
--   - question_id saja       → soal tunggal (standalone)
--   - passage_id+question_id → SATU soal di dalam materi (subset)  ← BARU
-- ============================================================

ALTER TABLE exam_pool_units DROP CONSTRAINT IF EXISTS exam_pool_unit_exactly_one;

ALTER TABLE exam_pool_units
    ADD CONSTRAINT exam_pool_unit_at_least_one CHECK (
        passage_id IS NOT NULL OR question_id IS NOT NULL
    );

COMMENT ON TABLE exam_pool_units IS
    'Unit pool: materi utuh (passage_id), soal tunggal (question_id), atau subset materi (passage_id+question_id).';
