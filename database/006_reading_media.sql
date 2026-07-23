-- ============================================================
-- Learning Nexus CBT — Bank Soal: media gambar untuk Reading
-- Run this SQL in Supabase SQL Editor (after 003_question_bank.sql)
--
-- Menambah kolom image_url pada soal & passage agar bisa memuat gambar
-- (mis. diagram pada soal reading). Rich text passage (bold/italic/underline)
-- & nomor baris disimpan di kolom `content` yang sudah ada (teks bertanda +
-- line-break) — tidak butuh kolom baru.
-- ============================================================

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE question_passages
    ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN questions.image_url IS 'URL gambar opsional pada soal (mis. diagram). Disimpan di Cloudflare R2.';
COMMENT ON COLUMN question_passages.image_url IS 'URL gambar opsional pada passage. Disimpan di Cloudflare R2.';
