'use strict';

/**
 * Self-test murni (tanpa DB) untuk 4 rule engine ProSN B.1.1-B.1.4.
 * Corrective pass: signature diperbarui (evidence-aware via callback),
 * ditambah kasus kalender wajib (28/30/31 hari, tahun kabisat, lintas bulan).
 * Jalankan: node scripts/prosnpRuleEngineSelfTest.js
 */
const assert = require('assert');
const { hitungB11, semesterEvaluationWindow } = require('../services/prosnp/ruleEngine/prosnpB11RuleEngine');
const { hitungB12 } = require('../services/prosnp/ruleEngine/prosnpB12RuleEngine');
const { hitungB13, hitungNeraca } = require('../services/prosnp/ruleEngine/prosnpB13RuleEngine');
const { hitungB14 } = require('../services/prosnp/ruleEngine/prosnpB14RuleEngine');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  OK  ${name}`);
  } catch (error) {
    fail++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${error.message}`);
  }
}

// Corrective Pass "B.1.1 Semester Evaluation Window" (Kepmendagri
// 700.1.1.4-180/2026) — engine SEKARANG menuntut `tahun`+`semester` (window
// kanonik 6 bulan tetap: Semester I=Jan-Jun, Semester II=Jul-Des), TIDAK lagi
// menerima periode custom `tanggal_mulai/tanggal_tenggat` bebas. Fixture lama
// yang memakai window 2-3 bulan buatan (di luar semester real) DIADAPTASI ke
// window semester 6-bulan penuh — assertion skor/bisnis ASLI dipertahankan
// persis, hanya jumlah bulan pengisi & angka turunannya (jumlah_surat_sah dkk)
// disesuaikan mengikuti window 6 bulan yang sekarang wajib.
// B11_SEMESTER*_2025 (bentuk {tahun,semester}) KHUSUS dipakai hitungB11 saja.
// `SEMESTER1_2025` ({tanggal_mulai,tanggal_tenggat}) di bawah TETAP dipertahankan
// UTUH krn dipakai bersama oleh test B.1.2/B.1.3/B.1.4 (hitungB12 dkk TIDAK
// diubah pada corrective pass ini — §31 mandat, protected).
const B11_SEMESTER1_2025 = { tahun: 2025, semester: 1 };
const B11_SEMESTER2_2025 = { tahun: 2025, semester: 2 };
const semuaValid = () => true;
const semuaInvalid = () => false;

