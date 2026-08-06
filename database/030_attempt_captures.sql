-- ============================================================
-- Learning Nexus CBT — Kamera Capture Berkala (M8.4 "proctoring-lite")
-- Run in Supabase SQL Editor (after 029_attempt_session.sql)
--
-- Foto peserta yang diambil berkala selama ujian (bukan rekam video).
-- File di object storage (R2 folder proctor/); tabel ini simpan metadata.
-- PII sensitif: akses hanya pemilik ujian + super_admin (via backend);
-- retensi/auto-hapus lewat job internal. Detail: docs/AntiCheat_M8_plan.md.
-- ============================================================

CREATE TABLE IF NOT EXISTS attempt_captures (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id  UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,          -- URL publik (untuk ditampilkan admin)
    storage_key TEXT,                   -- key di storage (untuk hapus saat retensi)
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attempt_captures IS 'Foto capture kamera peserta per attempt (M8.4). PII — akses backend owner/super_admin.';

CREATE INDEX IF NOT EXISTS idx_attempt_captures_attempt
    ON attempt_captures(attempt_id, captured_at);
-- Untuk job retensi (hapus yang lama).
CREATE INDEX IF NOT EXISTS idx_attempt_captures_captured_at
    ON attempt_captures(captured_at);

-- ─── RLS lockdown (service-role only; konsisten dg 019) ─────
DO $$
DECLARE
    pol text;
BEGIN
    EXECUTE 'ALTER TABLE public.attempt_captures ENABLE ROW LEVEL SECURITY';
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'attempt_captures'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attempt_captures', pol);
    END LOOP;
    EXECUTE 'CREATE POLICY "service_role_all" ON public.attempt_captures FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'REVOKE ALL ON public.attempt_captures FROM anon, authenticated';
END $$;
