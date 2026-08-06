# Fase 21 — Investigasi & Fix: Margin Fase 20 Tidak Ter-apply di Render Akhir

**Status:** Dieksekusi dan diverifikasi lewat **pengukuran piksel objektif** (bukan asumsi kode) — margin sebelum ~0.5-1cm (jauh dari target), sesudah ~3.0/2.0cm (sesuai target), dikonfirmasi di `exportPdf` (mode cepat) DAN `exportPdfFinal` (mode nomor halaman), masing-masing di 2 halaman berbeda.

**File yang diubah:** `backend/controllers/lakipExportController.js`.

---

## A. Investigasi — akar masalah GANDA (bukan 1 penyebab tunggal)

### 1-2. Titik pengaturan margin & duplikasi sumber

Dicek 3 titik: CSS `@page`, opsi margin Puppeteer, opsi margin html-to-docx. **DOCX tidak bermasalah** (sudah diverifikasi Fase 20 via Word `PageSetup` API — margin benar 3/2.01/3/2.01cm, dan HTML-to-DOCX tidak memproses CSS `@page` sama sekali sehingga tidak terpapar bug ini). Masalah murni di jalur **PDF (Puppeteer)**.

### 3. Reproduce & pengukuran objektif

Tidak ada tool `pdftoppm`/ImageMagick di lingkungan ini — dibuat script pengukuran sendiri pakai `pdfjs-dist` + `canvas` (sudah jadi dependency proyek): render halaman PDF jadi bitmap 150dpi, cari piksel non-putih terluar di 4 sisi, konversi jarak ke cm. Hasil generate ulang PDF pasca-Fase-20, halaman isi (bukan cover):
```
Margin ATAS  : 0.58cm    (target 3cm)
Margin BAWAH : 0.51cm    (target 2cm)
Margin KIRI  : 0.00-1.02cm (target 3cm)
Margin KANAN : 0.02-1.98cm (target 2cm)
```
**Independen mengonfirmasi laporan user** — bukan salah baca kode, betul-betul salah di file hasil.

### Akar masalah #1 — CSS `@page { margin: 0; }` bentrok dengan opsi margin Puppeteer

`PRINT_CSS` (sudah ada sejak Fase 17/18, tidak disentuh Fase 20) punya:
```css
@page { size: A4 portrait; margin: 0; }
```
Dibuktikan lewat bisection HTML minimal (div sederhana, tanpa konten LAKIP sama sekali): dengan `@page{margin:0}` aktif, opsi margin Puppeteer (`page.pdf({margin:{...}})`) **diabaikan**, margin efektif jatuh ke ~0.2-0.7cm. Begitu properti `margin` dihapus dari `@page` (size tetap dipertahankan), margin balik benar (~3.2cm/3.15cm pada tes minimal).

**Ini bug LATEN sejak Fase 18** (saat itu `@page{margin:0}` sudah ada, tapi saya cuma memverifikasi margin lewat perhitungan aritmetika — "170mm dihitung dari margin yang sekarang tunggal" — **bukan lewat pengukuran piksel sungguhan**, jadi bug ini tidak pernah ketahuan sampai sekarang). Fase 20 tidak "merusak" margin — Fase 20 cuma memperbesar nilai target margin (20mm→3cm/2cm) sehingga selisih yang tadinya kecil & tak kentara jadi jauh lebih mencolok dan akhirnya dilaporkan user.

**Fix bagian ini:** hapus properti `margin` dari `@page` (CSS di `PRINT_CSS`), sisakan cuma `size: A4 portrait`.

### Akar masalah #2 (BARU ditemukan, LEBIH BESAR) — Puppeteer `displayHeaderFooter` + template berisi konten MENGABAIKAN opsi `margin` TOTAL

Setelah fix #1 diterapkan, margin **masih salah** di dokumen LAKIP asli (meski sudah benar di tes HTML minimal) — indikasi ada penyebab KEDUA. Bisection lanjutan (isolasi variabel satu-satu: cover-vs-rest paralel/sekuensial, header/footer ada/tidak):

