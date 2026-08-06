# Fase 1 — Satukan Sumber Template PDF & Word (LAKIP)

**Ruang lingkup:** `backend/controllers/lakipExportController.js` (fungsi `exportDocx`), mengikuti rekomendasi di `AUDIT-LAKIP-SISTEMATIKA.md` bagian "Rekomendasi Perbaikan Konkret per File".
**Status:** SELESAI & terverifikasi dengan generate dokumen nyata (data DB asli, tahun 2025). Menunggu review sebelum lanjut Fase 2.

---

## 1. Perubahan Kode

File: `backend/controllers/lakipExportController.js`

| Baris | Perubahan |
|---|---|
| 118 | `buildDocxHtml` → **di-rename** jadi `buildDocxHtml_deprecated`, body fungsi **tidak diubah sama sekali**. Ditambah komentar penjelas (115-117) kenapa dibiarkan (rollback/pembanding), bukan dihapus. Fungsi ini sekarang tidak dipanggil di manapun. |
| 250-284 | **3 fungsi transform baru**, khusus dipakai di jalur DOCX saja (tidak menyentuh `buildHtml()`/PDF): `stripDocxToolbar()`, `stripDocxStyleBlock()`, `stripDocxTableCellWidthStyle()`. Alasan masing-masing dijelaskan di §2 di bawah — ini BUKAN penyederhanaan struktur/konten laporan, murni kompatibilitas terhadap keterbatasan library `html-to-docx`. |
| 286-295 | `exportDocx()` diganti total: sebelumnya ambil JSON via `genCtrl.getData()` lalu bangun ulang HTML sendiri lewat `buildDocxHtml()`. Sekarang **reuse `getHtml(req)`** — HTML yang **sama persis** dengan yang dipakai `exportPdf()` (baris 63) — lalu dilewatkan 3 fungsi strip di atas sebelum masuk `HTMLtoDOCX()`. |

Tidak ada perubahan di `lakipGeneratorController.js` (`buildHtml()` tetap seperti semula — satu-satunya sumber struktur dokumen sekarang, untuk PDF *dan* DOCX).

---

## 2. Temuan CSS: kenapa reuse HTML apa adanya tidak bisa langsung jalan

Investigasi dilakukan dengan membaca source `html-to-docx` v1.7.0 (`node_modules/html-to-docx/dist/html-to-docx.umd.js`) langsung — bukan asumsi dari dokumentasi — lalu diverifikasi dengan bisection nyata (generate DOCX sungguhan dari potongan HTML, lihat §3). Tiga temuan, urut dari yang paling parah:

### 2.a `<style>` block SAMA SEKALI tidak di-parse (bukan cuma grid/flexbox — SEMUA CSS class-based)

`html-to-docx` **tidak punya parser CSS sama sekali** untuk selector class/id — dicek dengan grep source untuk `cssRules`/`stylesheet`/`className`/`class=`: nol hasil. Ia hanya membaca objek `style` yang sudah di-parse dari atribut **inline** `style="..."` per elemen (lewat dependency `html-to-vdom`). Konsekuensinya, seluruh `<style>...</style>` di `buildHtml()` (~270 baris: `.page`, `.cover`, `table/th/td`, `.badge`, `.kpi-grid`, `.hierarchy-title`, dst.) **tidak berlaku apa pun** untuk DOCX — bukan "diabaikan dengan aman", tapi **aktif merusak**: karena `html-to-vdom` memperlakukan tag `<style>` sebagai elemen biasa (bukan tag yang di-skip), seluruh teks CSS mentahnya (termasuk baris `/* ── Print ── */`, `@media print { ... }`, nama class seperti `kpi-grid`) **didorong sebagai satu paragraf teks biasa di halaman pertama dokumen, sebelum BAB I** — dibuktikan lewat generate DOCX sungguhan dan inspeksi `word/document.xml` (lihat log di §3).

- **Dampak jika dibiarkan:** dokumen Word dibuka dengan +-270 baris gibberish CSS di paragraf pertama, sebelum "BAB I — PENDAHULUAN".
- **Fix diterapkan (Fase 1):** `stripDocxStyleBlock()` — buang seluruh blok `<style>...</style>` sebelum masuk `HTMLtoDOCX()`, khusus jalur DOCX.
- **Konsekuensi:** semua styling yang didefinisikan lewat class (warna dasar capaian, border tabel, badge status, garis hierarki Tujuan→Sasaran→Program→Kegiatan, kotak KPI, cover) **tidak akan tampak** di Word — dokumen jadi hitam-putih polos, terstruktur benar tapi tidak "berwarna" seperti PDF.
- **Alternatif yang didukung (untuk Fase 2 kalau mau paritas visual):** pindahkan styling yang benar-benar penting (warna status capaian, border tabel) ke atribut `style="..."` **inline per elemen** langsung di `buildHtml()` (bukan lewat class) — `html-to-docx` terbukti membaca `color`, `background-color`, `border`, `text-align`, `vertical-align`, `line-height` kalau ditulis inline. Ini investasi non-trivial (puluhan titik di `buildHtml()`), sengaja **tidak** dikerjakan di Fase 1 ini karena scope-nya "satukan sumber", bukan "samakan visual".

