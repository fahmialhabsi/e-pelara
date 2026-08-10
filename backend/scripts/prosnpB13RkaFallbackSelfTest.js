'use strict';

/**
 * Self-test corrective "B.1.3 RKA Authoritative Target Fallback".
 * Cakupan: eligibility RKA (active+APPROVED WAJIB keduanya), exact-code
 * matching, precedence DPA-first-then-RKA, anti-spoof, source_trace
 * lengkap, dan scoring invariance (provenance RKA tidak memengaruhi skor).
 *
 * Fixture RKA/DPA memakai tahun fiktif '2097'/'2098' (TIDAK PERNAH
 * menyentuh baris nyata 2025/2026), kode_sub_kegiatan EXACT
 * 2.09.03.1.02.0005 (kode nyata, whitelist nomenklatur B.1.3 nyata
 * dipakai apa adanya) + kode "berbeda" utk membuktikan exact-match saja.
 * Semua baris RKA/DPA/target uji DIHAPUS di blok finally.
 *
 * Jalankan: node scripts/prosnpB13RkaFallbackSelfTest.js
 */
const assert = require('assert');
const db = require('./../models');
db.sequelize.options.logging = false;
const dpaSourceService = require('../services/prosnp/prosnpDpaSourceService');
const rkaSourceService = require('../services/prosnp/prosnpRkaSourceService');
const cadanganService = require('../services/prosnp/prosnpCadanganPanganService');
const { hitungB13 } = require('../services/prosnp/ruleEngine/prosnpB13RuleEngine');

const TENANT_ID = 1;
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2097';
const TAHUN_UJI_GENERIK = '2096';
const KODE_EXACT = dpaSourceService.B13_KODE_SUB_KEGIATAN_CADANGAN_PANGAN;
const PERIODE_ID = 1;

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

const cleanup = { rkaIds: [], dpaIds: [], targetIds: [] };
let seqUnik = 0;
async function buatRkaUji(tahun, opdId, kodeSubKegiatan, {
  targetKeluaran = null, satuanKeluaran = null, tahapan = 'APBD_INDUK', version = 1, isActiveVersion = true, approvalStatus = 'APPROVED',
} = {}) {
  seqUnik += 1;
  const rka = await db.Rka.create({
    tahun, periode_id: PERIODE_ID, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'Pengelolaan Cadangan Pangan Pemerintah Provinsi (UJI)',
    kode_unik_sub_kegiatan: `UJI-RKA-FALLBACK-${seqUnik}`, tahapan, opd_id: opdId, kode_sub_kegiatan: kodeSubKegiatan,
    keluaran: 'Cadangan pangan pemerintah provinsi (UJI)', target_keluaran: targetKeluaran, satuan_keluaran: satuanKeluaran,
    version, is_active_version: isActiveVersion, approval_status: approvalStatus, needs_recall: false,
  });
  cleanup.rkaIds.push(rka.id);
  return rka;
}
async function buatDpaUji(tahun, opdId, kodeSubKegiatan, { target = null, version = 1, isActiveVersion = true } = {}) {
  const dpa = await db.Dpa.create({
    tahun, periode_id: PERIODE_ID, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'Pengelolaan Cadangan Pangan Pemerintah Provinsi (UJI)',
    opd_id: opdId, kode_sub_kegiatan: kodeSubKegiatan, target, anggaran: 0, approval_status: 'DRAFT', needs_recall: false, realisasi: 0,
    version, is_active_version: isActiveVersion, jenis_dokumen: 'DPA',
  });
  cleanup.dpaIds.push(dpa.id);
  return dpa;
}

