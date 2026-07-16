-- ============================================================
-- Learning Nexus CBT — Phase 1: Foundation Migration
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- ─── 1. Profiles Table ───────────────────────────────────────
-- Extends Supabase Auth users with application-specific data

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'peserta' 
        CHECK (role IN ('super_admin', 'admin', 'peserta')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles extending Supabase Auth with CBT-specific data';
COMMENT ON COLUMN profiles.role IS 'User role: super_admin, admin, or peserta';

-- ─── 2. Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ─── 3. Enable Row Level Security ────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS Helper Functions (Avoid Infinite Recursion) ──────

CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 5. RLS Policies ────────────────────────────────────────

-- Drop existing policies if they exist to prevent duplication errors during re-runs
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        check_is_admin(auth.uid())
    );

-- Admins can create profiles (for creating peserta accounts)
CREATE POLICY "Admins can create profiles" ON profiles
    FOR INSERT WITH CHECK (
        check_is_admin(auth.uid())
    );

-- Admins can update profiles
CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE USING (
        check_is_admin(auth.uid())
    );

-- SECURITY NOTE: "Users can update own profile" policy has been intentionally
-- REMOVED to prevent privilege escalation. Without column-level restrictions,
-- any authenticated user could change their own role to 'super_admin'.
-- All profile modifications MUST go through the backend API (service_role key).

-- Only super_admin can delete profiles
CREATE POLICY "Super admins can delete profiles" ON profiles
    FOR DELETE USING (
        check_is_super_admin(auth.uid())
    );

-- Service role can do everything (for backend admin operations)
CREATE POLICY "Service role full access" ON profiles
    FOR ALL USING (auth.role() = 'service_role');


-- ─── 5. Auto-update updated_at trigger ───────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── 6. Initial Super Admin (Optional) ──────────────────────
-- After creating your first user via Supabase Auth dashboard,
-- run this to make them a super_admin:
-- 
-- INSERT INTO profiles (id, username, full_name, role)
-- VALUES (
--     'YOUR-AUTH-USER-UUID-HERE',
--     'superadmin',
--     'Super Administrator',
--     'super_admin'
-- );
