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
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');
const db = require('../../../models');

const TEXT_LAYER_MIN_CHARS = 40;
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

async function ocrPdfViaRender(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const worker = await Tesseract.createWorker('ind+eng');
  try {
    let combined = '';
    for (let i = 1; i <= doc.numPages; i += 1) {
      const png = await renderPdfPageToPng(doc, i);
      // eslint-disable-next-line no-await-in-loop
      const { data } = await worker.recognize(png);
      combined += `${data.text || ''}\n`;
    }
    return combined.trim();
  } finally {
    await worker.terminate();
  }
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
 * §9 kontrak: mengembalikan { text, method, warnings, extractFailed, code }
 * dan MENYIMPAN cache ke `ProsnBuktiDukung` bila berhasil (idempotent —
 * analisis ulang menimpa cache, tidak menambah baris).
 */
async function extractTextFromBukti(bukti, transaction) {
  const mime = bukti.mime_type;
  const warnings = [];
  let text = '';
  let method = null;

  if (mime === 'application/pdf') {
    const buffer = fs.readFileSync(bukti.file_path);
    try {
      const parsed = await pdfParse(buffer);
      if (parsed.text && parsed.text.trim().length >= TEXT_LAYER_MIN_CHARS) {
        text = parsed.text.trim();
        method = 'pdf_text_layer';
      }
    } catch (_) {
      // lanjut ke OCR — kegagalan pdf-parse murni bukan hard failure
    }
    if (!method) {
      try {
        text = await ocrPdfViaRender(buffer);
        method = 'ocr_pdf_render';
        if (text) warnings.push('Ekstraksi PDF text-layer kosong, memakai OCR — periksa ulang hasil.');
      } catch (error) {
        warnings.push(`OCR PDF gagal: ${error.message}`);
      }
    }
  } else if (mime === 'image/jpeg' || mime === 'image/png') {
    try {
      const buffer = fs.readFileSync(bukti.file_path);
      text = await ocrImage(buffer);
      method = 'ocr_image';
    } catch (error) {
      warnings.push(`OCR gambar gagal: ${error.message}`);
    }
  } else {
    return { text: '', method: null, warnings: ['Ekstraksi otomatis belum mendukung format ini — isi manual.'], extractFailed: true, code: 'UNSUPPORTED_DOCUMENT' };
  }

  if (!text) {
    return { text: '', method, warnings: warnings.length ? warnings : ['Teks tidak terbaca sama sekali dari berkas ini.'], extractFailed: true, code: 'EXTRACT_FAILED' };
  }

  await db.ProsnBuktiDukung.update(
    { extracted_text_cache: text, extracted_at: new Date(), extraction_method: method },
    { where: { id: bukti.id }, transaction },
  );

  return { text, method, warnings, extractFailed: false, code: null };
}

module.exports = { extractTextFromBukti, TEXT_LAYER_MIN_CHARS };
