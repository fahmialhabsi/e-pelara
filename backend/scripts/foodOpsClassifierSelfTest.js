'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Self-test classifier module-owned
 * (mandat §60) — golden text sintetis, TANPA OCR (murni unit test regex/zone
 * logic), TIDAK menyentuh `prosnpDocumentClassifier.js` sama sekali.
 *
 * Jalankan: node scripts/foodOpsClassifierSelfTest.js
 */
const assert = require('assert');
const { classifyFoodOpsDocument } = require('../services/foodOperations/foodOpsClassifier');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

test('PERATURAN GUBERNUR -> peraturan_gubernur, HIGH', () => {
  const r = classifyFoodOpsDocument('PERATURAN GUBERNUR MALUKU UTARA\nNOMOR 10 TAHUN 2025\nTENTANG CADANGAN PANGAN\nDENGAN RAHMAT TUHAN YANG MAHA ESA');
  assert.strictEqual(r.document_type, 'peraturan_gubernur');
  assert.strictEqual(r.confidence, 'HIGH');
  assert.strictEqual(r.requires_review, false);
});

test('PERATURAN DAERAH (dgn Persetujuan Bersama DPRD) -> peraturan_daerah, HIGH', () => {
  const r = classifyFoodOpsDocument('PERATURAN DAERAH PROVINSI MALUKU UTARA\nNOMOR 4 TAHUN 2023\nDENGAN RAHMAT TUHAN YANG MAHA ESA\nMenimbang: a. bahwa perlu persetujuan bersama DPRD');
  assert.strictEqual(r.document_type, 'peraturan_daerah');
  assert.strictEqual(r.confidence, 'HIGH');
});

test('Pergub yang MENYEBUT Perda pada judul TENTANG tetap peraturan_gubernur (bukan tertukar)', () => {
  const r = classifyFoodOpsDocument('PERATURAN GUBERNUR MALUKU UTARA\nNOMOR 5 TAHUN 2025\nTENTANG PELAKSANAAN PERATURAN DAERAH NOMOR 4 TAHUN 2023');
  assert.strictEqual(r.document_type, 'peraturan_gubernur');
});

test('KEPUTUSAN GUBERNUR -> keputusan_gubernur, HIGH', () => {
  const r = classifyFoodOpsDocument('KEPUTUSAN GUBERNUR MALUKU UTARA\nNOMOR 188/2025\nTENTANG PENETAPAN CADANGAN PANGAN');
  assert.strictEqual(r.document_type, 'keputusan_gubernur');
  assert.strictEqual(r.confidence, 'HIGH');
});

test('SURAT KEPUTUSAN -> surat_keputusan, HIGH', () => {
  const r = classifyFoodOpsDocument('SURAT KEPUTUSAN KEPALA DINAS PANGAN\nNOMOR 01/SK/2025\nMEMUTUSKAN\nMENETAPKAN');
  assert.strictEqual(r.document_type, 'surat_keputusan');
});

test('SURAT TUGAS -> surat_tugas, HIGH', () => {
  const r = classifyFoodOpsDocument('SURAT TUGAS\nNOMOR 001/ST/2025\nMENUGASKAN');
  assert.strictEqual(r.document_type, 'surat_tugas');
});

test('UNDANGAN -> undangan, HIGH', () => {
  const r = classifyFoodOpsDocument('SURAT UNDANGAN\nMengharap kehadiran Bapak/Ibu pada Rapat Koordinasi\nHari/Tanggal: Senin, 10 Februari 2025');
  assert.strictEqual(r.document_type, 'undangan');
});

test('DAFTAR HADIR -> daftar_hadir, HIGH', () => {
  const r = classifyFoodOpsDocument('DAFTAR HADIR\nRAPAT KOORDINASI FORKOPIMDA\nTanda Tangan');
  assert.strictEqual(r.document_type, 'daftar_hadir');
});

test('NOTULEN -> notulen, HIGH', () => {
  const r = classifyFoodOpsDocument('NOTULEN RAPAT KOORDINASI\nHari/Tanggal: Senin, 10 Februari 2025\nDAFTAR HADIR terlampir');
  assert.strictEqual(r.document_type, 'notulen');
});

test('BERITA ACARA -> berita_acara, HIGH', () => {
  const r = classifyFoodOpsDocument('BERITA ACARA SERAH TERIMA\nPada hari ini telah dilaksanakan serah terima barang');
  assert.strictEqual(r.document_type, 'berita_acara');
});

test('LAPORAN -> laporan, HIGH', () => {
  const r = classifyFoodOpsDocument('LAPORAN PELAKSANAAN KEGIATAN CADANGAN PANGAN TAHUN 2025');
  assert.strictEqual(r.document_type, 'laporan');
});

test('Unknown -> other, NONE, requires_review true (tidak memalsukan kepastian)', () => {
  const r = classifyFoodOpsDocument('Ini adalah dokumen acak tanpa pola apa pun yang dikenali sistem.');
  assert.strictEqual(r.document_type, 'other');
  assert.strictEqual(r.confidence, 'NONE');
  assert.strictEqual(r.requires_review, true);
});

test('Output ternormalisasi memuat seluruh field wajib mandat §27', () => {
  const r = classifyFoodOpsDocument('NOTULEN RAPAT');
  for (const field of ['document_type', 'confidence', 'reason', 'method', 'requires_review', 'identity_evidence', 'reference_mentions']) {
    assert.ok(Object.prototype.hasOwnProperty.call(r, field), `field wajib hilang: ${field}`);
  }
});

console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
