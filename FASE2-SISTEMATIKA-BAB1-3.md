# Fase 2 (poin 1-6) — Perbaikan Sistematika LAKIP sesuai Permenpan RB 12/2015

**Ruang lingkup:** `backend/controllers/lakipGeneratorController.js` (`buildHtml()`, sumber tunggal PDF & DOCX sejak Fase 1). Mengacu `AUDIT-LAKIP-SISTEMATIKA.md` Tahap 4.
**Status:** Poin 1-6 SELESAI SEMUA & terverifikasi dari data DB nyata (tahun 2025). Poin 2 sempat tertunda menunggu keputusan produk (Opsi A/B/C, lihat §3) — **dikonfirmasi Opsi A dan sudah diimplementasikan**. "Pernyataan Telah Direviu" dan "Lampiran" sengaja tidak disentuh, menunggu diskusi terpisah.
**Catatan:** semua perubahan di file ini otomatis berlaku untuk PDF *dan* DOCX (sumber sama sejak Fase 1) — tidak ada perubahan di `lakipExportController.js` untuk struktur, kecuali 1 bugfix regex yang ditemukan saat verifikasi (§4).

---

## 1. Perubahan per poin

### Poin 1 — Ringkasan Eksekutif dipindah sebelum Bab I ✅
Blok `<!-- RINGKASAN EKSEKUTIF -->` dipindah dari posisi lama (setelah Bab I) ke posisi baru: setelah Cover, Kata Pengantar (baris 1051), dan Daftar Isi (baris 1083) — tepat sebelum Bab I (baris 1115; Bab I sendiri mulai baris 1162). Isinya tidak diubah selain menghapus tabel Realisasi Anggaran (dipindah ke Bab III, lihat Poin 4) dan menambah 1 kalimat penunjuk "Rincian realisasi anggaran disajikan pada Bab III bagian C."

### Poin 2 — Bab I diperluas ✅ SELESAI (keputusan Opsi A dikonfirmasi & diimplementasikan)
- **"A. Latar Belakang" (baris 1165): ditambahkan.** Sumber data: `renstra_bab` tabel bab='I' ("Pendahuluan", 1 item, isi ~1844 karakter) — belum pernah dipakai di LAKIP sebelumnya, tidak ada konflik. Query di `collectLakipData()` (baris 234-268: `WHERE bab IN ('I','II','III')`, tadinya cuma `('II','III')`) menghasilkan `latarBelakangItem`, dialirkan ke `buildHtml()` (baris 430, 479).
- **"D. Tugas dan Fungsi serta Struktur Organisasi" (baris 1185-an, sub-title tepat setelah "C. Maksud dan Tujuan") — Opsi A.** Variabel yang tadinya bernama `gambaranUmumItem` di-**rename** jadi `tusiItem` (dideklarasikan baris 246, diisi baris 259, dialirkan ke `buildHtml()` baris 431 & 480) supaya nama variabelnya jujur soal isinya — sumber datanya **tidak diubah sama sekali**, tetap butir `renstra_bab` bab='II' `"2.1 Tugas, Fungsi, dan Struktur Organisasi"`, cuma judul subbagian di HTML yang diganti.
- **"E. Gambaran Umum Organisasi" — BARU, Opsi A.** Sumber baru: butir `renstra_bab` bab='II' `"2.2 Sumber Daya Dinas Pangan"` (ekstraksi `sumberDayaItem`, baris 264: `items.find(judul startsWith '2.2') || null` — **sengaja tanpa fallback** ke item lain kalau tidak ketemu, supaya kalau OPD/tahun Renstra lain tidak punya butir 2.2, yang tampil adalah placeholder eksplisit "Data gambaran umum organisasi (sumber daya) belum tersedia pada modul Renstra." — bukan diam-diam menampilkan butir yang salah).
- **"F. Isu Strategis"**: cuma pergeseran huruf (sebelumnya E), sumber/konten tidak berubah.

Daftar Isi (halaman DAFTAR ISI di `buildHtml()`, baris 1095-1097) disesuaikan mengikuti urutan huruf final A-F yang sama.

