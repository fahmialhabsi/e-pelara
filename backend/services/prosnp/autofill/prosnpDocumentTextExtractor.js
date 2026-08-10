'use strict';

/**
 * Spesifikasi 35 v3 §9 — Document Extraction Architecture. Teknik render
 * PDF->gambar (pdfjs-dist + canvas) + OCR (tesseract.js) REUSE dari
 * `backend/services/realisasiSipdPdfImportService.js` (dibuktikan read-only
 * di file itu, fungsi `renderPdfPageToPng`/pola `Tesseract.createWorker`) —
 * HANYA teknik rendering-nya, BUKAN parser tabel Rupiah/bounding-box-nya
 * (tidak relevan utk dokumen ProSN yang berbasis teks naratif, bukan tabel).
 */
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');
const db = require('../../../models');
const { extractDocxTables, resolveLabelValuePairs } = require('./docxStructuredExtractor');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TEXT_LAYER_MIN_CHARS = 40;
// §21/§28 corrective — PDF hasil scan multi-halaman kadang menyisakan SEDIKIT
// teks asli tertanam (mis. blok tanda tangan digital/stempel pada satu
// halaman) sehingga total karakter melewati TEXT_LAYER_MIN_CHARS flat padahal
// isi sesungguhnya adalah gambar tanpa text-layer (temuan biner nyata: PDF
// Pergub 15 halaman hanya mengandung 76 karakter total/±5 karakter per
// halaman). Ambang kini juga MENSYARATKAN kepadatan rata-rata per halaman,
// bukan hanya total absolut, sebelum menganggap text-layer valid.
const MIN_CHARS_PER_PAGE = 50;
const RENDER_SCALE = 3.0; // dokumen naratif ProSN tidak butuh presisi angka setinggi parser Rupiah SIPD

async function renderPdfPageToPng(doc, pageNumber, scale = RENDER_SCALE) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toBuffer('image/png');
}

/**
 * §29 corrective — kegagalan render/OCR pada SATU halaman tidak lagi
 * menggagalkan SELURUH ekstraksi (halaman lain yang sudah berhasil tetap
 * dipakai). Mengembalikan `failedPages` agar caller dapat menandai hasil
 * sebagai PARTIAL_EXTRACTION alih-alih EXTRACT_FAILED penuh.
 */
async function ocrPdfViaRender(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const worker = await Tesseract.createWorker('ind+eng');
  try {
    let combined = '';
    const failedPages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      try {
        const png = await renderPdfPageToPng(doc, i);
        // eslint-disable-next-line no-await-in-loop
        const { data } = await worker.recognize(png);
        combined += `${data.text || ''}\n`;
      } catch (_pageError) {
        failedPages.push(i);
      }
    }
    return { text: combined.trim(), totalPages: doc.numPages, failedPages };
  } finally {
    await worker.terminate();
  }
}

/**
 * §27/§8 corrective — dukungan DOCX MINIMAL via `mammoth` (satu-satunya
 * dependency baru yang diotorisasi CEA, sudah diaudit tidak ada alternatif
 * baca DOCX yang terpasang di repo). Hanya `extractRawText` (plain text) —
 * TIDAK ada parser bisnis kedua, TIDAK mengeksekusi macro/embedded
 * object/script apa pun (mammoth murni membaca XML docx sbg teks).
 */
async function extractDocxRawText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return { text: (result.value || '').trim(), warnings: (result.messages || []).map((m) => m.message) };
}

