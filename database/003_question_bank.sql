-- ============================================================
-- Learning Nexus CBT — Phase 2: Question Bank Migration
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- ─── 1. Question Passages Table ─────────────────────────────
-- Parent table for grouped questions (Reading passages, Listening audio groups, etc.)

CREATE TABLE IF NOT EXISTS question_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('listening', 'structure', 'written_expression', 'reading')),
    content TEXT,                          -- Passage text (Reading/Structure/Written Expression)
    audio_url TEXT,                        -- Audio file URL for Listening passages (Supabase Storage)
    status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE question_passages IS 'Parent passages for grouped questions (1 passage : N questions)';
COMMENT ON COLUMN question_passages.type IS 'Passage type: listening, structure, written_expression, reading';
COMMENT ON COLUMN question_passages.content IS 'Passage text content. For Written Expression, use __word__ to mark underlined words';
COMMENT ON COLUMN question_passages.audio_url IS 'Audio URL from Supabase Storage for Listening passages';


-- ─── 2. Questions Table ─────────────────────────────────────
-- Individual question items (can be standalone or linked to a passage)

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES question_passages(id) ON DELETE CASCADE,  -- NULL = standalone question
    section VARCHAR(30) NOT NULL CHECK (section IN ('listening', 'structure', 'written_expression', 'reading')),
    difficulty VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,           -- The question prompt
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
    explanation TEXT,                      -- Optional answer explanation
    status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    tags JSONB DEFAULT '[]'::jsonb,        -- Array of topic tags, e.g. ["Tenses", "Vocabulary"]
    sort_order INTEGER DEFAULT 0,          -- Order within a passage group
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE questions IS 'Individual MCQ questions, optionally linked to a passage parent';
COMMENT ON COLUMN questions.passage_id IS 'FK to question_passages. NULL for standalone questions';
COMMENT ON COLUMN questions.section IS 'Question section: listening, structure, written_expression, reading';
COMMENT ON COLUMN questions.tags IS 'JSONB array of topic tags for filtering and analytics';
COMMENT ON COLUMN questions.sort_order IS 'Display order within a passage group';


-- ─── 3. Indexes ─────────────────────────────────────────────

-- question_passages indexes
CREATE INDEX IF NOT EXISTS idx_qp_created_by ON question_passages(created_by);
CREATE INDEX IF NOT EXISTS idx_qp_type ON question_passages(type);
CREATE INDEX IF NOT EXISTS idx_qp_status ON question_passages(status);
CREATE INDEX IF NOT EXISTS idx_qp_created_at ON question_passages(created_at DESC);

-- questions indexes
CREATE INDEX IF NOT EXISTS idx_q_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_q_passage_id ON questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_q_section ON questions(section);
CREATE INDEX IF NOT EXISTS idx_q_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_q_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_q_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_q_sort_order ON questions(passage_id, sort_order);


-- ─── 4. Enable Row Level Security ──────────────────────────

ALTER TABLE question_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;


-- ─── 5. RLS Helper Function ────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_question_owner(user_id UUID, owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin can access all questions
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'super_admin') THEN
        RETURN TRUE;
    END IF;
    -- Admin can only access their own questions
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin') THEN
        RETURN user_id = owner_id;
    END IF;
    -- Peserta cannot access question bank at all
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 6. RLS Policies: question_passages ─────────────────────

DROP POLICY IF EXISTS "Admin can view own passages" ON question_passages;
DROP POLICY IF EXISTS "Super admin can view all passages" ON question_passages;
DROP POLICY IF EXISTS "Admin can create passages" ON question_passages;
DROP POLICY IF EXISTS "Owner can update passages" ON question_passages;
DROP POLICY IF EXISTS "Owner can delete passages" ON question_passages;
DROP POLICY IF EXISTS "Service role full access passages" ON question_passages;

-- SELECT: Admin sees own, Super Admin sees all
CREATE POLICY "Admin can view own passages" ON question_passages
    FOR SELECT USING (
        check_question_owner(auth.uid(), created_by)
    );

-- INSERT: Admin/Super Admin can create
CREATE POLICY "Admin can create passages" ON question_passages
    FOR INSERT WITH CHECK (
        check_is_admin(auth.uid()) AND created_by = auth.uid()
    );

-- UPDATE: Owner or Super Admin
CREATE POLICY "Owner can update passages" ON question_passages
    FOR UPDATE USING (
        check_question_owner(auth.uid(), created_by)
    );

-- DELETE: Owner or Super Admin
CREATE POLICY "Owner can delete passages" ON question_passages
    FOR DELETE USING (
        check_question_owner(auth.uid(), created_by)
    );

-- Service role bypass
CREATE POLICY "Service role full access passages" ON question_passages
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 7. RLS Policies: questions ─────────────────────────────

DROP POLICY IF EXISTS "Admin can view own questions" ON questions;
DROP POLICY IF EXISTS "Super admin can view all questions" ON questions;
DROP POLICY IF EXISTS "Admin can create questions" ON questions;
DROP POLICY IF EXISTS "Owner can update questions" ON questions;
DROP POLICY IF EXISTS "Owner can delete questions" ON questions;
DROP POLICY IF EXISTS "Service role full access questions" ON questions;

-- SELECT: Admin sees own, Super Admin sees all
CREATE POLICY "Admin can view own questions" ON questions
    FOR SELECT USING (
        check_question_owner(auth.uid(), created_by)
    );

-- INSERT: Admin/Super Admin can create
CREATE POLICY "Admin can create questions" ON questions
    FOR INSERT WITH CHECK (
        check_is_admin(auth.uid()) AND created_by = auth.uid()
    );

-- UPDATE: Owner or Super Admin
CREATE POLICY "Owner can update questions" ON questions
    FOR UPDATE USING (
        check_question_owner(auth.uid(), created_by)
    );

-- DELETE: Owner or Super Admin
CREATE POLICY "Owner can delete questions" ON questions
    FOR DELETE USING (
        check_question_owner(auth.uid(), created_by)
    );

-- Service role bypass
CREATE POLICY "Service role full access questions" ON questions
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 8. Auto-update updated_at triggers ─────────────────────

CREATE TRIGGER update_question_passages_updated_at
    BEFORE UPDATE ON question_passages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
