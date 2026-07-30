// backend/services/sdiDaftarDataExportExcelService.js
'use strict';

/**
 * Export Daftar Data Daerah ke Excel mengikuti Lampiran surat 000.7/4486/SETDA.
 *
 * Susunan sheet sengaja dibuat sama persis dengan Lampiran: judul, identitas
 * OPD, baris header nama atribut, lalu baris nomor (1)-(19) di bawahnya.
 * Baris nomor itu dipakai Forum Satu Data sebagai rujukan verifikasi, sehingga
 * tidak boleh dihilangkan meskipun terlihat mubazir.
 *
 * exportService.exportExcel yang generik tidak dipakai di sini karena hanya
 * mendukung satu baris header tanpa baris nomor kolom.
 */

const ExcelJS = require('exceljs');

const BIRU = 'FF1F4E79';
const ABU = 'FFF2F2F2';

/** Atribut baku Lampiran (1)-(19) diikuti atribut tambahan (20)-(22). */
const KOLOM = [
  { no: 1, header: 'ID DDD', key: 'id_ddd', width: 10 },
  { no: 2, header: 'ID DDP', key: 'id_ddp', width: 10 },
  { no: 3, header: 'Sumber Referensi', key: 'sumber_referensi', width: 30 },
  { no: 4, header: 'Kode Indikator', key: 'kode_indikator', width: 18 },
  { no: 5, header: 'Nama Indikator', key: 'nama_indikator', width: 30 },
  { no: 6, header: 'Nama Data', key: 'nama_data', width: 30 },
  { no: 7, header: 'Jenis Data', key: 'jenis_data', width: 14 },
  { no: 8, header: 'Indikator/ Variabel', key: 'indikator_variabel', width: 14 },
  { no: 9, header: 'Kode Standar Data', key: 'kode_standar_data', width: 18 },
  { no: 10, header: 'Produsen Data', key: 'produsen_data', width: 22 },
  { no: 11, header: 'Klasifikasi Data sesuai Risiko', key: 'klasifikasi_risiko', width: 18 },
  { no: 12, header: 'Definisi', key: 'definisi', width: 40 },
  { no: 13, header: 'Satuan', key: 'satuan', width: 14 },
  { no: 14, header: 'Klasifikasi Penyajian', key: 'klasifikasi_penyajian', width: 22 },
  { no: 15, header: 'Jadwal Pemutakhiran', key: 'jadwal_pemutakhiran', width: 18 },
  { no: 16, header: 'Kategori RAD', key: 'kategori_rad', width: 22 },
  { no: 17, header: 'Kode Metadata', key: 'kode_metadata', width: 22 },
  { no: 18, header: 'Link Portal Daerah', key: 'link_portal_daerah', width: 28 },
  { no: 19, header: 'Link Portal SDI', key: 'link_portal_sdi', width: 28 },
  { no: 20, header: 'Metode Pengumpulan', key: 'metode_pengumpulan', width: 30 },
  { no: 21, header: 'Periode Data', key: 'periode_data', width: 16 },
  { no: 22, header: 'Penanggung Jawab Data', key: 'penanggung_jawab', width: 22 },
];

const LABEL_ENUM = {
  jenis_data: { statistik: 'Statistik', geospasial: 'Geospasial', keuangan: 'Keuangan' },
  indikator_variabel: { indikator: 'Indikator', variabel: 'Variabel' },
  klasifikasi_risiko: { terbuka: 'Terbuka', terbatas: 'Terbatas', tertutup: 'Tertutup' },
  jadwal_pemutakhiran: {
    harian: 'Harian',
    mingguan: 'Mingguan',
    bulanan: 'Bulanan',
    triwulanan: 'Triwulanan',
    semesteran: 'Semesteran',
    tahunan: 'Tahunan',
    insidental: 'Insidental',
  },
};

const nilai = (row, key) => {
  const mentah = row[key];
  // ID DDP yang sudah dipastikan tidak mengacu Data Pusat ditulis "-" agar
  // pemeriksa dapat membedakannya dari sel yang belum dikerjakan. Lampiran
  // mengizinkan kolom ini kosong dalam keadaan tersebut.
  if (key === 'id_ddp' && (mentah == null || mentah === '')) {
    return row.id_ddp_status === 'tidak_mengacu' ? '-' : '';
  }
  if (mentah == null || mentah === '') return '';
  return LABEL_ENUM[key]?.[mentah] || String(mentah);
};

const garis = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

/**
 * @param {object} res      Express response
 * @param {Array}  rows     Baris Daftar Data
 * @param {object} meta     { namaOpd, tahun }
 */
