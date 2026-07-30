-- ============================================================
-- Learning Nexus CBT — Anti-brute-force login per-akun (F2.b)
-- Run in Supabase SQL Editor (after 017_exam_status_lifecycle.sql)
--
-- Lockout per-AKUN melengkapi rate-limit per-IP: penyerang yang ganti-ganti IP
-- (credential stuffing) tetap terblok setelah N gagal login untuk satu akun.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

COMMENT ON COLUMN profiles.failed_login_count IS 'Jumlah gagal login berturut sejak sukses terakhir (anti-brute-force).';
COMMENT ON COLUMN profiles.locked_until IS 'Login diblok hingga waktu ini (NULL = tak terkunci).';
