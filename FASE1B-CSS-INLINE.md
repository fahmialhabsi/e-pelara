# Fase 1b — Inline CSS (juice) untuk exportDocx()

**Ruang lingkup:** perbaikan kecil di atas Fase 1 (`AUDIT-LAKIP-SISTEMATIKA.md` → `FASE1-SATUKAN-TEMPLATE.md`) — mengatasi hilangnya font-size bervariasi dan bold/warna header tabel di DOCX, akibat blok `<style>` dibuang mentah-mentah sebelum konversi.
**Status:** SELESAI & terverifikasi langsung dari `word/document.xml` hasil generate nyata (data DB sama, tahun 2025). Menunggu review sebelum lanjut Fase 2.

---

## 1. Perubahan Kode

### `backend/controllers/lakipExportController.js`

| Bagian | Perubahan |
|---|---|
| Import | Tambah `const juice = require("juice");` |
| `stripDocxStyleBlock()` | Komentar diperbarui: fungsi ini sekarang jalan **setelah** `juice()`, jadi yang dibuang bukan seluruh CSS asli lagi, melainkan sisa `<style>` yang **tidak bisa** di-inline juice (at-rules kondisional: `@media print`, `@page`) — tetap harus dibuang karena kalau dibiarkan, isinya tetap didorong jadi teks paragraf oleh `html-to-docx` (root cause sama seperti Fase 1). |
| `stripDocxTableCellWidthStyle()` | **Diubah logikanya.** Sebelumnya (Fase 1) langsung membuang seluruh atribut `style="width:NN%"` karena saat itu isinya cuma width. Sejak `juice()` menggabung width dengan properti lain yang justru ingin dipertahankan (`background-color`, `color`, `font-weight` pada `<th>`), sekarang fungsi ini mem-parse isi `style="..."`, membuang **hanya** deklarasi yang diawali `width:`, dan menyusun ulang sisanya. |
| `exportDocx()` | Urutan proses diubah sesuai permintaan: 1) `getHtml(req)` (sama), 2) **`juice(rawHtml)`** — inline semua CSS class ke atribut `style=` per elemen, 3) `stripDocxStyleBlock` + `stripDocxToolbar` (urutan strip lain tetap), 4) `stripDocxTableCellWidthStyle` (Masalah B, tidak disentuh — tetap dipertahankan). |

### `backend/controllers/lakipGeneratorController.js` — **1 perubahan tambahan di luar rencana awal, lihat §3**

Baris ~683-689, selector `th` di `buildHtml()`:
```diff
 th {
-  background: #1e40af;
+  background-color: #1e40af;
   color: #fff;
+  font-weight: bold;
   padding: 8px 6px;
   text-align: center;
   border: 1px solid #93c5fd;
 }
```

### Dependency baru
- `backend/package.json` / `package-lock.json`: ditambahkan `"juice": "^11.1.1"` (via `npm install juice --save`).
- **Catatan:** kedua file ini sudah berstatus "modified" *sebelum* sesi ini dimulai (ada baris `"@turbodocx/html-to-docx": "^1.22.0"` yang bukan hasil kerja saya — sudah ada di working tree sebelum saya menyentuh apa pun). Disebutkan di sini supaya jelas mana yang punya saya (`juice`) dan mana yang bukan.

---

## 2. Verifikasi (langsung dari `word/document.xml` hasil generate nyata, tahun=2025, periode_id=2)

### ✅ Font-size bervariasi sesuai aslinya

Distribusi `w:sz` (half-point) di dokumen hasil akhir — **tidak lagi seragam 24 (12pt) seperti Fase 1**:

| w:sz | ≈ pt | Jumlah | Sumber (kelas asal) |
|---|---|---|---|
| 18 | 9pt | 39 | `.narasi-row` (baris analisis di bawah tiap indikator) |
| 20 | 10pt | 1 | `table` (default ukuran tabel) |
| 21 | ~10.5pt | 33 | `h6.hierarchy-title` (judul Program/Kegiatan) |
| 16 | 8pt | 35 | `.badge` (label status capaian) |
| 24 | 12pt | 12 | body/paragraf biasa |
| 22 | 11pt | 5 | `h5.hierarchy-title` (judul Sasaran) |
| 28 | 14pt | 5 | `h2.section-title` (judul BAB) |
| 44 | 22pt | 3 | judul cover (`h1`) — proporsional dari 22pt asli |
| 32/20 | 16pt/10pt | 2 | elemen lain (`.kpi-val`, dst) |

Variasi ini **hilang total di Fase 1** (semuanya rata 24/12pt) — sekarang kembali mendekati desain asli.

### ✅ (setelah 1 perbaikan tambahan) Header tabel (`<th>`) sekarang bold + warna sesuai CSS aslinya

**Temuan awal (juice saja, sebelum perbaikan §1 bagian 2):** dicek satu tabel penuh ("Rincian Realisasi Program dan Kegiatan") — sel header memang dapat `<w:color w:val="ffffff"/>` (teks putih, ter-inline dengan benar dari `color:#fff`), **tapi TIDAK dapat** `<w:shd>` (fill/background) dan **TIDAK dapat** `<w:b/>` (bold). Hasilnya justru **lebih buruk dari Fase 1**: teks putih tanpa latar belakang = **tidak terbaca (putih di atas putih)**.