### Poin 3 — Ringkasan Rencana Strategis di Bab II ✅
"A. Rencana Strategis" (baris 1228) ditambahkan sebelum tabel Perjanjian Kinerja (yang jadi "B. Perjanjian Kinerja Tahun ...", baris 1234). Data dari `tujuan`+`sasaran` yang sudah ada di `data` (tidak perlu query baru) — helper baru `renstraRingkasHtml` (baris 660-677) mengelompokkan Sasaran di bawah Tujuan induknya (beda dari `sasaranHtml` lama di Bab III yang flat tanpa pengelompokan).

### Poin 4 — Realisasi Anggaran dipindah ke Bab III ✅
Tabel & bar Realisasi Anggaran (sebelumnya di Ringkasan Eksekutif) diekstrak jadi helper `realisasiAnggaranHtml` (baris 681-702, dihitung sekali, dipakai sekali) dan disisipkan sebagai "C. Realisasi Anggaran" (baris 1287) tepat setelah "B. Rincian Realisasi Program dan Kegiatan" di Bab III — sesuai rekomendasi audit persis.

### Poin 5 — "D. Analisis Efisiensi" di Bab III ✅ (dikerjakan setelah rumus dikonfirmasi)
Rumus dipakai persis sesuai arahan: per **Kegiatan** (bukan Program — lihat catatan grain di bawah), `% Capaian Kinerja >= % Capaian Anggaran → "Efisien"`, selain itu `"Kurang Efisien"`; kalau salah satu data tidak tersedia → `"Tidak Dapat Dihitung"` (bukan NaN/Infinity/crash).

- **`analisaEfisiensi(rows)`** — fungsi baru di `backend/services/lakipAnalisaService.js` (baris 181-206). Terima array `{nama_program, nama_kegiatan, pct_capaian_kinerja, pagu, realisasi}`, kembalikan array yang sama + `pct_capaian_anggaran` (dihitung `round(realisasi/pagu*100)`, `null` kalau `pagu<=0`) + `status_efisiensi`. Pakai helper `angka()` yang sudah ada di file yang sama (menangani `null`/`undefined`/string kosong tanpa salah baca jadi 0), jadi tidak ada jalur yang menghasilkan `NaN`/`Infinity`.
- **Data capaian kinerja per Kegiatan** — `lakipGeneratorController.js` `collectLakipData()` (baris 383-406, setelah `indikatorTree` selesai dibangun): rata-rata `pct_capaian` dari `k.indikator` (indikator yang tertaut langsung ke Kegiatan itu di hierarki Renstra). Kegiatan tanpa indikator langsung → `pct_capaian_kinerja = null` → otomatis jadi "Tidak Dapat Dihitung", bukan crash.
- **Data anggaran per Kegiatan (BARU, belum pernah ada sebelumnya di sistem)** — query baru `anggaranPerKegiatanRows` (baris 209-232): agregasi `dpa.anggaran` (pagu) + `penatausahaan.jumlah` (realisasi, pre-agregat per `dpa_id` dulu di subquery supaya tidak fan-out saat JOIN+GROUP BY) dikelompokkan per teks `dpa.kegiatan`, tahun berjalan, `is_active_version=1`. Nama Kegiatan di Renstra vs di DPA kadang beda spasi/kapitalisasi (dicek manual, contoh nyata: `"Lainnya  sesuai"` vs `"Lainnya sesuai"`) — ditangani dengan `normalizeKegiatanKey()` (trim + collapse whitespace + lowercase) sebelum dicocokkan, supaya tidak salah dianggap "tidak ditemukan" gara-gara whitespace, bukan karena datanya memang tidak ada.
- **Render Bab III bagian D** — `buildHtml()` (heading baris 1294; helper `efisiensiHtml`/`efisiensiBadge`/`efisiensiNarasi` baris 706-745): tabel `Program / Kegiatan | % Capaian Kinerja | % Capaian Anggaran | Status Efisiensi` + 1 paragraf narasi ringkas total ("Dari N Kegiatan yang dapat dianalisis... tercatat X efisien dan Y kurang efisien..."). Status "Efisien"/"Kurang Efisien" pakai badge hijau/merah (kelas `.badge-green`/`.badge-red` yang sudah ada); "Tidak Dapat Dihitung" sengaja **tanpa** badge warna (teks abu-abu polos) supaya tidak terbaca seolah itu penilaian kinerja baik/buruk — itu murni "datanya belum lengkap".

