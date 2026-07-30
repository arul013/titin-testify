-- ============================================================
-- Learning Nexus CBT — RLS Lockdown / "Tutup Data API Publik" (F2.e, Opsi A)
-- Run in Supabase SQL Editor (after 018_login_lockout.sql)
--
-- Arsitektur app = BACKEND-ONLY: semua akses data lewat FastAPI (service-role,
-- yang MEM-BYPASS RLS). Frontend memakai anon key HANYA untuk auth (gotrue),
-- tak pernah query data (`.from()` = 0).
--
-- Masalah: policy lama memberi peran `authenticated` akses data LANGSUNG lewat
-- PostgREST publik (anon key publik). Contoh bahaya: peserta bisa `PATCH`
-- exam_attempts miliknya → set score/ubah status, atau ubah jawaban pasca-submit,
-- MELEWATI backend (timer/skoring). `audit_events` bahkan belum ber-RLS.
--
-- Solusi: tutup total data API publik.
--   - RLS ON di semua tabel public + HAPUS semua policy anon/authenticated.
--   - Sisakan satu policy service_role (belt; service_role juga bypass RLS).
--   - REVOKE privilege anon/authenticated (sabuk pengaman ekstra).
-- Hasil: PostgREST publik → kosong/forbidden utk anon/authenticated; backend
-- (service-role) tetap jalan; auth (gotrue, schema `auth`) tak terpengaruh.
--
-- CATATAN: bila suatu saat butuh akses klien-langsung (mis. realtime monitoring),
-- tambahkan policy spesifik SECARA SENGAJA saat itu — bukan lubang blanket.
-- ============================================================

DO $$
DECLARE
    t    text;
    pol  text;
    tables text[] := ARRAY[
        'profiles',
        'question_passages',
        'questions',
        'exams',
        'exam_sections',
        'exam_pool_units',
        'exam_participants',
        'exam_questions',
        'exam_attempts',
        'exam_attempt_answers',
        'scoring_schemes',
        'test_types',
        'test_type_skills',
        'audit_events'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- 1) Pastikan RLS aktif
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- 2) Hapus SEMUA policy yang ada (termasuk anon/authenticated lama)
        FOR pol IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
        END LOOP;

        -- 3) Sisakan satu policy service_role (belt-and-suspenders)
        EXECUTE format(
            'CREATE POLICY "service_role_all" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
            t
        );

        -- 4) Cabut grant langsung dari peran API publik
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

-- Verifikasi cepat (opsional, jalankan terpisah):
--   SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname='public' ORDER BY tablename;
--   → tiap tabel hanya punya "service_role_all".
