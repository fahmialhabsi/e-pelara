# Fase 20 — Margin Cetak, Format Tanda Tangan, dan Bugfix File Word Tidak Bisa Dibuka

**Status:** Dieksekusi dan diverifikasi — termasuk **membuka file .docx hasil generate ulang langsung di Microsoft Word via COM automation** (Word 16.0 terinstal & tersedia di lingkungan ini), bukan cuma "generate berhasil tanpa error di terminal".

**File yang diubah:** `backend/controllers/lakipExportController.js`, `backend/controllers/lakipGeneratorController.js`, `backend/utils/formatNip.js` (baru).

**Klarifikasi yang diminta ke user sebelum eksekusi:** instruksi awal margin ("kanan 3cm, kiri 2cm, kiri sengaja lebih lebar utk jilid") kontradiktif secara angka (2cm bukan lebih lebar dari 3cm). Dikonfirmasi: **kiri = 3cm, kanan = 2cm** (mengikuti alasan jilid, bukan angka literal yang salah tulis).

---

## C. Investigasi bug file Word tidak bisa dibuka — DITEMUKAN & DIPERBAIKI

Dikerjakan berurutan sesuai instruksi, dari yang paling murah:

### 1. Reproduce lokal
Generate ulang `.docx` untuk Dinas Pangan 2025, buka di Word via COM automation (`Word.Application` COM, tersedia di lingkungan ini — versi 16.0). **Berhasil direproduksi persis**: pesan error identik dengan laporan user — *"Word experienced an error trying to open the file... Check the file permissions... sufficient free memory... Open the file with the Text Recovery converter."*

### 2. Cek ukuran file
`Buffer.length` di memori Node (1.527.685 bytes) **identik** dengan ukuran file di disk setelah `fs.writeFileSync()`. Tidak ada indikasi stream terpotong saat simpan lokal (catatan: `exportDocx` juga tidak pernah eksplisit set header `Content-Length` — beda dari `exportPdf` yang selalu set — bukan penyebab utama karena Node otomatis mengisi ini utk response Buffer, tapi dicatat sebagai temuan minor terpisah, tidak diperbaiki di Fase ini karena di luar scope bug yang dilaporkan).

### 3. Cek validitas struktur ZIP
- **ZIP container 100% valid**: dibuka bersih via `yauzl` (20 entries, semua terbaca), dan dicek manual byte-level: magic header `PK\x03\x04` benar di awal, End-Of-Central-Directory record benar di akhir (offset+size cocok persis, tanpa data nyasar).
- **Semua file XML di dalamnya well-formed** (dicek via `xmldoc` — `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`, `word/numbering.xml`, `word/settings.xml`, `word/footer1.xml`, dll — semua parse sukses, tidak ada tag tak tertutup/rusak).
- **Semua relationship & content-type declaration konsisten** (2 gambar embed — dari emoji "🌾" di cover yang dikonversi html-to-docx jadi JPEG — direferensikan dengan benar, 1 relationship gambar ternyata tidak terpakai/orphan tapi ini BUKAN penyebab fatal, cuma sisa resource tak terpakai ~14KB, lazim & ditoleransi Word).

**Kesimpulan sementara: bukan masalah ZIP/XML-well-formedness** — perlu investigasi lebih dalam.

### 4. Cek regresi Fase 17-19
Dibuat **git worktree terisolasi** dari commit terakhir (`ded5b333`, state SEBELUM seluruh pekerjaan Fase 13-20 sesi ini — belum ada satupun dari Fase 13-20 yang di-commit) — generate ulang `.docx` dari kode versi itu, dites buka di Word.

**Hasil: GAGAL DIBUKA JUGA, pesan error identik persis.** Ini **BUKAN regresi** dari Fase 17-19 — bug ini sudah ada jauh sebelum sesi ini dimulai.

### 5. Investigasi lanjutan (akar masalah, sebelum lapor)

Karena langkah 1-4 belum menemukan akar masalah pasti, dilanjutkan bisection sistematis (bukan tambal-sulam):
- **Bisection isi dokumen** (potong per-Bab pakai marker Fase 19, generate 11 versi kumulatif dari "cuma Kata Pengantar" sampai dokumen penuh) — **SEMUA gagal dibuka, termasuk potongan terkecil (~25KB)**. Ini membuktikan bug **BUKAN soal ukuran/kompleksitas konten** (dugaan awal soal tabel besar Bab III terbukti salah).
- **Uji dokumen minimal** (`<p>Halo dunia</p>` tanpa wrapper apapun) — **berhasil dibuka**, mengonfirmasi metodologi tes (COM automation, Word itu sendiri) valid, dan `html-to-docx` secara umum berfungsi normal.
- **Bisection struktur wrapper HTML** (`<!DOCTYPE>`/`<html>`/`<head>`/`<body>` dicoba berbagai kombinasi) — ternyata TIDAK relevan, semua kombinasi wrapper berhasil dibuka ketika opsi `HTMLtoDOCX()` disederhanakan.
- **Bisection OPSI `HTMLtoDOCX()`** (font, fontSize, margins, table diuji satu-satu) — **`margins` adalah pemicu tunggal**. Dicoba berbagai nilai margin (semua default 1440, cuma 1 properti, satuan cm) — **SEMUA gagal selama tidak lengkap 7 properti**.