**Catatan desain — grain per Kegiatan, bukan Program:** instruksi menyebut "per program/kegiatan". Saya pilih grain **Kegiatan** (bukan Program, dan bukan keduanya sekaligus) karena anggaran (DPA) tertaut ke teks `dpa.kegiatan`, bukan ke Program — kalau diagregasi ke level Program dulu, akan butuh asumsi tambahan (SUM semua Kegiatan di bawahnya) yang tidak diminta secara eksplisit. Kolom "Program / Kegiatan" di tabel tetap menampilkan nama Program (baris kecil abu-abu) di atas nama Kegiatan supaya konteksnya tidak hilang.

**Hasil generate nyata (tahun 2025):** 16 Kegiatan pada hierarki Renstra OPD aktif, 14 dapat dihitung (11 Efisien, 3 Kurang Efisien), 2 "Tidak Dapat Dihitung" (Kegiatan tanpa indikator langsung dan/atau tanpa padanan pagu DPA yang cocok). Angka ini konsisten di PDF maupun DOCX (lihat §2b).

### Poin 6 — Kata Pengantar & Daftar Isi ✅
- **"KATA PENGANTAR"** (baris 1051): halaman baru setelah Cover. Isi paragraf pembuka standar (puji syukur, tujuan laporan, permintaan masukan) + blok tanda tangan Kepala OPD — pola teksnya konsisten dengan paragraf hardcode lain yang sudah ada di file ini (Dasar Hukum, Maksud dan Tujuan), bukan data dari DB.
- **"DAFTAR ISI"** (baris 1083): halaman baru setelah Kata Pengantar, sebelum Ringkasan Eksekutif. Berisi daftar Bab I-IV beserta subbagian (A-F, sudah termasuk hasil final Poin 2 Opsi A) secara statis mengikuti struktur final di bawah. **Tidak mencantumkan nomor halaman** — dijelaskan lewat catatan kecil di bawah tabel bahwa dokumen dibangkitkan dinamis, pagination tidak dihitung dua-pass. Kalau nomor halaman betul-betul diperlukan, itu perlu two-pass render (render sekali untuk hitung halaman, render ulang dengan nomornya) — effort terpisah, belum dikerjakan.

---

## 2. Urutan Bab final — verifikasi dari PDF & DOCX nyata (data DB, tahun=2025, periode_id=2, generate TERAKHIR setelah Poin 2 Opsi A)

### Dari `pdftotext -layout` (PDF)
```
KATA PENGANTAR
DAFTAR ISI
RINGKASAN EKSEKUTIF
BAB I -- PENDAHULUAN
  A. Latar Belakang
  B. Dasar Hukum
  C. Maksud dan Tujuan
  D. Tugas dan Fungsi serta Struktur Organisasi
  E. Gambaran Umum Organisasi
  F. Isu Strategis
BAB II -- PERENCANAAN KINERJA
  A. Rencana Strategis
  B. Perjanjian Kinerja Tahun 2025
BAB III -- AKUNTABILITAS KINERJA
  A. Capaian Kinerja Organisasi
  B. Rincian Realisasi Program dan Kegiatan
  C. Realisasi Anggaran
  D. Analisis Efisiensi
BAB IV -- PENUTUP
```

