"""
Learning Nexus CBT — Scoring Engine

Skor ujian ditentukan otomatis oleh (jenis tes + mode):
  - Tes Lengkap ITP (test_type='itp', exam_mode='full')  → TOEFL ITP Resmi (217–677)
  - Selain itu                                            → Nilai 0–100

Tabel konversi TOEFL ITP ditranskrip PERSIS dari dokumen resmi
"Menghitung Skor TOEFL ITP PBT" (lihat docs/Exam_Scoring_TOEFL_ITP.md).
JANGAN mengubah angka tanpa sumber resmi.
"""

import math

# ─── Tabel konversi TOEFL ITP PBT (jumlah_benar → nilai konversi) ───
# Listening & Reading: 0–50. Structure & Written Expression (gabungan): 0–40.
_ITP_LISTENING = {
    0: 24, 1: 25, 2: 26, 3: 27, 4: 28, 5: 29, 6: 30, 7: 31, 8: 32, 9: 32,
    10: 33, 11: 35, 12: 37, 13: 38, 14: 39, 15: 41, 16: 41, 17: 42, 18: 43, 19: 44,
    20: 45, 21: 45, 22: 46, 23: 47, 24: 47, 25: 48, 26: 48, 27: 49, 28: 49, 29: 50,
    30: 51, 31: 51, 32: 52, 33: 52, 34: 53, 35: 54, 36: 54, 37: 55, 38: 56, 39: 57,
    40: 57, 41: 58, 42: 59, 43: 60, 44: 61, 45: 62, 46: 63, 47: 65, 48: 66, 49: 67, 50: 68,
}
_ITP_STRUCTURE_WE = {
    0: 20, 1: 20, 2: 21, 3: 22, 4: 23, 5: 25, 6: 26, 7: 27, 8: 29, 9: 31,
    10: 33, 11: 35, 12: 36, 13: 37, 14: 38, 15: 40, 16: 40, 17: 41, 18: 42, 19: 43,
    20: 44, 21: 45, 22: 46, 23: 47, 24: 48, 25: 49, 26: 50, 27: 51, 28: 52, 29: 53,
    30: 54, 31: 55, 32: 56, 33: 57, 34: 58, 35: 60, 36: 61, 37: 63, 38: 65, 39: 67, 40: 68,
}
_ITP_READING = {
    0: 21, 1: 22, 2: 23, 3: 23, 4: 24, 5: 25, 6: 26, 7: 27, 8: 28, 9: 28,
    10: 29, 11: 30, 12: 31, 13: 32, 14: 34, 15: 35, 16: 36, 17: 37, 18: 38, 19: 39,
    20: 40, 21: 41, 22: 42, 23: 43, 24: 43, 25: 44, 26: 45, 27: 46, 28: 46, 29: 47,
    30: 48, 31: 48, 32: 49, 33: 50, 34: 51, 35: 52, 36: 52, 37: 53, 38: 54, 39: 54,
    40: 55, 41: 56, 42: 57, 43: 58, 44: 59, 45: 60, 46: 61, 47: 63, 48: 65, 49: 66, 50: 67,
}


def _round_half_up(x: float) -> int:
    """Bulatkan ke bilangan bulat terdekat (0,5 dibulatkan ke atas)."""
    return int(math.floor(x + 0.5))


def _lookup(table: dict[int, int], count: int) -> int:
    """Ambil nilai konversi; clamp bila di luar rentang tabel."""
    lo, hi = min(table), max(table)
    return table[max(lo, min(hi, count))]


def resolve_scale(test_type: str, exam_mode: str) -> str:
    """Skala skor untuk (jenis tes, mode) — TITIK EKSTENSI TUNGGAL untuk skala baru (F1.4).

    Sekarang:
      - ITP lengkap (itp, full)  → 'toefl_itp' (tabel resmi 217–677)
      - selain itu               → 'nilai' (0–100 / poin Σawarded/Σmax)

    Menyusul (saat tabel di scoring_tables terisi & jenis tes aktif):
      - IELTS → 'ielts_band'  (per-bagian band; overall = rata-rata 4, bulat 0.5)
      - iBT   → 'toefl_ibt'   (per-bagian 0–30; total 0–120)
    Bagian rubrik (Writing/Speaking) menyumbang band/skala langsung dari awarded_score.
    """
    if test_type == "itp" and exam_mode == "full":
        return "toefl_itp"
    return "nilai"


