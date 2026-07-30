-- ============================================================
-- Learning Nexus CBT — Fondasi Model Soal Ekstensibel (F1.0)
-- Run in Supabase SQL Editor (after 019_rls_lockdown.sql)
--
-- Menyiapkan SKEMA untuk multi-tipe soal (ITP/TOEIC/iBT/IELTS) tanpa rombak
-- fondasi. Semua kolom baru nullable/ber-default → MCQ existing TAK berubah
-- (question_type default 'mcq_single'). BELUM ada UI/logika tipe baru (F1.1+).
--
-- Prinsip: extensible by data (question_type enum + JSONB), bukan tabel-per-tipe.
-- Tabel baru (rubrics) WAJIB ikut lockdown F2.e (RLS + service_role_all + REVOKE).
-- ============================================================

-- ─── 1. Rubrics (reusable, untuk penilaian manual: essay/speaking) ───
CREATE TABLE IF NOT EXISTS rubrics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    test_type   VARCHAR(30),                       -- NULL = umum/lintas jenis tes
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    criteria    JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, max_score, descriptors?}]
    max_total   NUMERIC,
    is_builtin  BOOLEAN NOT NULL DEFAULT FALSE,
    status      VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    deleted_at  TIMESTAMPTZ,
    updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rubrics_created_by ON rubrics(created_by);
CREATE INDEX IF NOT EXISTS idx_rubrics_active ON rubrics(id) WHERE deleted_at IS NULL;

-- Lockdown (konsisten F2.e): hanya service_role, tutup anon/authenticated.
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON rubrics;
CREATE POLICY "service_role_all" ON rubrics FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON rubrics FROM anon, authenticated;

-- ─── 2. Peran 'grader' (permission diwire di F1.2) ───
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'admin', 'grader', 'peserta'));

-- ─── 3. questions: tipe soal + JSONB + relax constraint MCQ ───
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) NOT NULL DEFAULT 'mcq_single';
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (
    question_type IN (
        'mcq_single','mcq_multi','true_false_ng','matching','fill_blank',
        'short_answer','ordering','insert_text','essay','speaking'
    )
);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS content_json JSONB;   -- render spesifik-tipe (mis. options[])
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_json  JSONB;   -- kunci/konfig nilai spesifik-tipe
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(10) NOT NULL DEFAULT 'auto';
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_scoring_mode_check;
ALTER TABLE questions ADD CONSTRAINT questions_scoring_mode_check CHECK (scoring_mode IN ('auto','manual'));
ALTER TABLE questions ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS max_score NUMERIC NOT NULL DEFAULT 1;

-- Relax constraint MCQ-only agar tipe non-MCQ muat (MCQ lama tetap pakai kolom ini).
ALTER TABLE questions ALTER COLUMN option_a DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN option_b DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN option_c DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN option_d DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_answer_check;  -- (a-d) tak lagi wajib
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_section_check;         -- section per jenis tes (test_type_skills)

-- ─── 4. exam_attempt_answers: jawaban generik + grading manual ───
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS answer_json      JSONB;      -- multi/matching/fill/teks/urutan
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS answer_audio_url TEXT;       -- jawaban Speaking (R2)
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS is_correct       BOOLEAN;    -- auto (null=belum/ tak berlaku)
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS awarded_score    NUMERIC;
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS max_score        NUMERIC;
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS graded_by        UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS graded_at        TIMESTAMPTZ;
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS rubric_scores    JSONB;      -- skor per kriteria rubrik
ALTER TABLE exam_attempt_answers ADD COLUMN IF NOT EXISTS feedback         TEXT;

-- ─── 5. exam_questions (snapshot beku): bawa tipe + kunci terpisah ───
-- content_json → MASUK payload peserta. answer_json/rubric_json → TAK ke payload.
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) NOT NULL DEFAULT 'mcq_single';
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS content_json  JSONB;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS answer_json   JSONB;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS scoring_mode  VARCHAR(10) NOT NULL DEFAULT 'auto';
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS max_score     NUMERIC NOT NULL DEFAULT 1;
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS rubric_json   JSONB;   -- snapshot rubrik (TAK ke payload)

-- ─── 6. exam_attempts: status grading manual ───
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS grading_status VARCHAR(15) NOT NULL DEFAULT 'not_required';
ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_grading_status_check;
ALTER TABLE exam_attempts ADD CONSTRAINT exam_attempts_grading_status_check
    CHECK (grading_status IN ('not_required', 'pending', 'complete'));

-- ─── 7. exam_sections: timing per-bagian (dipakai runner di F1.4) ───
ALTER TABLE exam_sections ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;

COMMENT ON COLUMN questions.question_type IS 'Tipe soal: mcq_single|mcq_multi|true_false_ng|matching|fill_blank|short_answer|ordering|insert_text|essay|speaking.';
COMMENT ON COLUMN questions.content_json IS 'Data render spesifik-tipe (mis. {options:[...]}). MCQ 4-opsi lama tetap di option_a-d.';
COMMENT ON COLUMN questions.answer_json IS 'Kunci/konfig nilai spesifik-tipe (mis. {correct:[...],choose:2}).';
COMMENT ON COLUMN exam_attempts.grading_status IS 'not_required (semua auto) | pending (menunggu grading manual) | complete.';
