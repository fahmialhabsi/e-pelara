/**
 * Manifest impor RPJMD Malut — sumber: pemetaan halaman pdfjs + hitungan parser
 * pada file Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf.
 * Jumlah baris diharapkan disesuaikan jika edisi PDF berubah (jalankan verify script).
 */
"use strict";

const PDF_REL = "dokumenEPelara/Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf";

/** Rentang halaman inklusif (1-based) untuk referensi audit. */
const pageRanges = {
  table228: { startPage: 68, endPage: 76, note: "Judul 2.28 hal.68; Tabel 2.29 mulai hal.76" },
  table229: { startPage: 76, endPage: 78, note: "Tabel 2.29 hal.76-77; teks 2.2.3 hal.78" },
  table31: { startPage: 109, endPage: 112, note: "Tabel 3.1 hal.109-111; STRATEGI hal.112" },
  table33: { startPage: 121, endPage: 127, note: "Tabel 3.3 hal.121-126; 3.5 hal.127" },
  table42: { startPage: 148, endPage: 150, note: "Tabel 4.2 hal.148-149; Tabel 4.3 hal.150" },
};

/**
 * Metode per tabel pada pipeline impor terakhir:
 * - pdf-parse-from-pdf-bytes: string dari pdf-parse(readFileSync(pdf))
 * - pdfjs-geometry: baris dari getTextContent + clustering posisi
 */
const parserMethodByTable = {
  table228: "pdf-parse-from-pdf-bytes",
  table229: "pdfjs-geometry",
  table31: "pdf-parse-from-pdf-bytes",
  table33: "pdfjs-geometry",
  table42: "pdfjs-geometry",
};

/** Jumlah baris data hasil parser (bukan jumlah baris visual PDF). */
const expectedRowCounts = {
  urusan_kinerja_2021_2024: 114,
  apbd_proyeksi_2026_2030: 38,
  rpjmd_target_tujuan_sasaran_2025_2029: 26,
  arah_kebijakan_rpjmd: 6,
  iku_rpjmd: 25,
};

const keyFingerprints = {
  apbd_proyeksi_2026_2030: [
    { kode_baris: "1", uraianContains: "PENDAPATAN" },
    { kode_baris: "1.1.1", uraianContains: "Pajak Daerah" },
  ],
  iku_rpjmd: [
    { no_urut: 1, indikatorContains: "Indeks Modal Manusia" },
    { no_urut: 18, indikatorContains: "Harmoni" },
  ],
};

module.exports = {
  PDF_REL,
  pageRanges,
  parserMethodByTable,
  expectedRowCounts,
  keyFingerprints,
};
