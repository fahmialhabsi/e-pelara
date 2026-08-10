'use strict';

/**
 * Self-test corrective "B.1.3 DPA/DPPA Authoritative Target Source".
 * Cakupan: parser target/satuan aman, exact-code mapping + precedence
 * active-version deterministik, validasi source-aware (Kepgub vs DPA/DPPA),
 * anti-spoof, dan scoring invariance (provenance tidak memengaruhi skor).
 *
 * Fixture DPA memakai tahun fiktif '2098' (TIDAK PERNAH menyentuh baris nyata
 * tahun 2025/2026), kode_sub_kegiatan EXACT 2.09.03.1.02.0005 (kode nyata,
 * whitelist nomenklatur B.1.3 nyata dipakai apa adanya — TIDAK dimodifikasi)
 * dan beberapa kode "mirip tapi berbeda" untuk membuktikan tidak ada fuzzy
 * matching. Semua baris DPA + target uji DIHAPUS di blok finally.
 *
 * Jalankan: node scripts/prosnpB13DpaOperasionalTargetSelfTest.js
 */
const assert = require('assert');
const db = require('./../models');
db.sequelize.options.logging = false;
const dpaSourceService = require('../services/prosnp/prosnpDpaSourceService');
const cadanganService = require('../services/prosnp/prosnpCadanganPanganService');
const { hitungB13 } = require('../services/prosnp/ruleEngine/prosnpB13RuleEngine');

const TENANT_ID = 1;
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2098';
const KODE_EXACT = dpaSourceService.B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN;
const PERIODE_ID = 1;

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

const cleanup = { dpaIds: [], targetIds: [] };
async function buatDpaUji(opdId, kodeSubKegiatan, { target = null, indikator = null, version = 1, isActiveVersion = true } = {}) {
  const dpa = await db.Dpa.create({
    tahun: TAHUN_UJI, periode_id: PERIODE_ID, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'Pengelolaan Cadangan Pangan Pemerintah Provinsi (UJI)',
    opd_id: opdId, kode_sub_kegiatan: kodeSubKegiatan, indikator, target, anggaran: 0, approval_status: 'DRAFT', needs_recall: false, realisasi: 0,
    version, is_active_version: isActiveVersion, jenis_dokumen: 'DPA',
  });
  cleanup.dpaIds.push(dpa.id);
  return dpa;
}

