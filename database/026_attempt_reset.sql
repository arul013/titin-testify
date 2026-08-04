-- ============================================================
-- Learning Nexus CBT — Reset / Re-invite Akses Peserta (M5.3)
-- Run in Supabase SQL Editor (after 025_participant_extra_time.sql)
--
-- "Reset akses" = void LUNAK sebuah percobaan (mis. peserta macet/kehabisan
-- waktu karena kendala teknis) supaya peserta bisa mulai ulang. Percobaan
-- ter-reset TIDAK dihapus (auditable, konsisten pilar F3 soft-delete):
-- diabaikan saat peserta memulai lagi & dikecualikan dari hasil/analitik.
-- ============================================================

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS reset_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN exam_attempts.reset_at IS
    'Bila terisi: percobaan di-void oleh admin (M5.3) — diabaikan utk blokir mulai & dikecualikan dari hasil/analitik.';

-- Index parsial: percepat query percobaan AKTIF (yang belum di-reset).
CREATE INDEX IF NOT EXISTS idx_exam_attempts_active
    ON exam_attempts(exam_id, user_id)
    WHERE reset_at IS NULL;
