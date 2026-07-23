-- ============================================================
-- Learning Nexus CBT — Phase 3: Exam Builder (Manajemen Ujian)
-- Run this SQL in Supabase SQL Editor
--
-- Cakupan E0 (authoring): exams, exam_sections, exam_pool_units,
-- exam_participants. Tabel snapshot runtime (exam_attempt_questions)
-- SENGAJA ditunda ke Phase 4 (Exam Engine) karena itu data saat ujian
-- berjalan, bukan saat penyusunan paket.
--
-- Bergantung pada helper dari migrasi 001/003:
--   - check_is_admin(uuid)
--   - update_updated_at_column()
-- ============================================================


-- ─── 1. Exams (paket ujian) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    passing_grade INTEGER CHECK (passing_grade IS NULL OR (passing_grade BETWEEN 0 AND 100)),  -- OPSIONAL
    shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,   -- acak antar-UNIT (tak memecah materi)
    shuffle_options BOOLEAN NOT NULL DEFAULT FALSE,     -- acak pilihan A/B/C/D
    status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    token VARCHAR(100),                                 -- DISIAPKAN, belum dipakai (anti-cheat = fase akhir)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT exams_schedule_valid CHECK (
        starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
    )
);

COMMENT ON TABLE exams IS 'Paket ujian yang disusun admin; soal bersumber dari Bank Soal';
COMMENT ON COLUMN exams.passing_grade IS 'Nilai kelulusan 0-100 (opsional; boleh NULL)';
COMMENT ON COLUMN exams.token IS 'Disiapkan untuk anti-cheat fase akhir; belum digunakan';


-- ─── 2. Exam Sections (komposisi per section) ───────────────
-- Target jumlah soal per section. Boleh subset (mis. hanya "structure").

CREATE TABLE IF NOT EXISTS exam_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section VARCHAR(30) NOT NULL CHECK (section IN ('listening', 'structure', 'written_expression', 'reading')),
    target_count INTEGER NOT NULL CHECK (target_count > 0),  -- target total soal (unit materi utuh bisa buat total ≠ target)
    weight NUMERIC,                                          -- bobot opsional (default: setara)
    UNIQUE (exam_id, section)
);

COMMENT ON TABLE exam_sections IS 'Komposisi per section untuk satu paket ujian (blueprint)';
COMMENT ON COLUMN exam_sections.target_count IS 'Target jumlah soal; dipenuhi campuran soal tunggal + materi utuh';


-- ─── 3. Exam Pool Units (hybrid: pool dipersempit / pilih manual) ──
-- Satu baris = satu UNIT: materi utuh (passage_id) ATAU soal tunggal (question_id).
-- Kosong = ambil dari seluruh pool section (acak). Terisi = batasi ke unit ini.

CREATE TABLE IF NOT EXISTS exam_pool_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES question_passages(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    -- tepat SATU dari (passage_id, question_id) yang terisi
    CONSTRAINT exam_pool_unit_exactly_one CHECK (
        (passage_id IS NOT NULL)::int + (question_id IS NOT NULL)::int = 1
    )
);

COMMENT ON TABLE exam_pool_units IS 'Unit soal terpilih/dipersempit (materi utuh atau soal tunggal) untuk pool hybrid';


-- ─── 4. Exam Participants (whitelist peserta) ───────────────

CREATE TABLE IF NOT EXISTS exam_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (exam_id, user_id)
);

COMMENT ON TABLE exam_participants IS 'Whitelist peserta; hanya yang terdaftar boleh mengikuti ujian';


