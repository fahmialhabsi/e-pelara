'use strict';

/**
 * Tabel 4.1 Renja Permendagri 14/2026 — 17 kolom, kepala tabel 3 tingkat.
 *
 * Berkas ini hanya mengubah keluaran `renjaTabel41Service.buildTabel41()`
 * menjadi bentuk yang siap digambar, sehingga aturan isinya tetap satu tempat
 * di service dan tidak tersebar ke mesin render.
 *
 * Tidak memakai ulang RenjaBab4TableHelper (Permendagri 86/2017) karena jumlah
 * kolom, susunan kepala tabel, dan jenjang barisnya berbeda sama sekali.
 */

/**
 * Bobot lebar kolom. Disimpan sebagai proporsi, bukan poin, supaya tabel tetap
 * memenuhi lebar halaman berapa pun marginnya.
 */
// Setiap angka di bawah adalah hasil PENGUKURAN LANGSUNG, bukan perkiraan:
// diambil dari doc.widthOfString() PDFKit sendiri untuk kata terpanjang di
// tiap kolom pada font Helvetica-Bold ukuran 6 (font judul kolom), ditambah
// CELL_PADDING_X*2 (8pt) dan margin aman 3pt. Dua revisi sebelumnya masih
// menebak lebar dan terbukti salah di dokumen cetak nyata — kata seperti
// "RENSTRA", "REALISASI"/"PRAKIRAAN", "KELOMPOK", dan "PENANGGUNG" tetap
// terpotong jadi dua baris walau sudah satu kata per baris pada judul kolom,
// karena font tebal jauh lebih lebar per huruf daripada perkiraan kasar.
// Kolom KODE juga mempertimbangkan isi terpanjang di badan tabel: kode
// subkegiatan 17 digit ("2.09.01.1.01.0001") ternyata LEBIH LEBAR (48,4pt)
// daripada kata judulnya sendiri ("KODE", 17,2pt).
//
// Total kolom 3 (URAIAN) dan 4 (INDIKATOR) mendapat SISA anggaran setelah
// 15 kolom lain dijatah pas-pasan sesuai kebutuhan minimum judulnya — jadi
// keduanya tetap paling lebar seperti sebelumnya, hanya tidak selonggar
// revisi awal. Total baris landscape A4 = 761,89pt (lihat usableWidth()).
const BOBOT_KOLOM = [
  20, // 1  NO            — "NO" 9,0pt
  60, // 2  KODE          — kode 17 digit di badan tabel 48,4pt (pengikat)
  80, // 3  URUSAN / BIDANG URUSAN / PROGRAM / OUTCOME / KEGIATAN / SUBKEGIATAN
  61, // 4  INDIKATOR     — kata judul "INDIKATOR" 29,1pt
  41, // 5  TARGET AKHIR RENSTRA — kata terpanjang "RENSTRA" 29,0pt
  44, // 6  REALISASI (tahun-2) — "REALISASI" 32,0pt
  48, // 7  PRAKIRAAN (tahun-1) — "PRAKIRAAN" 36,0pt (huruf lebih lebar dari REALISASI walau sama 9 huruf)
  36, // 8  TARGET (tahun) — "TARGET" 24,1pt
  41, // 9  PAGU INDIKATIF — "INDIKATIF" 29,1pt
  34, // 10 LOKASI — "LOKASI" 22,7pt
  38, // 11 SUMBER DANA — "SUMBER" 26,0pt
  43, // 12 PRIORITAS NASIONAL — "NASIONAL" 31,3pt
  37, // 13 PRIORITAS DAERAH — "DAERAH" 25,4pt
  46, // 14 KELOMPOK SASARAN — "KELOMPOK" 34,7pt
  36, // 15 PRAKIRAAN MAJU - TARGET — "TARGET" 24,1pt
  41, // 16 PRAKIRAAN MAJU - PAGU INDIKATIF — "INDIKATIF" 29,1pt
  56, // 17 PERANGKAT DAERAH PENANGGUNG JAWAB — "PENANGGUNG" 43,7pt
];

const TOTAL_BOBOT = BOBOT_KOLOM.reduce((a, b) => a + b, 0);

/** Lebar kolom dalam poin, diskalakan ke lebar cetak yang tersedia. */
function lebarKolom(lebarTotal) {
  return BOBOT_KOLOM.map((b) => (b / TOTAL_BOBOT) * lebarTotal);
}

/** Lebar kolom dalam persen — dipakai tabel DOCX. */
function lebarKolomPersen() {
  return BOBOT_KOLOM.map((b) => (b / TOTAL_BOBOT) * 100);
}

/**
 * Kepala tabel 3 tingkat. `null` berarti sel tertutup rowSpan dari baris di
 * atasnya dan tetap menggeser satu kolom — sesuai kontrak drawPdfGridTable.
 */
