-- ============================================================
-- Learning Nexus CBT — Grup/Kelas Peserta (M5.1)
-- Run in Supabase SQL Editor (after 023_exam_templates.sql)
--
-- Cohort peserta yang bisa dipakai ulang lintas ujian: admin menyimpan
-- sekumpulan peserta sebagai "grup/kelas", lalu menambahkannya ke ujian
-- sekali klik (di-expand jadi exam_participants di sisi builder).
--
-- Owner-scoped (created_by). Akses HANYA lewat backend service-role
-- (RLS lockdown, konsisten dg 019).
-- ============================================================

CREATE TABLE IF NOT EXISTS participant_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

COMMENT ON TABLE participant_groups IS 'Grup/kelas peserta (cohort) yang bisa dipakai ulang lintas ujian; owner-scoped.';

CREATE TABLE IF NOT EXISTS participant_group_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id   UUID NOT NULL REFERENCES participant_groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

COMMENT ON TABLE participant_group_members IS 'Anggota grup peserta (M5.1).';

-- ─── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_participant_groups_owner
    ON participant_groups(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pg_members_group
    ON participant_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_pg_members_user
    ON participant_group_members(user_id);

-- ─── RLS lockdown (service-role only; konsisten dg 019) ─────
DO $$
DECLARE
    t   text;
    pol text;
    tables text[] := ARRAY['participant_groups', 'participant_group_members'];
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
