-- ============================================================
-- Learning Nexus CBT — Bank Soal: posisi gambar pada Materi (passage)
-- Run this SQL in Supabase SQL Editor (after 006_reading_media.sql)
--
-- Menambah kolom image_position pada passage: menentukan apakah gambar materi
-- ditampilkan DI ATAS teks bacaan ('above') atau DI BAWAH-nya ('below').
-- Default 'below' (teks dulu, baru gambar) — paling umum untuk Reading.
-- ============================================================

ALTER TABLE question_passages
    ADD COLUMN IF NOT EXISTS image_position TEXT NOT NULL DEFAULT 'below';

ALTER TABLE question_passages
    DROP CONSTRAINT IF EXISTS question_passages_image_position_check;
ALTER TABLE question_passages
    ADD CONSTRAINT question_passages_image_position_check
    CHECK (image_position IN ('above', 'below'));

COMMENT ON COLUMN question_passages.image_position IS
    'Posisi gambar materi relatif terhadap teks: ''above'' (gambar dulu) atau ''below'' (teks dulu). Default ''below''.';
