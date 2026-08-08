'use strict';

/**
 * Spesifikasi 35 v3 — Fase 4 self-test: Test G (DPA), H (Penatausahaan), I
 * (Target/Realisasi Indikator tidak dari Penatausahaan), O (Renstra Cross-OPD
 * Mapping, P0), T (Renstra Year Boundary). Data uji Dpa/Penatausahaan/RenstraOPD/
 * IndikatorRenstra dibuat terisolasi (tahun fiktif '2096'/'2097') dan DIHAPUS
 * TOTAL di akhir (finally) — TIDAK PERNAH menyentuh 4 master indikator produksi
 * Ketahanan Pangan (memakai master_indikator_id=5 "MBG 2.1" sbg target isolasi
 * pemetaan, dikembalikan ke NULL sesudahnya).
 *
 * Jalankan: node scripts/prosnpAutofillFase4SelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const dpaSourceService = require('../services/prosnp/prosnpDpaSourceService');
const dpaRecallAdapter = require('../services/prosnp/autofill/adapters/dpaRecallAdapter');
const penatausahaanRecallAdapter = require('../services/prosnp/autofill/adapters/penatausahaanRecallAdapter');
const renstraIndicatorRecallAdapter = require('../services/prosnp/autofill/adapters/renstraIndicatorRecallAdapter');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

const cleanup = { dpaIds: [], penatausahaanIds: [], renstraOpdIds: [], indikatorRenstraIds: [], masterIndikatorTouched: null, masterIndikatorOriginal: null };

(async () => {
  try {
    // === TEST G — DPA pagu benar (data APBD nyata existing, tidak dimodifikasi) ===
    console.log('=== TEST G: DPA Recall Adapter ===');
    await test('TEST G.1 — dpaRecallAdapter mengembalikan pagu HIGH utk kombinasi whitelist nyata', async () => {
      const expected = await dpaSourceService.ambilSnapshot(3, '2025', 107, '2.09.02.1.01.0006');
      const result = await dpaRecallAdapter.recall({ masterIndikatorId: 3, tahun: '2025', opdPenanggungJawabId: 107, kodeSubKegiatan: '2.09.02.1.01.0006' });
      assert.strictEqual(result.source_type, 'DPA_RECALL');
      assert.strictEqual(result.confidence, 'HIGH');
      assert.strictEqual(result.value, expected.source_pagu_dpa);
    });
    await test('TEST G.2 — dpaRecallAdapter: kode_sub_kegiatan di luar whitelist -> NOT_FOUND (DPA_NOT_FOUND), bukan error keras', async () => {
      const result = await dpaRecallAdapter.recall({ masterIndikatorId: 3, tahun: '2025', opdPenanggungJawabId: 107, kodeSubKegiatan: 'KODE-NGAWUR-999' });
      assert.strictEqual(result.source_type, 'NOT_FOUND');
      assert.strictEqual(result.code, 'DPA_NOT_FOUND');
      assert.strictEqual(result.value, null);
    });

    // === TEST H — Penatausahaan SUM + OPD scoping ===
    console.log('\n=== TEST H: Penatausahaan Recall Adapter ===');
    const dpaA = await db.Dpa.create({ tahun: '2096', periode_id: 1, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'UJI FASE 4 A', opd_id: 107, approval_status: 'draft', needs_recall: false, realisasi: 0, version: 1, is_active_version: true });
    cleanup.dpaIds.push(dpaA.id);
    const dpaB = await db.Dpa.create({ tahun: '2096', periode_id: 1, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'UJI FASE 4 B', opd_id: 109, approval_status: 'draft', needs_recall: false, realisasi: 0, version: 1, is_active_version: true });
    cleanup.dpaIds.push(dpaB.id);
    const dpaC = await db.Dpa.create({ tahun: '2096', periode_id: 1, program: 'UJI', kegiatan: 'UJI', sub_kegiatan: 'UJI FASE 4 C (nol transaksi)', opd_id: 107, approval_status: 'draft', needs_recall: false, realisasi: 0, version: 1, is_active_version: true });
    cleanup.dpaIds.push(dpaC.id);

    const p1 = await db.Penatausahaan.create({ tahun: '2096', periode_id: 1, tanggal_transaksi: '2096-01-05', uraian: 'UJI FASE 4', jumlah: 1000000, dpa_id: dpaA.id });
    cleanup.penatausahaanIds.push(p1.id);
    const p2 = await db.Penatausahaan.create({ tahun: '2096', periode_id: 1, tanggal_transaksi: '2096-02-05', uraian: 'UJI FASE 4', jumlah: 2500000, dpa_id: dpaA.id });
    cleanup.penatausahaanIds.push(p2.id);
    const p3 = await db.Penatausahaan.create({ tahun: '2096', periode_id: 1, tanggal_transaksi: '2096-01-05', uraian: 'UJI FASE 4 (OPD lain)', jumlah: 9999999, dpa_id: dpaB.id });
    cleanup.penatausahaanIds.push(p3.id);

    await test('TEST H.1 — SUM realisasi benar utk dpa+OPD yang cocok (1.000.000 + 2.500.000 = 3.500.000)', async () => {
      const result = await penatausahaanRecallAdapter.recall({ dpaId: dpaA.id, opdPenanggungJawabId: 107 });
      assert.strictEqual(result.source_type, 'PENATAUSAHAAN_RECALL');
      assert.strictEqual(result.value, 3500000);
    });
    await test('TEST H.2 — OPD scoping: dpa_id valid TAPI opd_penanggung_jawab_id diminta SALAH -> DPA_NOT_FOUND (bukan mengembalikan data OPD lain)', async () => {
      const result = await penatausahaanRecallAdapter.recall({ dpaId: dpaA.id, opdPenanggungJawabId: 109 });
      assert.strictEqual(result.source_type, 'NOT_FOUND');
      assert.strictEqual(result.code, 'DPA_NOT_FOUND');
    });
    await test('TEST H.3 — 0 baris Penatausahaan (bukan SUM=0) -> PENATAUSAHAAN_NOT_FOUND, value=null (bukan 0)', async () => {
      const result = await penatausahaanRecallAdapter.recall({ dpaId: dpaC.id, opdPenanggungJawabId: 107 });
      assert.strictEqual(result.source_type, 'NOT_FOUND');
      assert.strictEqual(result.code, 'PENATAUSAHAAN_NOT_FOUND');
      assert.strictEqual(result.value, null, 'value HARUS null, bukan 0, saat 0 baris.');
    });
    await test('TEST H.4 — dpa_id milik OPD lain (109), diminta dgn OPD yang benar (109) -> berhasil, tidak tercampur data dpa A', async () => {
      const result = await penatausahaanRecallAdapter.recall({ dpaId: dpaB.id, opdPenanggungJawabId: 109 });
      assert.strictEqual(result.value, 9999999);
    });

    // === TEST I — Target/Realisasi Indikator TIDAK dari Penatausahaan; NOT_FOUND saat FK NULL ===
    console.log('\n=== TEST I: Renstra Indicator Recall — tidak dari Penatausahaan, FK NULL ===');
    await test('TEST I.1 — renstraIndicatorRecallAdapter TIDAK mengimpor model Dpa/Penatausahaan sama sekali (source-check statis)', async () => {
      const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'prosnp', 'autofill', 'adapters', 'renstraIndicatorRecallAdapter.js'), 'utf8');
      assert.ok(!/db\.Dpa\b/.test(src), 'Tidak boleh ada referensi db.Dpa.');
      assert.ok(!/db\.Penatausahaan\b/.test(src), 'Tidak boleh ada referensi db.Penatausahaan.');
    });
    await test('TEST I.2 — master_indikator.indikator_renstra_id NULL -> INDICATOR_MAPPING_NOT_FOUND utk target DAN realisasi, value null (bukan 0)', async () => {
      const master = await db.ProsnMasterIndikator.findByPk(1); // B.1.1, dikonfirmasi NULL sejak Fase 1
      assert.strictEqual(master.indikator_renstra_id, null, 'Prasyarat: harus NULL sebelum test ini.');
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 1, tahun: '2025', opdPenanggungJawabId: 107, transaction: null });
      assert.strictEqual(result.target.code, 'INDICATOR_MAPPING_NOT_FOUND');
      assert.strictEqual(result.target.value, null);
      assert.strictEqual(result.realisasi.code, 'INDICATOR_MAPPING_NOT_FOUND');
      assert.strictEqual(result.realisasi.value, null);
    });

    // === TEST O — Renstra Cross-OPD Mapping (P0) ===
    console.log('\n=== TEST O: Renstra Cross-OPD Mapping (P0) ===');
    const renstraOpdB = await db.RenstraOPD.create({ opd_id: 109, rpjmd_id: 999999, bidang_opd: 'UJI', sub_bidang_opd: 'UJI', nama_opd: 'UJI OPD B FASE 4', tahun_mulai: 2025, tahun_akhir: 2029, is_aktif: true });
    cleanup.renstraOpdIds.push(renstraOpdB.id);
    const indikatorOpdB = await db.IndikatorRenstra.create({ ref_id: 1, stage: 'sub_kegiatan', kode_indikator: 'UJI-O', nama_indikator: 'Indikator Uji OPD B', renstra_id: renstraOpdB.id, target_tahun_1: 500 });
    cleanup.indikatorRenstraIds.push(indikatorOpdB.id);
    const masterMbg21 = await db.ProsnMasterIndikator.findByPk(5); // MBG 2.1 — isolasi dari 4 indikator KP produksi
    cleanup.masterIndikatorTouched = 5;
    cleanup.masterIndikatorOriginal = masterMbg21.indikator_renstra_id;
    await masterMbg21.update({ indikator_renstra_id: indikatorOpdB.id });

    await test('TEST O.1 — FK menunjuk IndikatorRenstra milik OPD LAIN (109) TAPI konteks ProSN aktif OPD A (107) -> INDICATOR_MAPPING_OPD_MISMATCH utk target DAN realisasi', async () => {
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 5, tahun: '2025', opdPenanggungJawabId: 107, transaction: null });
      assert.strictEqual(result.target.code, 'INDICATOR_MAPPING_OPD_MISMATCH');
      assert.strictEqual(result.target.value, null, 'TIDAK BOLEH ada nilai OPD B (target_tahun_1=500) yang ikut terkirim.');
      assert.strictEqual(result.realisasi.code, 'INDICATOR_MAPPING_OPD_MISMATCH');
      assert.strictEqual(result.realisasi.value, null);
    });
    await test('TEST O.2 — konteks OPD yang BENAR (109, sama dgn RenstraOPD.opd_id) -> BERHASIL, bukan mismatch', async () => {
      // tahunAwalRenstra fallback = tahun_akhir(2029)-5 = 2024 -> tahun='2024' berarti offset=1 -> target_tahun_1.
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 5, tahun: '2024', opdPenanggungJawabId: 109, transaction: null });
      assert.strictEqual(result.target.source_type, 'INDIKATOR_RENSTRA_RECALL');
      assert.strictEqual(result.target.value, 500);
    });

    // === TEST T — Renstra Year Boundary ===
    console.log('\n=== TEST T: Renstra Year Boundary (OD-1) ===');
    await test('TEST T.1 — offset < 1 (tahun sebelum tahunAwalRenstra) -> RENSTRA_YEAR_OUT_OF_RANGE, BUKAN clamp ke target_tahun_1', async () => {
      // tahun_akhir=2029, tanpa rpjmd_id -> fallback tahunAwalRenstra = 2029-5 = 2024. tahun=2023 -> offset=0.
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 5, tahun: '2023', opdPenanggungJawabId: 109, transaction: null });
      assert.strictEqual(result.target.code, 'RENSTRA_YEAR_OUT_OF_RANGE');
      assert.strictEqual(result.target.value, null, 'TIDAK boleh diam-diam mengambil target_tahun_1.');
    });
    await test('TEST T.2 — offset dalam jangkauan (tahun=2024 -> offset=1) -> mengambil target_tahun_1 apa adanya (500)', async () => {
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 5, tahun: '2024', opdPenanggungJawabId: 109, transaction: null });
      assert.strictEqual(result.target.code, undefined);
      assert.strictEqual(result.target.value, 500);
    });
    await test('TEST T.3 — offset > 6 (tahun jauh melampaui) -> RENSTRA_YEAR_OUT_OF_RANGE, BUKAN clamp ke target_tahun_6', async () => {
      // tahunAwalRenstra=2024, tahun=2031 -> offset=8.
      const result = await renstraIndicatorRecallAdapter.recall({ masterIndikatorId: 5, tahun: '2031', opdPenanggungJawabId: 109, transaction: null });
      assert.strictEqual(result.target.code, 'RENSTRA_YEAR_OUT_OF_RANGE');
      assert.strictEqual(result.target.value, null);
    });

    console.log(`\n=== HASIL TEST FASE 4 (G/H/I/O/T): ${pass} lulus, ${fail} gagal ===`);
  } catch (fatal) {
    fail++;
    console.error('FATAL SETUP ERROR:', fatal.stack || fatal.message);
  } finally {
    console.log('\n=== Cleanup total data uji Fase 4 ===');
    if (cleanup.masterIndikatorTouched) {
      await db.ProsnMasterIndikator.update({ indikator_renstra_id: cleanup.masterIndikatorOriginal }, { where: { id: cleanup.masterIndikatorTouched } });
    }
    if (cleanup.indikatorRenstraIds.length) await db.IndikatorRenstra.destroy({ where: { id: cleanup.indikatorRenstraIds } });
    if (cleanup.renstraOpdIds.length) await db.RenstraOPD.destroy({ where: { id: cleanup.renstraOpdIds } });
    if (cleanup.penatausahaanIds.length) await db.Penatausahaan.destroy({ where: { id: cleanup.penatausahaanIds } });
    if (cleanup.dpaIds.length) await db.Dpa.destroy({ where: { id: cleanup.dpaIds } });
    const masterCheck = await db.ProsnMasterIndikator.findByPk(5);
    console.log(`  Cleanup selesai — master MBG 2.1 indikator_renstra_id dikembalikan ke: ${masterCheck.indikator_renstra_id}`);
  }
  process.exit(fail > 0 ? 1 : 0);
})();
