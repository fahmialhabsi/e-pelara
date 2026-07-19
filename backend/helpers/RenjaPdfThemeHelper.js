'use strict';

/**
 * ==========================================================
 * RenjaPdfThemeHelper
 * ----------------------------------------------------------
 * Theme visual PDF Renja.
 *
 * Seluruh warna, font, border, padding, dan layout
 * diletakkan di sini agar konsisten di seluruh dokumen PDF.
 *
 * Tidak mengandung business logic.
 * ==========================================================
 */

const PDF_THEME = {
  // ======================================================
  // Warna
  // ======================================================

  // Header tabel (mengikuti style Microsoft Word)
  HEADER_FILL: '#DDEBF7',
  HEADER_TEXT: '#000000',

  // Isi tabel
  BODY_TEXT: '#111111',

  // Border tabel
  BORDER: '#333333',
  BORDER_WIDTH: 0.45,

  // ======================================================
  // Font
  // ======================================================

  HEADER_FONT: 'Helvetica-Bold',
  BODY_FONT: 'Helvetica',

  // Ukuran font tabel
  TABLE_FONT_SIZE: 7,

  // Ukuran font paragraf
  BODY_FONT_SIZE: 10,

  // ======================================================
  // Padding Cell
  // ======================================================

  CELL_PADDING_X: 4,
  CELL_PADDING_Y: 4,

  // ===== Tinggi =====
  MIN_ROW_HEIGHT: 16,

  // ======================================================
  // Margin halaman PDF
  // ======================================================
  PAGE_MARGIN: 40,

  // ======================================================
  // Layout
  // ======================================================

  // Jarak setelah tabel sebelum paragraf berikutnya
  TABLE_SPACING: 8,
};

const RENJA_BAB4_HEADERS = [
  [
    {
      text: 'Kode',
      rowSpan: 2,
      align: 'center',
    },
    {
      text: 'Urusan / Bidang Urusan Pemerintahan Daerah dan Program / Kegiatan',
      rowSpan: 2,
      align: 'center',
    },
    {
      text: 'Indikator Kinerja Program / Kegiatan',
      rowSpan: 2,
      align: 'center',
    },
    {
      text: 'Rencana Tahun',
      colSpan: 4,
      align: 'center',
    },
    {
      text: 'Catatan Penting',
      rowSpan: 2,
      align: 'center',
    },
    {
      text: 'Prakiraan Maju',
      colSpan: 2,
      align: 'center',
    },
  ],

  [
    null,
    null,
    null,

    {
      text: 'Lokasi',
      align: 'center',
    },
    {
      text: 'Target\nCapaian\nKinerja',
      align: 'center',
    },
    {
      text: 'Kebutuhan\nDana / Pagu\nIndikatif',
      align: 'center',
    },
    {
      text: 'Sumber\nDana',
      align: 'center',
    },

    null,

    {
      text: 'Target\nCapaian\nKinerja',
      align: 'center',
    },
    {
      text: 'Kebutuhan\nDana /\nPagu Indikatif',
      align: 'center',
    },
  ],
];

const RENJA_BAB4_COLUMNS = [
  'No',
  'Program',
  'Kegiatan',
  'Sub Kegiatan',
  'Indikator Kinerja',
  'Target',
  'Satuan',
  'Pagu (Rp)',
];

const RENJA_BAB4_COL_WIDTHS = [24, 145, 145, 170, 170, 40, 50, 90];

const RENJA_BAB4_TABLE = [
  { header: 'Kode', field: 'kode', width: 35 },
  { header: 'Program', field: 'urusanProgram', width: 145 },
  { header: 'Indikator', field: 'indikator', width: 135 },
  { header: 'Lokasi', field: 'lokasi', width: 70 },
  { header: 'Target', field: 'target', width: 45, align: 'center' },
  { header: 'Pagu', field: 'pagu', width: 80, align: 'right' },
  { header: 'Sumber Dana', field: 'sumberDana', width: 65 },
  { header: 'Catatan', field: 'catatan', width: 80 },
  { header: 'Target Maju', field: 'targetMaju', width: 45, align: 'center' },
  { header: 'Pagu Maju', field: 'paguMaju', width: 60, align: 'right' },
];

// ======================================================
// BAB IV RENJA
// ======================================================

const RENJA_BAB4 = {
  TITLE: 'BAB IV — RENCANA KERJA DAN PENDANAAN',

  SUBTITLE_POLICY: '4.1 Acuan Kebijakan',

  SUBTITLE_TABLE: '4.2 Rencana Program, Kegiatan, Indikator, Target, dan Pagu Indikatif',

  TABLE_TITLE(meta) {
    return `Tabel 4.2 Rencana Program, Kegiatan, Indikator, Target, dan Pagu Indikatif ${
      meta.pdNama || ''
    } Tahun ${meta.tahun || ''}`;
  },

  TABLE_NOTE(meta) {
    return `Rencana kerja dan pendanaan ${meta.pdNama || ''} Tahun ${
      meta.tahun || ''
    } disusun berdasarkan RKPD, Renstra Perangkat Daerah, indikator kinerja, target tahunan, dan pagu indikatif.`;
  },

  POLICY_TEXT(meta) {
    return `Penyusunan rencana kerja dan pendanaan ${meta.pdNama || ''} Tahun ${
      meta.tahun || ''
    } mengacu pada:

1. RKPD Provinsi Maluku Utara Tahun ${meta.tahun || ''};
2. Renstra ${meta.pdNama || ''} Tahun ${meta.periodeStr || ''};
3. Prioritas pembangunan ketahanan pangan nasional dan daerah.

RKPD acuan: ${meta.rkpdJudul || '—'}

Renstra PD: ${meta.renstraJudul || '—'}`;
  },
};

module.exports = {
  PDF_THEME,
  RENJA_BAB4,
  RENJA_BAB4_HEADERS,
  RENJA_BAB4_COLUMNS,
  RENJA_BAB4_COL_WIDTHS,
  RENJA_BAB4_TABLE,
};