### Dari `word/document.xml` (DOCX, paragraf `Heading2`/`Heading3`)
```
KATA PENGANTAR
DAFTAR ISI
RINGKASAN EKSEKUTIF
  Visi / Misi
BAB I — PENDAHULUAN
  A. Latar Belakang / B. Dasar Hukum / C. Maksud dan Tujuan / D. Tugas dan Fungsi serta Struktur Organisasi / E. Gambaran Umum Organisasi / F. Isu Strategis
BAB II — PERENCANAAN KINERJA
  A. Rencana Strategis / B. Perjanjian Kinerja Tahun 2025
BAB III — AKUNTABILITAS KINERJA
  A. Capaian Kinerja Organisasi / B. Rincian Realisasi Program dan Kegiatan / C. Realisasi Anggaran / D. Analisis Efisiensi
BAB IV — PENUTUP
```

**Identik di kedua format, termasuk urutan huruf A-F Bab I hasil Poin 2 Opsi A.** Isi tiap subbagian dicek juga tidak kosong (mis. "A. Rencana Strategis" menampilkan Tujuan T2-01.01/T3-01.01 dengan Sasaran masing-masing; "C. Realisasi Anggaran" menampilkan tabel Rp 24.999.760.561 / Rp 24.300.904.925,96 / 97% — data yang sama seperti yang sebelumnya ada di Ringkasan Eksekutif, sekarang di lokasi baru).

### 2c. Poin 2 (Opsi A) — verifikasi khusus subbagian D & E

- **"D. Tugas dan Fungsi serta Struktur Organisasi"** menampilkan narasi butir 2.1 apa adanya (dasar hukum Pergub 56/2021 & 72/2023, "A. Kedudukan", "B. Tugas Pokok", ..., "D. Susunan Organisasi", "E. UPTD") — dicek isinya SAMA PERSIS dengan yang dulu tampil di "Gambaran Umum Organisasi" versi lama (memang cuma judulnya yang berubah, sesuai instruksi poin 1).
- **"E. Gambaran Umum Organisasi" (BARU)** menampilkan narasi + tabel dari butir 2.2 "Sumber Daya Dinas Pangan": tabel "Status Kepegawaian" (PNS 61, CPNS 4, PPPK 18, Total 83), tabel "Komposisi Pegawai Berdasarkan Jabatan", tabel "Komposisi Pegawai Berdasarkan Tingkat Pendidikan", dan **Tabel 2.1 "Jenis dan Jumlah Sarana dan Prasarana"** (lewat `renderRenstraTabel()`, bukan cuma teks) — dicek semuanya ter-render sebagai tabel HTML/Word sungguhan (ada `<table>`/`<w:tbl>` dengan baris data, bukan paragraf datar), di kedua format. Di DOCX dicek langsung: tabel pertama setelah heading "E. Gambaran Umum Organisasi" (narasi awal butir 2.2 cukup panjang, tabel pertamanya muncul ~24,7K karakter setelah heading di XML) punya struktur `<w:tbl>` lengkap dengan border, dan teks "Pegawai Negeri Sipil"/"83" ditemukan di dalamnya.
- **Graceful-fail untuk butir 2.2 yang tidak ada** — tidak ada kasus nyata di data tahun 2025 (butir 2.2 memang ada), jadi disimulasikan terpisah (bukan lewat DB): logika ekstraksi `sumberDayaItem = items.find(judul startsWith '2.2') || null` diuji dengan array `items` tiruan yang cuma punya butir 2.1 dan 2.3 (tanpa 2.2) → hasil `sumberDayaItem = null`, yang otomatis membuat `buildHtml()` mengambil cabang placeholder `<p class="text-muted">Data gambaran umum organisasi (sumber daya) belum tersedia pada modul Renstra.</p>` (bukan section kosong tanpa keterangan, dan bukan crash — pola ini identik dengan penanganan `isuStrategisItem`/`tusiItem` yang sudah terbukti aman sebelumnya).
- **Tidak ada NaN/Infinity/crash**: generate ulang penuh (PDF 1.454.539 bytes, DOCX 1.313.668 bytes) sukses tanpa error di kedua jalur.

### 2b. Poin 5 — verifikasi khusus tabel "D. Analisis Efisiensi"

