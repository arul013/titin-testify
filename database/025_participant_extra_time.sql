-- ============================================================
-- Learning Nexus CBT — Akomodasi Waktu Per-Peserta (M5.2)
-- Run in Supabase SQL Editor (after 024_participant_groups.sql)
--
-- Menit tambahan per-peserta untuk satu ujian (akomodasi). Timer peserta:
-- durasi personal = duration_minutes + extra_minutes, dan dinding ends_at
-- DIGESER +extra_minutes khusus peserta itu (bukan clamp keras).
-- ============================================================

ALTER TABLE exam_participants
    ADD COLUMN IF NOT EXISTS extra_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (extra_minutes >= 0);

COMMENT ON COLUMN exam_participants.extra_minutes IS
    'Menit tambahan (akomodasi) untuk peserta ini pada ujian ini; menggeser durasi & ends_at +extra.';
