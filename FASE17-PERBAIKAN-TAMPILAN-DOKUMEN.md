# Fase 17 — Perbaikan Tampilan Dokumen (Nama File, Header/Footer, Cover) + Investigasi Lanjutan

**Status:** Part A dieksekusi & diverifikasi (generate ulang PDF+DOCX). Part B murni investigasi, **tidak ada implementasi** untuk Poin 7-8, sesuai instruksi — kecuali 1 sub-temuan di Poin 6 yang terpaksa ikut diperbaiki karena memblokir verifikasi Part A (dijelaskan di §6).

**File yang diubah:** `backend/controllers/lakipExportController.js` (mayoritas perubahan), `backend/controllers/lakipGeneratorController.js` (2 titik kecil: `getOpdIdentitas` export, cover `.cover{box-sizing:border-box}` + hapus render "Diterbitkan").

---

## A. Fix langsung

### 1. Nama file PDF/DOCX

**Root cause:** hardcode terpisah dari `OPD_CONFIG` — `lakipExportController.js` punya string literalnya SENDIRI, tidak pernah ikut diperbaiki saat Fase 14 membenahi `OPD_CONFIG`:
```js
// SEBELUM (baris 101 & 333):
const filename = `LAKIP_${tahun}_DinasKetahananPangan.pdf`;   // exportPdf
const filename = `LAKIP_${tahun}_DinasKetahananPangan.docx`;  // exportDocx
```

**Fix:** tambah `exports.getOpdIdentitas()` di `lakipGeneratorController.js` (query ringan `SELECT nama_opd FROM renstra_opd WHERE is_aktif=1` — sengaja TIDAK reuse `collectLakipData()` penuh karena itu menjalankan banyak query berat yang tidak perlu cuma untuk nama OPD). Dipanggil dari kedua fungsi export:
```js
const namaOpdSlug = namaOpd.replace(/\s+/g, "");   // "Dinas Pangan" -> "DinasPangan"
const filename = `LAKIP_${tahun}_${namaOpdSlug}.pdf`;  // / .docx
```

**Verifikasi:** `Content-Disposition: attachment; filename="LAKIP_2025_DinasPangan.pdf"` (dan `.docx`) — persis sesuai permintaan.

### 2-3. Running header & footer (PDF)

**Root cause:** `headerTemplate`/`footerTemplate` di `page.pdf()` — dua string HTML terpisah TOTAL dari `buildHtml()`/`OPD_CONFIG`, karena Puppeteer header/footer memang API yang berbeda (bukan bagian dari HTML utama), jadi tidak ikut ter-fix di Fase 14 sama sekali.

**Fix:** kedua template sekarang pakai `namaOpd`/`namaProvinsi` dari `getOpdIdentitas()` yang sama:
```js
headerTemplate: `... LAKIP/LKj Tahun ${tahun} — ${namaOpd} ${namaProvinsi} ...`
footerTemplate: `... digenerate secara otomatis oleh sistem ePeLARA ${namaOpd} pada ${tanggal} ...`
```

**Verifikasi** (ekstrak teks per halaman dari PDF hasil generate, `pdf-parse`): halaman isi (bukan cover) menunjukkan header `"LAKIP/LKj Tahun 2025 — Dinas Pangan Maluku Utara"` dan footer `"Dokumen ini digenerate secara otomatis oleh sistem ePeLARA Dinas Pangan pada 3/8/2026"`. 0 kemunculan "Dinas Ketahanan Pangan" di seluruh 38 halaman PDF (113 kemunculan "Dinas Pangan" — cover, header berulang tiap halaman isi, dan body).

### 4. Cover tanpa header/footer/nomor halaman

**Pendekatan:** meniru pola yang SUDAH TERBUKTI dipakai `renstraGenerateController.js` (dokumen Renstra) — pisahkan Cover dari sisa dokumen, render 2 pass Puppeteer terpisah, gabung pakai `pdf-lib` (`PDFDocument.copyPages`) yang sudah jadi dependency di proyek ini.

