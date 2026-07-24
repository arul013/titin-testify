-- ============================================================
-- Learning Nexus CBT — Bank Soal: pilihan jawaban berupa gambar
-- Run this SQL in Supabase SQL Editor (after 006_reading_media.sql)
--
-- Untuk soal yang pilihan jawabannya berupa SATU gambar berisi label
-- A/B/C/D (mis. diagram). Stem tetap teks; admin cukup menandai huruf
-- yang benar. Bila kolom ini terisi → mode "opsi gambar" (option_a..d
-- dikirim string kosong). Bila NULL → opsi teks seperti biasa.
-- ============================================================

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS options_image_url TEXT;

COMMENT ON COLUMN questions.options_image_url IS 'URL gambar yang memuat pilihan jawaban A/B/C/D (mode opsi gambar). NULL = opsi teks.';