### Akar masalah pasti

`html-to-docx` (dicek versi 1.7.0 **dan** 1.8.0 terbaru — sama-sama bermasalah, jadi bukan regresi versi) punya template XML internal untuk `<w:sectPr>` yang **langsung meng-interpolasi SEMUA 7 properti object `margins`** tanpa fallback ke default kalau properti itu tidak diisi caller:
```js
`<w:pgMar w:top="${margins.top}" w:right="${margins.right}" w:bottom="${margins.bottom}"
          w:left="${margins.left}" w:header="${margins.header}" w:footer="${margins.footer}"
          w:gutter="${margins.gutter}"/>`
```
Kode LAKIP (sudah ada sejak sebelum Fase 13, bukan buatan sesi ini) cuma memberi **4 dari 7 properti** (`top`/`right`/`bottom`/`left`) — 3 sisanya (`header`/`footer`/`gutter`) jadi `undefined`, tercetak literal sebagai `w:header="undefined" w:footer="undefined" w:gutter="undefined"` di `word/document.xml`. Ini **masih valid XML** (string "undefined" adalah nilai atribut yang sah secara sintaks) — makanya lolos semua pengecekan ZIP/XML-well-formedness di langkah 3 — tapi **melanggar skema OOXML** yang mengharuskan atribut itu berisi angka TWIP, sehingga Word menolak membuka file sama sekali dengan pesan generik "Word experienced an error..." yang sama sekali tidak menunjuk ke penyebab sebenarnya.

**Verifikasi fix** (sebelum diterapkan ke kode produksi): ditest ulang dengan margins berisi LENGKAP 7 properti (`header: 720, footer: 720, gutter: 0` ditambahkan, nilai default resmi sesuai README library ini) — **file langsung bisa dibuka normal di Word**.

### Cara memperbaikinya (diterapkan, lihat §A.3)

`margins` di `HTMLtoDOCX()` options SELALU diisi lengkap 7 properti setiap kali di-override — bukan cuma 4 yang "kelihatannya" perlu. Diterapkan sekaligus dengan nilai margin baru (§A). Tidak perlu upgrade/downgrade versi library (sudah dicek 1.8.0 tidak memperbaiki ini juga) — cukup perbaikan pemakaian opsi di sisi kode kami sendiri.

---

## A. Margin cetak

### 1-2. PDF (Puppeteer) — satu sumber margin

Sudah dipastikan sejak Fase 18 hanya ADA SATU sumber margin aktif untuk export (Puppeteer `margin` option; CSS `.page{padding:0}` di PRINT_CSS menonaktifkan sumber kedua). Fase 20 tinggal update NILAI-nya:
```js
const MARGIN = { top: "3cm", bottom: "2cm", left: "3cm", right: "2cm" };
```
Lebar cetak efektif: 210mm − (30+20)mm = **160mm**. Tinggi efektif: 297mm − (30+20)mm = **247mm**.

### 3. Word (html-to-docx) — margin sama + fix bug

```js
margins: { top: "3cm", right: "2cm", bottom: "2cm", left: "3cm", header: 720, footer: 720, gutter: 0 },
```
Nilai sama persis dengan PDF (pakai satuan `cm` string, didukung native oleh library ini), PLUS 3 properti wajib (`header`/`footer`/`gutter`) yang jadi akar masalah §C.

### Verifikasi

**PDF:** margin diset via kode (`MARGIN` constant), konsisten dengan mekanisme yang sudah diverifikasi visual di Fase 18 (170mm effective width test) — sekarang tinggal beda nilai target.

**Word — diverifikasi via Word API SENDIRI** (bukan cuma asumsi dari kode yang ditulis):
```
Margin (cm): Top=3 Bottom=2.01 Left=3 Right=2.01
```
(Dibaca lewat `doc.Sections.Item(1).PageSetup` di Word COM — 0.01cm adalah pembulatan TWIP↔cm yang wajar, bukan kesalahan.) **Kiri (3cm) lebih lebar dari kanan (2cm) — sesuai maksud ruang jilid.**

---

## B. Format blok tanda tangan (Kata Pengantar & Bab IV)

### 3. Cek util format NIP dulu — TIDAK ADA, dibuat baru

Dicek 11 generator dokumen resmi lain (`renstraGenerateController.js`, `lakipPkExportService.js`, `dpaController.js`, `dpaPergeseranController.js`, `rkaExportController.js`, dkk) — **semuanya masih render NIP mentah tanpa pengelompokan spasi** (`NIP. 197507302001121001` atau `NIP: ${nip}` polos). Tidak ada util serupa untuk direuse.

