'use strict';

/**
 * Spesifikasi 35 v3 — Fase 3 self-test: Test E (Document Extraction) + Test S
 * (Document Type Regulatory Semantics) + smoke-test 4 field extractor.
 * Jalankan: node scripts/prosnpAutofillFase3SelfTest.js
 * (Peringatan: OCR via tesseract.js — bagian Test E realistis makan waktu
 * puluhan detik, ini NORMAL, bukan hang.)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const { extractTextFromBukti } = require('../services/prosnp/autofill/prosnpDocumentTextExtractor');
const { classifyDocument } = require('../services/prosnp/autofill/prosnpDocumentClassifier');
const { extractCadanganTargetFields } = require('../services/prosnp/autofill/extractors/cadanganTargetFieldExtractor');
const { extractInovasiFields } = require('../services/prosnp/autofill/extractors/inovasiFieldExtractor');
const { extractSuratPenugasanFields } = require('../services/prosnp/autofill/extractors/suratPenugasanFieldExtractor');
const { extractRapatForkopimdaFields } = require('../services/prosnp/autofill/extractors/rapatForkopimdaFieldExtractor');

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'prosnp-autofill');
let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

function fakeBuktiRow(id, filePath, mimeType) {
  return { id, file_path: filePath, mime_type: mimeType };
}

(async () => {
  // === TEST E — Document Extraction ===
  console.log('=== TEST E: Document Extraction (4 fixture) ===');

  const DUMMY_TENANT_BUKTI_ID = -1; // ID palsu, TIDAK ada baris DB nyata — update cache akan no-op (0 rows), aman
  await test('TEST E.1 — PDF dgn text layer -> extraction_method=pdf_text_layer, teks memuat NOMOR', async () => {
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'text-layer.pdf'), 'application/pdf');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.extractFailed, false);
    assert.strictEqual(result.method, 'pdf_text_layer');
    assert.ok(/NOMOR/i.test(result.text), 'Teks hasil ekstraksi harus memuat "NOMOR".');
  });

  await test('TEST E.2 — PDF scan tanpa text layer -> fallback OCR (ocr_pdf_render)', async () => {
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'scanned-no-text-layer.pdf'), 'application/pdf');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.method, 'ocr_pdf_render', `Method salah: ${result.method}`);
    assert.strictEqual(result.extractFailed, false);
    console.log(`      (OCR text sample: "${result.text.slice(0, 60).replace(/\n/g, ' ')}...")`);
  }, 120000);

  await test('TEST E.3 — Gambar (PNG) -> OCR langsung (ocr_image)', async () => {
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'image-ocr.png'), 'image/png');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.method, 'ocr_image');
    assert.strictEqual(result.extractFailed, false);
  });

  await test('TEST E.4 — Berkas rusak/bukan PDF valid -> EXTRACT_FAILED, tidak menggagalkan proses (partial degradation)', async () => {
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'unreadable.pdf'), 'application/pdf');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.extractFailed, true);
    assert.strictEqual(result.code, 'EXTRACT_FAILED');
  });

  await test('TEST E.5 — MIME tidak didukung (xlsx) -> UNSUPPORTED_DOCUMENT', async () => {
    // DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
    // TIDAK LAGI unsupported sejak Corrective Pass "Binary E2E Final
    // Verification" (§8 mandat — dukungan DOCX minimal via mammoth) — lihat
    // TEST E.6 di bawah utk assert jalur DOCX. xlsx dipakai di sini krn tetap
    // benar2 belum didukung, menjaga kontrak "mime benar2 asing -> UNSUPPORTED_DOCUMENT".
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'unreadable.pdf'), 'application/vnd.ms-excel');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.extractFailed, true);
    assert.strictEqual(result.code, 'UNSUPPORTED_DOCUMENT');
  });

  await test('TEST E.6 — DOCX rusak/bukan DOCX valid -> EXTRACT_FAILED (bukan hasil palsu)', async () => {
    const bukti = fakeBuktiRow(DUMMY_TENANT_BUKTI_ID, path.join(FIXTURE_DIR, 'unreadable.pdf'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const result = await extractTextFromBukti(bukti, null);
    assert.strictEqual(result.extractFailed, true);
    assert.strictEqual(result.code, 'EXTRACT_FAILED');
  });

  // === TEST S — Document Type Regulatory Semantics ===
  console.log('\n=== TEST S: Document Type Regulatory Semantics ===');

  await test('TEST S.1 — Heading "PERATURAN GUBERNUR" -> peraturan_gubernur, BUKAN keputusan_gubernur', async () => {
    const text = 'PERATURAN GUBERNUR MALUKU UTARA\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nGUBERNUR MALUKU UTARA,';
    const hasil = classifyDocument(text);
    assert.strictEqual(hasil.jenis_dokumen, 'peraturan_gubernur');
  });

  await test('TEST S.2 — Heading "KEPUTUSAN GUBERNUR" -> keputusan_gubernur, BUKAN peraturan_gubernur', async () => {
    const text = 'KEPUTUSAN GUBERNUR MALUKU UTARA\nMEMUTUSKAN\nMenetapkan target cadangan pangan.';
    const hasil = classifyDocument(text);
    assert.strictEqual(hasil.jenis_dokumen, 'keputusan_gubernur');
  });

  await test('TEST S.3 — Heading "PERATURAN DAERAH" + DPRD -> peraturan_daerah, TIDAK PERNAH peraturan_gubernur', async () => {
    const text = 'PERATURAN DAERAH PROVINSI MALUKU UTARA\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nDENGAN PERSETUJUAN BERSAMA DPRD PROVINSI MALUKU UTARA';
    const hasil = classifyDocument(text);
    assert.strictEqual(hasil.jenis_dokumen, 'peraturan_daerah');
  });

  await test('TEST S.4 — GUBERNUR ambigu (tanpa kata KEPUTUSAN/PERATURAN sama sekali) -> confidence NONE, requires_review', async () => {
    const text = 'GUBERNUR MALUKU UTARA\n(scan buruk, judul dokumen tidak terbaca)';
    const hasil = classifyDocument(text);
    assert.strictEqual(hasil.confidence, 'NONE');
    assert.strictEqual(hasil.requires_review, true);
  });

  await test('TEST S.5 — cadanganTargetFieldExtractor: dokumen peraturan_gubernur TIDAK PERNAH mengisi nomor/tanggal keputusan B.1.3', async () => {
    const text = 'PERATURAN GUBERNUR MALUKU UTARA\nNOMOR : 5/PERGUB/2025\n05 Januari 2025\ntarget 1.000 ton';
    const fields = extractCadanganTargetFields(text, 'peraturan_gubernur');
    const nomor = fields.find((f) => f.field_key === 'nomor_keputusan');
    const tanggal = fields.find((f) => f.field_key === 'tanggal_keputusan');
    assert.strictEqual(nomor.value, null, 'nomor_keputusan HARUS NOT_FOUND bila sumber peraturan_gubernur.');
    assert.strictEqual(nomor.source_type, 'NOT_FOUND');
    assert.strictEqual(tanggal.value, null);
  });

  await test('TEST S.6 — cadanganTargetFieldExtractor: dokumen keputusan_gubernur BERHASIL mengisi nomor/tanggal keputusan', async () => {
    const text = 'KEPUTUSAN GUBERNUR MALUKU UTARA\nNOMOR : 5/KPTS/2025\nditetapkan tanggal 05 Januari 2025\ntarget 1.000 ton cadangan beras';
    const fields = extractCadanganTargetFields(text, 'keputusan_gubernur');
    const nomor = fields.find((f) => f.field_key === 'nomor_keputusan');
    assert.strictEqual(nomor.value, '5/KPTS/2025');
    assert.strictEqual(nomor.source_type, 'DOCUMENT_EXTRACTED');
  });

  await test('TEST S.7 — inovasiFieldExtractor: dokumen peraturan_daerah TIDAK PERNAH mengisi Status Perkada = terpenuhi', async () => {
    const text = 'PERATURAN DAERAH PROVINSI MALUKU UTARA\nDENGAN PERSETUJUAN BERSAMA DPRD';
    const fields = extractInovasiFields(text, 'peraturan_daerah');
    const status = fields.find((f) => f.field_key === 'status_perkada');
    assert.strictEqual(status.value, null, 'status_perkada HARUS NOT_FOUND bila sumber peraturan_daerah.');
    assert.ok(/Peraturan Daerah, bukan Peraturan Gubernur/.test(status.reason));
  });

  await test('TEST S.8 — inovasiFieldExtractor: dokumen peraturan_gubernur BERHASIL mengisi Status Perkada HIGH', async () => {
    const text = 'PERATURAN GUBERNUR MALUKU UTARA\nNOMOR : 7/PERGUB/2025\nditetapkan 10 Maret 2025';
    const fields = extractInovasiFields(text, 'peraturan_gubernur');
    const status = fields.find((f) => f.field_key === 'status_perkada');
    assert.strictEqual(status.value, 'ditetapkan');
    assert.strictEqual(status.confidence, 'HIGH');
  });

  await test('TEST S.9 — inovasiFieldExtractor: relevansi_* TIDAK PERNAH auto-checked (requires_review selalu true)', async () => {
    const fields = extractInovasiFields('inovasi ini relevan dengan pengadaan dan pengelolaan', 'peraturan_gubernur');
    const relevansi = fields.filter((f) => f.field_key.startsWith('relevansi_'));
    assert.ok(relevansi.length >= 3);
    relevansi.forEach((f) => assert.strictEqual(f.requires_review, true, `${f.field_key} harus requires_review=true.`));
  });

  // === Smoke test field extractor lain ===
  console.log('\n=== Smoke test field extractor B.1.1/B.1.2 ===');
  await test('suratPenugasanFieldExtractor mengekstrak nomor_surat & tanggal_surat dgn benar', async () => {
    const text = 'SURAT TUGAS\nNOMOR : 090/123/DISPANGAN/2025\nditandatangani pada 05 Januari 2025 untuk pengadaan.';
    const fields = extractSuratPenugasanFields(text);
    const nomor = fields.find((f) => f.field_key === 'nomor_surat');
    const tanggal = fields.find((f) => f.field_key === 'tanggal_surat');
    assert.strictEqual(nomor.value, '090/123/DISPANGAN/2025');
    assert.strictEqual(tanggal.value, '2025-01-05');
  });

  await test('rapatForkopimdaFieldExtractor: unsur_forkopimda_hadir SELALU LOW + requires_review walau match', async () => {
    const text = 'RAPAT KOORDINASI FORKOPIMDA\nDihadiri GUBERNUR dan DANDIM.\ntanggal 10 Februari 2025';
    const fields = extractRapatForkopimdaFields(text);
    const unsur = fields.find((f) => f.field_key === 'unsur_forkopimda_hadir');
    assert.strictEqual(unsur.confidence, 'LOW');
    assert.strictEqual(unsur.requires_review, true);
  });

  await test('rapatForkopimdaFieldExtractor: sinyal Forkopimda eksplisit -> is_forkopimda=true MEDIUM, requires_review, independen dari unsur_forkopimda_hadir', async () => {
    const text = 'RAPAT KOORDINASI FORKOPIMDA\nDihadiri GUBERNUR dan DANDIM.\ntanggal 10 Februari 2025';
    const fields = extractRapatForkopimdaFields(text);
    const isForkopimda = fields.find((f) => f.field_key === 'is_forkopimda');
    const jenisForum = fields.find((f) => f.field_key === 'jenis_forum');
    assert.strictEqual(isForkopimda.value, true);
    assert.strictEqual(isForkopimda.confidence, 'MEDIUM');
    assert.strictEqual(isForkopimda.requires_review, true);
    assert.strictEqual(jenisForum.value, 'Forkopimda', 'jenis_forum harus tetap ada berdampingan dgn is_forkopimda (bukan digantikan).');
  });

  await test('rapatForkopimdaFieldExtractor: TIDAK ada sinyal Forkopimda -> is_forkopimda=null (BUKAN false yg dipalsukan sbg fakta)', async () => {
    const text = 'Rapat internal biasa membahas administrasi kantor, tanggal 10 Februari 2025.';
    const fields = extractRapatForkopimdaFields(text);
    const isForkopimda = fields.find((f) => f.field_key === 'is_forkopimda');
    assert.strictEqual(isForkopimda.value, null);
    assert.strictEqual(isForkopimda.confidence, 'NONE');
    assert.strictEqual(isForkopimda.source_type, 'NOT_FOUND');
  });

  console.log(`\n=== HASIL TEST FASE 3 (E + S + smoke B.1.1/B.1.2): ${pass} lulus, ${fail} gagal ===`);
  process.exit(fail > 0 ? 1 : 0);
})().catch((error) => {
  console.error('FATAL ERROR:', error.stack || error.message);
  process.exit(1);
});
