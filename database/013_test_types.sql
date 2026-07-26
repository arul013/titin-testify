-- ============================================================
-- Learning Nexus CBT — Multi-Jenis-Tes (Test Types taxonomy)
-- Run in Supabase SQL Editor (after 012_exam_engine.sql)
--
-- Fase A: menjadikan "Jenis Tes" dimensi paling atas (ITP/iBT/IELTS/TOEIC/…).
-- Skill (section) & Soal & Ujian jadi milik satu jenis tes. Registry
-- test_types + test_type_skills bersifat DATA (admin-CRUD), bukan enum keras,
-- supaya jenis tes bisa ditambah sebanyak apa pun tanpa migrasi baru.
--
-- Bergantung pada helper migrasi 001/003/004:
--   check_is_admin(uuid), update_updated_at_column()
-- ============================================================

-- ─── 1. test_types (registry jenis tes) ─────────────────────
CREATE TABLE IF NOT EXISTS test_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,                 -- 'itp' | 'ibt' | 'ielts' | 'toeic' | ...
    name VARCHAR(120) NOT NULL,
    description TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'soon', 'disabled')),
    allow_custom BOOLEAN NOT NULL DEFAULT TRUE,       -- boleh dibuat ujian mode "custom" berbasis jenis ini
    sort_order INT NOT NULL DEFAULT 0,
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,         -- bawaan sistem (lindungi dari hapus)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE test_types IS 'Registry jenis tes (ITP/iBT/IELTS/TOEIC/…). Dimensi teratas taksonomi Jenis→Skill→Soal.';
COMMENT ON COLUMN test_types.status IS 'active = bisa dipilih; soon = tampil badge & belum bisa dipakai; disabled = disembunyikan';

CREATE INDEX IF NOT EXISTS idx_test_types_status ON test_types(status);

-- ─── 2. test_type_skills (skill per jenis + preset full-test) ─
CREATE TABLE IF NOT EXISTS test_type_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_type_id UUID NOT NULL REFERENCES test_types(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL,                          -- 'listening' | 'structure' | 'written_expression' | 'reading' | 'speaking' | 'writing' | ...
    name VARCHAR(120) NOT NULL,
    scorable BOOLEAN NOT NULL DEFAULT TRUE,             -- MCQ auto-skor? (Speaking/Writing = FALSE)
    full_test_count INT NOT NULL DEFAULT 0,             -- jumlah soal preset untuk full test standar
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (test_type_id, code)
);

COMMENT ON TABLE test_type_skills IS 'Skill (bagian) milik satu jenis tes + jumlah preset untuk full test.';
COMMENT ON COLUMN test_type_skills.scorable IS 'FALSE untuk Speaking/Writing (rubrik manusia, bukan MCQ auto-skor).';

CREATE INDEX IF NOT EXISTS idx_test_type_skills_type ON test_type_skills(test_type_id);

-- ─── 3. Tag soal dengan jenis tes ───────────────────────────
ALTER TABLE questions ADD COLUMN IF NOT EXISTS test_type VARCHAR(30) NOT NULL DEFAULT 'itp';
-- Longgarkan CHECK section (skill valid kini dinamis per jenis tes; divalidasi di app layer)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_section_check;
CREATE INDEX IF NOT EXISTS idx_questions_test_type ON questions(test_type);
COMMENT ON COLUMN questions.test_type IS 'Jenis tes pemilik soal (FK lunak → test_types.code). Data lama = itp.';
COMMENT ON COLUMN questions.section IS 'Kode skill dalam jenis tes (divalidasi app terhadap test_type_skills).';

-- ─── 3b. Tag materi (passage) dengan jenis tes ──────────────
ALTER TABLE question_passages ADD COLUMN IF NOT EXISTS test_type VARCHAR(30) NOT NULL DEFAULT 'itp';
ALTER TABLE question_passages DROP CONSTRAINT IF EXISTS question_passages_type_check;
CREATE INDEX IF NOT EXISTS idx_qp_test_type ON question_passages(test_type);
COMMENT ON COLUMN question_passages.test_type IS 'Jenis tes pemilik materi (FK lunak → test_types.code). Data lama = itp.';

-- ─── 4. Longgarkan CHECK section pada komposisi ujian ───────
ALTER TABLE exam_sections DROP CONSTRAINT IF EXISTS exam_sections_section_check;

-- ─── 5. Tag ujian dengan jenis tes + mode ───────────────────
ALTER TABLE exams ADD COLUMN IF NOT EXISTS test_type VARCHAR(30) NOT NULL DEFAULT 'itp';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(15) NOT NULL DEFAULT 'custom'
    CHECK (exam_mode IN ('full', 'custom'));
