'use strict';

/**
 * ==========================================================
 * RenjaPdfLayoutHelper
 * ----------------------------------------------------------
 * Helper layout PDF untuk seluruh dokumen resmi Renja.
 *
 * Digunakan oleh:
 * - planningOfficialDocumentEngine.js
 *
 * Tanggung jawab:
 * - Portrait / Landscape
 * - Margin
 * - Ukuran halaman
 * - Area cetak (usable width/height)
 * - Informasi halaman aktif
 *
 * Jangan letakkan logika render tabel di helper ini.
 * ==========================================================
 */

function pageInfo(pdf) {
  return {
    width: pdf.page.width,
    height: pdf.page.height,
    marginLeft: pdf.page.margins.left,
    marginRight: pdf.page.margins.right,
    marginTop: pdf.page.margins.top,
    marginBottom: pdf.page.margins.bottom,
    usableWidth: pdf.page.width - pdf.page.margins.left - pdf.page.margins.right,
    usableHeight: pdf.page.height - pdf.page.margins.top - pdf.page.margins.bottom,
    layout: pdf.page.layout,
  };
}

function addPortrait(pdf) {
  pdf.addPage({
    size: 'A4',
    layout: 'portrait',
    margin: 40,
  });

  return pageInfo(pdf);
}

function addLandscape(pdf) {
  pdf.addPage({
    size: 'A4',
    layout: 'landscape',
    margin: 40,
  });

  return pageInfo(pdf);
}

function ensurePortrait(pdf) {
  if (pdf.page.layout !== 'portrait') {
    return addPortrait(pdf);
  }
  return pageInfo(pdf);
}

function ensureLandscape(pdf) {
  if (pdf.page.layout !== 'landscape') {
    return addLandscape(pdf);
  }
  return pageInfo(pdf);
}

function usableWidth(pdf) {
  return pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
}

function usableHeight(pdf) {
  return pdf.page.height - pdf.page.margins.top - pdf.page.margins.bottom;
}

function nextLandscape(pdf) {
  addLandscape(pdf);
  pdf.y = pdf.page.margins.top;
  return pdf.page.margins.top;
}

function nextPortrait(pdf) {
  addPortrait(pdf);
  pdf.y = pdf.page.margins.top;
  return pdf.page.margins.top;
}

function leftMargin(pdf) {
  return pdf.page.margins.left;
}

function topMargin(pdf) {
  return pdf.page.margins.top;
}

function moveBelow(pdf, y) {
  pdf.x = leftMargin(pdf);
  pdf.y = y;
}

function computeProportionalColWidths(headers, rows, totalWidth, minColWidth = 45) {
  const weights = headers.map((header, colIndex) => {
    const values = [String(header), ...rows.map((r) => String(r[colIndex] ?? ''))];

    const longestWord = Math.max(
      ...values.map((v) => Math.max(...v.split(/\s+/).map((w) => w.length), 1)),
    );

    const longestText = Math.max(...values.map((v) => v.length));

    // Header multi-kata (mis. "Target Tahun 2025") butuh lebar cukup untuk
    // menampung separuh kata sekaligus per baris, agar tidak pecah jadi
    // satu kata per baris (3+ baris) yang bisa mendorong isi ke halaman berikutnya.
    const headerWords = String(header).split(/\s+/);
    const headerHalfWidth = headerWords
      .slice(0, Math.ceil(headerWords.length / 2))
      .join(' ').length;

    return Math.max(longestWord * 2, longestText * 0.35, headerHalfWidth * 1.8);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const widths = weights.map((w) =>
    Math.max(minColWidth, Math.round((w / totalWeight) * totalWidth)),
  );

  let diff = totalWidth - widths.reduce((a, b) => a + b, 0);

  if (diff < 0) {
    // Kolom perlu dipangkas: hanya ambil dari kolom yang punya "slack" di
    // atas minColWidth, jadi tidak ada kolom yang terdorong di bawah batas
    // minimum terbaca (mis. kolom Catatan pecah huruf-per-huruf).
    const shrinkable = widths
      .map((w, i) => ({ i, slack: w - minColWidth }))
      .filter((c) => c.slack > 0);
    const totalSlack = shrinkable.reduce((a, c) => a + c.slack, 0);
    const need = Math.min(-diff, totalSlack);
    shrinkable.forEach((c) => {
      widths[c.i] -= Math.floor((c.slack / totalSlack) * need);
    });
    diff = totalWidth - widths.reduce((a, b) => a + b, 0);
    if (diff !== 0) widths[widths.length - 1] += diff;
  } else if (diff > 0) {
    widths[widths.length - 1] += diff;
  }

  return widths;
}

module.exports = {
  pageInfo,
  usableWidth,
  usableHeight,

  addPortrait,
  addLandscape,

  ensurePortrait,
  ensureLandscape,

  nextLandscape,
  nextPortrait,

  leftMargin,
  topMargin,
  moveBelow,

  computeProportionalColWidths,
};