**Dibuat baru:** `backend/utils/formatNip.js` — `formatNip(nipRaw)`, format BKN "8-6-1-3" (`197507302001121001` → `"19750730 200112 1 001"`), fallback ke nilai asli kalau bukan persis 18 digit. **Dilaporkan di sini supaya bisa direuse oleh 11 generator lain nanti** (belum diterapkan ke tempat lain, di luar scope Fase 20 — LAKIP saja).

### 1-2, 4. Format baru diterapkan di KEDUA tempat

Kata Pengantar dan Bab IV — Penutup, format sama:
```
Sofifi, 3 Agustus 2026
Kepala Dinas Pangan,
DHENY TJAN, SH.,M.Si
NIP : 19750730 200112 1 001
```
- Baris jabatan (`pkDetail.pihak_kedua.jabatan`, fallback `opd.kepala_opd`) ditambahkan SEBELUM nama.
- Placeholder `(......................................)` dihapus total, class CSS `.ttd-name` direpurpose untuk baris nama (tetap bold + margin-top, sekarang tanpa underline karena bukan lagi teks kosong).
- NIP diformat via `formatNip()` baru, prefix diubah dari `NIP.` jadi `NIP :`.
- **Blok Inspektur di "Pernyataan Telah Direviu" SENGAJA TIDAK disentuh** (placeholder manual by design sejak Fase 3) — dikonfirmasi tetap utuh saat verifikasi.

### Verifikasi (Word COM `Content.Text`, bukan cuma regex kode sendiri)

```
=== Kata Pengantar ===
Sofifi, 3 Agustus 2026 Kepala Dinas Pangan,  DHENY TJAN, SH.,M.Si  NIP : 19750730 200112 1 001

=== Bab IV ===
Sofifi, 3 Agustus 2026 Kepala Dinas Pangan,  DHENY TJAN, SH.,M.Si  NIP : 19750730 200112 1 001
```
Kedua blok identik dan sesuai format yang diminta. PDF (ekstraksi teks `pdf-parse`) dikonfirmasi konsisten: 2× "Kepala Dinas Pangan,", 2× "NIP :", 2× format NIP berkelompok, 0× placeholder titik-titik baru (2 kemunculan placeholder titik-titik yang tersisa dikonfirmasi milik blok Inspektur yang memang tidak diubah — 1 utk tanda tangan, 1 utk NIP-nya).

---

## Verifikasi akhir (checklist wajib)

1. ✅ PDF & Word Dinas Pangan 2025 di-generate ulang. Margin kiri (3cm) lebih lebar dari kanan (2cm) — dikonfirmasi lewat Word `PageSetup` API (Top=3cm, Bottom=2.01cm, Left=3cm, Right=2.01cm).
2. ✅ Teks blok tanda tangan Kata Pengantar & Bab IV sesuai format baru — dikonfirmasi di KEDUA dokumen (PDF via `pdf-parse`, Word via `Content.Text` COM API langsung).
3. ✅ **File .docx hasil generate ulang BENAR-BENAR dibuka langsung via Microsoft Word** (COM automation Word 16.0, bukan cuma "tidak error di terminal") — berhasil, 2342 paragraf terbaca.
4. ✅ Semua data uji dihapus: git worktree investigasi + junction node_modules-nya, semua file `.docx`/`.pdf` test dari sesi Fase 20 ini (`FINAL_test_lakip_2025.docx/.pdf`, `bisect_*.docx`, `fine_*.docx`, `g_`/`h_`/.../`x_*.docx`, instalasi html-to-docx@1.8.0 isolated test). Dikonfirmasi via `git status` — hanya file kode yang berubah (`lakipExportController.js`, `lakipGeneratorController.js`, `utils/formatNip.js` baru), tidak ada file data/test yang tertinggal di project.

---

## Ringkasan

| | Sebelum | Sesudah |
|---|---|---|
| Margin cetak (PDF) | 20mm semua sisi | 3cm/2cm/3cm/2cm (kiri lebih lebar, jilid) |
| Margin cetak (Word) | Tidak konsisten dgn PDF, DAN corrupt | Sama dgn PDF, DAN valid |
| File .docx bisa dibuka? | **TIDAK** (bug lama, dikonfirmasi sejak sebelum Fase 13) | **YA** (dikonfirmasi buka nyata via Word COM) |
| Blok TTD Kata Pengantar/Bab IV | "Maluku Utara,"/"Sofifi," + placeholder titik-titik | Kota + jabatan + nama + NIP berkelompok, tanpa placeholder |
| Util format NIP | Tidak ada di manapun (11 generator dicek) | `utils/formatNip.js` baru, siap direuse |

Tidak ada perubahan data di database — seluruh perubahan Fase 20 murni kode (`lakipExportController.js`, `lakipGeneratorController.js`, `utils/formatNip.js` baru).
