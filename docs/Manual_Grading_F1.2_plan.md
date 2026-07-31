# F1.2 — Grading Manual (Essay/Writing)

Status: **desain disepakati 2026-07-31.** Subsistem penilaian manual untuk tipe soal berbasis rubrik (essay; nanti speaking di F1.3). Bagian dari [[question-model-f1]].

## Keputusan (2026-07-31)
1. **Penilai = pemilik ujian (admin) + super_admin.** Admin menilai esai ujian miliknya; super_admin semua. Peran `grader` (delegasi/penugasan per-ujian) **ditunda** — tak ada tabel `exam_graders` dulu.
2. **Rubrik = kriteria + pustaka reusable.** Rubrik = daftar kriteria (mis. IELTS Writing: Task Achievement/Coherence/Lexical/Grammar, tiap 0–9). Dikelola di menu **Rubrik**, dipakai ulang lintas soal. Kriteria-tunggal = mode holistik (iBT 0–5).
3. **Skor = berbasis POIN + hasil ditahan.** Ujian yang memuat item manual dinilai `Σawarded / Σmax`. Peserta melihat **"Menunggu Penilaian"** sampai `grading_status = complete`, baru skor final muncul. Ujian auto-only tetap seperti sekarang (correct-count → ITP/Nilai).

## Fondasi (sudah ada, migrasi 020)
- `rubrics` (created_by, test_type, name, description, `criteria` JSONB `[{name,max_score,descriptors?}]`, max_total, is_builtin, status, deleted_at) — **RLS locked**.
- `questions`: `scoring_mode`(auto|manual), `rubric_id`, `max_score`.
- `exam_questions` snapshot: `scoring_mode`, `max_score`, `rubric_json` (rubrik dibekukan).
- `exam_attempt_answers`: `awarded_score`, `max_score`, `graded_by`, `graded_at`, `rubric_scores` JSONB, `feedback`, `is_correct`.
- `exam_attempts.grading_status` (not_required|pending|complete). `profiles.role` +grader.

## Model data (pemakaian)
- **Essay** (author): `question_type='essay'`, `scoring_mode='manual'`, `rubric_id`→rubrics, `max_score` = rubrik `max_total`, `content_json={word_limit?}`, `answer_json=null`. Freeze → `rubric_json` (snapshot kriteria).
- **Jawaban peserta**: `answer_json={text}` (esai). Grading isi `awarded_score` (=Σ skor kriteria), `rubric_scores` (per kriteria), `feedback`, `graded_by/at`, `is_correct=null`.
- **grading_status** attempt: submit → `pending` bila ada item manual, else `not_required`; `complete` saat semua jawaban manual ter-`awarded_score`.

## Skema skor baru (poin) — dipakai bila ujian memuat item manual
- Auto item: `awarded_score = max_score` bila benar, else 0 (diisi saat submit agar agregasi seragam).
- Manual item: `awarded_score` diisi grader.
- Skor final = `Σawarded / Σmax × 100` (Nilai 0–100). Band IELTS/skala iBT = F1.4.
- Auto-only exam: TAK berubah (tetap ITP conversion / Nilai correct-count).

## Alur
- **Submit**: item auto dinilai + `awarded_score` diisi. Bila ada item manual → `grading_status=pending`, skor final DITAHAN (score=null). Else hitung sekarang, `complete`.
- **Grading** (admin owner/super_admin): menu **Penilaian** → daftar ujian dgn `pending` → daftar attempt/jawaban manual → nilai esai (teks peserta + kriteria rubrik → skor per kriteria + feedback). Saat semua jawaban manual sebuah attempt ter-nilai → recompute skor final + `grading_status=complete`.
- **Hasil peserta**: `pending` → "Menunggu Penilaian" (tanpa skor). `complete` → skor final + (bila show_review) esai + feedback + skor rubrik.

## Rencana bertahap
- **F1.2.0 — Authoring & jawaban** (review antar-langkah):
  - **F1.2.0a** — Rubrik ✅ (2026-07-31, belum commit): backend `models/rubric.py` + `services/rubric_service.py` (list bawaan+milik/super-all, get, create, update, soft-delete; ownership + built-in protect; max_total auto = Σmax_score) + `routes/rubrics.py` (`/api/rubrics` CRUD, require_admin) terdaftar di main. Frontend `useRubrics` + `RubrikManager` + `RubrikFormModal` (editor kriteria: nama+skor-maks desimal+descriptor) + route `/skema-penilaian/rubrik` (thin) + kartu "Rubrik Penilaian" (section "Alat Penilaian") di landing Skema Penilaian. tsc/import/diagnostics bersih.
  - **F1.2.0b** — Tipe `essay` ✅ (2026-07-31, belum commit): builder `QuestionFields` (opsi "Esai/Writing" + picker rubrik dari `useRubrics` → set max_score=rubric.max_total + word_limit) & `useQuestionForm` (isEssay, effectiveFormat='essay', buildPayload kirim scoring_mode='manual'/rubric_id/max_score, validate wajib rubrik). Runner `AnswerSheet` textarea (answer_json={text}) + `ExamRunner` isAnswered. Preview `QuestionView` (area jawaban + catatan manual). Review `AttemptReviewPanel` (teks peserta + badge "Dinilai Manual"). Backend `_grade` essay/speaking→False (bukan auto); freeze `rubric_json` disnapshot utk item manual (1 query batch). tsc/import/diagnostics bersih. **Catatan:** skor esai belum ditahan (masih ikut correct-count auto) → itu F1.2.0c.
  - **F1.2.0c** — Submit ✅ (2026-07-31, belum commit): `submit_attempt` ambil `scoring_mode`+`max_score` dari snapshot; `has_manual` deteksi item manual; correct-count auto **mengabaikan** item manual; tiap baris jawaban diisi `awarded_score`/`max_score` (auto: max bila benar else 0; manual: awarded null, is_correct null); set `grading_status`=pending bila ada manual else not_required; field `grading_status` ditambah ke `AttemptResultResponse` + `get_result` + api.ts. import/compile/tsc bersih. **Catatan:** skor final belum ditahan/di-recompute poin — itu F1.2.1 (gating + Σawarded/Σmax).
- **F1.2.1 — Grading + agregasi + gating**: endpoint list-pending + submit-grade; menu Penilaian (UI grader); skor poin `Σawarded/Σmax`; recompute+complete; gating hasil peserta ("Menunggu Penilaian").

## Aturan
- Jangan commit/push (hak user). Tabel/endpoint baru ikut lockdown RLS + authz (owner/super_admin).
- Kunci/rubrik: `rubric_json` dibekukan; skor rubrik peserta tak bocor sebelum complete + show_review.