Dicek langsung isi `<w:t>` (DOCX) dan teks hasil `pdftotext` (PDF), bukan cuma judul heading:
- **Tidak ada satupun `NaN`/`Infinity`/`undefined` di teks yang tampil** — dicek dengan memindai seluruh 1.554 `<w:t>` run di DOCX (nol yang cocok) dan seluruh teks PDF hasil ekstraksi. (Satu-satunya kemunculan string `"undefined"` di `word/document.xml` ada di atribut XML `w:header="undefined"`/`w:footer="undefined"` pada `<w:pgMar>` — itu default internal `html-to-docx` untuk opsi margin yang tidak diisi, bukan teks yang terlihat, dan sudah ada sejak Fase 1, tidak terkait Poin 5.)
- **Jumlah status di DOCX cocok dengan narasi**: `Efisien` × 11, `Kurang Efisien` × 3, `Tidak Dapat Dihitung` × 2 → total 16, sama persis dengan kalimat narasi "Dari 14 Kegiatan yang dapat dianalisis ... dari total 16 Kegiatan ... 11 Kegiatan efisien ... 3 Kegiatan kurang efisien ... 2 Kegiatan lainnya belum dapat dianalisis".
- **Edge case pagu=0/data kosong tertangani**: 2 dari 16 Kegiatan otomatis berstatus "Tidak Dapat Dihitung" (bukan NaN atau baris hilang) — dikonfirmasi ini murni karena Kegiatan tsb belum punya indikator langsung di hierarki Renstra dan/atau belum ada padanan pagu DPA yang cocok, bukan bug.
- **Catatan minor (bukan bug data):** `pdftotext -layout` menunjukkan satu artefak interleaving teks footer/tabel di sekitar baris "Pelaksanaan Pengawasan Keamanan Pangan Segar Distribusi Lintas Daerah" — ini terjadi karena baris tabel itu jatuh tepat di batas page-break fisik PDF, dan merupakan keterbatasan alat ekstraksi teks `pdftotext` saat tabel HTML terpotong lintas halaman (sudah ada polanya di tabel besar lain seperti "B. Rincian Realisasi Program dan Kegiatan" yang juga lintas banyak halaman), **bukan kerusakan pada PDF visual maupun pada data** (angka & status tetap benar, dicek dari sel yang sama di representasi DOCX).

---

## 3. Poin 2 (Tugas dan Fungsi / Struktur Organisasi) — KEPUTUSAN DIKONFIRMASI: Opsi A ✅

Riwayat keputusan (dipertahankan sebagai catatan, sudah diimplementasikan — lihat §1 Poin 2 dan §2c untuk hasilnya):

Saat mencari sumber data, ditemukan di `renstra_bab` (bab='II'): butir **"2.1 Tugas, Fungsi, dan Struktur Organisasi"** — isinya SATU narasi gabungan (dasar hukum Pergub, lalu "A. Kedudukan", "B. Tugas Pokok", ..., "D. Susunan Organisasi", "E. UPTD" — sub-heading itu tertulis sebagai teks biasa di dalam narasinya, bukan field terpisah). Butir ini sudah dipakai sebagai isi "D. Gambaran Umum Organisasi" versi lama.

Tiga opsi yang diajukan:

**Opsi A (DIPILIH) — Repurpose "D. Gambaran Umum Organisasi" jadi "Tugas dan Fungsi serta Struktur Organisasi".**
Ganti judul subbagian D (bukan tambah baru), karena isinya memang sudah persis itu. "Gambaran Umum Organisasi" yang sebenarnya (profil singkat: jumlah pegawai, dsb) diambil dari sumber lain yang juga sudah ada di Renstra: `renstra_bab` bab='II' butir "2.2 Sumber Daya Dinas Pangan" (ada tabel jumlah ASN/PNS/CPNS/PPPK) — jadi subbagian baru terpisah "Gambaran Umum Organisasi" pakai 2.2, bukan 2.1.
→ Hasil: A. Latar Belakang, B. Dasar Hukum, C. Maksud dan Tujuan, D. Tugas dan Fungsi serta Struktur Organisasi (dari 2.1), E. Gambaran Umum Organisasi (dari 2.2, BARU), F. Isu Strategis.

