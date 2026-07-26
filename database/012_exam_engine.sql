-- ============================================================
-- Learning Nexus CBT — Phase 4: Exam Engine (peserta mengerjakan ujian)
-- Run this SQL in Supabase SQL Editor (after 011_exams_scoring.sql)
--
-- P4.0: snapshot soal terakit (dibekukan saat publish) + percobaan + jawaban.
-- Bergantung helper 001/004: check_exam_owner(uuid,uuid), update_updated_at_column()
-- ============================================================

-- ─── 1. exam_questions: snapshot soal (dibekukan saat Tayangkan) ──
-- Konten di-copy (denormalisasi) → ujian kebal perubahan Bank Soal setelah tayang.
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section VARCHAR(30) NOT NULL,
    position INTEGER NOT NULL,                                  -- urutan global dalam ujian
    source_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,  -- jejak sumber; konten sudah beku
    correct_answer VARCHAR(1) NOT NULL,                        -- disimpan terpisah; TAK dikirim ke peserta
    payload JSONB NOT NULL,                                    -- konten render peserta (stem/opsi/materi), TANPA kunci
    UNIQUE (exam_id, position)
);
COMMENT ON TABLE exam_questions IS 'Snapshot beku set soal ujian (dibuat saat publish); payload untuk render peserta tanpa kunci jawaban';
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);

-- ─── 2. exam_attempts: percobaan peserta ─────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status VARCHAR(15) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expired')),
    score NUMERIC,
    passed BOOLEAN,
    total_questions INTEGER,
    total_correct INTEGER,
    score_detail JSONB,                                        -- rincian per bagian
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE exam_attempts IS 'Percobaan peserta mengerjakan ujian; skor dihitung via skema penilaian saat submit';
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_user ON exam_attempts(exam_id, user_id);

-- ─── 3. exam_attempt_answers: jawaban per soal ───────────────
CREATE TABLE IF NOT EXISTS exam_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    exam_question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    selected_answer VARCHAR(1),                                -- 'a'..'d' atau NULL (belum dijawab)
    is_correct BOOLEAN,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (attempt_id, exam_question_id)
);
COMMENT ON TABLE exam_attempt_answers IS 'Jawaban peserta per soal (autosave); is_correct diisi saat submit';
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON exam_attempt_answers(attempt_id);

-- ─── 4. RLS ──────────────────────────────────────────────────
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempt_answers ENABLE ROW LEVEL SECURITY;

-- exam_questions: HANYA pemilik ujian (admin) + service role.
-- Peserta TAK boleh SELECT langsung (mengandung correct_answer) — dilayani backend tanpa kunci.
DROP POLICY IF EXISTS "Owner manage exam_questions" ON exam_questions;
DROP POLICY IF EXISTS "Service role full access exam_questions" ON exam_questions;
CREATE POLICY "Owner manage exam_questions" ON exam_questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_questions.exam_id AND check_exam_owner(auth.uid(), e.created_by))
    );
CREATE POLICY "Service role full access exam_questions" ON exam_questions
    FOR ALL USING (auth.role() = 'service_role');

-- exam_attempts: peserta kelola miliknya; pemilik ujian boleh lihat; service role.
DROP POLICY IF EXISTS "Participant manage own attempt" ON exam_attempts;
DROP POLICY IF EXISTS "Owner view exam attempts" ON exam_attempts;
DROP POLICY IF EXISTS "Service role full access exam_attempts" ON exam_attempts;
CREATE POLICY "Participant manage own attempt" ON exam_attempts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner view exam attempts" ON exam_attempts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_attempts.exam_id AND check_exam_owner(auth.uid(), e.created_by))
    );
CREATE POLICY "Service role full access exam_attempts" ON exam_attempts
    FOR ALL USING (auth.role() = 'service_role');

-- exam_attempt_answers: peserta kelola jawaban attempt miliknya; pemilik ujian lihat; service role.
DROP POLICY IF EXISTS "Participant manage own answers" ON exam_attempt_answers;
DROP POLICY IF EXISTS "Owner view exam answers" ON exam_attempt_answers;
DROP POLICY IF EXISTS "Service role full access exam_answers" ON exam_attempt_answers;
CREATE POLICY "Participant manage own answers" ON exam_attempt_answers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exam_attempts a WHERE a.id = exam_attempt_answers.attempt_id AND a.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM exam_attempts a WHERE a.id = exam_attempt_answers.attempt_id AND a.user_id = auth.uid())
    );
CREATE POLICY "Owner view exam answers" ON exam_attempt_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_attempts a
            JOIN exams e ON e.id = a.exam_id
            WHERE a.id = exam_attempt_answers.attempt_id AND check_exam_owner(auth.uid(), e.created_by)
        )
    );
CREATE POLICY "Service role full access exam_answers" ON exam_attempt_answers
    FOR ALL USING (auth.role() = 'service_role');

-- ─── 5. updated_at trigger untuk jawaban (autosave) ──────────
DROP TRIGGER IF EXISTS update_attempt_answers_updated_at ON exam_attempt_answers;
CREATE TRIGGER update_attempt_answers_updated_at
    BEFORE UPDATE ON exam_attempt_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
