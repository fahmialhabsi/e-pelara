# Fase 19 — Nomor Halaman Daftar Isi (Opsi A, Level Bab) + Mode Preview/Final Terpisah

**Status:** Dieksekusi dan diverifikasi. Bug signifikan ditemukan & diperbaiki di tengah implementasi (lihat §A.4 "Temuan penting").

**File yang diubah:** `backend/controllers/lakipGeneratorController.js`, `backend/controllers/lakipExportController.js`, `backend/routes/lakipGeneratorRoutes.js`, `frontend/src/features/lakip/components/LakipGeneratorPanel.jsx`.

---

## A. Implementasi Opsi A (level Bab)

### 1. Marker komentar HTML — TIDAK PERLU ditambah, sudah ada semua

Sebelum menambah marker baru, dicek dulu marker yang sudah ada di `buildHtml()` (banyak ditambahkan di fase-fase sebelumnya untuk keperluan readability template) — **ternyata seluruh 10 titik potong level-Bab yang dibutuhkan sudah punya marker HTML comment sendiri**, tidak perlu satupun ditambah:

```
<!-- COVER -->              (sudah ada sejak Fase 17, ditangani terpisah)
<!-- KATA PENGANTAR -->
<!-- DAFTAR ISI -->
<!-- RINGKASAN EKSEKUTIF -->
<!-- BAB I — PENDAHULUAN -->
<!-- BAB II — PERENCANAAN KINERJA -->
<!-- SASARAN STRATEGIS -->         ← nama legacy, ISINYA "BAB III — AKUNTABILITAS KINERJA" (dipakai apa adanya sbg marker BAB III)
<!-- PENUTUP + TTD -->             ← nama legacy, ISINYA "BAB IV — PENUTUP" (dipakai apa adanya sbg marker BAB IV)
<!-- PERNYATAAN TELAH DIREVIU -->
<!-- LAMPIRAN 1 — PERJANJIAN KINERJA -->
<!-- LAMPIRAN 2 — PENGUKURAN KINERJA -->
```
Ini mengurangi risiko implementasi dibanding perkiraan awal (Fase 17 Poin 8) — tidak ada marker baru yang perlu disisipkan dan disinkronkan manual.

### 2. `splitHtmlIntoSections(html, markerEntries)`

Generalisasi `splitCoverFromRest()` (Fase 17) — potong `rest` (HTML setelah Cover) jadi N section berurutan berdasar array marker. Tiap section jadi dokumen HTML utuh sendiri (head + slice + closing tag), siap dirender Puppeteer terpisah — pola identik dengan cover/rest, cuma digeneralisasi dari 2 jadi N section.

### 3-4. Pipeline render → hitung halaman → suntik nomor → render ulang Daftar Isi → merge

`buildHtml(data, options)` diberi parameter baru `options.pageNumbers` — kalau diisi, Daftar Isi merender kolom "Halaman" dan menghapus disclaimer lama; kalau tidak diisi (default, dipakai `/preview` & `exportPdf` biasa), perilaku sama persis seperti sebelum Fase 19.

Daftar Isi direfactor dari HTML statis jadi data-driven (`TOC_SECTIONS(tahun)`, array section dengan `key`/`label`/`subItems`) — satu-satunya cara membuatnya bisa menerima nomor halaman opsional tanpa duplikasi template.

Pipeline `exportPdfFinal()`:
1. `collectLakipData()` sekali (data mentah, dipakai 2x render).
2. Render pertama (`buildHtml(data)`, TANPA pageNumbers) → split cover+10 section → render SEMUA (cover+10) **paralel** via `Promise.all` → hitung jumlah halaman tiap section via `pdf-lib`.
3. Akumulasi jadi nomor halaman awal tiap section (`pageNumbers` map, kumulatif, cover tidak dihitung/dinomori — konvensi Fase 17).
4. Render KEDUA — HANYA section Daftar Isi, kali ini dengan `buildHtml(data, {pageNumbers})` supaya tabelnya terisi angka yang benar.
5. Gabung: cover + 9 section dari render pertama + 1 section Daftar Isi dari render kedua → `pdf-lib` `copyPages`, urut.

### Temuan penting saat verifikasi — bug nomor halaman "reset per-section"

**Setelah implementasi awal selesai, verifikasi manual (cocokkan nomor TOC ke isi halaman aktual) GAGAL total** — nomor yang tercetak di header/footer TIDAK cocok dengan Bab yang seharusnya. Akar masalah: `pageNumber`/`totalPages` bawaan Puppeteer **dihitung ulang dari 0 di TIAP job render terpisah** — karena `exportPdfFinal` merender 10 section sebagai 10 job Puppeteer BERBEDA (bukan 1 job utuh seperti `exportPdf` biasa yang cuma render cover+rest), section "BAB II" yang seharusnya halaman 11-12 dari total dokumen, header/footer bawaannya sendiri cuma tahu "1/2" (relatif terhadap section itu sendiri) — bukan "11/38".