(async () => {
  let fatalError = null;
  try {
    // === A. RKA ELIGIBILITY (mandat §19) ===
    console.log('=== RKA Eligibility ===');
    await test('A — active=true, APPROVED, target=65 Ton -> valid fallback', async () => {
      await buatRkaUji(TAHUN_UJI, 9401, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9401);
      assert.strictEqual(r.ditemukan, true);
      assert.strictEqual(r.requires_review, false);
      assert.strictEqual(r.target_ton, 65);
    });
    await test('B — active=true, DRAFT -> REJECT (kritis: active tidak berarti approved)', async () => {
      await buatRkaUji(TAHUN_UJI, 9402, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton', approvalStatus: 'DRAFT' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9402);
      assert.strictEqual(r.ditemukan, false);
      assert.strictEqual(r.requires_review, true);
    });
    await test('C — active=false, APPROVED -> REJECT', async () => {
      await buatRkaUji(TAHUN_UJI, 9403, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton', isActiveVersion: false });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9403);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('D — kode salah (0006) -> REJECT (bukan exact code)', async () => {
      await buatRkaUji(TAHUN_UJI, 9404, '2.09.03.1.02.0006', { targetKeluaran: '999', satuanKeluaran: 'Ton' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9404);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('E — OPD salah -> REJECT', async () => {
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 999999);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('F — tahun salah -> REJECT', async () => {
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka('2050', 9401);
      assert.strictEqual(r.ditemukan, false);
    });
    await test('G — target_keluaran NULL -> requires_review', async () => {
      await buatRkaUji(TAHUN_UJI, 9405, KODE_EXACT, { targetKeluaran: null, satuanKeluaran: 'Ton' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9405);
      assert.strictEqual(r.ditemukan, true); // baris RKA ditemukan...
      assert.strictEqual(r.requires_review, true); // ...tapi target tidak authoritative
      assert.strictEqual(r.target_ton, null);
    });
    await test('H — satuan_keluaran NULL -> requires_review', async () => {
      await buatRkaUji(TAHUN_UJI, 9406, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: null });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9406);
      assert.strictEqual(r.requires_review, true);
      assert.strictEqual(r.target_ton, null);
    });
    await test('I — satuan_keluaran="Kg" -> invalid, TIDAK silent-convert', async () => {
      await buatRkaUji(TAHUN_UJI, 9407, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Kg' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9407);
      assert.strictEqual(r.requires_review, true);
      assert.strictEqual(r.target_ton, null);
      assert.strictEqual(r.parsing_status, 'AMBIGUOUS_UNIT');
    });
    await test('J — 2 kandidat authoritative sekaligus -> requires_review, bukan silent pick', async () => {
      await buatRkaUji(TAHUN_UJI, 9408, KODE_EXACT, { targetKeluaran: '50', satuanKeluaran: 'Ton', version: 1 });
      await buatRkaUji(TAHUN_UJI, 9408, KODE_EXACT, { targetKeluaran: '90', satuanKeluaran: 'Ton', version: 2 });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9408);
      assert.strictEqual(r.ditemukan, false);
      assert.strictEqual(r.requires_review, true);
      assert.ok(Array.isArray(r.kandidat_ambigu) && r.kandidat_ambigu.length === 2);
    });

    // === PRECEDENCE (mandat §20) ===
    console.log('\n=== Precedence DPA-first-then-RKA ===');
    await test('Precedence A — DPA valid 80 Ton, RKA valid 65 Ton -> DPA menang (80)', async () => {
      // OPD 9501 fiktif (dpa.opd_id/rka.opd_id tidak ber-FK) sengaja dipakai agar
      // verifikasi murni di level resolver, tanpa perlu OPD nyata dari FK createTarget.
      await buatDpaUji(TAHUN_UJI, 9501, KODE_EXACT, { target: '80 Ton' });
      await buatRkaUji(TAHUN_UJI, 9501, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const dpaR = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9501);
      assert.strictEqual(dpaR.ditemukan, true);
      assert.strictEqual(dpaR.requires_review, false);
      assert.strictEqual(dpaR.target_ton, 80);
    });
    await test('Precedence B — DPA target NULL, RKA approved 65 Ton -> RKA fallback 65', async () => {
      await buatDpaUji(TAHUN_UJI, 107, KODE_EXACT, { target: null });
      await buatRkaUji(TAHUN_UJI, 107, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const t = await cadanganService.createTarget({ tahun_target: TAHUN_UJI, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI, source_opd_id: 107 }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65);
      assert.strictEqual(t.source_dpa_id, null, 'source_dpa_id HARUS null (bukan difabrikasi) utk target RKA.');
      assert.ok(t.source_trace.some((e) => e.jenis === 'sistem_rka_operasional'));
    });
    await test('Precedence D — DPA absent, RKA approved 65 Ton -> RKA fallback', async () => {
      await buatRkaUji(TAHUN_UJI_GENERIK, 107, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const t = await cadanganService.createTarget({ tahun_target: TAHUN_UJI_GENERIK, source_mode: 'DPA_OPERASIONAL', source_tahun: TAHUN_UJI_GENERIK, source_opd_id: 107 }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65);
    });
    await test('Precedence E — DPA invalid + RKA draft aktif -> TIDAK ADA authoritative target (FAIL)', async () => {
      await buatDpaUji(TAHUN_UJI, 9502, KODE_EXACT, { target: null });
      await buatRkaUji(TAHUN_UJI, 9502, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton', approvalStatus: 'DRAFT' });
      const dpaR = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9502);
      const rkaR = await rkaSourceService.resolveOperationalTargetB13FromRka(TAHUN_UJI, 9502);
      assert.strictEqual(dpaR.ditemukan && !dpaR.requires_review, false);
      assert.strictEqual(rkaR.ditemukan && !rkaR.requires_review, false);
    });
    await test('Precedence F — DPA valid, RKA berbeda -> RKA TIDAK PERNAH menimpa DPA', async () => {
      await buatDpaUji(TAHUN_UJI, 9503, KODE_EXACT, { target: '90 Ton' });
      await buatRkaUji(TAHUN_UJI, 9503, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton', version: 2 });
      const dpaR = await dpaSourceService.resolveOperationalTargetB13(TAHUN_UJI, 9503);
      assert.strictEqual(dpaR.target_ton, 90, 'Karena DPA sudah valid, RKA tidak boleh dipertimbangkan sama sekali oleh orkestrasi.');
    });

    // === GENERICITY (mandat §21) — nilai berbeda dari 65, membuktikan tidak hardcode ===
    console.log('\n=== Genericity (nilai sintetis berbeda) ===');
    await test('RKA tahun lain dgn nilai sintetis 42 (BUKAN 65/20) -> resolusi tetap benar, generik', async () => {
      await buatRkaUji('2050', 9601, KODE_EXACT, { targetKeluaran: '42', satuanKeluaran: 'Ton' });
      const r = await rkaSourceService.resolveOperationalTargetB13FromRka('2050', 9601);
      assert.strictEqual(r.target_ton, 42);
    });

    // === SOURCE TRACE COMPLETENESS (mandat §23) ===
    console.log('\n=== Source Trace Completeness ===');
    await test('source_trace RKA fallback memuat seluruh field wajib mandat §9', async () => {
      await buatDpaUji('2049', 107, KODE_EXACT, { target: null });
      await buatRkaUji('2049', 107, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const t = await cadanganService.createTarget({ tahun_target: '2049', source_mode: 'DPA_OPERASIONAL', source_tahun: '2049', source_opd_id: 107 }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      const jejak = t.source_trace.find((e) => e.jenis === 'sistem_rka_operasional');
      assert.ok(jejak);
      for (const field of ['rka_id', 'tahun', 'opd_id', 'kode_sub_kegiatan', 'nama_sub_kegiatan', 'keluaran_raw', 'target_value_raw', 'target_unit_raw', 'target_ton_resolved', 'tahapan', 'version', 'is_active_version', 'approval_status', 'fallback_reason', 'parsing_status']) {
        assert.ok(Object.prototype.hasOwnProperty.call(jejak, field), `source_trace kehilangan field wajib: ${field}`);
      }
      assert.strictEqual(t.source_dpa_id, null);
    });

    // === ANTI-SPOOF ===
    console.log('\n=== Anti-Spoof RKA ===');
    await test('Klien mengklaim rka_id/target_ton palsu -> diabaikan, backend tetap authoritative', async () => {
      await buatDpaUji('2048', 107, KODE_EXACT, { target: null });
      await buatRkaUji('2048', 107, KODE_EXACT, { targetKeluaran: '65', satuanKeluaran: 'Ton' });
      const t = await cadanganService.createTarget({
        tahun_target: '2048', source_mode: 'DPA_OPERASIONAL', source_tahun: '2048', source_opd_id: 107,
        target_ton: 999999, source_dpa_id: 1, rka_id: 1, approval_status: 'APPROVED', version: 999,
      }, ACTOR_OPERATOR, TENANT_ID);
      cleanup.targetIds.push(t.id);
      assert.strictEqual(Number(t.target_ton), 65);
      assert.strictEqual(t.source_dpa_id, null);
    });

    // === SCORING INVARIANCE (mandat §22) — PROTECTED: prosnpB13RuleEngine TIDAK disentuh ===
    console.log('\n=== Scoring Invariance Lintas Provenance (DPA/RKA/Kepgub) ===');
    await test('target 100 Ton dari DPA vs RKA vs Kepgub, transaksi identik -> skor & persentase IDENTIK', () => {
      const transaksi = [{ jenis_transaksi: 'saldo_awal', volume: 100 }];
      const targetDpa = { target_ton: 100, nomor_keputusan: null, tanggal_keputusan: null };
      const targetRka = { target_ton: 100, nomor_keputusan: null, tanggal_keputusan: null };
      const targetKepgub = { target_ton: 100, nomor_keputusan: 'UJI/1', tanggal_keputusan: '2097-01-01' };
      const hasilDpa = hitungB13(transaksi, targetDpa, '2097-06-30', true);
      const hasilRka = hitungB13(transaksi, targetRka, '2097-06-30', true);
      const hasilKepgub = hitungB13(transaksi, targetKepgub, '2097-06-30', true);
      assert.strictEqual(hasilDpa.skor, hasilRka.skor);
      assert.strictEqual(hasilRka.skor, hasilKepgub.skor);
      assert.strictEqual(hasilDpa.detail.capaian_persen, hasilRka.detail.capaian_persen);
      assert.strictEqual(hasilDpa.skor, 2.50);
    });
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    for (const id of cleanup.targetIds) {
      try { await db.ProsnCadanganTarget.destroy({ where: { id }, force: true }); } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
    }
    for (const id of cleanup.rkaIds) {
      try { await db.Rka.destroy({ where: { id }, force: true }); } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
    }
    for (const id of cleanup.dpaIds) {
      try { await db.Dpa.destroy({ where: { id }, force: true }); } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
    }
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
  }
})();
