# F1 — Model Soal Ekstensibel (multi-jenis-tes)

Status: **desain disepakati 2026-07-30. F1.0 (skema) siap dikoding.** Pilar F1 dari `Foundation_and_Roadmap.md`.
Tujuan: satu model yang menampung **ITP, TOEIC, iBT, IELTS** (dan ekstensi tak terduga) **tanpa rombak fondasi/DB**.

## Prinsip
Extensible **by data** (`question_type` enum + JSONB), bukan tabel-per-tipe. Tipe baru = nilai enum + bentuk JSON baru, **tanpa migrasi skema**.

## Keputusan (2026-07-30)
1. **MCQ = hybrid + opsi via JSONB.** MCQ 4-opsi lama tetap di `option_a–d` (ITP backward-compat, tanpa migrasi). Jumlah-opsi-variabel (TOEIC 3, iBT 6) via `content_json.options`. Renderer: pakai `content_json.options` bila ada, else kolom a–d.
2. **F1.0 = skema saja (tanpa UI).** MCQ existing jalan seperti biasa. Tipe baru menyusul F1.1+.
3. **Grading manual = peran `grader` + `rubrics` reusable**, kolom grading disiapkan di skema sekarang (UI di F1.2).

## Cakupan tipe soal (tervalidasi ITP/TOEIC/iBT/IELTS)
`mcq_single`, `mcq_multi` (pilih N), `true_false_ng`, `matching` (headings/features/labeling/kategorisasi), `fill_blank`/completion (±word bank), `short_answer`, `ordering`, `insert_text`, `essay` (manual), `speaking` (manual). Kasus khas (insert_text/labeling/table) = varian via `content_json`, bukan tipe/tabel baru.

## Rencana bertahap
- **F1.0 — Fondasi skema** ✅ KODE SELESAI (2026-07-30, compile+import bersih, belum commit; **migrasi 020 nunggu user jalankan**).
  - `database/020_question_model_foundation.sql`: semua kolom/tabel di §skema + lockdown F2.e utk `rubrics`.
  - Backend: `models/question.py` (Question Create/Update/Response +field F1 opsional; `correct_answer` & `option_a–d` jadi optional); `question_service.py` refactor `_q_resp()` (round-trip field baru) + create/update persist. **MCQ existing tak berubah** (default `mcq_single`/`auto`).
  - **Ditunda ke fitur yang memakainya** (DB sudah siap): wiring model `exam_sections.time_limit_minutes`, `exam_attempt_answers.*` (grading), `exam_attempts.grading_status`, `exam_questions.*` snapshot → dikerjakan di F1.1/F1.2/F1.4 saat dipakai.
  - **Catatan**: `QuestionSection` enum masih 4 nilai TOEFL (DB CHECK section sudah di-drop); diperlebar saat onboarding jenis tes non-TOEFL (F1.1/F1.4).
- **F1.1 — Tipe auto-scored** (urutan ringan→berat: **true_false_ng** → mcq_multi → fill_blank → short_answer → matching → ordering): builder + runner + scoring.
  - **F1.1.0 (pionir `true_false_ng`) — ENGINE-SIDE ✅** (2026-07-30, belum commit): T/F/NG = MCQ 3-opsi berlabel tetap (True=a/False=b/NotGiven=c) → reuse selected_answer+correct_answer+scoring. Backend `_question_payload`/`_assemble_and_freeze` alirkan `question_type`(+content_json) ke payload & snapshot. Frontend runner (`AnswerSheet`) & review (`AttemptReviewPanel`) render True/False/Not Given. Backward-compat aman.
  - **F1.1.0b — BUILDER authoring T/F/NG ✅** (2026-07-31, tsc bersih, belum commit): `useQuestionForm` (+questionType/isTFNG, effectiveFormat='tfng', buildPayload kirim question_type), `QuestionFields` (selektor Tipe Soal + picker True/False/Not-Given), `QuestionView` preview TFNG, `useQuestions.Question`+question_type. **F1.1.0 LENGKAP end-to-end (buat→ujian→kerjakan→skor→review).**
  - **F1.1.1 — `mcq_multi`** (pertama yang butuh `answer_json` + `content_json.options` variabel + set-scoring):
    - **F1.1.1a — backend plumbing ✅** (2026-07-31, belum commit): `answer_json` di AttemptQuestion/SaveAnswer/Review; `_grade()` dispatch per-tipe (mcq_multi=set match); save/start/submit/review wired. Skor mcq_multi jalan di backend.
    - **F1.1.1b — frontend main/tinjau ✅** (2026-07-31, belum commit): api.ts answer_json; ExamRunner+AnswerSheet multi-select (content_json.options variabel, batas choose-N); AttemptReviewPanel render mcq_multi. Konvensi keys 'a','b',… ; choose di content_json (publik), correct di answer_json (rahasia).
    - **F1.1.1c — builder authoring mcq_multi ✅** (2026-07-31, belum commit): useQuestionForm (multiOptions/multiCorrect, choose auto=jml benar) + QuestionFields editor opsi variabel (tambah/hapus/tandai-benar) + QuestionView preview. **F1.1.1 LENGKAP end-to-end.**
  - **F1.1.2 — `fill_blank`/completion ✅** (2026-07-31, belum commit): isian teks (answer_json={accept}/{text}), `_grade` normalisasi case-insensitive; runner Input+autosave debounce; review+preview+builder editor accept. End-to-end.
  - **F1.1.3 — `short_answer` ✅** (2026-07-31, belum commit): reuse pola fill_blank (`isTextAnswer`) + batas kata (content_json.word_limit, hint di runner). `_grade` cabang sama.
  - **F1.1.4 — `matching` ✅** (2026-07-31, belum commit): content_json={left,right}, answer_json={pairs}; runner Select per item; review pasangan; builder editor kiri/kanan+kunci. End-to-end.
  - **F1.1.5 — `ordering` ✅** (2026-07-31, belum commit): content_json={items}, answer_json={positions}; runner Select nomor; review+builder+preview. **F1.1 LENGKAP — 6 tipe auto-scored end-to-end.**