**Fix:** header/footer untuk `exportPdfFinal` di-render TANPA `pageNumber`/`totalPages` Puppeteer (`omitPageNumber: true`, opsi baru di `buildHeaderFooterTemplates`) — nomor yang benar (kumulatif, konsisten dengan Daftar Isi) di-"cap" belakangan langsung ke PDF hasil merge pakai `pdf-lib` (`stampPageNumbers()`, pojok kanan-bawah tiap halaman kecuali cover, pakai `page.drawText()`). `exportPdf` (mode cepat, fast path) **tidak kena masalah ini** — cuma 2 job (cover+rest), dan "rest" adalah 1 job utuh untuk seluruh isi (Kata Pengantar s.d. Lampiran 2), jadi `pageNumber` bawaan Puppeteer-nya sudah otomatis kumulatif & benar sendiri sejak awal.

### 5. Update disclaimer Daftar Isi

Disclaimer lama ("Nomor halaman mengikuti pagination otomatis... tidak dicantumkan...") sekarang **kondisional** — tampil HANYA kalau `pageNumbers` tidak diisi (mode cepat/preview, tidak berubah). Kalau `pageNumbers` diisi (mode final), disclaimer dihapus total (tidak diganti kalimat lain — kolom "Halaman" yang terisi sudah menjelaskan sendiri).

### Verifikasi cross-check nomor halaman (setelah fix `stampPageNumbers`)

Dicocokkan manual 10/10 baris level-Bab: nomor yang tertera di Daftar Isi vs nomor yang BENAR-BENAR TERCETAK di footer halaman yang bersangkutan, DAN isi halaman itu (heading Bab yang sesuai):

```
Kata Pengantar (tercetak "1"): COCOK ✓ — halaman berisi "KATA PENGANTAR"
Daftar Isi (tercetak "3"): COCOK ✓ — halaman berisi "DAFTAR ISI"
Ringkasan Eksekutif (tercetak "5"): COCOK ✓
BAB I (tercetak "7"): COCOK ✓
BAB II (tercetak "11"): COCOK ✓
BAB III (tercetak "13"): COCOK ✓
BAB IV (tercetak "29"): COCOK ✓
Pernyataan Telah Direviu (tercetak "31"): COCOK ✓
Lampiran 1 (tercetak "33"): COCOK ✓
Lampiran 2 (tercetak "37"): COCOK ✓
```
**Semua 10 baris level-Bab cocok persis** antara nomor di Daftar Isi, nomor yang benar-benar tercetak di halaman fisik, dan isi/heading halaman tersebut.

---

## B. Safeguard drift marker

`validateTocSync(html, markerEntries)` dijalankan **SEBELUM** proses render mahal (~12 Puppeteer job) dimulai — 2 pemeriksaan:
1. Semua marker di `BAB_SECTION_MARKERS` harus ditemukan di HTML. Kalau tidak → error eksplisit sebut key yang hilang.
2. Jumlah baris level-Bab di tabel Daftar Isi (dihitung dinamis dari HTML yang SEDANG di-generate — bukan angka hardcode) harus PERSIS sama dengan jumlah marker. Kalau tidak → error eksplisit sebut kedua angka yang tidak cocok.

### Uji Skenario 1 — marker hilang (comment out marker BAB II)
```
[Fase19 safeguard] Marker tidak ditemukan di template buildHtml(): bab2.
Kemungkinan template berubah tapi BAB_SECTION_MARKERS di lakipExportController.js belum diupdate.
```
→ HTTP 500, **tidak ada PDF yang dihasilkan**, error jelas menyebut section `bab2`. Perubahan test langsung dikembalikan setelah verifikasi.

### Uji Skenario 2 — baris Bab baru ditambah ke Daftar Isi tanpa marker baru
```
[Fase19 safeguard] Mismatch: 10 marker section ditemukan, 11 baris level-Bab di tabel Daftar Isi
— buildHtml() (TOC_SECTIONS) dan BAB_SECTION_MARKERS di lakipExportController.js tidak sinkron.
Cek apakah ada Bab yang ditambah/dihapus di salah satu tempat tapi tidak di tempat lain.
TIDAK melanjutkan render supaya tidak menerbitkan dokumen dengan nomor halaman yang berpotensi salah.
```
→ HTTP 500, **tidak ada PDF yang dihasilkan**. Perubahan test (baris `test_bab_palsu` di `TOC_SECTIONS`) langsung dikembalikan setelah verifikasi.

**Kedua skenario dikonfirmasi: proses berhenti dengan error jelas, TIDAK ADA nomor halaman salah yang lolos ke dokumen.**

---