async function exportDaftarData(res, rows, meta = {}) {
  const namaOpd = meta.namaOpd || '-';
  const tahun = meta.tahun || String(new Date().getFullYear());

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'e-PeLARA';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Daftar Data Daerah', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = KOLOM.map((k) => ({ key: k.key, width: k.width }));

  const lebar = KOLOM.length;
  const judul = [
    'Lampiran',
    'Format Daftar Data Daerah',
    `Nama OPD : ${namaOpd}`,
    `Tahun : ${tahun}`,
  ];
  judul.forEach((teks, i) => {
    const row = sheet.addRow([teks]);
    sheet.mergeCells(row.number, 1, row.number, lebar);
    row.getCell(1).font = { bold: i <= 1, size: i === 1 ? 13 : 11, color: { argb: BIRU } };
    row.getCell(1).alignment = { horizontal: i <= 1 ? 'center' : 'left' };
  });
  sheet.addRow([]);

  // Baris header atribut.
  const headerRow = sheet.addRow(KOLOM.map((k) => k.header));
  headerRow.height = 40;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = garis;
  });

  // Baris nomor (1)-(22) — rujukan verifikasi Forum Satu Data.
  const nomorRow = sheet.addRow(KOLOM.map((k) => `(${k.no})`));
  nomorRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ABU } };
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = garis;
  });

  rows.forEach((r) => {
    const row = sheet.addRow(KOLOM.map((k) => nilai(r, k.key)));
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.font = { size: 10 };
      cell.border = garis;
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: nomorRow.number }];
  sheet.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: lebar },
  };

  // Sheet keterangan atribut — disalin dari Lampiran agar pengisi tidak perlu
  // membuka surat asli saat melengkapi kolom.
  const info = workbook.addWorksheet('Keterangan Atribut');
  info.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Atribut', key: 'atribut', width: 30 },
    { header: 'Keterangan', key: 'ket', width: 100 },
  ];
  info.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  info.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BIRU } };
  KETERANGAN.forEach((k) => info.addRow(k));
  info.eachRow((row, idx) => {
    if (idx === 1) return;
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
  });

  const namaFile = `Daftar-Data-Daerah-${namaOpd.replace(/[^\w]+/g, '-')}-${tahun}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** Keterangan atribut sebagaimana tercantum pada Lampiran surat. */
const KETERANGAN = [
  { no: 1, atribut: 'ID DDD', ket: 'Angka yang merepresentasikan identitas unik dari data.' },
  {
    no: 2,
    atribut: 'ID DDP',
    ket: 'ID Daftar Data Pusat, diisi jika Daftar Data Daerah mengacu ke Daftar Data Pusat/Data Prioritas. Dapat dikosongkan jika tidak mengacu ke Data Pusat.',
  },
  {
    no: 3,
    atribut: 'Sumber Referensi',
    ket: 'Nama dokumen perencanaan pembangunan atau regulasi yang menjadi basis penentuan daftar data.',
  },
  { no: 4, atribut: 'Kode Indikator', ket: 'Kode unik dari tiap indikator.' },
  {
    no: 5,
    atribut: 'Nama Indikator',
    ket: 'Nomenklatur dari indikator pembangunan sesuai dengan kode dan sumber referensi yang digunakan.',
  },
  {
    no: 6,
    atribut: 'Nama Data',
    ket: 'Nama dari indikator atau variabel yang masuk dalam daftar data.',
  },
  {
    no: 7,
    atribut: 'Jenis Data',
    ket: 'Klasifikasi data: statistik, geospasial, atau keuangan.',
  },
  {
    no: 8,
    atribut: 'Indikator/Variabel',
    ket: 'Dibagi menjadi dua kategori: indikator dan variabel pembentuk/pendukung.',
  },
  {
    no: 9,
    atribut: 'Kode Standar Data',
    ket: 'Kode Standar Data Statistik (SDS) pada INDAH (indah.bps.go.id) atau kode unsur pada KUGI (kugi.ina-sdi.or.id). Dapat diisi "N/A" jika data belum ada standarnya.',
  },
  {
    no: 10,
    atribut: 'Produsen Data',
    ket: 'Organisasi Perangkat Daerah yang memproduksi data.',
  },
  {
    no: 11,
    atribut: 'Klasifikasi Data sesuai Risiko',
    ket: 'Pengelompokan data berdasarkan ruang lingkup dan batasan pengguna data (Terbuka, Terbatas, Tertutup).',
  },
  {
    no: 12,
    atribut: 'Definisi',
    ket: 'Penjelasan yang memberi batas atau membedakan secara jelas arti dan cakupan suatu data dengan data yang lain.',
  },
  {
    no: 13,
    atribut: 'Satuan',
    ket: 'Besaran tertentu dalam data yang digunakan sebagai standar untuk mengukur atau menakar sebagai sebuah keseluruhan.',
  },
  {
    no: 14,
    atribut: 'Klasifikasi Penyajian',
    ket: 'Klasifikasi untuk data numerik, misal penyajian menurut kabupaten/kota, desa/kelurahan, jenis kelamin, atau kategori tertentu.',
  },
  {
    no: 15,
    atribut: 'Jadwal Pemutakhiran',
    ket: 'Jadwal/periode data dikumpulkan atau dibagipakaikan.',
  },
  {
    no: 16,
    atribut: 'Kategori RAD',
    ket: 'Kategori berdasarkan Rancangan Arsitektur Data dan Informasi SPBE (RAD) pada sisae.spbe.go.id/index.php/_RAD.',
  },
  {
    no: 17,
    atribut: 'Kode Metadata',
    ket: 'Kode Metadata Kegiatan, Indikator, dan Variabel pada INDAH (indah.bps.go.id) untuk data statistik, atau tautan ke file metadata untuk data geospasial.',
  },
  {
    no: 18,
    atribut: 'Link Portal Daerah',
    ket: 'Tautan menuju laman data dengan jenis file CSV, XLSX, JSON pada Portal Daerah.',
  },
  {
    no: 19,
    atribut: 'Link Portal SDI',
    ket: 'Tautan menuju laman data dengan jenis file CSV, XLSX, JSON pada Portal SDI (data.go.id).',
  },
  {
    no: 20,
    atribut: 'Metode Pengumpulan',
    ket: 'Atribut tambahan pemenuh metadata Standar Data Indonesia (ketentuan angka 4 surat): cara data dikumpulkan dan dihitung.',
  },
  {
    no: 21,
    atribut: 'Periode Data',
    ket: 'Atribut tambahan pemenuh metadata Standar Data Indonesia: rentang tahun data yang dicakup.',
  },
  {
    no: 22,
    atribut: 'Penanggung Jawab Data',
    ket: 'Atribut tambahan pemenuh metadata Standar Data Indonesia: unit/pejabat yang bertanggung jawab atas data.',
  },
];

module.exports = { exportDaftarData, KOLOM, LABEL_ENUM };