- Render `rest` SENDIRIAN tanpa header/footer Puppeteer → margin **benar** (3.01cm/1.98cm).
- Render `rest` yang SAMA PERSIS + `displayHeaderFooter:true` + `headerTemplate`/`footerTemplate` berisi konten nyata (persis kode produksi) → margin **rusak** (0.58cm/0.02cm) — REPRODUCE PERSIS.
- Dites dengan HTML generik (`<div>Header</div>`/`<div>Footer</div>`, TANPA konten LAKIP sama sekali), margin tetap rusak → **bukan soal isi/CSS LAKIP, murni interaksi Puppeteer**.
- Dicoba margin 3cm, 5cm, satuan inch, CSS `@page` — **hasil SAMA PERSIS setiap kali** (~0.52cm) selama header/footer berisi konten apa pun → opsi `margin` **diabaikan total**, bukan cuma dihitung salah.
- Header/footer KOSONG (`<span></span>`, konvensi dokumen Puppeteer utk "tanpa header/footer") → margin **benar**.

**Kesimpulan:** di versi terpasang (`puppeteer 24.14.0` / Chrome `138.0.7204.157`), kombinasi `displayHeaderFooter:true` + template berisi konten nyata membuat Chromium **mengabaikan opsi `margin` sepenuhnya**, apa pun nilainya. Ini bug/keterbatasan level Puppeteer-Chromium, bukan sesuatu yang bisa diperbaiki lewat CSS atau nilai opsi.

---

## B. Perbaikan

### 1. Fix #1 (CSS `@page`)
```css
/* SEBELUM: */
@page { size: A4 portrait; margin: 0; }
/* SESUDAH: */
@page { size: A4 portrait; }
```

### 2. Fix #2 (header/footer Puppeteer → pdf-lib stamping)

Karena Puppeteer TIDAK BISA diandalkan untuk margin+header/footer sekaligus, header/footer **tidak pernah lagi** diberikan ke Puppeteer sebagai konten — `displayHeaderFooter` sekarang **selalu `false`**. Sebagai gantinya, header (judul kiri + nomor halaman kanan) dan footer (teks tengah) **di-"cap" SETELAH render**, langsung ke PDF hasil merge, pakai `pdf-lib` (`page.drawText()`) — pola yang SAMA dengan `stampPageNumbers` yang sudah dipakai Fase 19, sekarang digeneralisasi jadi `stampHeaderFooter()` yang mencakup teks header+footer juga, bukan cuma nomor halaman.

`buildHeaderFooterTemplates()` (yang dulu menghasilkan HTML template Puppeteer) diganti `buildHeaderFooterText()` (cuma string teks polos, tidak pernah masuk ke Puppeteer). `renderPdfPage()` kehilangan parameter `headerFooter` — sekarang selalu render tanpa header/footer Puppeteer, margin jadi 100% andal.

### 3. Diterapkan ke KEDUA mode export

- **`exportPdf`** (cepat/harian): render cover+rest tanpa header/footer Puppeteer → merge → `stampHeaderFooter()` pakai `pdfPageCount(restBuf)` sebagai total.
- **`exportPdfFinal`** (Fase 19, dengan nomor halaman): SEMUA 10 section + Daftar-Isi-render-ulang tanpa header/footer Puppeteer → merge → `stampHeaderFooter()` pakai `cumulative` (total halaman non-cover, angka yang SAMA dipakai menyuntik Daftar Isi) — satu mekanisme, dipakai oleh kedua fungsi, tidak ada lagi cabang `omitPageNumber` khusus (sudah tidak relevan, wong Puppeteer tidak pernah lagi diberi nomor apa pun).

---

## Verifikasi (pengukuran piksel objektif, BUKAN baca kode)

### `exportPdf` (mode cepat)

