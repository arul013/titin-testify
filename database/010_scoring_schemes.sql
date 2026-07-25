-- ============================================================
-- Learning Nexus CBT — Manajemen Ujian: Skema Penilaian (Scoring Schemes)
-- Run this SQL in Supabase SQL Editor (after 004_exams.sql)
--
-- Fase A (fondasi penilaian): tabel reference `scoring_schemes` yang dipakai
-- ulang banyak ujian. Fokus awal keluarga "Custom (%)". Skema STANDAR resmi
-- (TOEFL ITP 310–677, IELTS band) ditambah kemudian dengan TABEL KONVERSI
-- RESMI TERVERIFIKASI (angka tidak boleh dikarang) → lihat docs.
--
-- Bergantung pada helper migrasi 001/003/004:
--   check_is_admin(uuid), check_exam_owner(uuid,uuid), update_updated_at_column()
-- ============================================================

CREATE TABLE IF NOT EXISTS scoring_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,   -- NULL untuk skema bawaan (built-in)
    name VARCHAR(120) NOT NULL,
    family VARCHAR(15) NOT NULL CHECK (family IN ('standard', 'custom')),
    test_type VARCHAR(30) NOT NULL,                              -- 'toefl_itp' | 'ielts' | 'custom' | ...
    config JSONB NOT NULL DEFAULT '{}'::jsonb,                   -- bagian, bobot, tabel/rumus, skala, aturan lulus
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,                   -- bawaan (read-only) vs custom milik admin
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE scoring_schemes IS 'Skema penilaian ujian (reference); dipakai ulang banyak paket ujian';
COMMENT ON COLUMN scoring_schemes.family IS 'standard = tabel resmi (TOEFL/IELTS); custom = berbasis % benar';
COMMENT ON COLUMN scoring_schemes.config IS 'JSONB fleksibel: tipe skor, bobot per bagian, tabel konversi/rumus, skala, unit & ambang lulus';
COMMENT ON COLUMN scoring_schemes.is_builtin IS 'TRUE = bawaan sistem (read-only, created_by NULL)';

CREATE INDEX IF NOT EXISTS idx_scoring_schemes_created_by ON scoring_schemes(created_by);
CREATE INDEX IF NOT EXISTS idx_scoring_schemes_builtin ON scoring_schemes(is_builtin);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE scoring_schemes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view builtin or own scheme" ON scoring_schemes;
DROP POLICY IF EXISTS "Admin create scheme" ON scoring_schemes;
DROP POLICY IF EXISTS "Owner update scheme" ON scoring_schemes;
DROP POLICY IF EXISTS "Owner delete scheme" ON scoring_schemes;
DROP POLICY IF EXISTS "Service role full access scoring_schemes" ON scoring_schemes;

-- SELECT: bawaan terlihat semua admin; custom terlihat pemilik/super admin
CREATE POLICY "Admin view builtin or own scheme" ON scoring_schemes
    FOR SELECT USING (
        (is_builtin = TRUE AND check_is_admin(auth.uid()))
        OR check_exam_owner(auth.uid(), created_by)
    );

-- INSERT: admin/super admin membuat skema custom (bukan built-in)
CREATE POLICY "Admin create scheme" ON scoring_schemes
    FOR INSERT WITH CHECK (
        check_is_admin(auth.uid()) AND created_by = auth.uid() AND is_builtin = FALSE
    );

-- UPDATE / DELETE: pemilik (atau super admin), tak boleh menyentuh built-in
CREATE POLICY "Owner update scheme" ON scoring_schemes
    FOR UPDATE USING (is_builtin = FALSE AND check_exam_owner(auth.uid(), created_by));
CREATE POLICY "Owner delete scheme" ON scoring_schemes
    FOR DELETE USING (is_builtin = FALSE AND check_exam_owner(auth.uid(), created_by));

CREATE POLICY "Service role full access scoring_schemes" ON scoring_schemes
    FOR ALL USING (auth.role() = 'service_role');

-- ─── updated_at trigger ─────────────────────────────────────
DROP TRIGGER IF EXISTS update_scoring_schemes_updated_at ON scoring_schemes;
CREATE TRIGGER update_scoring_schemes_updated_at
    BEFORE UPDATE ON scoring_schemes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Seed: skema bawaan Custom % (default siap pakai) ───────
INSERT INTO scoring_schemes (created_by, name, family, test_type, config, is_builtin)
SELECT NULL,
       'Persentase (semua bagian setara)',
       'custom',
       'custom',
       '{"type":"percentage","weighting":"equal","passing_unit":"percent","scale":{"min":0,"max":100}}'::jsonb,
       TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM scoring_schemes WHERE is_builtin = TRUE AND name = 'Persentase (semua bagian setara)'
);

-- Catatan: skema STANDAR resmi (TOEFL ITP 310–677, IELTS band) DITAMBAH KEMUDIAN
-- dengan tabel konversi resmi terverifikasi. Jangan seed angka karangan.
