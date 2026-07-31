-- 022_perf_indexes.sql — F4: index untuk kolom hot (join/filter) agar batch query cepat.
--
-- Postgres TIDAK auto-index foreign key. Kolom yang sering di-filter/join di bawah
-- ini menopang perbaikan N+1 (list_exams batch, freeze _units_for_section, submit).
-- Data masih kecil → CREATE INDEX biasa (bukan CONCURRENTLY) aman.

-- Ujian ↔ komposisi/peserta/attempt/soal
CREATE INDEX IF NOT EXISTS idx_exam_sections_exam_id       ON exam_sections(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam_id   ON exam_participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_user_id   ON exam_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id       ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id       ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id      ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_pool_units_exam_id     ON exam_pool_units(exam_id);

-- Jawaban peserta (di-join per attempt saat submit/review/grading)
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id  ON exam_attempt_answers(attempt_id);

-- Bank soal (freeze menyaring per section/status/test_type/passage)
CREATE INDEX IF NOT EXISTS idx_questions_passage_id        ON questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_questions_section_status    ON questions(section, status);
CREATE INDEX IF NOT EXISTS idx_questions_test_type         ON questions(test_type);
CREATE INDEX IF NOT EXISTS idx_passages_type_status        ON question_passages(type, status);