function kepalaTabel(meta) {
  const thnRealisasi = meta?.tahun_realisasi ?? '';
  const thnBerjalan = meta?.tahun_berjalan ?? '';
  const thn = meta?.tahun ?? '';
  const thnMaju = meta?.tahun_maju ?? '';

  const tengah = (text, extra = {}) => ({ text, align: 'center', ...extra });

  return [
    [
      tengah('NO', { rowSpan: 3 }),
      tengah('KODE', { rowSpan: 3 }),
      tengah('URUSAN / BIDANG URUSAN /\nPROGRAM / OUTCOME /\nKEGIATAN / SUBKEGIATAN\nOUTPUT', {
        rowSpan: 3,
      }),
      tengah('INDIKATOR', { rowSpan: 3 }),
      tengah('TARGET\nAKHIR\nRENSTRA', { rowSpan: 3 }),
      tengah(`REALISASI\n${thnRealisasi}`, { rowSpan: 3 }),
      tengah(`PRAKIRAAN\n${thnBerjalan}`, { rowSpan: 3 }),
      tengah('CAPAIAN KINERJA DAN KERANGKA PENDANAAN', { colSpan: 6 }),
      tengah('KELOMPOK\nSASARAN', { rowSpan: 3 }),
      tengah(`PRAKIRAAN MAJU ${thnMaju}`, { colSpan: 2 }),
      tengah('PERANGKAT\nDAERAH\nPENANGGUNG\nJAWAB', { rowSpan: 3 }),
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      tengah(`TARGET\n${thn}`, { rowSpan: 2 }),
      tengah('PAGU\nINDIKATIF', { rowSpan: 2 }),
      tengah('LOKASI', { rowSpan: 2 }),
      tengah('SUMBER\nDANA', { rowSpan: 2 }),
      tengah('PRIORITAS', { colSpan: 2 }),
      null,
      tengah('TARGET', { rowSpan: 2 }),
      tengah('PAGU\nINDIKATIF', { rowSpan: 2 }),
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      tengah('NASIONAL'),
      tengah('DAERAH'),
      null,
      null,
      null,
      null,
    ],
  ];
}

/** Baris penomoran "(1) (2) ... (17)" seperti pada dokumen acuan. */
function barisPenomoran() {
  return BOBOT_KOLOM.map((_b, i) => `(${i + 1})`);
}

const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '' : Number(n).toLocaleString('id-ID');

const teks = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * Jenjang baris ditandai dengan indentasi pada kolom uraian. PDF dan DOCX
 * sama-sama tidak punya konsep "tingkat", jadi hierarki dinyatakan visual.
 */
// Indentasi sengaja rapat: pada lebar kolom cetak, satu spasi tambahan per
// tingkat sudah cukup menandai jenjang, sedangkan indentasi lebar memakan
// ruang teks dan menambah jumlah halaman secara nyata.
const INDENT = {
  opd: '',
  urusan: ' ',
  bidang_urusan: '  ',
  program: '  ',
  outcome_program: '   ',
  indikator_program: '   ',
  kegiatan: '   ',
  outcome_kegiatan: '    ',
  indikator_kegiatan: '    ',
  subkegiatan: '    ',
  output_subkegiatan: '     ',
};

/** Baris yang dicetak tebal pada DOCX (struktur, bukan rincian). */
const BARIS_TEBAL = new Set([
  'opd',
  'urusan',
  'bidang_urusan',
  'program',
  'kegiatan',
  'subkegiatan',
]);

/** Ubah satu baris hasil buildTabel41 menjadi larik 17 sel siap cetak. */
function selBaris(b) {
  return [
    teks(b.no),
    teks(b.kode),
    `${INDENT[b.jenis] ?? ''}${teks(b.uraian)}`,
    teks(b.indikator),
    teks(b.target_akhir_renstra),
    typeof b.realisasi_lalu === 'number' ? rupiah(b.realisasi_lalu) : teks(b.realisasi_lalu),
    teks(b.prakiraan_berjalan),
    teks(b.target),
    rupiah(b.pagu),
    teks(b.lokasi),
    teks(b.sumber_dana),
    teks(b.prioritas_nasional),
    teks(b.prioritas_daerah),
    teks(b.kelompok_sasaran),
    teks(b.target_maju),
    rupiah(b.pagu_maju),
    teks(b.pd_penanggung_jawab),
  ];
}

/** Seluruh baris isi tabel, diawali baris penomoran kolom. */
function barisTabel(tabel41) {
  const isi = (tabel41?.baris || []).map(selBaris);
  return [barisPenomoran(), ...isi];
}

module.exports = {
  BOBOT_KOLOM,
  BARIS_TEBAL,
  lebarKolom,
  lebarKolomPersen,
  kepalaTabel,
  barisPenomoran,
  barisTabel,
  selBaris,
};
