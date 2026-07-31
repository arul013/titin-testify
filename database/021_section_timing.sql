-- 021_section_timing.sql — F1.4b: state timing per-bagian pada percobaan ujian.
--
-- Menyimpan urutan bagian + started_at/deadline per-bagian untuk ujian mode
-- "per-bagian berurutan" (gaya iBT). Null untuk ujian timer-global biasa.
--
-- Bentuk section_state (JSONB), contoh:
-- {
--   "mode": "per_section",
--   "order": ["listening", "structure", "reading"],
--   "current": 0,
--   "sections": {
--     "listening": {"started_at": "...Z", "deadline": "...Z", "status": "active"},
--     "structure": {"status": "pending"},
--     "reading":   {"status": "pending"}
--   }
-- }

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS section_state JSONB;

COMMENT ON COLUMN exam_attempts.section_state IS
  'F1.4b: state timing per-bagian (urutan + started_at/deadline per bagian). Null = timer global.';
