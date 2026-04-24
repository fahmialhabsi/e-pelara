/**
 * Ekstraksi teks per baris dari PDF RPJMD Malut memakai pdfjs + posisi glyph.
 * Menangani halaman teks horizontal (urutan y menurun = atas→bawah) dan
 * tabel "berputar" (baris dikelompokkan menurut transform[4], urutan sel = transform[5]).
 *
 * Sumber file: dokumenEPelara/Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

let _pdfParse;
function getPdfParse() {
  if (!_pdfParse) {
    try {
      _pdfParse = require("pdf-parse");
    } catch {
      _pdfParse = null;
    }
  }
  return _pdfParse;
}

const DEFAULT_PDF = path.join(
  __dirname,
  "..",
  "..",
  "dokumenEPelara",
  "Rankhir RPJMD Prov. Malut Tahun 2025-2029 - 28072025.pdf",
);

/** Rentang halaman inklusif + satu halaman setelahnya untuk penanda akhir parser. */
const TABLE_PAGE_RANGES = {
  table228: { start: 68, end: 76 },
  table229: { start: 76, end: 78 },
  table31: { start: 109, end: 112 },
  table33: { start: 121, end: 127 },
  table42: { start: 148, end: 150 },
};

function isMostlyHorizontalLayout(items) {
  let horiz = 0;
  let any = 0;
  for (const i of items) {
    if (!i.str || !String(i.str).trim()) continue;
    any++;
    const m = i.transform;
    if (Math.abs(m[1]) < 0.12 && Math.abs(m[2]) < 0.12) horiz++;
  }
  return any === 0 || horiz > any / 2;
}

/**
 * Gabung token satu baris; sisipkan dua spasi bila jarak sepanjang sumbu baca > ambang.
 */
function joinRowCells(sortedCells, horiz, gapMin) {
  const parts = [];
  for (let i = 0; i < sortedCells.length; i++) {
    const cur = sortedCells[i];
    if (i > 0) {
      const prev = sortedCells[i - 1];
      const gap = horiz
        ? cur.a - (prev.a + (prev.w || 0))
        : cur.b - (prev.b + (prev.w || 0));
      parts.push(gap >= gapMin ? "  " : " ");
    }
    parts.push(cur.str);
  }
  return parts.join("");
}

/**
 * @param {import("pdfjs-dist").PDFPageProxy} page
 * @param {{ gapMinHorizontal?: number, gapMinRotated?: number }} opts
 * @returns {Promise<string[]>}
 */
async function extractOrderedLinesFromPage(page, opts = {}) {
  const gapH = opts.gapMinHorizontal ?? 10;
  const gapR = opts.gapMinRotated ?? 12;
  const tc = await page.getTextContent();
  const items = tc.items || [];
  const cells = [];
  for (const i of items) {
    if (!i.str || !String(i.str).trim()) continue;
    const tr = i.transform;
    cells.push({
      str: String(i.str).trim(),
      a: tr[4],
      b: tr[5],
      tr,
      w: typeof i.width === "number" ? i.width : 0,
    });
  }
  if (!cells.length) return [];

  const horiz = isMostlyHorizontalLayout(items);
  const tol = 4;
  if (horiz) {
    cells.sort((x, y) => y.b - x.b || x.a - y.a);
  } else {
    cells.sort((x, y) => x.a - y.a || x.b - y.b);
  }

  const keyA = (c) => (horiz ? c.b : c.a);
  const keyB = (c) => (horiz ? c.a : c.b);
  const gapMin = horiz ? gapH : gapR;

  const rows = [];
  for (const c of cells) {
    const ka = keyA(c);
    if (!rows.length) {
      rows.push([c]);
      continue;
    }
    const ref = keyA(rows[rows.length - 1][0]);
    if (Math.abs(ka - ref) <= tol) rows[rows.length - 1].push(c);
    else rows.push([c]);
  }

  return rows.map((r) => {
    const sorted = [...r].sort((x, y) => keyB(x) - keyB(y));
    return joinRowCells(sorted, horiz, gapMin);
  });
}

/**
 * @param {import("pdfjs-dist").PDFDocumentProxy} doc
 * @param {number} pageStart 1-based
 * @param {number} pageEnd 1-based inclusive
 */
async function extractSectionLines(doc, pageStart, pageEnd, opts) {
  const lines = [];
  for (let p = pageStart; p <= pageEnd; p++) {
    const page = await doc.getPage(p);
    const L = await extractOrderedLinesFromPage(page, opts);
    for (const ln of L) lines.push(ln);
  }
  return lines;
}

