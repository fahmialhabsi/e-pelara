# Fase 3 — Pernyataan Telah Direviu & Lampiran (embed penuh)

**Ruang lingkup:** `backend/controllers/lakipGeneratorController.js` (`buildHtml()`/`collectLakipData()`), reuse `backend/services/lakipPkExportService.js` (`buildPkHtml()`, **tidak diubah**) dan `backend/services/lakipPkService.js` (`getPkDetail()`, **tidak diubah**).
**Status:** A & B SELESAI dan terverifikasi dari data DB nyata (tahun 2025). Dengan ini seluruh 2 item terakhir `AUDIT-LAKIP-SISTEMATIKA.md` (di luar temuan #9 soal data anggaran dead code, yang memang terpisah) sudah tertangani — LAKIP sekarang punya 4 Bab + Kata Pengantar + Daftar Isi + Ringkasan Eksekutif + Pernyataan Telah Direviu + 2 Lampiran, identik strukturnya di PDF & DOCX.

---

## A. Pernyataan Telah Direviu

Halaman baru `<!-- PERNYATAAN TELAH DIREVIU -->` (baris 1407-1439), disisipkan setelah Bab IV Penutup, sebelum Lampiran. Isi:
- 3 paragraf baku: rujukan reviu ke Permenpan RB 53/2014, tujuan reviu (keyakinan atas keandalan sistem pengumpulan/pengklasifikasian/pengikhtisaran/pelaporan data), dan kalimat kesimpulan "tidak/terdapat catatan..." dengan keterangan eksplisit `(diisi manual sesuai hasil reviu Inspektorat)` — supaya jelas bagian mana yang perlu disunting manual, bukan cuma titik-titik kosong tanpa konteks.
- Blok tanda tangan (`.ttd-area`/`.ttd-box`, pola identik dengan tanda tangan Kepala OPD di Bab IV): Tempat/Tanggal terisi otomatis, **Nama Inspektur = titik-titik kosong**, **NIP = titik-titik kosong**, Jabatan = "Inspektur Provinsi ${nama_provinsi}" (dinamis, bukan hardcode "Maluku Utara" supaya konsisten kalau OPD_CONFIG berubah).

Bab IV (`<div class="page">`) diubah jadi `<div class="page page-break">` (sebelumnya tidak perlu page-break karena dulu itu section terakhir) supaya tidak menyatu satu halaman fisik dengan Pernyataan Direviu.

---

## B. Lampiran (embed penuh)

### B1. Lampiran 1 — Perjanjian Kinerja

**Data:** `collectLakipData()` baris 39-47 — fetch `pkDetail = await lakipPkService.getPkDetail(renstraAktif.id, tahun)` (fungsi yang sama persis dipakai export PK mandiri, **tidak diubah**), dibungkus `.catch(() => null)` murni jaga-jaga error DB tak terduga, BUKAN mengganti behaviour `getPkDetail` sendiri (fungsi itu sendiri sudah punya fallback `DEFAULT_PASAL` kalau LakipPk belum diisi untuk tahun ybs. — dicek di `lakipPkService.js`, tidak throw untuk kasus "belum diisi", hanya throw kalau Renstra OPD-nya sendiri tidak ada, yang di titik ini sudah pasti ada karena `collectLakipData` sudah validasi `renstraAktif`).

**Cek konflik style/struktur (sebelum reuse, sesuai instruksi):** dibaca langsung source `buildPkHtml()` — hasilnya HTML **berdiri sendiri** (`<!DOCTYPE html><html><head>...</head><body style="...">`) tapi **100% inline style**, TANPA blok `<style>`, TANPA `class="page"`/`.cover`/toolbar/apa pun yang bisa bentrok dengan CSS `buildHtml()`. **Kesimpulan: tidak ada konflik style/struktur** yang perlu dilaporkan/diputuskan — reuse aman langsung, cukup 2 adaptasi teknis (bukan perubahan makna), keduanya di `lakipGeneratorController.js`, `buildPkHtml()` sendiri **tidak disentuh**:
1. `extractBodyInner()` (baris 1537-1539) — buang wrapper `<html>/<head>/<body>`, supaya bisa disisipkan sebagai child `<div class="page page-break">` milik dokumen LAKIP (mewarisi font Times New Roman 12pt dari `body{}` kita).
2. `demoteHeadings()` (baris 1550-1556) — **1 penyesuaian tambahan, di luar permintaan awal, saya lakukan karena sudah jelas diperlukan:** `buildPkHtml()` punya `<h1>PERJANJIAN KINERJA</h1>` dan beberapa `<h2>` sendiri (judul dokumen, Pasal 1-6) yang kalau disisipkan apa adanya akan **sejajar level outline** dengan `<h1>` utama LAKIP dan `<h2>BAB...</h2>` — bukan cacat visual, tapi cacat struktur navigasi (Word Navigation Pane/Heading Styles akan menampilkan "PERJANJIAN KINERJA" sebagai judul top-level, bukan bersarang di bawah "LAMPIRAN 1"). Diturunkan 2 level (h1→h3, h2→h4, dst) HANYA pada salinan hasil extract untuk Lampiran, bukan pada `buildPkHtml()` itu sendiri. Dibuktikan aman secara visual (bukan asumsi): dites langsung generate DOCX dengan tag `<h1>` vs `<h3>` yang sama-sama punya inline `font-size:16pt` — hasil `w:sz` di XML **identik** (font-size datang dari inline style, bukan dari default Word Heading-N style), jadi turun level tidak mengecilkan/mengubah tampilan judul PK.

**Judul pembungkus:** `<h2 class="section-title">LAMPIRAN 1 — PERJANJIAN KINERJA</h2>` (baris 1442-1446), lalu `${lampiran1Html}` di bawahnya. Kalau `pkDetail` null (mis. Renstra OPD tidak aktif sama sekali — kasus ekstrem yang jarang terjadi karena LAKIP sendiri sudah butuh Renstra aktif untuk hampir semua Bab lain), tampil placeholder eksplisit "Data Perjanjian Kinerja Tahun ... belum tersedia. Lengkapi lewat menu Perjanjian Kinerja (PK) LAKIP." — bukan section kosong.

### B2. Lampiran 2 — Pengukuran Kinerja

Tabel baru (BUKAN reuse tabel Bab III yang mana pun — dibangun dari nol sesuai instruksi), kolom: **No | Sasaran Strategis | Indikator Kinerja | Target | Realisasi | Capaian (%)**, sesuai format baku Lampiran Pengukuran Kinerja Permenpan RB 53/2014. Dibangun di `buildHtml()` baris 785-807 dari gabungan:
- `indikator` (indikatorFlat — sudah mencakup indikator orphan juga, karena `indikatorOrphan` cuma subset filter dari situ, bukan sumber data terpisah, jadi tidak digabung dobel), dengan kolom "Sasaran Strategis" di-resolve dari `sasaranId` masing-masing indikator.
- `iku` + `ikk` (indikator level OPD, tanpa ancestry Sasaran) — kolom "Sasaran Strategis"-nya diisi label `"Indikator Kinerja Utama (IKU)"`/`"Indikator Kinerja Kunci (IKK)"` supaya pembaca tahu kenapa kolom itu bukan nama Sasaran.

**Hasil generate nyata (tahun 2025): 35 baris indikator** (27 dari hierarki Tujuan→Sasaran→Program→Kegiatan + 2 IKU + 6 IKK), semua kolom terisi angka nyata (Target/Realisasi/Capaian %), tidak ada baris kosong tanpa keterangan.

---

## Verifikasi — generate ulang PDF+DOCX nyata (tahun=2025, periode_id=2)

PDF: **1.640.914 bytes**. DOCX: **1.623.937 bytes**. Keduanya sukses tanpa error.

### Urutan akhir dokumen — identik di PDF & DOCX

Dari `pdftotext -layout` (nomor baris hasil ekstraksi):
```
2420  BAB IV -- PENUTUP
2445  PERNYATAAN TELAH DIREVIU
2467  LAMPIRAN 1 -- PERJANJIAN KINERJA
2696  LAMPIRAN 2 -- PENGUKURAN KINERJA
```

Dari `word/document.xml` (paragraf `Heading1`/`Heading2`, urutan penuh setelah Bab IV):
```
Heading2: BAB IV — PENUTUP
Heading2: PERNYATAAN TELAH DIREVIU
Heading2: LAMPIRAN 1 — PERJANJIAN KINERJA
  Heading3: PERJANJIAN KINERJA          ← sudah bersarang di bawah Lampiran 1 (bukti demoteHeadings bekerja)
  Heading4: KEPALA DINAS PANGAN / PROVINSI MALUKU UTARA / TAHUN ANGGARAN 2025
  Heading4: Pasal 1 .. Pasal 6           Heading5: (sub-judul tiap pasal)
  Heading4: LAMPIRAN: INDIKATOR KINERJA UTAMA TAHUN 2025
    Heading5: Program & Anggaran
Heading2: LAMPIRAN 2 — PENGUKURAN KINERJA
```

**Identik urutan Bab-nya di kedua format.** Daftar Isi (halaman DAFTAR ISI) juga sudah menyertakan 3 entri baru ini (baris tabel setelah "BAB IV").

### Cek isi per bagian

- **Pernyataan Telah Direviu**: dicek teks placeholder kosong tampil jelas — "(......................................)" untuk Nama Inspektur, "NIP. ....................................." untuk NIP, keterangan `(diisi manual sesuai hasil reviu Inspektorat)` untuk kalimat catatan reviu. Bukan section kosong tanpa keterangan.
- **Lampiran 1 (PK)**: dicek isinya lengkap dengan data nyata — Pihak Pertama "Sherly Tjoanda Laos, Gubernur Maluku Utara", Pihak Kedua "Dheny Tjan, Kepala Dinas Pangan", Pasal 1-6 lengkap dengan teks baku, tabel Sasaran/Output/Realisasi/Target/Bukti Ukur per Sasaran Strategis terisi data nyata (bukan placeholder kosong semua) — style dokumen utama (font, tabel LAKIP lain, halaman sebelumnya) **tidak rusak/berubah** setelah Lampiran 1 disisipkan (dicek visual struktur Bab I-IV & Kata Pengantar/Daftar Isi tetap sama seperti sebelum Fase 3).
- **Lampiran 2 (Pengukuran Kinerja)**: tabel rekap 35 baris tampil benar dengan angka Target/Realisasi/Capaian nyata, termasuk baris IKU/IKK berlabel jelas.
- **NaN/Infinity/crash**: dipindai seluruh `<w:t>` run di DOCX hasil akhir — nol yang mengandung `NaN`/`Infinity`. Generate PDF & DOCX sukses penuh tanpa exception di kedua jalur.

---

## File yang diubah

- `backend/controllers/lakipGeneratorController.js` — satu-satunya file yang diubah:
  - `collectLakipData()`: import `lakipPkService`/`buildPkHtml` (baris 13-14), fetch `pkDetail` (baris 39-47), `pkDetail` ditambahkan ke return object.
  - `buildHtml()`: builder `lampiran1Html` (baris 765-767) dan `pengukuranKinerjaHtml`/`pengukuranKinerjaRows` (baris 769-807), 3 blok halaman baru di badan HTML (Pernyataan Direviu baris 1407-1439, Lampiran 1 baris 1442-1446, Lampiran 2 baris 1448-1455), Daftar Isi diperbarui, Bab IV diberi `page-break`.
  - Helper baru: `extractBodyInner()` (baris 1537-1539), `demoteHeadings()` (baris 1550-1556).
- **Tidak ada perubahan** di `lakipPkExportService.js` (`buildPkHtml()`) maupun `lakipPkService.js` (`getPkDetail()`), sesuai instruksi — keduanya tetap dipakai apa adanya oleh jalur export PK mandiri.
- Tidak ada perubahan di `lakipExportController.js` (jalur DOCX Fase 1/1b tidak perlu disentuh — tidak ada CSS/struktur baru yang memicu masalah `html-to-docx` seperti temuan Fase 1).
- Tidak ada migrasi, tidak ada dependency baru, tidak ada perubahan route/frontend.
