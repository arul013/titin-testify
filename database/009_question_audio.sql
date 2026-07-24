-- ============================================================
-- Learning Nexus CBT — Bank Soal: audio untuk Soal Tunggal Listening
-- Run this SQL in Supabase SQL Editor (after 003_question_bank.sql)
--
-- Menambah kolom audio_url pada SOAL agar Soal Tunggal (standalone) bertipe
-- Listening bisa memuat audionya sendiri (kasus "1 audio → 1 soal").
-- Bila soal berada di dalam Materi Listening, audio berasal dari materi dan
-- kolom ini dibiarkan NULL.
-- ============================================================

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS audio_url TEXT;

COMMENT ON COLUMN questions.audio_url IS
    'URL audio untuk Soal Tunggal Listening (standalone). NULL bila soal memakai audio dari materi bersama. Disimpan di Cloudflare R2.';
