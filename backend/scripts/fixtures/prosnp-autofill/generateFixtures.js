'use strict';

/**
 * Generator fixture Test E (Spesifikasi 35 v3 §36) — 4 berkas kecil:
 * 1. text-layer.pdf          — PDF dgn lapisan teks asli (pdfkit .text()).
 * 2. scanned-no-text-layer.pdf — PDF HANYA berisi gambar (render teks->canvas->
 *    PNG->pdfkit .image()), NOL operator showText — memaksa jalur OCR §9 langkah 2.
 * 3. image-ocr.png           — gambar biasa berisi teks (jalur OCR gambar langsung).
 * 4. unreadable.pdf          — byte acak berekstensi .pdf (bukan PDF valid sama sekali).
 *
 * Jalankan: node scripts/fixtures/prosnp-autofill/generateFixtures.js
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { createCanvas } = require('canvas');

const DIR = __dirname;

const SURAT_TUGAS_TEXT = [
  'SURAT TUGAS',
  'NOMOR : 090/123/DISPANGAN/2025',
  '',
  'Menimbang: bahwa dalam rangka pelaksanaan tugas pengadaan dan pengelolaan',
  'gabah/beras serta penyaluran Cadangan Beras Pemerintah, perlu menugaskan',
  'pejabat sebagai berikut.',
  '',
  'MENUGASKAN',
  'Kesatu: melaksanakan koordinasi pengadaan dan penyaluran cadangan pangan.',
  '',
  'Ditetapkan di Sofifi pada tanggal 05 Januari 2025.',
  '',
  'KEPALA DINAS PANGAN PROVINSI MALUKU UTARA',
].join('\n');

function buatPdfTextLayer() {
  return new Promise((resolve, reject) => {
    const outPath = path.join(DIR, 'text-layer.pdf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.fontSize(11).text(SURAT_TUGAS_TEXT);
    doc.end();
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

function renderTextToPngBuffer(text) {
  const width = 900;
  const lines = text.split('\n');
  const height = 60 + lines.length * 30;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'black';
  ctx.font = '24px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 30, 40 + i * 30));
  return canvas.toBuffer('image/png');
}

function buatPdfScannedTanpaTextLayer() {
  return new Promise((resolve, reject) => {
    const outPath = path.join(DIR, 'scanned-no-text-layer.pdf');
    const png = renderTextToPngBuffer(SURAT_TUGAS_TEXT);
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    doc.image(png, 20, 20, { width: 550 }); // HANYA .image(), tidak ada .text() -> nol text layer
    doc.end();
    stream.on('finish', () => resolve(outPath));
    stream.on('error', reject);
  });
}

function buatImagePng() {
  const outPath = path.join(DIR, 'image-ocr.png');
  const png = renderTextToPngBuffer('NOTULEN RAPAT KOORDINASI FORKOPIMDA\nTanggal: 10 Februari 2025\nDihadiri unsur GUBERNUR dan DANDIM.');
  fs.writeFileSync(outPath, png);
  return outPath;
}

function buatUnreadablePdf() {
  const outPath = path.join(DIR, 'unreadable.pdf');
  fs.writeFileSync(outPath, Buffer.from('BUKAN-PDF-SAMA-SEKALI-' + 'x'.repeat(50)));
  return outPath;
}

(async () => {
  await buatPdfTextLayer();
  await buatPdfScannedTanpaTextLayer();
  buatImagePng();
  buatUnreadablePdf();
  console.log('Fixture Test E berhasil dibuat di', DIR);
  fs.readdirSync(DIR).filter((f) => f !== 'generateFixtures.js').forEach((f) => console.log(' -', f));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
