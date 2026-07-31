"""
IELTS — Konversi skala band (PROVISIONAL).

Status: tabel resmi BELUM tersedia. Selama itu, engine memakai aproksimasi linear
(lihat scoring_tables.linear_band) dan menandai hasil provisional.

Cara mengaktifkan saat tabel institusi sudah ada:
1. Isi `LR_RAW_TO_BAND` = {jumlah_benar: band, ...} untuk Listening & Reading.
2. Set `OFFICIAL = True` dan perbarui `SOURCE`.
Tak perlu ubah engine — angka langsung dipakai.

Bagian Writing & Speaking dinilai rubrik → band diambil LANGSUNG dari awarded_score
(rubrik max=9), TAK lewat tabel ini.
"""

OFFICIAL = False
SOURCE = "Belum tersedia — menunggu tabel konversi institusi."

# Listening / Reading: jumlah_benar (0..N) → band (0.0..9.0, langkah 0.5).
LR_RAW_TO_BAND: dict[int, float] | None = None

# Rentang band + langkah pembulatan (untuk fallback linear & overall = rata-rata 4 band).
BAND_MIN = 0.0
BAND_MAX = 9.0
BAND_STEP = 0.5
