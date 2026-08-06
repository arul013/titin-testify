-- ============================================================
-- Learning Nexus CBT — Satu Sesi Aktif (M8.2)
-- Run in Supabase SQL Editor (after 028_anti_cheat.sql)
--
-- Token sesi per attempt untuk menegakkan "satu sesi aktif" (anti_cheat.single_session):
-- setiap `start()` menghasilkan token baru & menyimpannya. Klien mengirim token
-- lewat heartbeat; bila token server ≠ token klien (attempt dibuka di tab/perangkat
-- lain yang meng-claim token baru) → sesi lama dikunci. Detail: docs/AntiCheat_M8_plan.md.
-- ============================================================

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS session_token UUID;

COMMENT ON COLUMN exam_attempts.session_token IS
    'Token sesi aktif (M8.2 single_session). Heartbeat klien dibandingkan dg ini; beda = sesi lain mengambil alih.';