def is_official_itp(test_type: str, exam_mode: str) -> bool:
    """True bila ujian ini memakai skor TOEFL ITP resmi."""
    return resolve_scale(test_type, exam_mode) == "toefl_itp"


def score_toefl_itp(listening: int, structure_we: int, reading: int) -> dict:
    """Skor TOEFL ITP dari jumlah benar tiap grup. Dipakai grading & kalkulator."""
    conv_l = _lookup(_ITP_LISTENING, listening)
    conv_s = _lookup(_ITP_STRUCTURE_WE, structure_we)
    conv_r = _lookup(_ITP_READING, reading)
    score = _round_half_up((conv_l + conv_s + conv_r) * 10 / 3)
    return {
        "score": score,
        "converted": {"listening": conv_l, "structure_we": conv_s, "reading": conv_r},
    }


def compute_exam_score(
    test_type: str,
    exam_mode: str,
    per_section: list[dict],
    passing_value: float | None,
) -> dict:
    """
    Hitung skor ujian.
    per_section: list of {section, total, correct}.
    Return: {score, scale_unit, passed, total_questions, total_correct, groups}
      groups: list of {section, label, total, correct, percent, converted}.
    """
    by = {s["section"]: s for s in per_section}
    total_q = sum(s["total"] for s in per_section)
    total_c = sum(s["correct"] for s in per_section)

    def _passed(score: float) -> bool | None:
        return (score >= passing_value) if passing_value is not None else None

    scale = resolve_scale(test_type, exam_mode)
    # Skala baru menyusul di sini (F1.4a lanjutan) saat tabel di scoring_tables terisi
    # & jenis tes aktif: `scale == "ielts_band"` / `"toefl_ibt"` → agregasi band per-bagian
    # (bagian auto via tabel/aproksimasi, bagian rubrik via awarded_score). Sampai itu,
    # jenis tes tsb jatuh ke jalur 'nilai' di bawah.

    # ── Tes Lengkap ITP → skor resmi ──
    if scale == "toefl_itp":
        l_row = by.get("listening", {"total": 0, "correct": 0})
        s_row = by.get("structure", {"total": 0, "correct": 0})
        we_row = by.get("written_expression", {"total": 0, "correct": 0})
        r_row = by.get("reading", {"total": 0, "correct": 0})

        l_correct = l_row["correct"]
        swe_correct = s_row["correct"] + we_row["correct"]
        r_correct = r_row["correct"]

        res = score_toefl_itp(l_correct, swe_correct, r_correct)
        conv = res["converted"]
        groups = [
            {"section": "listening", "label": "Listening", "total": l_row["total"],
             "correct": l_correct, "percent": 0.0, "converted": conv["listening"]},
            {"section": "structure_we", "label": "Structure & Written Expression",
             "total": s_row["total"] + we_row["total"], "correct": swe_correct,
             "percent": 0.0, "converted": conv["structure_we"]},
            {"section": "reading", "label": "Reading", "total": r_row["total"],
             "correct": r_correct, "percent": 0.0, "converted": conv["reading"]},
        ]
        return {
            "score": float(res["score"]),
            "scale_unit": "toefl_itp",
            "passed": _passed(res["score"]),
            "total_questions": total_q,
            "total_correct": total_c,
            "groups": groups,
        }

    # ── Selain itu → Nilai 0–100 ──
    score = float(_round_half_up(total_c / total_q * 100)) if total_q else 0.0
    groups = [
        {"section": s["section"], "label": None, "total": s["total"], "correct": s["correct"],
         "percent": float(_round_half_up(s["correct"] / s["total"] * 100)) if s["total"] else 0.0,
         "converted": None}
        for s in per_section
    ]
    return {
        "score": score,
        "scale_unit": "nilai",
        "passed": _passed(score),
        "total_questions": total_q,
        "total_correct": total_c,
        "groups": groups,
    }
