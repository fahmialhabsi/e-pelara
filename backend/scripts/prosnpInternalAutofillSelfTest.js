'use strict';

/**
 * Self-test murni (tanpa DB) untuk `prosnpInternalFieldAutofillService` —
 * mandat "Internal Field Autofill B.1.1-B.1.4". Menguji fungsi derive* (pure,
 * menerima objek `facts` sintetis) + resolusi kategori, sesuai konvensi repo
 * (`node scripts/xValidationSelfTest.js`, bukan Jest/Mocha — lihat CLAUDE.md).
 *
 * Tidak menyentuh database sama sekali — `previewInternalAutofill` (yang
 * membaca DB) TIDAK diuji di sini; cakupan pengujian dibatasi ke logika
 * derivasi murni + assembleSuggestion (resolusi kategori by kode).
 */

const assert = require('assert');
const {
  deriveB11, deriveB12, deriveB13, deriveB14, assembleSuggestion, resolveKategori,
} = require('../services/prosnp/prosnpInternalFieldAutofillService');

const KATEGORI_HAMBATAN = [
  { id: 101, kode: 'ANGGARAN', label: 'Keterlambatan/Keterbatasan Anggaran' },
  { id: 102, kode: 'SDM', label: 'Kendala SDM/Personel' },
  { id: 103, kode: 'SARANA_PRASARANA', label: 'Kendala Sarana dan Prasarana' },
  { id: 104, kode: 'DATA_INFORMASI', label: 'Data/Informasi Tidak Tersedia atau Tidak Akurat' },
  { id: 105, kode: 'KOORDINASI', label: 'Kendala Koordinasi Lintas Instansi' },
  { id: 106, kode: 'REGULASI', label: 'Kendala Regulasi/Kebijakan' },
  { id: 107, kode: 'BENCANA_FORCE_MAJEURE', label: 'Bencana/Force Majeure' },
  { id: 108, kode: 'LAINNYA', label: 'Lainnya' },
];
const KATEGORI_TINDAK_LANJUT = [
  { id: 201, kode: 'PERCEPATAN_ANGGARAN', label: 'Percepatan Realisasi Anggaran' },
  { id: 202, kode: 'PENGUATAN_SDM', label: 'Penambahan/Pelatihan SDM' },
  { id: 203, kode: 'PERBAIKAN_SARANA', label: 'Perbaikan/Penambahan Sarana dan Prasarana' },
  { id: 204, kode: 'PERBAIKAN_DATA', label: 'Perbaikan Pendataan/Validasi Data' },
  { id: 205, kode: 'KOORDINASI_STAKEHOLDER', label: 'Koordinasi dengan Pemangku Kepentingan Terkait' },
  { id: 206, kode: 'REVISI_TARGET', label: 'Revisi Target/Rencana Kerja' },
  { id: 207, kode: 'PENGAJUAN_KEBIJAKAN', label: 'Pengajuan Perubahan Regulasi/Kebijakan' },
  { id: 208, kode: 'LAINNYA', label: 'Lainnya' },
];

let pass = 0;
let fail = 0;
function check(label, fn) {
  try { fn(); console.log(`  OK   ${label}`); pass += 1; }
  catch (e) { console.error(`  FAIL ${label}\n       ${e.message}`); fail += 1; }
}

