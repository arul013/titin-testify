-- ============================================================
-- Learning Nexus CBT — Fondasi Auditability & Integritas Data (F3.0)
-- Run in Supabase SQL Editor (after 015_pool_subset_fix.sql)
--
-- Menyiapkan pilar auditability:
--   1) audit_events  — log append-only semua aksi sensitif (siapa/kapan/before→after)
--   2) soft-delete   — deleted_at pada exams/questions/question_passages (jangan hard-delete data historis)
--   3) concurrency   — version pada exams (optimistic locking, cegah tabrakan edit)
--   4) jejak aktor   — updated_by pada exams/questions/question_passages
-- ============================================================

-- ─── 1. Audit events (append-only) ──────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = sistem/otomatis
    actor_role   VARCHAR(20),
    action       VARCHAR(60) NOT NULL,          -- mis. 'exam.publish', 'exam.extend', 'exam.close'
    entity_type  VARCHAR(40) NOT NULL,          -- mis. 'exam', 'question', 'attempt'
    entity_id    UUID,
    summary      TEXT,                           -- ringkasan human-readable
    before_json  JSONB,
    after_json   JSONB,
    ip           VARCHAR(64),
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_events IS 'Log append-only aksi sensitif (auditability). JANGAN update/delete baris.';

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_events(action, created_at DESC);

-- Append-only guard: cegah UPDATE/DELETE pada audit_events.
CREATE OR REPLACE FUNCTION public.audit_events_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_events bersifat append-only (UPDATE/DELETE dilarang).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_events_no_update ON audit_events;
CREATE TRIGGER trg_audit_events_no_update
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION public.audit_events_block_mutation();

-- ─── 2. Soft-delete ─────────────────────────────────────────
ALTER TABLE exams              ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE questions          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE question_passages  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN exams.deleted_at IS 'Soft-delete: NULL = aktif. Data historis tak dihapus permanen.';

-- Index parsial: percepat query "yang masih aktif".
CREATE INDEX IF NOT EXISTS idx_exams_active     ON exams(id)             WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(id)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qp_active        ON question_passages(id) WHERE deleted_at IS NULL;

-- ─── 3. Optimistic concurrency (exams) ──────────────────────
ALTER TABLE exams ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
COMMENT ON COLUMN exams.version IS 'Optimistic locking: naik tiap update; klien kirim version untuk cegah tabrakan.';

-- ─── 4. Jejak aktor (updated_by) ────────────────────────────
ALTER TABLE exams              ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE questions          ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE question_passages  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
