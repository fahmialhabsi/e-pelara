'use strict';

/**
 * Render khusus BAB II — Tabel 2.1 & 2.2 perlu landscape (kolom banyak) dan
 * Tabel 2.2 perlu header 2-baris sesuai format resmi T-C.30 (grup "Target
 * Renstra Perangkat Daerah" x4 tahun, "Realisasi Capaian" x2 tahun, "Proyeksi"
 * x2 tahun) — tidak bisa dihasilkan dari markdown pipe-table datar biasa.
 * Narasi & tabel lain (2.3, 2.4, dst.) tetap portrait via renderMarkdownToPdf biasa.
 */

const { ensureLandscape, ensurePortrait, usableWidth, leftMargin, moveBelow, computeProportionalColWidths } = require('./RenjaPdfLayoutHelper');
const { drawPdfGridTable, parseMarkdownTablePdf, renderMarkdownToPdf } = require('./RenjaPdfTableHelper');
const { PDF_THEME } = require('./RenjaPdfThemeHelper');

function buildTabel22Headers(tahun) {
  const n2 = String(tahun - 2);
  const n1 = String(tahun - 1);
  const n0 = String(tahun);
  const p1 = String(tahun + 1);
  return [
    [
      'No',
      'Indikator',
      'SPM/Standar Nasional',
      'IKK',
      { text: 'Target Renstra Perangkat Daerah', colSpan: 4, align: 'center' },
      { text: 'Realisasi Capaian', colSpan: 2, align: 'center' },
      { text: 'Proyeksi', colSpan: 2, align: 'center' },
      'Catatan Analisis',
    ],
    [null, null, null, null, n2, n1, n0, p1, n2, n1, n0, p1, null],
  ];
}

function flatWidthHintTabel22(tahun) {
  const n2 = tahun - 2;
  const n1 = tahun - 1;
  return [
    'No',
    'Indikator',
    'SPM/Standar Nasional',
    'IKK',
    `Target Renstra PD ${n2}`,
    `Target Renstra PD ${n1}`,
    `Target Renstra PD ${tahun}`,
    `Target Renstra PD ${tahun + 1}`,
    `Realisasi ${n2}`,
    `Realisasi ${n1}`,
    `Proyeksi ${tahun}`,
    `Proyeksi ${tahun + 1}`,
    'Catatan Analisis',
  ];
}

// Ambil baris judul "Tabel 2.1 ..."/"Tabel 2.2 ..." beserta blok pipe-table
// yang langsung mengikutinya (boleh diselingi baris kosong).
function extractTableBlock(lines, titleIdx) {
  let i = titleIdx + 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  const tableStart = i;
  while (i < lines.length && lines[i].trim().startsWith('|')) i++;
  return { titleLine: lines[titleIdx], tableLines: lines.slice(tableStart, i), endIdx: i };
}

function renderTableInLandscape(pdf, titleLine, tableLines, headerOverride, widthHintHeaders) {
  ensureLandscape(pdf);

  pdf.fontSize(11).fillColor(PDF_THEME.BODY_TEXT).text(titleLine.trim(), { align: 'left' });
  pdf.moveDown(0.3);

  const table = parseMarkdownTablePdf(tableLines);
  if (table) {
    const width = usableWidth(pdf);
    const left = leftMargin(pdf);
    const widthHint = widthHintHeaders || table.headers;
    const colWidths = computeProportionalColWidths(widthHint, table.rows, width);

    drawPdfGridTable(pdf, {
      left,
      yStart: pdf.y,
      cols: colWidths,
      headers: headerOverride || table.headers,
      rows: table.rows,
      fontSize: 7,
    });

    moveBelow(pdf, pdf.y + PDF_THEME.TABLE_SPACING);
  }

  ensurePortrait(pdf);
}

function renderBab2Section(pdf, bab2Text, tahun) {
  const lines = String(bab2Text || '').split('\n');
  let buffer = [];
  let i = 0;

  const flushNarrative = () => {
    if (buffer.length) {
      renderMarkdownToPdf(pdf, buffer.join('\n'));
      buffer = [];
    }
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (/^Tabel 2\.1\b/.test(trimmed)) {
      flushNarrative();
      const block = extractTableBlock(lines, i);
      renderTableInLandscape(pdf, block.titleLine, block.tableLines, null, null);
      i = block.endIdx;
      continue;
    }

    if (/^Tabel 2\.2\b/.test(trimmed)) {
      flushNarrative();
      const block = extractTableBlock(lines, i);
      renderTableInLandscape(
        pdf,
        block.titleLine,
        block.tableLines,
        buildTabel22Headers(tahun),
        flatWidthHintTabel22(tahun),
      );
      i = block.endIdx;
      continue;
    }

    buffer.push(lines[i]);
    i++;
  }

  flushNarrative();
}

module.exports = { renderBab2Section };