console.log('=== B.1.1 (penugasan_kdh) ===');
check('tidak ada surat -> hambatan grounded, kategori DATA_INFORMASI', () => {
  const draft = deriveB11({ tahun: 2027, semester: '1', surat: { total: 0, valid: 0 }, skorDetail: null });
  assert.strictEqual(draft.hambatanKode, 'DATA_INFORMASI');
  assert.ok(draft.hambatan && draft.hambatan.length > 0);
  assert.ok(!/2025|Januari|Februari/i.test(draft.hambatan), 'tidak boleh hardcode tahun/bulan spesifik');
});
check('surat ada tapi belum valid -> hambatan bukti belum valid', () => {
  const draft = deriveB11({ tahun: 2027, semester: '2', surat: { total: 3, valid: 0 }, skorDetail: null });
  assert.strictEqual(draft.hambatanKode, 'DATA_INFORMASI');
  assert.match(draft.hambatan, /bukti/i);
});
check('bulan_kosong dari skor_detail -> kategori LAINNYA/LAINNYA (bukan DATA_INFORMASI/PERBAIKAN_DATA, terlalu spesifik)', () => {
  const draft = deriveB11({ tahun: 2025, semester: '1', surat: { total: 1, valid: 1 }, skorDetail: { bulan_kosong: ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06'] } });
  assert.strictEqual(draft.hambatanKode, 'LAINNYA');
  assert.strictEqual(draft.tindakLanjutKode, 'LAINNYA');
  assert.strictEqual(draft.hambatanConfidence, 'HIGH');
  assert.ok(!/2025-02|Februari/i.test(draft.hambatan), 'narasi tidak boleh hardcode bulan literal dari data');
});
check('bulan_kosong dari skor_detail -> narasi Hambatan/Tindak Lanjut TIDAK berubah oleh koreksi kategori', () => {
  const draft = deriveB11({ tahun: 2025, semester: '1', surat: { total: 1, valid: 1 }, skorDetail: { bulan_kosong: ['2025-02'] } });
  assert.strictEqual(draft.hambatan, 'Frekuensi penerbitan surat penugasan belum memenuhi cakupan bulanan periode penilaian; masih terdapat bulan tanpa surat penugasan yang sah.');
  assert.strictEqual(draft.tindakLanjut, 'Menelusuri dan melengkapi dokumen surat penugasan yang sah untuk bulan yang belum terdokumentasi, serta memastikan penerbitan/pengarsipan surat berikutnya dilakukan secara berkala sesuai kebutuhan periode.');
});
check('cakupan lengkap tanpa skor_detail gap -> tidak menebak hambatan (null)', () => {
  const draft = deriveB11({ tahun: 2027, semester: '1', surat: { total: 6, valid: 6 }, skorDetail: null });
  assert.strictEqual(draft.hambatan, null);
  assert.strictEqual(draft.hambatanKode, null);
  assert.strictEqual(draft.hambatanConfidence, 'NONE');
});
check('cakupan lengkap dgn skor_detail bulan_kosong=[] -> tidak menebak hambatan (null)', () => {
  const draft = deriveB11({ tahun: 2027, semester: '1', surat: { total: 6, valid: 6 }, skorDetail: { bulan_kosong: [] } });
  assert.strictEqual(draft.hambatan, null);
});

console.log('=== B.1.2 (koordinasi_forkopimda) ===');
check('tidak ada rapat -> hambatan kategori KOORDINASI', () => {
  const draft = deriveB12({ tahun: 2027, semester: '1', rapat: { total: 0, lengkap: 0 }, skorDetail: null });
  assert.strictEqual(draft.hambatanKode, 'KOORDINASI');
});
check('rapat ada, evidence tidak lengkap -> hambatan kategori DATA_INFORMASI', () => {
  const draft = deriveB12({ tahun: 2027, semester: '1', rapat: { total: 2, lengkap: 0 }, skorDetail: null });
  assert.strictEqual(draft.hambatanKode, 'DATA_INFORMASI');
});
check('rapat lengkap tanpa gap -> tidak menebak hambatan', () => {
  const draft = deriveB12({ tahun: 2027, semester: '1', rapat: { total: 4, lengkap: 4 }, skorDetail: null });
  assert.strictEqual(draft.hambatan, null);
});

console.log('=== B.1.3 (cadangan_pangan_beras) ===');
check('target belum ada -> hambatan "target belum tersedia", BUKAN diperlakukan sbg 0', () => {
  const draft = deriveB13({ tahun: 2027, target: { ada: false }, transaksi: { total: 0 }, mapping: { ada: false } });
  assert.match(draft.hambatan, /target.*belum tersedia|belum ditetapkan/i);
  assert.strictEqual(draft.hambatanKode, 'DATA_INFORMASI');
});
check('target ada, transaksi kosong -> hambatan transaksi belum ada', () => {
  const draft = deriveB13({ tahun: 2027, target: { ada: true }, transaksi: { total: 0 }, mapping: { ada: true } });
  assert.match(draft.hambatan, /transaksi\/mutasi stok/i);
});
check('mapping NOT_FOUND -> hambatan mapping belum tersedia, bukan dikonversi ke 0', () => {
  const draft = deriveB13({ tahun: 2027, target: { ada: true }, transaksi: { total: 5 }, mapping: { ada: false } });
  assert.match(draft.hambatan, /mapping/i);
  assert.ok(!/=\s*0\b/.test(draft.hambatan), 'NOT_FOUND tidak boleh muncul sbg angka 0 pada narasi');
});
check('target+transaksi+mapping lengkap -> tidak menebak hambatan', () => {
  const draft = deriveB13({ tahun: 2027, target: { ada: true }, transaksi: { total: 5 }, mapping: { ada: true } });
  assert.strictEqual(draft.hambatan, null);
});

console.log('=== B.1.4 (inovasi_dan_perkada) ===');
check('tidak ada inovasi -> hambatan grounded, tidak menuduh "kurang kreativitas"', () => {
  const draft = deriveB14({ tahun: 2027, inovasi: { total: 0, adaPerkada: false, adaBuktiImplementasi: false, adaHasilTerukur: false } });
  assert.strictEqual(draft.hambatanKode, 'DATA_INFORMASI');
  assert.ok(!/kreativitas|budaya inovasi/i.test(draft.hambatan));
});
check('inovasi ada, Perkada belum ada -> hambatan dokumen Perkada', () => {
  const draft = deriveB14({ tahun: 2027, inovasi: { total: 1, adaPerkada: false, adaBuktiImplementasi: false, adaHasilTerukur: false } });
  assert.match(draft.hambatan, /Perkada/);
});
check('inovasi + evidence lengkap -> tidak menebak hambatan', () => {
  const draft = deriveB14({ tahun: 2027, inovasi: { total: 1, adaPerkada: true, adaBuktiImplementasi: true, adaHasilTerukur: true } });
  assert.strictEqual(draft.hambatan, null);
});

console.log('=== Resolusi kategori (by kode, bukan id hardcode) ===');
check('resolveKategori menemukan by kode', () => {
  const r = resolveKategori(KATEGORI_HAMBATAN, 'DATA_INFORMASI');
  assert.strictEqual(r.id, 104);
  assert.strictEqual(r.label, 'Data/Informasi Tidak Tersedia atau Tidak Akurat');
});
check('resolveKategori kode null -> id null (bukan 0/undefined)', () => {
  const r = resolveKategori(KATEGORI_HAMBATAN, null);
  assert.strictEqual(r.id, null);
});
check('resolveKategori kode tidak ditemukan di master -> id null, tidak crash', () => {
  const r = resolveKategori(KATEGORI_HAMBATAN, 'KODE_TIDAK_ADA');
  assert.strictEqual(r.id, null);
});

console.log('=== assembleSuggestion — kontrak lengkap ===');
check('kontrak sesuai spesifikasi (authority, generated_at, confidence, reasons)', () => {
  const draft = deriveB11({ tahun: 2025, semester: '1', surat: { total: 1, valid: 1 }, skorDetail: { bulan_kosong: ['2025-02'] } });
  const suggestion = assembleSuggestion(draft, KATEGORI_HAMBATAN, KATEGORI_TINDAK_LANJUT);
  assert.strictEqual(suggestion.authority, 'INTERNAL_SUGGESTION');
  assert.strictEqual(suggestion.kategori_hambatan_id, 108); // LAINNYA — koreksi kategori bulan_kosong B.1.1
  assert.strictEqual(suggestion.kategori_tindak_lanjut_id, 208); // LAINNYA
  assert.ok(Array.isArray(suggestion.reasons.hambatan) && suggestion.reasons.hambatan.length > 0);
  assert.ok(['HIGH', 'MEDIUM', 'LOW', 'NONE'].includes(suggestion.confidence.hambatan));
  assert.ok(typeof suggestion.generated_at === 'string' && !Number.isNaN(Date.parse(suggestion.generated_at)));
});
check('kategori tidak ditemukan di master -> suggestion tetap valid dgn id null (bukan crash)', () => {
  const draft = deriveB11({ tahun: 2025, semester: '1', surat: { total: 0, valid: 0 }, skorDetail: null });
  const suggestion = assembleSuggestion(draft, [], []);
  assert.strictEqual(suggestion.kategori_hambatan_id, null);
  assert.ok(suggestion.hambatan, 'narasi tetap ada walau kategori tidak ter-resolve');
});

console.log(`\n=== HASIL: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