```js
function splitCoverFromRest(html) {
  // Potong berdasar marker komentar <!-- COVER --> / <!-- KATA PENGANTAR -->
  // yang sudah ada di buildHtml(). Fallback: render 1 pass kalau marker hilang.
}
```
- Pass 1 (`cover`): `displayHeaderFooter: false`, margin `0mm` semua sisi (bukan margin 10/15mm biasa — lihat §6, `.cover` sudah dirancang mengisi 1 halaman A4 penuh sendiri).
- Pass 2 (`rest`): seperti biasa, `displayHeaderFooter: true` dengan header/footer di atas.
- Digabung: `mergedPdf.copyPages(doc, doc.getPageIndices())` per bagian, urut cover dulu baru rest.

**Untuk DOCX:** jauh lebih sederhana — `html-to-docx` sudah punya opsi native `skipFirstHeaderFooter: true` (dipakai persis sama di `renstraGenerateController.js`), tinggal ditambahkan ke `HTMLtoDOCX(...)` options. Tidak perlu split/merge sama sekali untuk DOCX.

**Keterbatasan yang sengaja diterima (didokumentasikan di kode):** karena cover dirender sebagai PDF terpisah, Chromium menomori ulang render kedua mulai dari 1 — setelah digabung, halaman PERTAMA SETELAH cover menunjukkan "1 / N" (N = total halaman tanpa cover), bukan "2 / (N+1)". Ini pola yang SAMA dengan dokumen Renstra (cover tak bernomor, isi mulai dari 1) — lazim untuk dokumen bercover terpisah, bukan regresi.

**Verifikasi** (ekstrak teks per halaman): Halaman 1 (Cover) — TIDAK ada teks header, TIDAK ada teks footer, TIDAK ada nomor halaman. Halaman 2 (Kata Pengantar) — ADA header, ADA footer, menunjukkan "1 / 37".

### 5. Sembunyikan "Diterbitkan" di cover, data tetap ada

**Fix** (`lakipGeneratorController.js`): tanggal diekstrak jadi variabel `tanggalTerbit` (dihitung tetap, tidak dihapus), tapi baris `<p>Diterbitkan: ...</p>` dihapus dari markup cover.

**Verifikasi:** 0 kemunculan "Diterbitkan" di PDF hasil generate ulang.

### Verifikasi regresi Fase 14-16 (generate ulang PDF penuh)

```
Misi 1: 1  |  Misi 2: 1  |  Misi 3: 1  |  Misi 4: 1  |  Misi 5: 1  |  Misi 6: 1   (Fase 14/16)
Blok "Program:" tampil: 5                                                        (Fase 15B)
"Belum Dilaksanakan": 1                                                          (Fase 14 Poin 6)
"27 Indikator Kinerja": muncul  |  "IKU/IKK": muncul                             (Fase 14 Poin 5)
```
Tidak ada regresi. DOCX juga berhasil di-generate ulang (1.527.675 bytes, filename `LAKIP_2025_DinasPangan.docx`), tidak crash.

---

## B. Investigasi (belum diimplementasikan)

### 6. Ukuran kertas A4 / konten terpotong

`format: "A4"` **sudah** diset dengan benar di `page.pdf()` (tidak ada masalah di situ). Ditemukan **2 kontributor konkret** untuk keluhan "terpotong-potong":

**(a) Bug cover overflow — DITEMUKAN & TERPAKSA DIPERBAIKI** (memblokir verifikasi Poin 4): `.cover { min-height: 297mm; padding: 40px; border: 3px double; }` TANPA `box-sizing: border-box` berarti tinggi kotak SEBENARNYA = 297mm + padding + border > 1 halaman A4 penuh — cover overflow ke halaman kedua yang nyaris kosong. Dibuktikan dengan merender cover API Puppeteer sendiri: **2 halaman, halaman kedua kosong total**. Ini **bug pra-eksisting**, bukan disebabkan split Fase 17 — dibuktikan dengan merender dokumen LAMA (1 pass, tanpa split sama sekali) dan ditemukan hasil SAMA: 39 halaman total, halaman 2 kosong (cuma berisi header/footer tes), Kata Pengantar baru muncul di halaman 3. **Sudah diperbaiki** (`box-sizing:border-box` pada `.cover` + margin 0/padding 0 khusus render cover) sebagai bagian dari Poin 4, karena kalau dibiarkan, fix "cover tanpa header/footer" tidak akan terlihat benar (ada halaman kosong aneh setelahnya). Total halaman turun dari 39 → 38 setelah fix ini.

