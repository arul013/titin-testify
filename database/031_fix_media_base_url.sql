-- ============================================================
-- Learning Nexus CBT — Perbaikan Base URL Media R2 (data-fix)
-- Run in Supabase SQL Editor.
--
-- MASALAH: media lama tersimpan dengan URL publik R2 `.dev`
-- (https://pub-xxxx.r2.dev/...) yang SERTIFIKATNYA INVALID → audio/gambar
-- gagal dimuat di sisi peserta (snapshot) & di mana pun URL itu dipakai.
--
-- SOLUSI: bucket & object-key sama; cukup TUKAR host ke custom domain R2
-- (cert valid). Mencakup: questions, question_passages, snapshot
-- exam_questions.payload (JSONB), jawaban speaking, dan foto proctor.
--
-- ⚠️ SEBELUM MENJALANKAN: pastikan `new_base` = CLOUDFLARE_R2_PUBLIC_URL kamu
--    (custom domain R2), dan file benar-benar bisa dibuka lewat domain itu.
-- ============================================================

DO $$
DECLARE
    old_base text := 'https://pub-2ca3941ab3aa4fbbaf091444c2721535.r2.dev';
    new_base text := 'https://media.titintestify.com';   -- GANTI bila subdomain-mu beda
BEGIN
    -- 1) Bank Soal — soal
    UPDATE questions SET
        audio_url        = replace(audio_url, old_base, new_base),
        image_url        = replace(image_url, old_base, new_base),
        options_image_url = replace(options_image_url, old_base, new_base)
    WHERE audio_url LIKE old_base || '%'
       OR image_url LIKE old_base || '%'
       OR options_image_url LIKE old_base || '%';

    -- 2) Bank Soal — materi (passage)
    UPDATE question_passages SET
        audio_url = replace(audio_url, old_base, new_base),
        image_url = replace(image_url, old_base, new_base)
    WHERE audio_url LIKE old_base || '%'
       OR image_url LIKE old_base || '%';

    -- 3) Snapshot ujian (payload beku) — JSONB via teks
    UPDATE exam_questions SET
        payload = replace(payload::text, old_base, new_base)::jsonb
    WHERE payload::text LIKE '%' || old_base || '%';

    -- 4) Jawaban speaking (answer_json.audio_url)
    UPDATE exam_attempt_answers SET
        answer_json = replace(answer_json::text, old_base, new_base)::jsonb
    WHERE answer_json::text LIKE '%' || old_base || '%';

    -- 5) Foto proctor (M8.4)
    UPDATE attempt_captures SET
        url = replace(url, old_base, new_base)
    WHERE url LIKE old_base || '%';

    RAISE NOTICE 'Base URL media diperbarui: % -> %', old_base, new_base;
END $$;

-- Verifikasi (jalankan terpisah): tidak boleh ada lagi URL r2.dev.
--   SELECT count(*) FROM question_passages WHERE audio_url LIKE '%r2.dev%';
--   SELECT count(*) FROM exam_questions WHERE payload::text LIKE '%r2.dev%';