| Halaman | Atas | Bawah | Kiri | Kanan |
|---|---|---|---|---|
| 2 (Kata Pengantar, teks biasa) | 3.71cm | — (konten pendek) | **3.01cm** | **1.98cm** |
| 16 (isi tabel) | **2.98cm** | — (konten pendek) | **3.01cm** | **1.98cm** |

### `exportPdfFinal` (mode nomor halaman)

| Halaman | Atas | Bawah | Kiri | Kanan |
|---|---|---|---|---|
| 2 (Kata Pengantar) | 3.71cm | — | **3.01cm** | **1.98cm** |
| 16 (isi tabel) | **2.98cm** | — | **3.01cm** | **1.98cm** |

**Kiri/kanan konsisten TEPAT sasaran (target 3cm/2cm) di KEDUA mode, KEDUA jenis halaman.** Atas bervariasi 2.98-3.71cm tergantung konten (heading punya `margin-top` sendiri di atas margin halaman 3cm dasar — bukan bug, cuma jarak tambahan dari elemen pertama halaman itu). "Margin bawah" tidak dilaporkan sebagai angka tunggal karena kedua halaman contoh kontennya tidak sampai menyentuh dasar halaman (jarak besar yang terukur mencerminkan sisa halaman kosong, bukan margin yang salah).

**Before vs after (halaman isi, exportPdf):**
```
SEBELUM: Atas 0.58cm | Bawah 0.51cm | Kiri 0.00-1.02cm | Kanan 0.02-1.98cm
SESUDAH: Atas 2.98-3.71cm | Kiri 3.01cm | Kanan 1.98cm
```

### Regresi Word (DOCX) — tidak disentuh Fase 21, dikonfirmasi tetap benar

```
Dibuka via Word COM: OK (2342 paragraf)
Margin (dari Word PageSetup API): Top=3cm Bottom=2.01cm Left=3cm Right=2.01cm
```

### Konten header/footer/TTD tetap benar setelah perubahan mekanisme

```
Header judul muncul? true — "LAKIP/LKj Tahun 2025 — Dinas Pangan Maluku Utara"
Footer "digenerate..." muncul? true
Sofifi (TTD): 3x | "Kepala Dinas Pangan,": 2x
Daftar Isi (exportPdfFinal): Kata Pengantar 1, Daftar Isi 2, Ringkasan Eksekutif 3, BAB I 4, BAB II 7, BAB III 8, BAB IV 22, ... — kontinu & masuk akal
```

### Data uji

Semua file PDF/DOCX uji coba dan script pengukuran sementara (`measure_margin_TEMP.js` yang sempat disalin ke `backend/` untuk resolusi `require()`) sudah dihapus. `git status` dikonfirmasi hanya `lakipExportController.js` yang berubah.

---

## Ringkasan

| | Sebelum Fase 21 | Sesudah Fase 21 |
|---|---|---|
| Margin PDF aktual (kiri/kanan) | ~0.0-1.0cm | **~3.0/2.0cm** (sesuai target) |
| Sumber margin | CSS `@page{margin:0}` DIAM-DIAM menang atas opsi Puppeteer | Puppeteer margin SATU-SATUNYA sumber, tidak ada lagi yang bentrok |
| Header/footer PDF | Native Puppeteer `headerTemplate`/`footerTemplate` (TERBUKTI merusak margin saat dikombinasikan) | Di-cap via `pdf-lib` SETELAH render (pola sama dgn nomor halaman Fase 19) |
| Cakupan fix | — | `exportPdf` DAN `exportPdfFinal`, dua-duanya |
| Margin DOCX | 3/2.01/3/2.01cm (sudah benar sejak Fase 20) | Tidak berubah, tetap benar (regresi dicek) |

**2 akar masalah ditemukan dan diperbaiki** — CSS `@page{margin:0}` (bug laten sejak Fase 18) dan interaksi Puppeteer margin+header/footer (bug versi library, ditemukan baru di Fase 21). Tidak ada perubahan data di database — seluruh perubahan murni kode.