-- ─── 5. Indexes ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_schedule ON exams(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_exam_sections_exam ON exam_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_pool_units_exam ON exam_pool_units(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_pool_units_passage ON exam_pool_units(passage_id);
CREATE INDEX IF NOT EXISTS idx_exam_pool_units_question ON exam_pool_units(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam ON exam_participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_user ON exam_participants(user_id);


-- ─── 6. Enable Row Level Security ───────────────────────────

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_pool_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_participants ENABLE ROW LEVEL SECURITY;


-- ─── 7. RLS Helper: exam owner check ────────────────────────

CREATE OR REPLACE FUNCTION public.check_exam_owner(user_id UUID, owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin dapat mengakses semua paket ujian
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'super_admin') THEN
        RETURN TRUE;
    END IF;
    -- Admin hanya paket ujian miliknya
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin') THEN
        RETURN user_id = owner_id;
    END IF;
    -- Peserta tidak boleh mengelola paket ujian
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 8. RLS Policies: exams ─────────────────────────────────

DROP POLICY IF EXISTS "Admin can view own exams" ON exams;
DROP POLICY IF EXISTS "Admin can create exams" ON exams;
DROP POLICY IF EXISTS "Owner can update exams" ON exams;
DROP POLICY IF EXISTS "Owner can delete exams" ON exams;
DROP POLICY IF EXISTS "Participant can view assigned exam" ON exams;
DROP POLICY IF EXISTS "Service role full access exams" ON exams;

-- SELECT: Admin sees own, Super Admin sees all
CREATE POLICY "Admin can view own exams" ON exams
    FOR SELECT USING (check_exam_owner(auth.uid(), created_by));

-- SELECT: Peserta boleh melihat paket ujian yang menandai dirinya (untuk Phase 4)
CREATE POLICY "Participant can view assigned exam" ON exams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exam_participants ep
            WHERE ep.exam_id = exams.id AND ep.user_id = auth.uid()
        )
    );

-- INSERT: Admin/Super Admin
CREATE POLICY "Admin can create exams" ON exams
    FOR INSERT WITH CHECK (check_is_admin(auth.uid()) AND created_by = auth.uid());

-- UPDATE / DELETE: owner atau super admin
CREATE POLICY "Owner can update exams" ON exams
    FOR UPDATE USING (check_exam_owner(auth.uid(), created_by));

CREATE POLICY "Owner can delete exams" ON exams
    FOR DELETE USING (check_exam_owner(auth.uid(), created_by));

CREATE POLICY "Service role full access exams" ON exams
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 9. RLS Policies: child tables (gated ke pemilik exam induk) ──

-- exam_sections
DROP POLICY IF EXISTS "Owner manage exam_sections" ON exam_sections;
DROP POLICY IF EXISTS "Service role full access exam_sections" ON exam_sections;
CREATE POLICY "Owner manage exam_sections" ON exam_sections
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_sections.exam_id AND check_exam_owner(auth.uid(), e.created_by))
    );
CREATE POLICY "Service role full access exam_sections" ON exam_sections
    FOR ALL USING (auth.role() = 'service_role');

-- exam_pool_units
DROP POLICY IF EXISTS "Owner manage exam_pool_units" ON exam_pool_units;
DROP POLICY IF EXISTS "Service role full access exam_pool_units" ON exam_pool_units;
CREATE POLICY "Owner manage exam_pool_units" ON exam_pool_units
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_pool_units.exam_id AND check_exam_owner(auth.uid(), e.created_by))
    );
CREATE POLICY "Service role full access exam_pool_units" ON exam_pool_units
    FOR ALL USING (auth.role() = 'service_role');

-- exam_participants
DROP POLICY IF EXISTS "Owner manage exam_participants" ON exam_participants;
DROP POLICY IF EXISTS "Participant can view own assignment" ON exam_participants;
DROP POLICY IF EXISTS "Service role full access exam_participants" ON exam_participants;
CREATE POLICY "Owner manage exam_participants" ON exam_participants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_participants.exam_id AND check_exam_owner(auth.uid(), e.created_by))
    );
CREATE POLICY "Participant can view own assignment" ON exam_participants
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role full access exam_participants" ON exam_participants
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 10. Auto-update updated_at trigger ─────────────────────

DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