**Root cause, dibuktikan dengan test terisolasi** (dua HTML identik, satu pakai `background:`, satu pakai `background-color:` + `font-weight:bold`, dibandingkan XML hasil `HTMLtoDOCX()`):
- `html-to-docx` v1.7.0 **hanya membaca properti `background-color` (longhand)** untuk menghasilkan `<w:shd>` — properti `background` (shorthand) yang dipakai di CSS asli `buildHtml()` **tidak dikenali sama sekali**, dan `juice` sendiri tidak meng-expand shorthand→longhand (terkonfirmasi: output juice tetap `background: #1e40af`, bukan diterjemahkan).
- CSS asli `th { ... }` **tidak pernah punya `font-weight: bold` eksplisit** — tebalnya `<th>` di PDF/preview selama ini murni dari default browser (user-agent stylesheet men-bold-kan `<th>` secara implisit), bukan dari CSS `buildHtml()`. `juice` cuma bisa inline apa yang **tertulis eksplisit** di stylesheet, jadi tidak ada apa pun untuk di-inline soal bold.

**Perbaikan diterapkan** (§1, `lakipGeneratorController.js`): ganti `background`→`background-color`, tambah `font-weight: bold` eksplisit ke selector `th`. Kedua perubahan **tidak berdampak visual apa pun ke PDF** (`background`/`background-color` solid color identik di semua browser; `font-weight:bold` eksplisit cuma menegaskan apa yang browser sudah lakukan otomatis untuk `<th>`) — dibuktikan: **PDF hasil generate ulang persis byte-identical (1.328.424 bytes) sebelum dan sesudah perubahan CSS ini.**

**Hasil setelah perbaikan**, dicek langsung di `word/document.xml`, sel header "No" (tabel Rincian Realisasi):
```xml
<w:tcPr>
  <w:shd w:val="clear" w:fill="1e40af"/>
  <w:tcBorders> ... w:color="93C5FD" ... </w:tcBorders>
</w:tcPr>
<w:p>...
  <w:r>
    <w:rPr>
      <w:color w:val="ffffff"/>
      <w:b/>
    </w:rPr>
    <w:t>No</w:t>
  </w:r>
</w:p>
```
Latar biru (`fill="1e40af"`), border biru muda (`93C5FD`), teks putih tebal (`color=ffffff` + `<w:b/>`) — **identik dengan spesifikasi CSS asli**. Dihitung total di seluruh dokumen: **250 sel ter-shading**, **334 run bold** — konsisten di semua tabel (bukan cuma satu tabel yang dicek manual).

### ✅ PDF tidak berubah dibanding sebelum Fase 1b

Tidak bisa screenshot (tidak ada LibreOffice/renderer visual tersedia di environment ini), jadi verifikasi dilakukan by-evidence:
- **Byte-identical**: PDF hasil generate ulang setelah seluruh perubahan Fase 1b (juice di jalur DOCX + fix CSS `th`) = **1.328.424 bytes**, sama persis dengan PDF sebelum Fase 1b disentuh. Jalur PDF (`exportPdf`, `injectPrintCss`, Puppeteer) tidak diubah sama sekali di Fase 1b — `juice()` hanya dipanggil di dalam `exportDocx()`.
- Perubahan satu-satunya yang menyentuh sumber bersama (`buildHtml()` di `lakipGeneratorController.js`) adalah `background`→`background-color` dan tambah `font-weight:bold` pada `th` — keduanya terbukti tidak mengubah output Puppeteer sama sekali (byte PDF identik sebelum/sesudah).

### Masalah B (lebar kolom) — sengaja tidak disentuh, dikonfirmasi tidak berubah

Dicek ulang `<w:tblGrid>` tabel "Rincian Realisasi Program dan Kegiatan" pasca Fase 1b: masih **7× `gridCol w:w="1398.857142857143"`, sama rata** — persis seperti temuan di Fase 1. Tidak ada regresi maupun perbaikan di sini, sesuai instruksi.

---

## 3. Catatan: 1 perbaikan di luar rencana awal

Rencana awal Fase 1b hanya menyebut perubahan di `exportDocx()` (`lakipExportController.js`). Saat verifikasi, ditemukan bahwa `juice()` saja **tidak cukup** untuk memenuhi kriteria "header tabel bold + warna sesuai CSS aslinya" — bahkan sempat menghasilkan regresi baru (teks putih tanpa latar, tidak terbaca). Perbaikannya membutuhkan 1 perubahan kecil di **file CSS sumber** (`lakipGeneratorController.js`, selector `th`), bukan di `lakipExportController.js`. Saya terapkan karena:
- Perubahannya minimal (ganti 1 kata + tambah 1 baris CSS), murni menambah properti yang sudah seharusnya ada.
- Dibuktikan **tidak berdampak ke PDF** (byte-identical).
- Tanpa perubahan ini, kriteria verifikasi #2 yang diminta tidak akan terpenuhi (header akan tampil rusak/tidak terbaca, bukan cuma "tidak sebold PDF").

Kalau perubahan ini **tidak diinginkan** (mis. ingin scope Fase 1b murni di `lakipExportController.js` saja), tinggal revert 3 baris di `lakipGeneratorController.js` — akibatnya header tabel di DOCX kembali ke kondisi "font size sudah oke, tapi header tidak bold/background" (bukan kembali ke "putih tak terbaca", karena itu memang belum sempat di-generate/commit ke mana pun).

---

## 4. File yang diubah

- `backend/controllers/lakipExportController.js` (inti Fase 1b)
- `backend/controllers/lakipGeneratorController.js` (1 selector CSS, §3)
- `backend/package.json`, `backend/package-lock.json` (dependency `juice`)

Tidak ada perubahan lain (tidak menyentuh lebar kolom/Masalah B, tidak menyentuh route/frontend/migrasi).
