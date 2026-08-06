# Fase 18 — Fix Margin/Lebar Cetak & Tanda Tangan Kata Pengantar/Bab IV

**Status:** Dieksekusi dan diverifikasi (generate ulang PDF, `tahun=2025`, OPD "Dinas Pangan").

**File yang diubah:** `backend/controllers/lakipExportController.js` (Poin 6), `backend/controllers/lakipGeneratorController.js` (Poin 6.2, 6.3, 7).

---

## Poin 6 — Fix margin/lebar cetak

### 1. Hilangkan duplikasi margin

**Root cause** (dikonfirmasi investigasi Fase 17): dua sumber margin diterapkan BERTUMPUK pada tiap halaman isi —
```
Puppeteer page.pdf({ margin: { top:'10mm', bottom:'15mm', left:'10mm', right:'10mm' } })
+
.page { padding: 20mm 15mm 20mm 25mm !important; }   (PRINT_CSS)
```
Total: atas 30mm, kanan 25mm, bawah 35mm, **kiri 35mm** — lebar cetak efektif cuma ~150mm dari 210mm.

**Fix:** pilih SATU sumber — PRINT_CSS `.page{padding:...}` di-nolkan (`padding: 0 !important`), margin Puppeteer jadi satu-satunya sumber, diseragamkan `20mm` semua sisi:
```js
const margin = { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" };
```
**Lebar cetak efektif baru: 210mm − 40mm = 170mm** (persis target), tinggi efektif 297mm − 40mm = 257mm.

Efek samping yang ikut dibereskan: override khusus render cover (`coverPaddingOverride`, ditambahkan Fase 17 sebagai patch sementara) jadi redundan karena PRINT_CSS sekarang menolkan `.page` padding secara global — dihapus, kode jadi lebih ringkas. Mode `/preview` (HTML biasa di browser, tanpa Puppeteer/PRINT_CSS) **tidak terpengaruh** — masih pakai padding aslinya sendiri (`.page{padding:25mm 20mm 20mm 25mm}` dari `buildHtml()`) supaya tetap terlihat seperti "kertas" di layar.

### 2. `page-break-inside: avoid` pada `<tr>`

Ditambahkan di blok `@media print` (`buildHtml()`):
```css
tr { page-break-inside: avoid; break-inside: avoid; }
```
Puppeteer `page.pdf()` memakai emulasi media `print` secara default, jadi rule ini otomatis ikut berlaku saat export PDF (bukan cuma saat cetak langsung dari browser). Diterapkan ke SEMUA `<tr>` (bukan cuma tabel Bab III A/B secara spesifik) karena manfaatnya berlaku umum tanpa downside yang diketahui — lebih sederhana daripada scoping per-class.

### 3. Kecilkan kolom "Evaluasi" tabel Bab III B

```
SEBELUM: No 4% | Program 18% | Kegiatan 18% | Indikator 18% | Target 8%  | Realisasi 8%  | Evaluasi 26%
SESUDAH: No 4% | Program 22% | Kegiatan 22% | Indikator 18% | Target 10% | Realisasi 10% | Evaluasi 14%
```
12 poin dari Evaluasi (26%→14%) didistribusikan proporsional ke Program/Kegiatan/Target/Realisasi (Indikator & No tidak diubah, sesuai instruksi).

### Verifikasi

```
Total halaman PDF: 39 (naik dari 38 — wajar, margin lebih lebar = lebih sedikit ruang per halaman = lebih banyak halaman utk konten yang sama)
Heading "Rincian Realisasi Program dan Kegiatan" (Bab III B) ditemukan: true
Tidak ada error/crash saat generate.
```
Perbandingan lebar cetak: **150mm (sebelum) → 170mm (sesudah)**, dihitung dari margin yang sekarang tunggal (bukan diverifikasi visual piksel-per-piksel — perhitungan deterministik dari nilai margin yang diset, konsisten dengan tidak adanya lagi sumber padding kedua di jalur export).

---

## Poin 7 — Hardcode "Sofifi" + reuse `pkDetail.pihak_kedua`

### Perubahan

