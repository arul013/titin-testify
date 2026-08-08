-- ============================================================
-- Learning Nexus CBT — Masukan & Perbaikan (papan internal admin)
-- Run in Supabase SQL Editor (after 031_fix_media_base_url.sql)
--
-- Menu internal /masukan: admin & super_admin mencatat hal yang perlu
-- diperbaiki / diubah logic-nya / fitur baru. Bukan feedback peserta.
--
-- Hak edit/hapus/ubah-status: pembuat + super_admin (ditegakkan backend).
-- Akses HANYA lewat backend service-role (RLS lockdown, konsisten dg 019/024).
--
-- Skema lengkap 3 tabel dibuat sekaligus di sini; Fase 1 memakai
-- feedback_items, Fase 3 memakai feedback_comments, Fase 4 feedback_votes.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    description   TEXT NOT NULL DEFAULT '',   -- teks bertanda (aman; dirender via node, bukan innerHTML)
    category      VARCHAR(20) NOT NULL DEFAULT 'other',   -- bug|logic|feature|ui|other
    priority      VARCHAR(20) NOT NULL DEFAULT 'medium',  -- critical|high|medium|low
    status        VARCHAR(20) NOT NULL DEFAULT 'open',    -- open|in_progress|done|rejected
    comment_count INT NOT NULL DEFAULT 0,     -- denormalisasi (Fase 3)
    vote_count    INT NOT NULL DEFAULT 0,     -- denormalisasi (Fase 4)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback_items IS 'Papan Masukan & Perbaikan internal admin (perbaikan/perubahan-logic/fitur baru).';

CREATE TABLE IF NOT EXISTS feedback_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE feedback_comments IS 'Komentar/diskusi per item Masukan & Perbaikan (Fase 3).';

CREATE TABLE IF NOT EXISTS feedback_votes (
    feedback_id UUID NOT NULL REFERENCES feedback_items(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (feedback_id, user_id)
);

COMMENT ON TABLE feedback_votes IS 'Vote 1-orang-1-suara per item Masukan & Perbaikan (Fase 4).';

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feedback_items_status  ON feedback_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_items_owner   ON feedback_items(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_items_created ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_item ON feedback_comments(feedback_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_item    ON feedback_votes(feedback_id);

-- ─── RLS lockdown (service-role only; konsisten dg 019/024) ─
DO $$
DECLARE
    t   text;
    pol text;
    tables text[] := ARRAY['feedback_items', 'feedback_comments', 'feedback_votes'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
        END LOOP;
        EXECUTE format(
            'CREATE POLICY "service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            t
        );
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;