**Opsi B (tidak dipilih)** — Split butir 2.1 secara sederhana (regex/heuristik) jadi "Tugas dan Fungsi" vs "Struktur Organisasi". Berisiko rapuh (bergantung pola teks yang mungkin beda per tahun Renstra/OPD lain).

**Opsi C (tidak dipilih)** — Biarkan jadi placeholder kosong/manual dulu, sampai ada sumber data terpisah per subbagian.

**Implementasi Opsi A** (detail lengkap di §1 Poin 2): variabel `gambaranUmumItem` di-rename jadi `tusiItem` (sumber tidak berubah, cuma nama variabel & judul HTML), subbagian "E. Gambaran Umum Organisasi" baru dibangun dari `sumberDayaItem` (butir 2.2), "Isu Strategis" bergeser dari E ke F. Terverifikasi dari generate PDF+DOCX nyata di §2/§2c.

---

## 4. Bug ditemukan & diperbaiki saat verifikasi (di luar 6 poin, tapi wajib diperbaiki supaya DOCX valid)

Saat generate ulang DOCX untuk verifikasi Poin 1-6, ditemukan **toolbar cetak bocor ke DOCX** ("🖨️ Cetak / Print", "✕ Tutup" muncul sebagai teks di halaman awal — regresi dari Fase 1b yang lolos dari verifikasi sebelumnya).

**Root cause:** `juice()` (Fase 1b) menyisipkan atribut `style="..."` **setelah** `class="toolbar no-print"` pada tag toolbar (`<div class="toolbar no-print" style="...">`), sedangkan regex `stripDocxToolbar()` lama mengharuskan `>` persis setelah `class="toolbar no-print"` — begitu ada atribut tambahan di antaranya, regex tidak match lagi dan toolbar tidak terbuang.

**Fix** (`backend/controllers/lakipExportController.js`, fungsi `stripDocxToolbar`): regex diubah dari
```js
/<div class="toolbar no-print">[\s\S]*?<\/div>\s*/
```
menjadi
```js
/<div class="toolbar no-print"[^>]*>[\s\S]*?<\/div>\s*/
```
supaya menerima atribut apa pun di antara `class` dan `>`. Diverifikasi ulang: `Cetak / Print`, `✕ Tutup`, `window.print` sudah tidak ada lagi di `word/document.xml`, dan `w:shd`/`w:b` (styling header tabel dari Fase 1b) tetap utuh (250 sel shading, 337 run bold).

**Catatan:** ini bukan disebabkan oleh perubahan struktur Fase 2 — bug-nya sudah ada sejak Fase 1b, cuma verifikasi Fase 1b saya sebelumnya tidak sengaja luput mengecek ulang string toolbar setelah `juice()` diaktifkan (hanya mengecek font-size dan header shading/bold). Ditemukan sekarang karena verifikasi Fase 2 mengecek ulang heading `Heading2`/`Heading3` secara menyeluruh dan "🖨️ Cetak / Print"/"✕ Tutup" ikut nampak sebagai paragraf asing.

---

## 5. Yang TIDAK dikerjakan (sesuai instruksi eksplisit — Poin 1-6 semuanya SELESAI)

- **Pernyataan Telah Direviu** dan **Lampiran (Perjanjian Kinerja + Pengukuran Kinerja):** tidak disentuh sama sekali, sesuai instruksi — masih menunggu diskusi terpisah sebelum diimplementasikan.

---

## 6. File yang diubah

- `backend/controllers/lakipGeneratorController.js` (seluruh perubahan struktur Poin 1-6, termasuk rename `gambaranUmumItem`→`tusiItem` dan `sumberDayaItem` baru untuk Poin 2 Opsi A)
- `backend/controllers/lakipExportController.js` (1 baris regex, bugfix §4 — bukan perubahan struktur)
- `backend/services/lakipAnalisaService.js` (fungsi baru `analisaEfisiensi()`, Poin 5)

Tidak ada migrasi, tidak ada dependency baru, tidak ada perubahan route/frontend.