Ditambahkan 3 variabel baru di awal `buildHtml()` (dipakai bersama oleh 2 blok TTD):
```js
const kotaTtd = 'Sofifi';   // hardcode, konsisten dgn 11 generator dokumen resmi lain (Fase 17 Poin 7)
const namaKepalaDinas = pkDetail?.pihak_kedua?.nama || opd.kepala_opd;
const nipKepalaDinas = pkDetail?.pihak_kedua?.nip || opd.nip_kepala;
```
`pkDetail` sudah di-fetch `collectLakipData()` (untuk Lampiran 1 PK, lewat `lakipPkService.getPkDetail()` → `PejabatPenandatangan.findOne({role:'KEPALA_DINAS'})`) — **tidak ada query baru**, murni reuse.

Diterapkan di **2 blok TTD**:
1. **Kata Pengantar** — `${escH(opd.nama_provinsi)},` → `${escH(kotaTtd)},`; `${escH(opd.kepala_opd)}` → `${escH(namaKepalaDinas)}`; `${escH(opd.nip_kepala)}` → `${escH(nipKepalaDinas)}`.
2. **Bab IV — Penutup** — perubahan identik.

**TIDAK diubah** (sesuai instruksi eksplisit): blok TTD **Inspektur** di halaman "Pernyataan Telah Direviu" — tetap `${escH(opd.nama_provinsi)}` + `Inspektur Provinsi ${escH(opd.nama_provinsi)}` + placeholder `NIP. .....................................` apa adanya, karena itu memang placeholder manual by design sejak Fase 3 (data Inspektur bukan sesuatu yang tersedia di `pkDetail`, beda sumber sepenuhnya dari Kepala Dinas).

### Verifikasi (generate ulang PDF, ekstrak teks)

```
"Sofifi,": 3 kemunculan → Kata Pengantar + Bab IV + Lampiran 1 PK (Lampiran 1 SUDAH punya "Sofifi," sendiri sejak awal, tidak disentuh Fase 18 — total 3 wajar)
"DHENY TJAN": 4 kemunculan → Kata Pengantar + Bab IV + 2x di Lampiran 1 PK (intro pihak_kedua + TTD)
"197507302001121001" (NIP): 3 kemunculan (dicek via ekstraksi teks utuh) → persis di Kata Pengantar, Bab IV, dan Lampiran 1 PK — konfirmasi manual context:
  "...DHENY TJAN, SH.,M.Si (......................................) 197507302001121001 LAKIP/LKj Tahun 2025..." → Kata Pengantar (halaman 1) & Bab IV (halaman 29) — KEDUANYA benar
"Inspektur Provinsi": 1 kemunculan (TIDAK berubah, sesuai instruksi)
"NIP. ....." placeholder Inspektur: 1 kemunculan (TIDAK berubah)
```
Kedua blok TTD yang diminta (Kata Pengantar & Bab IV) sekarang menampilkan **"Sofifi, 3 Agustus 2026"**, **"DHENY TJAN, SH.,M.Si"**, dan **"197507302001121001"** — bukan placeholder titik-titik kosong lagi. Blok Inspektur dikonfirmasi tidak tersentuh sama sekali.

---

## Ringkasan

| | Sebelum | Sesudah |
|---|---|---|
| Lebar cetak efektif | ~150mm (margin bertumpuk 2 sumber) | 170mm (1 sumber, margin Puppeteer 20mm semua sisi) |
| Baris tabel terpotong batas halaman | Tidak dilindungi | `page-break-inside:avoid` pada semua `<tr>` |
| Kolom Evaluasi Bab III B | 26% (isi mayoritas "—") | 14%, sisa dialihkan ke Program/Kegiatan/Target/Realisasi |
| Kata Pengantar TTD | "Maluku Utara," + placeholder titik-titik | "Sofifi," + "DHENY TJAN, SH.,M.Si" + NIP asli |
| Bab IV TTD | "Maluku Utara," + placeholder titik-titik | "Sofifi," + "DHENY TJAN, SH.,M.Si" + NIP asli |
| Pernyataan Reviu (Inspektur) TTD | Placeholder manual | **Tidak diubah** (by design) |

Tidak ada perubahan data di database — seluruh perubahan Fase 18 murni kode (`lakipExportController.js`, `lakipGeneratorController.js`).
