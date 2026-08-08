-- ============================================================
-- Learning Nexus CBT — Session Idle Timeout (auth_sessions)
-- Run in Supabase SQL Editor (after 032_feedback.sql)
--
-- Melacak aktivitas terakhir per-sesi (klaim `session_id` JWT Supabase) untuk
-- memaksa logout setelah idle N menit (default 30). Server MENGECEK tiap request
-- (tolak 401 bila basi) & di-REFRESH oleh endpoint heartbeat saja.
--
-- Akses HANYA lewat backend service-role (RLS lockdown, konsisten 019/024/032).
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id    TEXT PRIMARY KEY,                 -- klaim `session_id` dari JWT Supabase
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE auth_sessions IS 'Aktivitas terakhir per-sesi untuk idle timeout (session_id = klaim JWT Supabase).';

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- ─── RLS lockdown (service-role only; konsisten 019/024/032) ─
DO $$
DECLARE
    pol text;
BEGIN
    EXECUTE 'ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY';
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'auth_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.auth_sessions', pol);
    END LOOP;
    EXECUTE 'CREATE POLICY "service_role_all" ON public.auth_sessions FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'REVOKE ALL ON public.auth_sessions FROM anon, authenticated';
END $$;
