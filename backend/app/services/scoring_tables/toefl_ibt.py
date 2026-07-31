"""
TOEFL iBT — Konversi skala (PROVISIONAL).

Status: tabel resmi BELUM tersedia. Selama itu, engine memakai aproksimasi linear
(lihat scoring_tables.linear_scaled) dan menandai hasil provisional.

Cara mengaktifkan saat tabel sudah ada:
1. Isi `SECTION_RAW_TO_SCALED` = {jumlah_benar: skala_0_30, ...} untuk Listening & Reading.
2. Set `OFFICIAL = True` dan perbarui `SOURCE`.

Bagian Writing & Speaking dinilai rubrik → skor terskala diambil LANGSUNG dari
awarded_score (rubrik max=30), TAK lewat tabel ini. Total = jumlah 4 bagian (0..120).
"""

OFFICIAL = False
SOURCE = "Belum tersedia — menunggu tabel konversi."

# Listening / Reading: jumlah_benar (0..N) → skala bagian (0..30).
SECTION_RAW_TO_SCALED: dict[int, int] | None = None

SECTION_MIN = 0
SECTION_MAX = 30
TOTAL_MAX = 120
