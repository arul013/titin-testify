# Rencana — Redesign Builder Bank Soal (halaman penuh + preview) & renderer passage baru

> Status: **Perencanaan** · Dibuat 2026-07-23 · Belum ada kode.
> Terkait: `docs/Bank_Soal_Reading_plan.md` (R0–R3 selesai), `docs/Bank_Soal_roadmap.md`.
> Memicu: butuh **indent paragraf + justify** pada passage, dan pembuatan soal terasa sempit di modal.

## 1. Keputusan (dikunci 2026-07-23)

1. **Render passage = Pendekatan B (paragraf natural + nomor baris otomatis).**
   - Penulis menulis/tempel **paragraf** (baris kosong = paragraf baru; tak perlu memenggal tiap baris).
   - Render: **`text-align: justify`** + **`text-indent`** baris pertama tiap paragraf (indent & justify otomatis; baris terakhir paragraf tidak ikut ter-justify — perilaku default browser).
   - **Nomor baris dihitung sistem** dari pembungkusan teks pada **lebar tetap** (fixed width), ditaruh tiap 5 baris di gutter.
   - **Merevisi keputusan lama** ("penulis tentukan line-break"). Kestabilan "line 12" dijaga oleh **lebar render yang dikunci sama** di sisi admin (preview) & peserta (Phase 4).
2. **Builder = halaman penuh (full-width dalam dashboard)**, pola sama seperti Exam Builder (toggle daftar ↔ builder di `/bank-soal`; sidebar & header tetap). Bukan route immersive.
3. **Layout = 2-panel** (editor kiri, live preview kanan). **Dibangun dengan `viewMode` state** agar mudah diubah ke **toggle Edit⇄Preview** bila 2-panel terasa sempit.
4. **Cakupan = Soal & Materi** dua-duanya jadi halaman penuh + preview.
5. Modal lama (QuestionForm/PassageForm) **diganti**; modal hanya menyisakan **pemilih jenis** (Soal Tunggal / Soal + Materi + section) sebelum masuk builder.

## 2. Komponen renderer baru (Pendekatan B)

Komponen `PassageView` (kanonik, dipakai preview builder + QuestionPreview + Phase 4):
- **Input**: `content` (teks bertanda; paragraf dipisah baris kosong), opsi `lineNumbers`, `width` tetap.
- **Parsing**: pecah jadi paragraf (split `\n\n`+); dalam paragraf, newline tunggal → spasi; parse marker inline (`**`,`*`,`__`,`[..]{A}`) via `renderExamText`/`renderInline` yang sudah ada.
- **Layout**: kontainer **lebar tetap** (mis. `max-w-[640px]` / satuan ch konsisten). Tiap paragraf: `text-align: justify; text-indent: 1.5em`.
- **Nomor baris (measured)**: bungkus tiap kata dalam `<span>`, setelah render ukur `offsetTop` untuk mendeteksi pindah baris; hitung baris; taruh nomor absolut di gutter pada tiap baris ke-5. Re-ukur saat konten berubah (lebar tetap → deterministik). (Alternatif: teknik pengukuran range/getClientRects.)
- Ganti `renderPassageLines` (berbasis `\n`) untuk passage reading. `renderExamText` (inline) tetap untuk stem/opsi.

> Catatan: karena lebar dikunci, di layar sempit passage bisa horizontal-scroll — dapat diterima (ujian = desktop).

## 3. Halaman builder (full-width, 2-panel)

Pola seperti Exam Builder (`features/exams`), tapi untuk Bank Soal:
```
/bank-soal (page.tsx): mode 'list' | 'builder'
  builder view (full-width, key remount):
    header: kembali ke daftar + judul (Buat/Edit Soal | Materi)
    grid 2 kolom (viewMode='split'):
      kiri  = <EditorPanel> (form: field + toolbar rich + unggah gambar)
      kanan = <PreviewPanel> (tampilan peserta: PassageView + stem + opsi + gambar)
    footer: Batal · Simpan Draf · (Materi) / Simpan · (Soal)
  viewMode bisa 'split' | 'edit' | 'preview' (siap toggle bila 2-panel sempit)
```
- **EditorPanel Soal**: isi dari `QuestionForm` sekarang (section/difficulty/status, stem rich, opsi A–D, jawaban ToggleGroup, pembahasan, tag, gambar soal).
- **EditorPanel Materi**: isi dari `PassageForm` (jenis, status, audio (listening), teks bacaan rich/paragraf, gambar materi).
- **PreviewPanel**: render kanonik "tampilan peserta" — reuse untuk Phase 4.
- **Pemilih jenis**: modal/FAB ringkas → set jenis + section → buka builder mode create.

## 4. Rencana bertahap (usulan)

- **B0 — `PassageView` (Pendekatan B)** ✅ **SELESAI — 2026-07-23.**
  - `features/questions/PassageView.tsx`: paragraf (dipisah baris kosong) → `text-align: justify` + `text-indent` baris pertama; tiap kata dibungkus `<span data-w>` lalu **diukur `offsetTop`** (useLayoutEffect + `fonts.ready` + ResizeObserver) untuk menomori tiap 5 baris di gutter; lebar dikunci (default 600px). Marker `**`/`*`/`__`.
  - `QuestionPreview`: passage `reading` → `<PassageView>` (ganti `renderPassageLines`).
  - Verifikasi: build sukses, diagnostics nol. ⚠️ Di modal `QuestionPreview` (lebar ~512px) passage 600px akan **horizontal-scroll** — tampilan utuhnya baru enak di **B1 (panel preview lebar)**.
- **B1 — Shell builder full-width + 2-panel:** toggle list↔builder di `/bank-soal`; PreviewPanel kanonik; `viewMode` (split default).
- **B2 — Pindahkan editor Soal & Materi ke EditorPanel** (dari modal → panel kiri); pemilih jenis jadi modal ringkas; hapus modal lama.
- **B3 — Polish:** live update, validasi, edit existing → buka builder, empty/loading, responsif (fallback toggle bila sempit).

## 5. Catatan
- Preview builder = tampilan peserta → **dipakai ulang Phase 4 (Exam Engine)**. Investasi sekali, kepakai dua kali.
- `renderPassageLines` lama akan pensiun setelah `PassageView` siap.
- **Aturan repo:** jangan `git commit`/`git push` — hak pemilik.