**(b) Margin bertumpuk pada SEMUA halaman isi (BELUM diperbaiki, murni temuan)** — dua sumber margin diterapkan SEKALIGUS pada tiap halaman isi:
```
Puppeteer page.pdf({ margin: { top:'10mm', bottom:'15mm', left:'10mm', right:'10mm' } })
+
.page { padding: 20mm 15mm 20mm 25mm !important; }   (PRINT_CSS, lakipExportController.js)
```
Totalnya: atas 30mm, kanan 25mm, bawah 35mm, **kiri 35mm** — total margin kiri+kanan **60mm dari 210mm lebar kertas**, menyisakan cuma **150mm lebar cetak efektif** (bukan ~170mm yang lazim untuk dokumen A4 portrait). Untuk tabel lebar (mis. tabel "Rincian Realisasi Program dan Kegiatan" 7 kolom, atau tabel Efisiensi 4 kolom dengan kolom Program/Kegiatan yang panjang), ruang 150mm ini sangat sempit — highly likely inilah sumber kesan "terpotong" pada isi tabel (teks/kolom kepepet atau kelihatan sesak).
Kemungkinan penyebab: PRINT_CSS `.page{padding:...}` awalnya didesain untuk mensimulasikan margin cetak di MODE PREVIEW ON-SCREEN (browser, sebelum Puppeteer terlibat) — begitu masuk jalur export PDF, Puppeteer's OWN `margin` option ditambahkan TERPISAH di atasnya tanpa mengurangi/menghapus padding CSS yang sudah ada, sehingga keduanya numpuk.

**(c) Tidak ada `page-break-inside`/`break-inside` sama sekali di seluruh CSS** (dicek grep menyeluruh) — tabel panjang (indikator hierarki, Efisiensi, Rincian Realisasi) TIDAK dilindungi dari terpotong di tengah baris saat jatuh tepat di batas halaman. Ini kemungkinan BESAR juga berkontribusi ke kesan "terpotong-potong" — baris tabel bisa kepotong visual separuh di bawah 1 halaman, separuh lagi di halaman berikutnya.

**Rekomendasi (belum dieksekusi, perlu keputusan/screenshot lebih spesifik dari user seperti diminta):**
- (b): pilih SATU sumber margin, bukan dua — kemungkinan paling aman: set margin Puppeteer jadi kecil/nol dan biarkan `.page{padding}` (sudah `box-sizing:border-box` dari reset global `*{box-sizing:border-box}`) yang menentukan margin cetak sepenuhnya, ATAU sebaliknya hapus padding CSS-nya dan andalkan margin Puppeteer saja. Extra kerja: perlu also cek dampaknya ke mode `/preview` (HTML biasa, tanpa Puppeteer) yang saat ini mengandalkan CSS padding untuk terlihat seperti "kertas" di layar.
- (c): tambah `tr, .kegiatan-block, .program-block { page-break-inside: avoid; }` (atau `break-inside`) supaya baris/blok tidak terpotong — perlu uji apakah ini malah membuat SATU baris/blok yang genuinely panjang (lebih dari 1 halaman penuh, kalau ada) jadi gagal ditampilkan sama sekali di beberapa versi Chromium (baris yang lebih tinggi dari 1 halaman biasanya tetap dipaksa split walau ada `avoid`).

### 7. Data penandatangan (Kata Pengantar) — struktur data ditemukan, SIAP di-reuse