(async () => {
  let fatalError = null;
  try {
    // === PARSER (mandat §5/§19) ===
    console.log('=== Target Parser Aman ===');
    await test('A — raw="65", satuan whitelist Ton -> target_ton 65', () => {
      const r = dpaSourceService.parseTargetTonDpa('65', 'Ton');
      assert.strictEqual(r.target_ton, 65); assert.strictEqual(r.requires_review, false);
    });
    await test('B — raw="65 Ton" -> 65', () => {
      const r = dpaSourceService.parseTargetTonDpa('65 Ton', 'Ton');
      assert.strictEqual(r.target_ton, 65); assert.strictEqual(r.requires_review, false);
    });
    await test('C — raw="65 ton" (huruf kecil) -> 65', () => {
      const r = dpaSourceService.parseTargetTonDpa('65 ton', 'Ton');
      assert.strictEqual(r.target_ton, 65);
    });
    await test('D — raw="65 TON" (kapital) -> 65', () => {
      const r = dpaSourceService.parseTargetTonDpa('65 TON', 'Ton');
      assert.strictEqual(r.target_ton, 65);
    });
    await test('E — raw="65 Kg" (satuan bukan Ton) -> TIDAK silent-convert, requires_review', () => {
      const r = dpaSourceService.parseTargetTonDpa('65 Kg', 'Ton');
      assert.strictEqual(r.target_ton, null); assert.strictEqual(r.requires_review, true); assert.strictEqual(r.parsing_status, 'AMBIGUOUS_UNIT');
    });
    await test('F — raw="65" TANPA satuan whitelist (satuan tidak diketahui) -> ambiguous, requires_review', () => {
      const r = dpaSourceService.parseTargetTonDpa('65', null);
      assert.strictEqual(r.target_ton, null); assert.strictEqual(r.requires_review, true);
    });
    await test('G — raw kosong -> safe failure (EMPTY)', () => {
      const r = dpaSourceService.parseTargetTonDpa('', 'Ton');
      assert.strictEqual(r.target_ton, null); assert.strictEqual(r.parsing_status, 'EMPTY'); assert.strictEqual(r.requires_review, true);
    });
    await test('H — raw="abc" (numerik invalid) -> safe failure', () => {
      const r = dpaSourceService.parseTargetTonDpa('abc', 'Ton');
      assert.strictEqual(r.target_ton, null); assert.strictEqual(r.requires_review, true);
    });
    await test('I — decimal "65,5" dgn satuan whitelist Ton -> 65.5', () => {
      const r = dpaSourceService.parseTargetTonDpa('65,5', 'Ton');
      assert.strictEqual(r.target_ton, 65.5);
    });
    await test('J — angka <= 0 -> INVALID_NUMERIC, requires_review', () => {
      const r = dpaSourceService.parseTargetTonDpa('0', 'Ton');
      assert.strictEqual(r.target_ton, null); assert.strictEqual(r.parsing_status, 'INVALID_NUMERIC');
    });

    // === SOURCE MAPPING — exact code + active-version precedence (mandat §20) ===
    console.log('\n=== Exact Mapping + Active-Version Precedence ===');
    await test('1/8 — exact code, satu versi aktif, target "65 Ton" -> authoritative, target_ton 65', async () => {
      await buatDpaUji(9101, KODE_EXACT, { target: '65 Ton' });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9101);
      assert.strictEqual(r.ditemukan, true);
      assert.strictEqual(r.requires_review, false);
      assert.strictEqual(r.target_ton, 65);
      assert.strictEqual(r.kode_sub_kegiatan, KODE_EXACT);
    });
    await test('2/3/4 — kode BERBEDA (mirip nama) di OPD ini -> NOT eligible utk B.1.3 (bukan exact code)', async () => {
      await buatDpaUji(9102, '2.09.03.1.02.0006', { target: '999 Ton' });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9102);
      assert.strictEqual(r.ditemukan, false);
      assert.strictEqual(r.requires_review, true);
    });
    await test('5 — exact code tetapi tahun salah -> NOT selected (isolasi antar tahun)', async () => {
      const r = await dpaSourceService.resolveOperationalTargetB13('2097', 9101); // tahun 2097 tidak ada fixture
      assert.strictEqual(r.ditemukan, false);
    });
    await test('6 — exact code tetapi OPD salah -> NOT selected', async () => {
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 999999);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('7 — exact code, HANYA versi TIDAK aktif -> NOT authoritative', async () => {
      await buatDpaUji(9103, KODE_EXACT, { target: '70 Ton', version: 1, isActiveVersion: false });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9103);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('8 — exact code, DPA lama TIDAK aktif + DPPA aktif terbaru -> authoritative = DPPA (versi lebih baru)', async () => {
      await buatDpaUji(9104, KODE_EXACT, { target: '50 Ton', version: 1, isActiveVersion: false });
      await buatDpaUji(9104, KODE_EXACT, { target: '80 Ton', version: 2, isActiveVersion: true });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9104);
      assert.strictEqual(r.ditemukan, true);
      assert.strictEqual(r.target_ton, 80);
      assert.strictEqual(r.version, 2);
    });
    await test('9 — duplikat ACTIVE (anomali data) -> requires_review, BUKAN silent arbitrary selection', async () => {
      await buatDpaUji(9105, KODE_EXACT, { target: '60 Ton', version: 1, isActiveVersion: true });
      await buatDpaUji(9105, KODE_EXACT, { target: '90 Ton', version: 2, isActiveVersion: true });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9105);
      assert.strictEqual(r.ditemukan, false);
      assert.strictEqual(r.requires_review, true);
      assert.ok(Array.isArray(r.kandidat_ambigu) && r.kandidat_ambigu.length === 2);
    });
    await test('target dengan satuan ambigu (bukan Ton) -> requires_review, tidak authoritative', async () => {
      await buatDpaUji(9106, KODE_EXACT, { target: '65 Kg' });
      const r = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9106);
      assert.strictEqual(r.ditemukan, true); // baris DPA ditemukan...
      assert.strictEqual(r.requires_review, true); // ...tapi target TIDAK authoritative krn satuan ambigu
      assert.strictEqual(r.target_ton, null);
    });

    // === VALIDASI SOURCE-AWARE + ANTI-SPOOF (mandat §10/§21) ===
    console.log('\n=== Validasi Source-Aware (createTarget) ===');
    await test('Kepgub — nomor+tanggal+target lengkap -> PASS, semantik existing tetap berlaku', async () => {
      const t = await cadanganService.createTarget({
        tahun_target: TAHUN_UJI, nomor_keputusan: 'UJI/001/2098', tanggal_keputusan: '2098-01-01', target_ton: 65,
      }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65);
      assert.strictEqual(t.source_type, 'manual');
    });
    await test('Kepgub tanpa nomor -> FAIL (semantik existing tidak berubah)', async () => {
      await assert.rejects(() => cadanganService.createTarget({ tahun_target: TAHUN_UJI, tanggal_keputusan: '2098-01-01', target_ton: 65 }, ACTOR_OPERATOR, TENANT_ID));
    });
    // OPD 107 = Dinas Pangan (OPD REAL, wajib krn prosnp_cadangan_target.source_opd_id
    // ber-FK ke opd_penanggung_jawab) — tahun tetap fiktif '2098' shg TIDAK bersinggungan
    // dgn baris DPA nyata 2025/2026 milik OPD yang sama.
    const dpaUntukTargetNyata = await buatDpaUji(107, KODE_EXACT, { target: '65 Ton' });
    await test('DPA/DPPA — source valid, exact subkegiatan, active version, target Ton valid -> PASS TANPA nomor/tanggal Keputusan', async () => {
      const t = await cadanganService.createTarget({
        tahun_target: TAHUN_UJI, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI, source_opd_id: 107,
      }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65);
      assert.strictEqual(t.nomor_keputusan, null);
      assert.strictEqual(t.tanggal_keputusan, null);
      assert.strictEqual(t.source_type, 'sistem');
      assert.ok(Array.isArray(t.source_trace) && t.source_trace.some((e) => e.jenis === 'sistem_dpa_operasional'));
    });
    await test('DPA source invalid (OPD tanpa data DPA) -> FAIL', async () => {
      await assert.rejects(() => cadanganService.createTarget({ tahun_target: TAHUN_UJI, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI, source_opd_id: 8888888 }, ACTOR_OPERATOR, TENANT_ID));
    });
    await test('DPA source spoofed dari frontend (target_ton/source_dpa_id palsu dikirim klien) -> diabaikan, backend tetap authoritative', async () => {
      const t = await cadanganService.createTarget({
        tahun_target: TAHUN_UJI, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI, source_opd_id: 107,
        target_ton: 999999, source_dpa_id: 1, nomor_keputusan: 'PALSU/999', // seluruhnya HARUS diabaikan backend
      }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65, 'target_ton HARUS dari resolusi backend (65), BUKAN dari klaim klien (999999).');
      assert.strictEqual(t.source_dpa_id, dpaUntukTargetNyata.id, 'source_dpa_id HARUS dari resolusi backend, bukan klaim klien.');
    });
    await test('DPA target ambigu (satuan bukan Ton) -> FAIL/REQUIRES REVIEW, tidak authoritative', async () => {
      await assert.rejects(() => cadanganService.createTarget({ tahun_target: TAHUN_UJI, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI, source_opd_id: 9106 }, ACTOR_OPERATOR, TENANT_ID));
    });

    // === SCORING INVARIANCE (mandat §22) — PROTECTED: prosnpB13RuleEngine TIDAK disentuh ===
    console.log('\n=== Scoring Invariance Lintas Provenance ===');
    await test('target 100 Ton dari Kepgub vs DPA/DPPA, transaksi identik -> skor & persentase IDENTIK', () => {
      const transaksi = [{ jenis_transaksi: 'saldo_awal', volume: 100 }];
      const targetKepgub = { target_ton: 100, nomor_keputusan: 'UJI/002', tanggal_keputusan: '2098-01-01' };
      const targetDpa = { target_ton: 100, nomor_keputusan: null, tanggal_keputusan: null };
      const hasilKepgub = hitungB13(transaksi, targetKepgub, '2098-06-30', true);
      const hasilDpa = hitungB13(transaksi, targetDpa, '2098-06-30', true);
      assert.strictEqual(hasilKepgub.skor, hasilDpa.skor);
      assert.strictEqual(hasilKepgub.detail.capaian_persen, hasilDpa.detail.capaian_persen);
      assert.strictEqual(hasilKepgub.skor, 2.50);
    });
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    for (const id of cleanup.targetIds) {
      try { await db.ProsnCadanganTarget.destroy({ where: { id }, force: true }); } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
    }
    for (const id of cleanup.dpaIds) {
      try { await db.Dpa.destroy({ where: { id }, force: true }); } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
    }
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
  }
})();