### 2.b `display:none` tidak berlaku → toolbar harus dibuang fisik

Konsekuensi langsung dari 2.a: `PRINT_CSS` di `exportPdf()` (baris 32-49) menyembunyikan toolbar lewat `.toolbar{display:none!important}` — ini jalan untuk PDF karena Puppeteer = browser sungguhan dengan full CSS engine. Untuk DOCX, aturan itu di dalam `<style>` yang sudah tidak dibaca sama sekali, jadi toolbar (`📄 ... 🖨️ Cetak / Print ✕ Tutup`) akan ikut ter-render sebagai teks biasa di halaman pertama kalau tidak ditangani terpisah.

- **Fix diterapkan:** `stripDocxToolbar()` — buang node `<div class="toolbar no-print">...</div>` secara fisik dari HTML (bukan CSS-hide) sebelum konversi, karena `display:none` terbukti tidak dibaca (`html-to-docx` hanya mengecek `style.display==="block"` untuk keperluan shading gambar, tidak untuk `"none"`).
- Diverifikasi: string "Cetak / Print", "Tutup", "window.print" **tidak** muncul lagi di `word/document.xml` hasil generate (§3).

### 2.c Bug crash nyata: `style="width:NN%"` / `width:auto` di `<th>`/`<td>` → html-to-docx exception

Ini **bukan** cuma "grid/flexbox tidak didukung" seperti dugaan awal di task — dibuktikan lewat bisection manual (uji satu-satu tiap bagian HTML) bahwa reuse HTML apa adanya langsung **crash** dengan error:
```
The string contains invalid characters. Invalid XML name: @w
```
Dipersempit sampai baris tunggal: `<th style="width:5%">` (atau `width:auto`) pada elemen tabel memicu exception ini di internal `html-to-docx` v1.7.0 (bukan pada `<div>`, bukan pada `width:Npx`, bukan pada `table{width:100%}` di level tabel — hanya pada **cell** dengan width persen/auto). Pola ini dipakai di 3 tabel di `buildHtml()`: `indikatorTableHtml()` (baris ~461-474, dipakai berulang di IKU/IKK/hierarki), tabel Perjanjian Kinerja BAB II (baris ~1001-1012), dan tabel Rincian Realisasi Program/Kegiatan (baris ~1038-1051).

- **Fix diterapkan:** `stripDocxTableCellWidthStyle()` — buang **hanya** atribut `style="width:...\"` pada `<th>`/`<td>`, regex `/(<t[hd])\s+style="width:[^"]*"/gi`. Tidak menyentuh struktur/isi tabel, cuma menghilangkan satu inline-style yang bikin crash.
- **Konsekuensi:** proporsi lebar kolom (mis. kolom "No" 4-5% vs "Evaluasi" 22-26%) hilang di Word — semua kolom jadi auto-width oleh Word. Murni kosmetik, tidak ada data yang hilang/salah urut.
- **Alternatif yang didukung untuk Fase 2 kalau mau proporsi kolom tetap presisi:** ganti dari `style="width:X%"` ke atribut HTML biasa `width="X%"` (bukan CSS) pada `<th>`/`<td>` — terbukti **tidak crash** saat diuji, tapi juga terbukti **tidak dipakai** oleh `html-to-docx` untuk menentukan lebar kolom sungguhan (source hanya membaca `vNode.properties.style.width`, bukan atribut HTML `width`), jadi hasilnya tetap auto-width — sama seperti dibuang saja. Kalau proporsi kolom betul-betul dibutuhkan, satu-satunya jalur yang didukung `html-to-docx` adalah `width:Npx` (bukan `%`/`auto`) — perlu dihitung ulang dari lebar halaman efektif (210mm − margin kiri/kanan) ke px, per tabel.

**Ringkasan:** dari 3 masalah di atas, **hanya (2.c) yang benar-benar "grid/flexbox-style CSS tidak didukung dan bikin layout rusak"** sesuai dugaan awal task (meski akar masalahnya width%, bukan grid/flex — `display:grid`/`display:flex` sendiri di `buildHtml()` ternyata tidak pernah sampai dievaluasi karena sudah gugur duluan di (2.a): seluruh `<style>` block, termasuk `.kpi-grid{display:grid}` dan `.cover{display:flex}`, tidak dibaca sama sekali). Temuan (2.a) dan (2.b) justru lebih parah dan wajib ditangani lebih dulu supaya dokumen bisa dibuka tanpa gibberish/tombol UI nyasar.

---

## 3. Verifikasi: generate sample nyata (data DB asli)

Dijalankan langsung terhadap DB lokal (`tahun=2025`, `periode_id=2` → RPJMD 2025-2029, Renstra OPD aktif Dinas Ketahanan Pangan), memanggil `genCtrl.preview`, `exportCtrl.exportPdf`, `exportCtrl.exportDocx` langsung (tanpa lewat HTTP) via script sekali-pakai di scratchpad (tidak masuk repo).