**Kota "Sofifi" BUKAN field database** — dicek: `pejabat_penandatangan` (kolom: `id, tahun, role, nama, nip, jabatan, created_at, updated_at, tanda_tangan_url, cap_dinas_url, persetujuan_pemilik`) **tidak punya kolom kota sama sekali**. "Sofifi" ternyata **hardcode string literal** di banyak file lain di codebase ini (`renstraGenerateController.js`, `lakipPkExportService.js`, `dpaController.js`, dll — 18 file total) — termasuk persis di `lakipPkExportService.js:194`: `` `<p>Sofifi, ${fmtTanggalIndo(detail.tanggal_ttd)}</p>` ``, ini SUMBER "Sofifi" yang benar di Lampiran 1 PK. Kesimpulan: kota penandatanganan bukan data dinamis per-OPD, melainkan konvensi tetap (Sofifi = ibu kota Provinsi Maluku Utara) yang di-hardcode konsisten di seluruh modul lain — Kata Pengantar LAKIP tinggal ikut pola yang sama (hardcode "Sofifi", BUKAN `opd.nama_provinsi` yang sekarang salah dipakai untuk baris tanda tangan).

**Nama & NIP Kepala Dinas — SUDAH TERSEDIA lewat `pkDetail`, tidak perlu query baru.** Ditelusuri ke `lakipPkService.js:221-230`:
```js
PejabatPenandatangan.findOne({ where: { tahun: Number(tahun), role: 'KEPALA_DINAS' }, raw: true })
```
hasilnya dipetakan jadi `pihak_kedua: { nama, nip, jabatan }` dalam objek yang dikembalikan `getPkDetail()`. **`lakipGeneratorController.js` SUDAH memanggil `lakipPkService.getPkDetail(renstraAktif.id, tahun)`** (untuk Lampiran 1) dan menyimpannya di variabel `pkDetail` — variabel ini SUDAH ADA di `collectLakipData()`, cuma belum dipakai untuk mengisi Kata Pengantar. Jadi integrasinya **tidak perlu query terpisah ke modul Pejabat Penandatangan** — tinggal reuse `pkDetail.pihak_kedua.nama`/`pkDetail.pihak_kedua.nip` yang sudah dibawa sampai ke `buildHtml()`.

**Data untuk Dinas Pangan tahun 2025 dikonfirmasi terisi lengkap:**
```
pejabat_penandatangan: tahun=2025, role=KEPALA_DINAS
  → nama: "DHENY TJAN, SH.,M.Si", nip: "197507302001121001", jabatan: "Kepala Dinas Pangan"
```
Persis sama dengan yang user sebutkan sebagai benar di Lampiran 1 PK.

**Rekomendasi integrasi (belum diimplementasikan):** di `buildHtml()`'s blok Kata Pengantar TTD, ganti:
- `${escH(opd.nama_provinsi)},` → hardcode `Sofifi,` (ikut konvensi seluruh codebase, BUKAN dari field database manapun).
- `${escH(opd.kepala_opd)}` / placeholder titik-titik / `${escH(opd.nip_kepala)}` → `${escH(pkDetail?.pihak_kedua?.nama || '...')}` / `${escH(pkDetail?.pihak_kedua?.nip || '...')}`, dengan fallback yang jelas kalau `pkDetail`/`pihak_kedua` null (mis. PK belum diisi utk tahun tsb — `pkDetail` sudah punya `.catch(() => null)` di collectLakipData, jadi bisa null).

### 8. Nomor halaman Daftar Isi — 3 opsi, semua non-trivial (belum diimplementasikan)

Dikonfirmasi: **Puppeteer TIDAK punya mekanisme built-in** untuk mengetahui nomor halaman aktual suatu elemen HTML sebelum PDF selesai di-generate (`pageNumber`/`totalPages` cuma tersedia di dalam konteks `headerTemplate`/`footerTemplate`, diisi Chromium sendiri saat print, TIDAK bisa direferensikan dari HTML konten utama). **`html-to-docx` juga tidak punya fitur TOC field/bookmark** (dicek README, tidak ada kata kunci `toc`/`bookmark`/`outline`). **`pdf-lib` (v1.17.1) tidak punya API tingkat-tinggi untuk membuat outline/bookmark PDF** (cuma ada `setNonFullScreenPageMode(UseOutlines)`, bukan API pembuatan outline-nya sendiri) — jadi opsi "bookmark PDF" pun butuh manipulasi objek PDF level rendah, bukan solusi murah seperti dugaan awal.