- **F1.2 — Grading manual** (essay): peran grader + antrean + rubrik + agregasi skor.
- **F1.3 — Speaking** (rekam audio peserta → R2 + grading).
- **F1.4 — Skala per jenis tes** (band IELTS / skala iBT) + timing per-bagian di runner.

## Skema konkret F1.0 (migrasi 020) — untuk direview
> Semua kolom baru **nullable / ber-default** → MCQ existing tak berubah. Tabel baru ikut pola lockdown F2.e (RLS + `service_role_all` + REVOKE anon/authenticated).

### `questions` (+ kolom)
- `question_type VARCHAR(20) NOT NULL DEFAULT 'mcq_single'` CHECK (mcq_single|mcq_multi|true_false_ng|matching|fill_blank|short_answer|ordering|insert_text|essay|speaking).
- `content_json JSONB` — data render spesifik-tipe (mis. `{options:[...]}`, `{template:"..[1].."}`, `{left:[],right:[]}`).
- `answer_json JSONB` — kunci/konfig nilai (mis. `{correct:["a","c"],choose:2}`, `{blanks:[{accept:[...]}]}`, `{pairs:{...}}`).
- `scoring_mode VARCHAR(10) NOT NULL DEFAULT 'auto'` CHECK (auto|manual).
- `rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL` — utk manual.
- `max_score NUMERIC NOT NULL DEFAULT 1` — poin soal.
- **Relax**: `option_a–d` → nullable; DROP CHECK `correct_answer` + nullable; DROP CHECK `section` (validitas per jenis tes via `test_type_skills`).

### `rubrics` (tabel baru, reusable)
`id, created_by, test_type, name, description, criteria JSONB (list {name,max_score,descriptors}), max_total NUMERIC, is_builtin BOOL, status, deleted_at, updated_by, created_at, updated_at`. + RLS lockdown.

### `exam_attempt_answers` (+ kolom)
- `answer_json JSONB` — jawaban non-MCQ (multi/matching/fill/teks/urutan).
- `answer_audio_url TEXT` — jawaban Speaking.
- `is_correct BOOLEAN` — auto (null=belum/ tak berlaku).
- `awarded_score NUMERIC`, `max_score NUMERIC` — poin didapat/maks.
- `graded_by UUID REFERENCES profiles(id)`, `graded_at TIMESTAMPTZ`, `rubric_scores JSONB`, `feedback TEXT` — grading manual.

### `exam_questions` (snapshot beku) (+ kolom)
- `question_type VARCHAR(20)`, `content_json JSONB` (masuk **payload** peserta), `answer_json JSONB` (TAK ke payload), `scoring_mode VARCHAR(10)`, `max_score NUMERIC`, `rubric_json JSONB` (snapshot rubrik, TAK ke payload). Konsisten prinsip: kunci/rubrik dibekukan terpisah, tak bocor ke peserta.

### `exam_attempts` (+ kolom)
- `grading_status VARCHAR(15) NOT NULL DEFAULT 'not_required'` CHECK (not_required|pending|complete). Skor final ditahan sampai grading manual selesai.

### `exam_sections` (+ kolom)
- `time_limit_minutes INTEGER` — timing per-bagian (dipakai runner di F1.4).

### `profiles.role` (+ nilai)
- Tambah `grader` ke CHECK role (peserta|grader|admin|super_admin). Permission grader diwire di F1.2.

## Aturan
- Jangan commit/push (hak user). Migrasi dijalankan user. Tabel baru WAJIB ikut lockdown F2.e.