console.log('=== B.1.1 — Penugasan KDH (evidence-aware, kalender bulan, semester canonical window) ===');
test('setiap bulan ada surat sah (evidence valid) -> skor 2,00', () => {
  const surat = ['2025-01-05', '2025-02-04', '2025-03-06', '2025-04-05', '2025-05-05', '2025-06-04']
    .map((t, i) => ({ id: i + 1, nomor_surat: `A/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
  assert.strictEqual(hasil.detail.interval_bulan_terpanjang, 0);
});
test('satu bulan sela (interval 1 bulan kosong, April hilang) -> skor 1,00 [FIXTURE DIADAPTASI: dulu periode 3-bulan custom, kini Semester I 2025 penuh]', () => {
  const surat = ['2025-01-05', '2025-02-05', '2025-03-05', '2025-05-05', '2025-06-05']
    .map((t, i) => ({ id: i + 1, nomor_surat: `B/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 1.00, hasil.alasan);
  assert.deepStrictEqual(hasil.detail.bulan_kosong, ['2025-04']);
  assert.strictEqual(hasil.detail.interval_bulan_terpanjang, 1);
});
test('dua bulan sela berturut-turut (Feb-Mar hilang) -> skor 0 [FIXTURE DIADAPTASI: kini Semester I 2025 penuh]', () => {
  const surat = ['2025-01-05', '2025-04-05', '2025-05-05', '2025-06-05']
    .map((t, i) => ({ id: i + 1, nomor_surat: `C/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 0.00, hasil.alasan);
  assert.strictEqual(hasil.detail.interval_bulan_terpanjang, 2);
  assert.deepStrictEqual(hasil.detail.bulan_kosong, ['2025-02', '2025-03']);
});
test('surat tanpa bukti valid TIDAK dihitung sah (evidence gate)', () => {
  const surat = [{ id: 1, nomor_surat: 'D/1', tanggal_surat: '2025-01-05', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaInvalid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
  assert.strictEqual(hasil.skor, 0);
});
test('surat di luar periode tidak dihitung', () => {
  const surat = [{ id: 1, nomor_surat: 'E/1', tanggal_surat: '2024-12-01', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
});
test('duplikat nomor surat terdeteksi', () => {
  const surat = [{ id: 1, nomor_surat: '005/2025', tanggal_surat: '2025-01-05', cakupan_pengadaan: true }, { id: 2, nomor_surat: '005/2025', tanggal_surat: '2025-02-05', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_kemungkinan_duplikat, 1);
});
test('kalender: bulan Februari 28 hari (bukan kabisat) tetap terhitung 1 bulan penuh [FIXTURE DIADAPTASI: kini Semester I 2025 penuh]', () => {
  const surat = ['2025-01-15', '2025-02-15', '2025-03-15', '2025-04-15', '2025-05-15', '2025-06-15']
    .map((t, i) => ({ id: i + 1, nomor_surat: `F/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
  assert.ok(hasil.detail.bulan_terpenuhi.includes('2025-02'), 'Feb 28 hari (non-kabisat) harus tetap dikenali sbg bulan 2025-02 penuh.');
});
test('kalender: tahun kabisat 2028 Februari 29 hari tetap 1 bulan penuh [FIXTURE DIADAPTASI: kini Semester I 2028 penuh]', () => {
  const surat = ['2028-01-10', '2028-02-29', '2028-03-01', '2028-04-10', '2028-05-10', '2028-06-10']
    .map((t, i) => ({ id: i + 1, nomor_surat: `G/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, { tahun: 2028, semester: 1 }, semuaValid);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
  assert.deepStrictEqual(hasil.detail.bulan_terpenuhi, ['2028-01', '2028-02', '2028-03', '2028-04', '2028-05', '2028-06']);
});
test('kalender: surat akhir bulan (31 Jan) ke awal bulan berikutnya (1 Feb) tetap 2 bulan berbeda terpenuhi [FIXTURE DIADAPTASI: kini Semester I 2025 penuh]', () => {
  const surat = ['2025-01-31', '2025-02-01', '2025-03-05', '2025-04-05', '2025-05-05', '2025-06-05']
    .map((t, i) => ({ id: i + 1, nomor_surat: `H/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 6);
  assert.ok(hasil.detail.bulan_terpenuhi.includes('2025-01') && hasil.detail.bulan_terpenuhi.includes('2025-02'), '31 Jan dan 1 Feb harus terhitung sbg 2 bulan kalender BERBEDA (2025-01 dan 2025-02).');
});
test('bulan 30 hari (April) surat di tanggal 30 tetap terhitung bulan itu [FIXTURE DIADAPTASI: kini Semester I 2025 penuh]', () => {
  const surat = ['2025-01-05', '2025-02-05', '2025-03-05', '2025-04-30', '2025-05-01', '2025-06-05']
    .map((t, i) => ({ id: i + 1, nomor_surat: `I/${i}`, tanggal_surat: t, cakupan_pengadaan: true }));
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
  assert.ok(hasil.detail.bulan_terpenuhi.includes('2025-04') && hasil.detail.bulan_terpenuhi.includes('2025-05'), '30 Apr dan 1 Mei harus terhitung sbg 2 bulan kalender BERBEDA.');
});

console.log('=== B.1.1 — Semester Evaluation Window (Corrective Pass, Kepmendagri 700.1.1.4-180/2026) ===');
test('semesterEvaluationWindow: Semester I 2025 -> Jan-Jun SAJA (bukan Jan-Jul)', () => {
  const w = semesterEvaluationWindow({ tahun: 2025, semester: 1 });
  assert.deepStrictEqual(w.months, ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
});
test('semesterEvaluationWindow: Semester II 2025 -> Jul-Des SAJA (Januari tahun berikutnya TIDAK masuk)', () => {
  const w = semesterEvaluationWindow({ tahun: 2025, semester: 2 });
  assert.deepStrictEqual(w.months, ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']);
});
test('DEADLINE-DECOUPLING: tanggal_tenggat BERBEDA (2025-07-01 vs 2025-07-31) pada Semester I SAMA -> window evaluasi IDENTIK', () => {
  const wA = semesterEvaluationWindow({ tahun: 2025, semester: 1, tanggal_tenggat: '2025-07-01' });
  const wB = semesterEvaluationWindow({ tahun: 2025, semester: 1, tanggal_tenggat: '2025-07-31' });
  assert.deepStrictEqual(wA.months, wB.months);
});
test('REPRODUKSI DEFECT PRODUKSI: periode dgn tanggal_tenggat=2025-07-31 (SENGAJA dipertahankan) -> Juli TETAP TIDAK masuk window', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const w = semesterEvaluationWindow(periodeProduksi);
  assert.ok(!w.months.includes('2025-07'), 'Juli TIDAK BOLEH masuk window Semester I meski tanggal_tenggat periode = 31 Juli.');
  assert.deepStrictEqual(w.months, ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
});
test('PRODUCTION-LIKE B.1.1: 1 surat sah Januari, periode tanggal_tenggat=2025-07-31 -> covered=[Jan], empty=[Feb..Jun], gap=5, skor=0, Juli TIDAK disebut', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const surat = [{ id: 92, nomor_surat: '500.1/518/G', tanggal_surat: '2025-01-30', cakupan_pengadaan: true, cakupan_pengelolaan: true, cakupan_penyaluran: true }];
  const hasil = hitungB11(surat, periodeProduksi, semuaValid);
  assert.deepStrictEqual(hasil.detail.bulan_terpenuhi, ['2025-01']);
  assert.deepStrictEqual(hasil.detail.bulan_kosong, ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
  assert.strictEqual(hasil.detail.interval_bulan_terpanjang, 5);
  assert.strictEqual(hasil.skor, 0.00);
  assert.ok(!hasil.alasan.includes('2025-07'), 'alasan TIDAK BOLEH menyebut 2025-07.');
  assert.ok(!hasil.detail.bulan_kosong.includes('2025-07'), 'bulan_kosong TIDAK BOLEH memuat 2025-07.');
});
test('BOUNDARY: surat 2025-07-01 (Semester II) TIDAK terhitung pada Semester I meski evidence valid', () => {
  const surat = [{ id: 1, nomor_surat: 'X/1', tanggal_surat: '2025-07-01', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
  assert.strictEqual(hasil.detail.bulan_terpenuhi.length, 0);
  assert.ok(!hasil.detail.bulan_kosong.includes('2025-07'), '2025-07 di luar window Semester I, tidak boleh muncul sbg bulan kosong ataupun terpenuhi.');
});
test('BOUNDARY: surat 2025-06-30 (Semester I) TIDAK terhitung pada Semester II meski evidence valid', () => {
  const surat = [{ id: 1, nomor_surat: 'Y/1', tanggal_surat: '2025-06-30', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER2_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
  assert.strictEqual(hasil.detail.bulan_terpenuhi.length, 0);
});
test('TIMEZONE FIX: surat 2025-06-30 DITERIMA di Semester I ITU SENDIRI (hari terakhir semester, bukan ditolak "Di luar rentang periode")', () => {
  const surat = [{ id: 1, nomor_surat: 'Z/1', tanggal_surat: '2025-06-30', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 1, 'hari terakhir Semester I harus sah, bukan ditolak krn timezone.');
  assert.deepStrictEqual(hasil.detail.bulan_terpenuhi, ['2025-06']);
  assert.strictEqual(hasil.detail.surat_ditolak.length, 0);
});
test('TIMEZONE FIX: surat 2025-07-01 TETAP ditolak dari Semester I ("Di luar rentang periode") — bukan efek samping normalisasi', () => {
  const surat = [{ id: 1, nomor_surat: 'Z/2', tanggal_surat: '2025-07-01', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER1_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
  assert.ok(hasil.detail.surat_ditolak[0].alasan.includes('Di luar rentang periode'));
});
test('TIMEZONE FIX: surat 2025-12-31 DITERIMA di Semester II ITU SENDIRI (hari terakhir semester)', () => {
  const surat = [{ id: 1, nomor_surat: 'Z/3', tanggal_surat: '2025-12-31', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER2_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 1, '31 Desember harus sah di Semester II, bukan ditolak krn timezone.');
  assert.deepStrictEqual(hasil.detail.bulan_terpenuhi, ['2025-12']);
  assert.strictEqual(hasil.detail.surat_ditolak.length, 0);
});
test('TIMEZONE FIX: surat 2026-01-01 TETAP ditolak dari Semester II ("Di luar rentang periode")', () => {
  const surat = [{ id: 1, nomor_surat: 'Z/4', tanggal_surat: '2026-01-01', cakupan_pengadaan: true }];
  const hasil = hitungB11(surat, B11_SEMESTER2_2025, semuaValid);
  assert.strictEqual(hasil.detail.jumlah_surat_sah, 0);
  assert.ok(hasil.detail.surat_ditolak[0].alasan.includes('Di luar rentang periode'));
});
test('TIMEZONE FIX: month window tidak berubah — Semester I tetap Jan-Jun, Semester II tetap Jul-Des', () => {
  const w1 = semesterEvaluationWindow(B11_SEMESTER1_2025);
  assert.deepStrictEqual(w1.months, ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
  const w2 = semesterEvaluationWindow(B11_SEMESTER2_2025);
  assert.deepStrictEqual(w2.months, ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']);
});
test('INVALID SEMESTER: semester=3 -> error eksplisit, TIDAK fallback diam-diam ke tanggal_tenggat/Jan-Des', () => {
  assert.throws(() => hitungB11([], { tahun: 2025, semester: 3 }, semuaValid), /semester tidak valid/i);
});
test('INVALID SEMESTER: semester=null -> error eksplisit', () => {
  assert.throws(() => hitungB11([], { tahun: 2025, semester: null }, semuaValid), /semester tidak valid/i);
});
test('INVALID TAHUN: tahun=null -> error eksplisit, TIDAK fallback ke tahun sistem berjalan', () => {
  assert.throws(() => hitungB11([], { tahun: null, semester: 1 }, semuaValid), /tahun tidak valid/i);
});

console.log('=== B.1.2 — Koordinasi Forkopimda (evidence per-rapat) ===');
// Corrective pass "B.1.2 Semester Evaluation Window": hitungB12 kini menurunkan
// cakupan bulan dari tahun+semester (reuse semesterEvaluationWindow B.1.1),
// BUKAN lagi tanggal_mulai/tanggal_tenggat — fixture di bawah ditambah
// tahun/semester (mekanis saja, tanggal_mulai/tanggal_tenggat tetap
// dipertahankan agar tidak mengubah bentuk fixture, meski kini diabaikan).
const SEMESTER1_2025 = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-06-30' };
const evidenceLengkap = () => ({ lengkap: true, kurang: [] });
const evidenceKurang = () => ({ lengkap: false, kurang: ['notulen'] });
test('2 rapat sah setiap bulan (evidence lengkap per rapat) -> skor 2,00', () => {
  const rapat = [];
  for (let bulan = 1; bulan <= 6; bulan++) {
    rapat.push({ id: bulan * 10 + 1, tanggal_rapat: `2025-0${bulan}-05`, is_forkopimda: true, topik_pengadaan: true });
    rapat.push({ id: bulan * 10 + 2, tanggal_rapat: `2025-0${bulan}-20`, is_forkopimda: true, topik_penyaluran: true });
  }
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidenceLengkap);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
});
test('1 rapat sah setiap bulan -> skor 1,00', () => {
  const rapat = [];
  for (let bulan = 1; bulan <= 6; bulan++) rapat.push({ id: bulan, tanggal_rapat: `2025-0${bulan}-05`, is_forkopimda: true, topik_pengelolaan: true });
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidenceLengkap);
  assert.strictEqual(hasil.skor, 1.00, hasil.alasan);
});
test('rapat internal (bukan Forkopimda) tidak dihitung', () => {
  const rapat = [{ id: 1, tanggal_rapat: '2025-01-05', is_forkopimda: false, topik_pengadaan: true }];
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 0);
});
test('rapat dengan evidence per-rapat TIDAK lengkap (mis. notulen belum valid) tidak dihitung sah', () => {
  const rapat = [{ id: 1, tanggal_rapat: '2025-01-05', is_forkopimda: true, topik_pengadaan: true }];
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidenceKurang);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 0);
  assert.ok(hasil.detail.rapat_tidak_sah[0].alasan.some((a) => a.includes('notulen')));
});
test('satu undangan/notulen TIDAK boleh melegitimasi rapat lain — evidence dicek per rapat_id berbeda', () => {
  // rapat #1 lengkap, rapat #2 TIDAK (evidence berbeda per id, bukan look-up generik)
  const evidencePerRapat = (id) => (id === 1 ? { lengkap: true, kurang: [] } : { lengkap: false, kurang: ['undangan', 'daftar_hadir', 'notulen'] });
  const rapat = [
    { id: 1, tanggal_rapat: '2025-01-05', is_forkopimda: true, topik_pengadaan: true },
    { id: 2, tanggal_rapat: '2025-01-20', is_forkopimda: true, topik_pengadaan: true },
  ];
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidencePerRapat);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 1, 'hanya rapat #1 yang sah, #2 harus tetap ditolak meski #1 lengkap');
});
test('rapat tanpa topik ProSN/CBP tidak dihitung', () => {
  const rapat = [{ id: 1, tanggal_rapat: '2025-01-05', is_forkopimda: true }];
  const hasil = hitungB12(rapat, SEMESTER1_2025, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 0);
});

console.log('=== B.1.2 — Semester Evaluation Window (corrective pass) ===');
test('SEMESTER I: window Jan-Jun, Juli TIDAK muncul walau tanggal_tenggat=2025-07-31', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const hasil = hitungB12([], periodeProduksi, evidenceLengkap);
  const bulan = Object.keys(hasil.detail.hasil_faktual);
  assert.deepStrictEqual(bulan, ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06']);
  assert.ok(!bulan.includes('2025-07'), 'Juli TIDAK BOLEH masuk window Semester I.');
});
test('SEMESTER II: window Jul-Des, Desember penuh masuk, Januari tahun berikutnya TIDAK muncul', () => {
  const periodeProduksi = { tahun: 2025, semester: 2, tanggal_mulai: '2025-07-01', tanggal_tenggat: '2025-12-01' };
  const hasil = hitungB12([], periodeProduksi, evidenceLengkap);
  const bulan = Object.keys(hasil.detail.hasil_faktual);
  assert.deepStrictEqual(bulan, ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']);
  assert.ok(bulan.includes('2025-12'), 'Desember harus tetap masuk walau tanggal_tenggat=2025-12-01 (awal Desember).');
  assert.ok(!bulan.includes('2026-01'), 'Januari tahun berikutnya TIDAK BOLEH masuk window Semester II.');
});
test('DEADLINE-DECOUPLING: tanggal_tenggat berbeda (2025-07-01 vs 2025-07-31) pada Semester I SAMA -> window hitungB12 IDENTIK', () => {
  const a = hitungB12([], { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-01' }, evidenceLengkap);
  const b = hitungB12([], { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' }, evidenceLengkap);
  assert.deepStrictEqual(Object.keys(a.detail.hasil_faktual), Object.keys(b.detail.hasil_faktual));
});
test('BATAS Jun30/Jul01 Semester I: rapat 30 Juni temporally IN, rapat 1 Juli temporally OUT ("Di luar rentang periode")', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const dalam = hitungB12([{ id: 1, tanggal_rapat: '2025-06-30', is_forkopimda: true, topik_pengadaan: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(dalam.detail.jumlah_rapat_sah, 1, '30 Juni harus dihitung sah (temporal IN).');
  const luar = hitungB12([{ id: 2, tanggal_rapat: '2025-07-01', is_forkopimda: true, topik_pengadaan: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(luar.detail.jumlah_rapat_sah, 0, '1 Juli harus ditolak (temporal OUT dari Semester I).');
  assert.ok(luar.detail.rapat_tidak_sah[0].alasan.includes('Di luar rentang periode'));
});
test('BATAS Des31/Jan01 Semester II: rapat 31 Des temporally IN, rapat 1 Jan tahun berikutnya temporally OUT', () => {
  const periodeProduksi = { tahun: 2025, semester: 2, tanggal_mulai: '2025-07-01', tanggal_tenggat: '2025-12-01' };
  const dalam = hitungB12([{ id: 1, tanggal_rapat: '2025-12-31', is_forkopimda: true, topik_pengadaan: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(dalam.detail.jumlah_rapat_sah, 1, '31 Desember harus dihitung sah (temporal IN Semester II).');
  const luar = hitungB12([{ id: 2, tanggal_rapat: '2026-01-01', is_forkopimda: true, topik_pengadaan: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(luar.detail.jumlah_rapat_sah, 0, '1 Januari tahun berikutnya harus ditolak (temporal OUT dari Semester II).');
  assert.ok(luar.detail.rapat_tidak_sah[0].alasan.includes('Di luar rentang periode'));
});
test('PRODUCTION-LIKE: rapat 20 Juni 2025 (spt entity 146) temporally eligible utk Semester I, TIDAK ditolak "Di luar rentang periode"', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const hasil = hitungB12([{ id: 146, tanggal_rapat: '2025-06-20', is_forkopimda: true, topik_pengadaan: true, topik_pengelolaan: true, topik_penyaluran: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 1, '20 Juni harus lolos temporal eligibility (bukan ditolak krn tanggal).');
  assert.strictEqual(hasil.detail.rapat_tidak_sah.length, 0);
});
test('PRODUCTION-LIKE: rapat 20 Agustus 2025 (spt entity 143) TETAP di luar Semester I ("Di luar rentang periode")', () => {
  const periodeProduksi = { tahun: 2025, semester: 1, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' };
  const hasil = hitungB12([{ id: 143, tanggal_rapat: '2025-08-20', is_forkopimda: true, topik_pengadaan: true }], periodeProduksi, evidenceLengkap);
  assert.strictEqual(hasil.detail.jumlah_rapat_sah, 0);
  assert.ok(hasil.detail.rapat_tidak_sah[0].alasan.includes('Di luar rentang periode'));
});
test('INVALID SEMESTER B.1.2: semester tidak valid -> error eksplisit, TIDAK fallback diam-diam ke tanggal_mulai/tanggal_tenggat', () => {
  assert.throws(() => hitungB12([], { tahun: 2025, semester: 3, tanggal_mulai: '2025-01-01', tanggal_tenggat: '2025-07-31' }, evidenceLengkap));
});

console.log('=== B.1.3 — Neraca & Capaian Cadangan Pangan Beras ===');
test('target nol/tidak ada ditolak (skor 0, tidak menghitung capaian)', () => {
  const hasil = hitungB13([], null, '2025-06-30', true, [], null);
  assert.strictEqual(hasil.skor, 0);
  assert.strictEqual(hasil.detail.capaian_persen, null);
});
test('target TANPA bukti KEPUTUSAN_KDH valid -> skor 0 meski angka tersedia', () => {
  const transaksi = [{ jenis_transaksi: 'saldo_awal', volume: 1000 }];
  const hasil = hitungB13(transaksi, { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', false, [], null);
  assert.strictEqual(hasil.skor, 0);
  assert.ok(/KEPUTUSAN_KDH/.test(hasil.alasan));
});
test('formula saldo akhir benar', () => {
  const transaksi = [
    { jenis_transaksi: 'saldo_awal', volume: 100 }, { jenis_transaksi: 'pengadaan', volume: 50 },
    { jenis_transaksi: 'penerimaan_lain_sah', volume: 5 }, { jenis_transaksi: 'koreksi_masuk', volume: 2 },
    { jenis_transaksi: 'penyaluran', volume: 30 }, { jenis_transaksi: 'susut_rusak', volume: 3 }, { jenis_transaksi: 'koreksi_keluar', volume: 1 },
  ];
  const neraca = hitungNeraca(transaksi);
  assert.strictEqual(neraca.saldo_akhir, 123);
});
test('capaian >= 100% menghasilkan skor 2.50', () => {
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 1000 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, [], null);
  assert.strictEqual(hasil.skor, 2.50);
});
test('capaian 90-99% menghasilkan skor 1.25', () => {
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 950 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, [], null);
  assert.strictEqual(hasil.skor, 1.25);
});
test('capaian 50-89% menghasilkan skor 0.25', () => {
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 600 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, [], null);
  assert.strictEqual(hasil.skor, 0.25);
});
test('capaian < 50% menghasilkan skor 0', () => {
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 100 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, [], null);
  assert.strictEqual(hasil.skor, 0.00);
});
test('transaksi dikecualikan (excluded) tetap tercatat di detail dgn alasan, tidak menghentikan perhitungan', () => {
  const excluded = [{ id: 99, jenis_transaksi: 'pengadaan', tanggal: '2025-03-01', volume: 500, excluded_reason: 'Belum ada dokumen pengadaan valid.' }];
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 100 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, excluded, null);
  assert.deepStrictEqual(hasil.detail.transaksi_dikecualikan, excluded);
});
test('rekonsiliasi perlu_rekonsiliasi tercermin di detail', () => {
  const rekon = { status: 'perlu_rekonsiliasi', selisih: 12.5 };
  const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 100 }], { target_ton: 1000, nomor_keputusan: 'X' }, '2025-06-30', true, [], rekon);
  assert.strictEqual(hasil.detail.rekonsiliasi.status, 'perlu_rekonsiliasi');
});

console.log('=== B.1.4 — Inovasi dan Perkada (evidence-aware) ===');
test('inovasi diterapkan + bukti implementasi + Perkada + dokumen => skor 2.00', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'X', relevansi_pengadaan: true, status_implementasi: 'diterapkan_penuh', status_perkada: 'ditetapkan' }];
  const hasil = hitungB14(inovasi, () => true, () => true);
  assert.strictEqual(hasil.skor, 2.00, hasil.alasan);
});
test('inovasi diterapkan + bukti implementasi, tanpa Perkada => skor 1.00', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'Y', relevansi_pengelolaan: true, status_implementasi: 'diterapkan_sebagian', status_perkada: 'belum_ada' }];
  const hasil = hitungB14(inovasi, () => false, () => true);
  assert.strictEqual(hasil.skor, 1.00);
});
test('diterapkan TAPI belum ada BUKTI_IMPLEMENTASI valid => skor 0 (status saja tidak cukup)', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'Y2', relevansi_pengelolaan: true, status_implementasi: 'diterapkan_penuh', status_perkada: 'belum_ada' }];
  const hasil = hitungB14(inovasi, () => false, () => false);
  assert.strictEqual(hasil.skor, 0.00, hasil.alasan);
});
test('gagasan belum diterapkan => skor 0', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'Z', relevansi_penyaluran: true, status_implementasi: 'gagasan', status_perkada: 'belum_ada' }];
  const hasil = hitungB14(inovasi, () => false, () => true);
  assert.strictEqual(hasil.skor, 0.00);
});
test('Perkada ditetapkan TANPA dokumen tidak menghasilkan skor penuh', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'W', relevansi_pengadaan: true, status_implementasi: 'diterapkan_penuh', status_perkada: 'ditetapkan' }];
  const hasil = hitungB14(inovasi, () => false, () => true);
  assert.strictEqual(hasil.skor, 1.00, 'Perkada tanpa dokumen harus dibatasi skor 1.00, bukan 2.00');
});
test('inovasi tidak relevan dengan objek ProSN ditolak (skor 0)', () => {
  const inovasi = [{ id: 1, nama_inovasi: 'V', relevansi_pengadaan: false, relevansi_pengelolaan: false, relevansi_penyaluran: false, status_implementasi: 'diterapkan_penuh', status_perkada: 'ditetapkan' }];
  const hasil = hitungB14(inovasi, () => true, () => true);
  assert.strictEqual(hasil.skor, 0.00);
});

console.log(`\n=== HASIL: ${pass} lulus, ${fail} gagal ===`);
process.exit(fail > 0 ? 1 : 0);