**3 opsi nyata:**

| Opsi | Cara kerja | Effort | Catatan |
|---|---|---|---|
| **A — 2-pass manual (sesuai deskripsi user)** | Pecah HTML jadi ~15-20 potongan per section (mengikuti tiap baris Daftar Isi: Kata Pengantar, Daftar Isi, Ringkasan, Bab I A-F, Bab II A-B, Bab III A-D, Bab IV, dst — mirip pola `splitCoverFromRest` tapi jauh lebih banyak titik potong), render TIAP potongan terpisah via Puppeteer utk hitung jumlah halamannya, akumulasi jadi nomor halaman awal tiap section, suntikkan angka itu ke HTML Daftar Isi, render ULANG Daftar Isi dengan angka yang benar, gabung SEMUA potongan (termasuk Daftar Isi versi final) berurutan via `pdf-lib`. | **TINGGI** — ~15-20x lebih banyak proses render Puppeteer per export (lebih lambat), marker HTML harus disinkronkan persis dengan tiap baris Daftar Isi (rawan drift kalau template berubah), perlu penanganan khusus utk entry ber-indentasi (A/B/C di bawah BAB berbagi section yang sama). |
| **B — PDF bookmark/outline (klik-navigasi, bukan nomor tercetak)** | Split serupa Opsi A hanya utk MENGHITUNG halaman (bukan suntik angka balik ke TOC), lalu tambahkan outline/bookmark PDF via manipulasi objek pdf-lib tingkat rendah supaya pembaca PDF (Adobe Reader, browser) punya panel navigasi sidebar per-Bab yang bisa diklik. Teks TOC tetap tanpa angka tercetak. | **SEDANG-TINGGI** — tidak butuh render-ulang TOC (lebih sederhana dari Opsi A di sisi itu), tapi pdf-lib tidak expose API outline resmi, harus otak-atik struktur PDF level rendah (dictionary/reference manual). |
| **C — Tetap seperti sekarang** | Biarkan disclaimer "nomor halaman tidak dicantumkan karena dokumen dibangkitkan dinamis". | **NOL** | Status quo, sudah jujur ke pembaca kenapa tidak ada nomor. |

**Tidak ada rekomendasi tunggal diajukan** — perlu keputusan produk (apakah manfaat nomor halaman/bookmark sepadan dengan kompleksitas & waktu render yang bertambah signifikan) sebelum salah satu opsi dikerjakan.

---

## Ringkasan

| Poin | Status | Verifikasi |
|---|---|---|
| 1. Nama file | ✅ Fixed | `LAKIP_2025_DinasPangan.pdf/.docx` |
| 2. Running header | ✅ Fixed | 0× "Dinas Ketahanan Pangan" di 38 halaman |
| 3. Footer | ✅ Fixed | Teks footer sertakan "Dinas Pangan" |
| 4. Cover tanpa header/footer/nomor | ✅ Fixed (+ bug halaman kosong ikut diperbaiki) | Halaman 1 bersih, halaman 2 (Kata Pengantar) normal dgn header/footer |
| 5. "Diterbitkan" disembunyikan | ✅ Fixed | 0× kemunculan, `tanggalTerbit` tetap ada sbg variabel |
| 6. Paper size / terpotong | 🔍 Investigasi — 1 bug ikut diperbaiki (cover overflow), 2 temuan lain (margin bertumpuk, tidak ada page-break-inside) BELUM diperbaiki | — |
| 7. Data penandatangan | 🔍 Investigasi — struktur & data sudah lengkap & tersedia (`pkDetail.pihak_kedua`, sudah di-fetch), tinggal reuse | — |
| 8. Nomor halaman Daftar Isi | 🔍 Investigasi — 3 opsi dilaporkan, semua non-trivial | — |

Tidak ada perubahan data di database — seluruh perubahan Fase 17 murni kode (`lakipExportController.js`, `lakipGeneratorController.js`).