- PDF: **1.327.640 bytes**, sukses (jalur PDF tidak diubah sama sekali, tetap `buildHtml()` → PRINT_CSS → Puppeteer).
- DOCX: awalnya **crash** (`Invalid XML name: @w`, temuan 2.c) → setelah 3 fix diterapkan: **sukses**, 1.034.421 bytes.
- Dicek `word/document.xml` hasil akhir: string CSS mentah (`box-sizing`, `kpi-grid`, `@media`, `hierarchy-title`) **tidak muncul lagi**; teks toolbar (`Cetak / Print`, `Tutup`, `window.print`) **tidak muncul lagi**.

### Perbandingan urutan & judul Bab (PDF vs DOCX)

Diekstrak dari PDF via `pdftotext -layout` dan dari DOCX via parsing langsung `word/document.xml` (paragraf dengan `pStyle` `Heading1`/`Heading2`):

| # | PDF | DOCX | Sama? |
|---|---|---|---|
| — | LAPORAN AKUNTABILITAS KINERJA INSTANSI PEMERINTAH (cover) | LAPORAN AKUNTABILITAS KINERJA\*INSTANSI PEMERINTAH | ✅ (lihat catatan minor di bawah) |
| 1 | BAB I — PENDAHULUAN | BAB I — PENDAHULUAN | ✅ |
| 2 | RINGKASAN EKSEKUTIF | RINGKASAN EKSEKUTIF | ✅ |
| 3 | BAB II — PERENCANAAN KINERJA | BAB II — PERENCANAAN KINERJA | ✅ |
| 4 | BAB III — AKUNTABILITAS KINERJA | BAB III — AKUNTABILITAS KINERJA | ✅ |
| 5 | BAB IV — PENUTUP | BAB IV — PENUTUP | ✅ |

**Urutan dan judul Bab sekarang identik** antara PDF dan DOCX (sebelumnya, per `AUDIT-LAKIP-SISTEMATIKA.md` §2.B, DOCX punya Bab yang hilang total — Bab I Pendahuluan & Bab II Perencanaan Kinerja — dan penomoran bergeser III→I, IV→III). Sub-heading level 3-6 (A/B/C.., Sasaran/Program/Kegiatan) di DOCX juga sudah mengikuti hierarki `indikatorTree` yang sama persis dengan PDF (dicek manual, lihat contoh "Tujuan T2-01.01 → Sasaran STR2-01.03.1 → Program → Kegiatan" muncul di kedua dokumen dengan isi sama).

**Catatan minor (bukan masalah urutan Bab, tapi cacat visual kecil dari reuse HTML apa adanya):** judul cover `<h1>LAPORAN AKUNTABILITAS KINERJA<br>INSTANSI PEMERINTAH</h1>` di `buildHtml()` pakai `<br>` untuk baris baru — Puppeteer merender ini sebagai dua baris (PDF benar), tapi `html-to-docx` tidak menyisipkan spasi/line-break di posisi `<br>` sehingga teksnya menempel: "KINERJA**INSTANSI**" tanpa spasi di DOCX. Tidak diperbaiki di Fase 1 ini (di luar scope "satukan sumber & urutan Bab"), dicatat sebagai kandidat kecil untuk Fase 2.

---

## 4. Yang sengaja TIDAK dikerjakan di Fase 1 (kandidat Fase 2/3)

- Menyamakan **visual** DOCX dengan PDF (warna status capaian, border tabel, badge, garis hierarki, kotak KPI, cover) — perlu memindahkan styling dari `<style>` class ke inline `style=` per elemen di `buildHtml()`, titik sentuhnya banyak.
- Proporsi lebar kolom tabel di DOCX (saat ini auto-width, lihat §2.c).
- Perbaikan `<br>` di judul cover agar tidak menempel di DOCX.
- Semua temuan sistematika dari `AUDIT-LAKIP-SISTEMATIKA.md` Tahap 3-4 yang **sama-sama** berlaku untuk PDF & DOCX sekarang (karena sumbernya sudah satu): urutan Ringkasan Eksekutif vs Bab I, Bab I belum lengkap (Latar Belakang/Tugas Fungsi/Struktur Organisasi), Bab II belum ada ringkasan Renstra, Realisasi Anggaran salah tempat, Analisis Efisiensi tidak ada, Kata Pengantar/Daftar Isi/Pernyataan Direviu tidak ada, Lampiran PK tidak di-embed. Semua ini sekarang **otomatis konsisten** antar PDF & DOCX begitu diperbaiki di `buildHtml()` satu tempat — itu isi Fase berikutnya sesuai rekomendasi audit.
- `buildDocxHtml_deprecated` memicu 1 warning lint (`no-unused-vars`, fungsi tidak dipakai) — sengaja dibiarkan sesuai instruksi (disimpan untuk rollback/pembanding), bukan bug.

---

## 5. File yang diubah

- `backend/controllers/lakipExportController.js` (satu-satunya file yang diubah)

Tidak ada migrasi, tidak ada perubahan skema DB, tidak ada perubahan route/frontend.