async function ocrImage(buffer) {
  const worker = await Tesseract.createWorker('ind+eng');
  try {
    const { data } = await worker.recognize(buffer);
    return (data.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Corrective "Evidence & Operasi Pangan Phase 0" (mandat §25) — inti logika
 * ekstraksi (§9 kontrak asli) diekstrak jadi fungsi murni TANPA DB write,
 * agar dapat dipakai ulang oleh modul lain (FoodOps) yang menyimpan file di
 * tabel BUKAN `prosnp_bukti_dukung`. TIDAK ADA perubahan logika/algoritma
 * satu baris pun — murni pemindahan body `extractTextFromBukti` ke sini,
 * dengan parameter `{ file_path, mime_type }` menggantikan objek `bukti`.
 * `extractTextFromBukti` di bawah menjadi wrapper tipis yang memanggil ini
 * lalu melakukan DB write yang SAMA PERSIS seperti sebelumnya — perilaku
 * ProSN 100% tidak berubah (dibuktikan regresi Fase3/Fase4/Fase5/Real
 * Evidence tetap hijau).
 */
async function extractTextFromFile({ file_path: filePath, mime_type: mimeType }) {
  const mime = mimeType;
  const warnings = [];
  let text = '';
  let method = null;
  let partialExtraction = false;
  let docxStructure = null;

  if (mime === 'application/pdf') {
    const buffer = fs.readFileSync(filePath);
    try {
      const parsed = await pdfParse(buffer);
      const trimmedLen = parsed.text ? parsed.text.trim().length : 0;
      const requiredMin = Math.max(TEXT_LAYER_MIN_CHARS, (parsed.numpages || 1) * MIN_CHARS_PER_PAGE);
      if (trimmedLen >= requiredMin) {
        text = parsed.text.trim();
        method = 'pdf_text_layer';
      }
    } catch (_) {
      // lanjut ke OCR — kegagalan pdf-parse murni bukan hard failure
    }
    if (!method) {
      try {
        const ocrResult = await ocrPdfViaRender(buffer);
        text = ocrResult.text;
        method = 'ocr_pdf_render';
        if (text) warnings.push('Ekstraksi PDF text-layer kosong, memakai OCR — periksa ulang hasil.');
        if (ocrResult.failedPages.length) {
          partialExtraction = true;
          warnings.push(`OCR gagal pada ${ocrResult.failedPages.length} dari ${ocrResult.totalPages} halaman (halaman: ${ocrResult.failedPages.join(', ')}) — hasil ekstraksi sebagian, periksa ulang manual.`);
        }
      } catch (error) {
        warnings.push(`OCR PDF gagal: ${error.message}`);
      }
    }
  } else if (mime === 'image/jpeg' || mime === 'image/png') {
    try {
      const buffer = fs.readFileSync(filePath);
      text = await ocrImage(buffer);
      method = 'ocr_image';
    } catch (error) {
      warnings.push(`OCR gambar gagal: ${error.message}`);
    }
  } else if (mime === DOCX_MIME) {
    try {
      const buffer = fs.readFileSync(filePath);
      const docxResult = await extractDocxRawText(buffer);
      if (docxResult.text) {
        text = docxResult.text;
        method = 'docx_raw_text';
        warnings.push(...docxResult.warnings);
      }
      // P1 corrective — dukungan structured table (mandat §8-§12): baca
      // `word/document.xml` langsung utk merekonstruksi hubungan sel
      // label->value yang HILANG saat mammoth.extractRawText meratakan
      // tabel jadi teks linear. Best-effort — kegagalan di sini TIDAK
      // menggagalkan ekstraksi teks dasar yang sudah berhasil di atas.
      // Pasangan label:value yang terbukti di-PREPEND (bukan append) ke
      // teks mentah mammoth — field extractor existing (regex label/value
      // generik, first-match-wins) HARUS menemukan versi bersih ini LEBIH
      // DULU daripada versi tabel yang sudah terlanjur rusak akibat
      // flattening pada teks asli (mis. "Pimpinan RapatAgenda Rapat"
      // tergabung tanpa pemisah) — append di akhir TERBUKTI tidak cukup
      // krn versi rusak yang lebih awal tetap menang. Heading dokumen asli
      // (dipakai classifier) tetap aman krn preamble pendek (~350 char)
      // jauh di bawah HEADING_WINDOW_CHARS (600) milik classifier.
      try {
        const structured = await extractDocxTables(buffer);
        if (structured.tables.length) {
          docxStructure = structured;
          const pairs = structured.tables.flatMap((t) => resolveLabelValuePairs(t));
          if (pairs.length) {
            const preamble = pairs.map((p) => `${p.label} : ${p.value}`).join('\n');
            text = text ? `${preamble}\n\n${text}` : preamble;
          }
        }
      } catch (_structError) {
        // ekstraksi struktur tabel murni best-effort, lihat komentar di atas.
      }
    } catch (error) {
      warnings.push(`Ekstraksi DOCX gagal: ${error.message}`);
    }
  } else {
    return { text: '', method: null, warnings: ['Ekstraksi otomatis belum mendukung format ini — isi manual.'], extractFailed: true, code: 'UNSUPPORTED_DOCUMENT' };
  }

  if (!text) {
    return { text: '', method, warnings: warnings.length ? warnings : ['Teks tidak terbaca sama sekali dari berkas ini.'], extractFailed: true, code: 'EXTRACT_FAILED' };
  }

  return { text, method, warnings, extractFailed: false, code: partialExtraction ? 'PARTIAL_EXTRACTION' : null, docx_structure: docxStructure };
}

/**
 * §9 kontrak asli ProSN: mengembalikan { text, method, warnings, extractFailed, code }
 * dan MENYIMPAN cache ke `ProsnBuktiDukung` bila berhasil (idempotent —
 * analisis ulang menimpa cache, tidak menambah baris). Perilaku IDENTIK
 * dengan sebelum refactor — hanya inti logika kini didelegasikan ke
 * `extractTextFromFile` (lihat komentar di atasnya).
 */
async function extractTextFromBukti(bukti, transaction) {
  const result = await extractTextFromFile({ file_path: bukti.file_path, mime_type: bukti.mime_type });
  if (result.extractFailed) return result;

  await db.ProsnBuktiDukung.update(
    { extracted_text_cache: result.text, extracted_at: new Date(), extraction_method: result.method },
    { where: { id: bukti.id }, transaction },
  );

  return result;
}

module.exports = { extractTextFromBukti, extractTextFromFile, TEXT_LAYER_MIN_CHARS };