## C. Mode preview cepat vs export final

### 1-2. Endpoint terpisah

- **`GET /api/lakip-generator/export/pdf`** (existing, TIDAK diubah perilakunya) — 2 render pass (cover+rest), TANPA nomor halaman Daftar Isi, dipakai sehari-hari.
- **`GET /api/lakip-generator/export/pdf-final`** (BARU) — ~12 render pass, DENGAN nomor halaman Daftar Isi, dipakai saat dokumen mau diterbitkan resmi.

Kedua endpoint reuse helper module-scope yang sama (`buildHeaderFooterTemplates`, `renderPdfPage`, `mergePdfBuffers`, `MARGIN`/`NO_MARGIN`) — tidak ada duplikasi logic berarti, cuma orkestrasi levelnya yang beda (2 vs 12 render + safeguard + stamping).

Frontend (`LakipGeneratorPanel.jsx`): tombol baru **"Export Final (dengan Nomor Halaman)"** (variant `outline-danger`, dengan tooltip menjelaskan lebih lambat) ditambahkan di kedua grup tombol (dengan/tanpa `previewData` di-load). Timeout request dilonggarkan khusus untuk `pdf-final` (180 detik vs 60 detik utk pdf/docx biasa).

**Temuan tambahan (di luar scope literal, diperbaiki karena langsung terkait):** ditemukan `downloadFile()` frontend selama ini **hardcode nama file `LAKIP_${tahun}_DinasKetahananPangan.${ext}`** sendiri di sisi client — ini secara diam-diam MENIMPA fix nama file Fase 17 di backend, karena atribut `a.download` pada trik unduh-lewat-blob-URL selalu menang atas header `Content-Disposition` server. Diperbaiki sekalian (mengekstrak nama file asli dari header response) supaya fix Fase 17 benar-benar terlihat oleh user saat mengunduh, bukan cuma benar di response header yang tidak pernah dipakai.

### 3. Pertimbangan duplikasi kode

Tidak ditemukan hambatan teknis berarti — sebagian besar kode (margin, header/footer template builder, render-per-halaman, merge pdf-lib) sudah diekstrak jadi helper bersama sebelum menulis `exportPdfFinal`, sehingga 2 endpoint terpisah bisa diimplementasikan tanpa duplikasi signifikan. Tidak perlu lapor balik ke user untuk keputusan — opsi 2-endpoint terpisah langsung dikerjakan sesuai permintaan.

### Verifikasi — waktu render

```
Mode CEPAT (exportPdf, 2 render pass):        ~10.1 detik
Mode FINAL (exportPdfFinal, ~12 render pass): ~13.3-14.3 detik
```
Selisihnya lebih kecil dari dugaan awal (Fase 17 memperkirakan bisa "puluhan detik") — karena render 10 section dilakukan PARALEL (`Promise.all`, bukan sekuensial) dan overhead peluncuran Chromium (~beberapa detik, konstan di kedua mode) mendominasi total waktu. Mode final tetap ~30-40% lebih lambat, cukup terasa bedanya untuk dijadikan tombol terpisah seperti diminta, tapi tidak seburuk yang dikhawatirkan.

### Verifikasi regresi mode cepat

```
Total halaman: 39 (tidak berubah)
Disclaimer lama masih ada? true (BENAR, tidak berubah)
Kolom "Halaman" TOC muncul? false (BENAR, tidak berubah)
```
Mode cepat/harian dikonfirmasi **tidak ada perubahan perilaku sama sekali** — hanya mode final yang baru.

DOCX (`exportDocx`, tidak disentuh Fase 19 sama sekali) dikonfirmasi tetap berfungsi normal (regresi check).

---

## Ringkasan

| | Mode Cepat (`exportPdf`) | Mode Final (`exportPdfFinal`, BARU) |
|---|---|---|
| Jumlah render Puppeteer | 2 (cover + rest) | ~12 (cover + 10 section + 1 render-ulang Daftar Isi) |
| Waktu | ~10 detik | ~13-14 detik |
| Nomor halaman Daftar Isi | Tidak ada (disclaimer seperti biasa) | Ada, terverifikasi 10/10 baris cocok dgn halaman fisik |
| Safeguard drift marker | — | Aktif, 2 skenario gagal teruji melempar error jelas sebelum render mahal jalan |
| Dipakai untuk | Cek data sehari-hari | Terbitkan dokumen resmi |

**Bug signifikan ditemukan & diperbaiki di tengah proses**: nomor halaman Puppeteer bawaan reset per-section (tidak kumulatif) — diperbaiki dengan `stampPageNumbers()` (pdf-lib post-processing), TANPA fix ini nomor di Daftar Isi akan mencocokkan angka yang salah/tidak ada di halaman fisik. Tidak ada perubahan data di database — seluruh perubahan Fase 19 murni kode.
