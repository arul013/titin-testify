-- ============================================================
-- Learning Nexus CBT — Anti-Cheat Perilaku (M8.1)
-- Run in Supabase SQL Editor (after 027_notifications.sql)
--
-- Config anti-cheat per-ujian (JSONB, opt-in) + log peristiwa perilaku
-- peserta (pindah tab/blur, keluar fullscreen, copy/paste diblok) +
-- agregat cepat `violation_count`. Detail: docs/AntiCheat_M8_plan.md.
-- ============================================================

-- 1) Config per-ujian (opt-in; default kosong = perilaku lama).
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS anti_cheat JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN exams.anti_cheat IS
    'Config anti-cheat per-ujian (M8): track_focus/on_focus_loss/require_fullscreen/block_copy_paste/detect_multi_screen/... Opt-in.';

-- 2) Agregat cepat pelanggaran di attempt (untuk badge & ambang).
ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

-- 3) Log peristiwa perilaku (high-volume, per-attempt). Beda dari audit_events
--    (yang untuk aksi admin). RLS lockdown service-role.
CREATE TABLE IF NOT EXISTS attempt_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type       VARCHAR(30) NOT NULL,   -- focus_lost | fullscreen_exit | copy_blocked | paste_blocked | ...
    detail     JSONB,                  -- mis. {"away_ms": 4200}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attempt_events IS 'Log peristiwa perilaku anti-cheat peserta per attempt (M8).';

CREATE INDEX IF NOT EXISTS idx_attempt_events_attempt
    ON attempt_events(attempt_id, created_at);

-- ─── RLS lockdown (service-role only; konsisten dg 019) ─────
DO $$
DECLARE
    pol text;
BEGIN
    EXECUTE 'ALTER TABLE public.attempt_events ENABLE ROW LEVEL SECURITY';
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'attempt_events'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attempt_events', pol);
    END LOOP;
    EXECUTE 'CREATE POLICY "service_role_all" ON public.attempt_events FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'REVOKE ALL ON public.attempt_events FROM anon, authenticated';
END $$;
