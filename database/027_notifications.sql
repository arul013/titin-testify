-- ============================================================
-- Learning Nexus CBT — Notifikasi In-App (M6 Fase 1)
-- Run in Supabase SQL Editor (after 026_attempt_reset.sql)
--
-- Notifikasi per-pengguna: ujian ditugaskan, pengingat buka/tutup,
-- hasil/penilaian selesai. Dibuat event-driven (backend) & cron
-- (dispatch-reminders). Idempotent via UNIQUE(user_id, type, entity_id)
-- supaya cron aman dipanggil berulang tanpa notif dobel.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL,          -- exam_assigned | exam_opening | exam_closing | result_ready
    title       TEXT NOT NULL,
    body        TEXT,
    entity_type VARCHAR(20),                   -- exam | attempt
    entity_id   UUID,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Idempotensi: satu notif per (penerima, jenis, entitas).
    UNIQUE (user_id, type, entity_id)
);

COMMENT ON TABLE notifications IS 'Notifikasi in-app per-pengguna (M6). Idempoten via UNIQUE(user_id,type,entity_id).';

-- ─── Indexes ───────────────────────────────────────────────
-- Daftar + hitung belum-dibaca per pengguna (terbaru dulu).
CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications(user_id, created_at DESC);
-- Hitung belum-dibaca cepat (parsial).
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id) WHERE read_at IS NULL;

-- ─── RLS lockdown (service-role only; konsisten dg 019) ─────
DO $$
DECLARE
    pol text;
BEGIN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol);
    END LOOP;
    EXECUTE 'CREATE POLICY "service_role_all" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'REVOKE ALL ON public.notifications FROM anon, authenticated';
END $$;