CREATE INDEX IF NOT EXISTS idx_exams_test_type ON exams(test_type);
COMMENT ON COLUMN exams.exam_mode IS 'full = preset terkunci + validasi EKSAK; custom = komposisi bebas + toleran (%).';

-- ─── 6. RLS: hanya admin yang mengelola registry ────────────
ALTER TABLE test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_type_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read test_types" ON test_types;
DROP POLICY IF EXISTS "Admin write test_types" ON test_types;
DROP POLICY IF EXISTS "Admin delete test_types" ON test_types;
DROP POLICY IF EXISTS "Service role full access test_types" ON test_types;

CREATE POLICY "Admin read test_types" ON test_types
    FOR SELECT USING (check_is_admin(auth.uid()));
CREATE POLICY "Admin write test_types" ON test_types
    FOR INSERT WITH CHECK (check_is_admin(auth.uid()));
CREATE POLICY "Admin update test_types" ON test_types
    FOR UPDATE USING (check_is_admin(auth.uid()));
-- Hapus hanya jenis non-bawaan
CREATE POLICY "Admin delete test_types" ON test_types
    FOR DELETE USING (check_is_admin(auth.uid()) AND is_builtin = FALSE);
CREATE POLICY "Service role full access test_types" ON test_types
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admin read test_type_skills" ON test_type_skills;
DROP POLICY IF EXISTS "Admin write test_type_skills" ON test_type_skills;
DROP POLICY IF EXISTS "Service role full access test_type_skills" ON test_type_skills;

CREATE POLICY "Admin read test_type_skills" ON test_type_skills
    FOR SELECT USING (check_is_admin(auth.uid()));
CREATE POLICY "Admin write test_type_skills" ON test_type_skills
    FOR ALL USING (check_is_admin(auth.uid())) WITH CHECK (check_is_admin(auth.uid()));
CREATE POLICY "Service role full access test_type_skills" ON test_type_skills
    FOR ALL USING (auth.role() = 'service_role');

-- ─── 7. Trigger updated_at ──────────────────────────────────
DROP TRIGGER IF EXISTS update_test_types_updated_at ON test_types;
CREATE TRIGGER update_test_types_updated_at
    BEFORE UPDATE ON test_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_type_skills_updated_at ON test_type_skills;
CREATE TRIGGER update_test_type_skills_updated_at
    BEFORE UPDATE ON test_type_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 8. Seed: TOEFL ITP (active) + iBT/IELTS/TOEIC (soon) ────
INSERT INTO test_types (code, name, description, status, allow_custom, sort_order, is_builtin)
SELECT 'itp', 'TOEFL ITP',
       'Institutional Testing Program — Listening, Structure & Written Expression, Reading (140 soal).',
       'active', TRUE, 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM test_types WHERE code = 'itp');

INSERT INTO test_types (code, name, description, status, allow_custom, sort_order, is_builtin)
SELECT 'ibt', 'TOEFL iBT',
       'Internet-Based Test — Reading, Listening, Speaking, Writing (Speaking/Writing rubrik manusia).',
       'soon', FALSE, 20, TRUE
WHERE NOT EXISTS (SELECT 1 FROM test_types WHERE code = 'ibt');

INSERT INTO test_types (code, name, description, status, allow_custom, sort_order, is_builtin)
SELECT 'ielts', 'IELTS',
       'Listening, Reading, Writing, Speaking (Writing/Speaking rubrik manusia).',
       'soon', FALSE, 30, TRUE
WHERE NOT EXISTS (SELECT 1 FROM test_types WHERE code = 'ielts');

INSERT INTO test_types (code, name, description, status, allow_custom, sort_order, is_builtin)
SELECT 'toeic', 'TOEIC',
       'Listening & Reading.',
       'soon', FALSE, 40, TRUE
WHERE NOT EXISTS (SELECT 1 FROM test_types WHERE code = 'toeic');

-- Skill ITP + preset full test (Structure 15 + Written Expression 25 = seksi S&WE 40)
INSERT INTO test_type_skills (test_type_id, code, name, scorable, full_test_count, sort_order)
SELECT tt.id, v.code, v.name, TRUE, v.cnt, v.ord
FROM test_types tt
JOIN (VALUES
    ('listening',          'Listening Comprehension', 50, 10),
    ('structure',          'Structure',               15, 20),
    ('written_expression', 'Written Expression',      25, 30),
    ('reading',            'Reading Comprehension',   50, 40)
) AS v(code, name, cnt, ord) ON TRUE
WHERE tt.code = 'itp'
  AND NOT EXISTS (
      SELECT 1 FROM test_type_skills s WHERE s.test_type_id = tt.id AND s.code = v.code
  );

-- Catatan: skill iBT/IELTS/TOEIC ditambah saat jenisnya benar-benar digarap
-- (termasuk penanganan Speaking/Writing non-MCQ). Jangan seed angka karangan.