async function extractSectionText(doc, pageStart, pageEnd, opts) {
  const lines = await extractSectionLines(doc, pageStart, pageEnd, opts);
  return lines.join("\n");
}

/**
 * Tabel 2.28: pdf-parse mempertahankan urutan baca teks lebih stabil untuk baris multi-baris
 * pada dokumen ini; tetap membaca bytes PDF yang sama (bukan file dump / kurasi).
 */
async function extractTable228TextPdfParse(pdfPath = DEFAULT_PDF) {
  const pdfParse = getPdfParse();
  if (!pdfParse) {
    throw new Error("pdf-parse tidak terpasang. npm install pdf-parse (devDependency) di folder backend.");
  }
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  const full = data.text || "";
  const start = full.indexOf("Tabel 2.28");
  const end = full.indexOf("Tabel 2.29", start);
  if (start < 0 || end < 0) return "";
  /** Sertakan penanda akhir agar parseTable228 (indexOf di string yang sama) menemukan batas. */
  return full.slice(start, end + "Tabel 2.29".length);
}

/** Tabel 3.1: pdf-parse + penanda akhir (sama pola dengan 2.28). */
async function extractTable31TextPdfParse(pdfPath = DEFAULT_PDF) {
  const pdfParse = getPdfParse();
  if (!pdfParse) return "";
  const buf = fs.readFileSync(pdfPath);
  const data = await pdfParse(buf);
  const full = data.text || "";
  const start = full.indexOf("Tabel 3.1");
  const end = full.indexOf("3.3 STRATEGI", start);
  if (start < 0 || end < 0) return "";
  return full.slice(start, end + "3.3 STRATEGI".length);
}

let _pdfModule;
async function getPdfModule() {
  if (!_pdfModule) {
    _pdfModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
    _pdfModule.GlobalWorkerOptions.workerSrc = pathToFileURL(
      require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    ).href;
  }
  return _pdfModule;
}

async function loadRpjmdMalutPdfDocument(pdfPath = DEFAULT_PDF) {
  const pdf = await getPdfModule();
  const buf = fs.readFileSync(pdfPath);
  const data = buf.buffer instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  return pdf.getDocument({ data, useSystemFonts: true }).promise;
}

/**
 * Teks kanonik per blok tabel (sudah berisi penanda awal/akhir yang dibutuhkan parser teks).
 */
async function buildMalutRpjmdTableTextsFromPdf(doc, pdfPath = DEFAULT_PDF) {
  const m = TABLE_PAGE_RANGES;
  let t228PdfParse = "";
  let table228Method = "pdfjs-geometry-pages-68-76";
  try {
    t228PdfParse = await extractTable228TextPdfParse(pdfPath);
    if (t228PdfParse && t228PdfParse.includes("Tabel 2.28")) table228Method = "pdf-parse-from-pdf-bytes";
    else t228PdfParse = "";
  } catch {
    t228PdfParse = "";
  }
  let t31PdfParse = "";
  let table31Method = "pdfjs-geometry-pages-109-112";
  try {
    t31PdfParse = await extractTable31TextPdfParse(pdfPath);
    if (t31PdfParse && t31PdfParse.includes("Tabel 3.1")) table31Method = "pdf-parse-from-pdf-bytes";
    else t31PdfParse = "";
  } catch {
    t31PdfParse = "";
  }
  const [t229, t33, t42] = await Promise.all([
    extractSectionText(doc, m.table229.start, m.table229.end),
    extractSectionText(doc, m.table33.start, m.table33.end),
    extractSectionText(doc, m.table42.start, m.table42.end),
  ]);
  if (!t228PdfParse) {
    t228PdfParse = await extractSectionText(doc, m.table228.start, m.table228.end);
  }
  if (!t31PdfParse) {
    t31PdfParse = await extractSectionText(doc, m.table31.start, m.table31.end);
  }
  return {
    table228: t228PdfParse,
    table229: t229,
    table31: t31PdfParse,
    table33: t33,
    table42: t42,
    pageRanges: m,
    table228Method,
    table31Method,
  };
}

module.exports = {
  DEFAULT_PDF,
  TABLE_PAGE_RANGES,
  loadRpjmdMalutPdfDocument,
  extractOrderedLinesFromPage,
  extractSectionText,
  extractSectionLines,
  extractTable228TextPdfParse,
  extractTable31TextPdfParse,
  buildMalutRpjmdTableTextsFromPdf,
};
