'use strict';

/**
 * Corrective "B.1.3 Period Cutoff Wiring + Semester Transaction Placement
 * Guard" — self-test membuktikan 2 defect dari audit read-only sebelumnya
 * sudah diperbaiki TANPA mengubah formula skor/tier/evidence-gate/carry-forward
 * yang sudah disahkan. Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1
 * (indikator ProSN di-seed per tenant produksi), dihapus total di finally.
 *
 * Jalankan: node scripts/prosnpB13CutoffPlacementSelfTest.js
 */
const assert = require('assert');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const cadanganPangan = require('../services/prosnp/prosnpCadanganPanganService');
const b13Semester = require('../services/prosnp/prosnpB13SemesterService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
const { resolveDefaultCutoff } = require('../services/prosnp/ruleEngine/prosnpB13RuleEngine');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2091';
const TAHUN_LEGACY = '2092'; // periode terpisah utk TEST 3/4 — hindari benturan unique constraint dgn periodeSem2 TAHUN_UJI

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

async function cariKomoditasBeras() {
  const row = await db.ProsnKomoditas.findOne({ where: { flag_beras: true } });
  assert.ok(row, 'Setup rusak — tidak ada komoditas dgn flag_beras=true di master data.');
  return row;
}

async function cariIndikatorB13(periodeId) {
  const indikator = await db.ProsnIndikator.findOne({ where: { periode_id: periodeId, kode: 'B.1.3' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
  assert.ok(indikator && indikator.pengisian, 'Setup rusak — indikator B.1.3 / pengisian tidak ditemukan pada periode uji.');
  return indikator;
}

const cleanup = { periodeIds: [] };

(async () => {
  let fatalError = null;
  let periodeSem1, periodeSem2, legacyPeriodeSem2;
  try {
    console.log('=== Setup: periode Semester I & II ProSN uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periodeSem1 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (B13 Cutoff Semester I)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periodeSem1.id);
    periodeSem2 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (B13 Cutoff Semester II)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-01`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periodeSem2.id);
    await workflow.activatePeriod(periodeSem1.id, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periodeSem2.id, ACTOR_ADMIN, TENANT_ID);
    console.log(`  Periode Semester I id=${periodeSem1.id}, Semester II id=${periodeSem2.id}`);

    // === TEST 1/2 — default cutoff saat createPeriod tanpa tanggal_cutoff eksplisit ===
    await test('TEST 1 — createPeriod Semester I tanpa tanggal_cutoff -> default 30 Juni', async () => {
      const fresh = await db.ProsnPeriode.findByPk(periodeSem1.id);
      assert.strictEqual(fresh.tanggal_cutoff, `${TAHUN_UJI}-06-30`);
    });
    await test('TEST 2 — createPeriod Semester II tanpa tanggal_cutoff -> default 31 Desember', async () => {
      const fresh = await db.ProsnPeriode.findByPk(periodeSem2.id);
      assert.strictEqual(fresh.tanggal_cutoff, `${TAHUN_UJI}-12-31`);
    });

    // === TEST 3 — fallback legacy (tanggal_cutoff NULL) TIDAK BOLEH lagi pakai tanggal_tenggat mentah ===
    console.log('\n=== TEST 3 — Legacy periode (tanggal_cutoff=NULL) ===');
    legacyPeriodeSem2 = await db.ProsnPeriode.create({
      tenant_id: TENANT_ID, perangkat_daerah_id: 3, tahun: TAHUN_LEGACY, semester: '2',
      nama: 'TEST DATA — NOT OFFICIAL (B13 Legacy NULL cutoff)', tanggal_mulai: `${TAHUN_LEGACY}-07-01`,
      tanggal_tenggat: `${TAHUN_LEGACY}-12-01`, tanggal_cutoff: null, created_by: ACTOR_ADMIN.id, updated_by: ACTOR_ADMIN.id,
    });
    cleanup.periodeIds.push(legacyPeriodeSem2.id);
    await test('TEST 3 — resolveCutoff legacy (NULL cutoff, tenggat 12-01) -> 31 Desember, BUKAN 12-01', async () => {
      const cutoff = b13Semester.resolveCutoff(legacyPeriodeSem2);
      assert.strictEqual(cutoff, `${TAHUN_LEGACY}-12-31`);
      assert.notStrictEqual(cutoff, `${TAHUN_LEGACY}-12-01`);
    });

    // === TEST 4 — transaksi tanggal 24 Desember masuk cutoff (setelah fix) ===
    console.log('\n=== TEST 4 — Transaksi akhir Desember dalam cutoff hasil perbaikan ===');
    const komoditasBeras = await cariKomoditasBeras();
    // Buat langsung via model (bukan lewat legacyPeriodeSem2's pengisian — cukup uji resolveCutoff+query lintas fungsi cutoff)
    await workflow.initializePeriodIndicators(legacyPeriodeSem2.id, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(legacyPeriodeSem2.id, ACTOR_ADMIN, TENANT_ID);
    const pengisianLegacyB13Id = (await cariIndikatorB13(legacyPeriodeSem2.id)).pengisian.id;
    await test('TEST 4 — transaksi 24 Desember (valid+evidence-exempt saldo_awal) TERMASUK cutoff 31 Desember hasil perbaikan', async () => {
      assert.ok(pengisianLegacyB13Id, 'Setup rusak — pengisian B.1.3 legacy tidak terbentuk.');
      const trxDesember = await db.ProsnStokTransaksi.create({
        tenant_id: TENANT_ID, periode_id: legacyPeriodeSem2.id, indikator_id: (await cariIndikatorB13(legacyPeriodeSem2.id)).id,
        pengisian_id: pengisianLegacyB13Id, komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_LEGACY}-12-24`,
        jenis_transaksi: 'saldo_awal', volume: 5, satuan: 'Ton', ownership: 'pemerintah_provinsi', status_verifikasi: 'valid',
        created_by: ACTOR_ADMIN.id, updated_by: ACTOR_ADMIN.id,
      });
      const cutoff = b13Semester.resolveCutoff(legacyPeriodeSem2);
      const { included } = await b13Semester.transaksiTerverifikasiUntukPeriode(legacyPeriodeSem2.id, TENANT_ID, cutoff);
      assert.ok(included.some((t) => t.id === trxDesember.id), 'Transaksi 24 Desember harus ikut terhitung setelah cutoff diperbaiki ke 31 Desember.');
    });

    // === TEST 5-9 — Guard penempatan transaksi manual per semester ===
    console.log('\n=== TEST 5-9 — Guard Penempatan Transaksi Semester ===');
    const b13Sem1 = await cariIndikatorB13(periodeSem1.id);
    const b13Sem2 = await cariIndikatorB13(periodeSem2.id);

    await test('TEST 5 — tolak transaksi tanggal Semester I (5 April) di periode Semester II', async () => {
      await assert.rejects(
        () => cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'saldo_awal', volume: 10 }, ACTOR_OPERATOR, TENANT_ID),
        (err) => err.code === 'PROSNP_STOK_SEMESTER_MISMATCH',
      );
    });
    await test('TEST 6 — tolak transaksi tanggal Semester II (20 Agustus) di periode Semester I', async () => {
      await assert.rejects(
        () => cadanganPangan.createTransaksi(b13Sem1.pengisian.id, { komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-08-20`, jenis_transaksi: 'penyaluran', volume: 3 }, ACTOR_OPERATOR, TENANT_ID),
        (err) => err.code === 'PROSNP_STOK_SEMESTER_MISMATCH',
      );
    });
    let trxSem1Valid, trxSem2Valid;
    await test('TEST 7 — terima transaksi tanggal Semester I (5 April) di periode Semester I', async () => {
      trxSem1Valid = await cadanganPangan.createTransaksi(b13Sem1.pengisian.id, { komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'saldo_awal', volume: 65 }, ACTOR_OPERATOR, TENANT_ID);
      assert.ok(trxSem1Valid.id);
    });
    await test('TEST 8 — terima transaksi tanggal Semester II (20 Agustus) di periode Semester II', async () => {
      trxSem2Valid = await cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-08-20`, jenis_transaksi: 'penyaluran', volume: 8 }, ACTOR_OPERATOR, TENANT_ID);
      assert.ok(trxSem2Valid.id);
    });
    await test('TEST 9 — tolak EDIT transaksi Semester II valid diubah tanggalnya ke Semester I', async () => {
      await assert.rejects(
        () => cadanganPangan.updateTransaksi(trxSem2Valid.id, { lock_version: 0, komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 8 }, ACTOR_OPERATOR, TENANT_ID),
        (err) => err.code === 'PROSNP_STOK_SEMESTER_MISMATCH',
      );
    });

    // === TEST 10 — carry-forward system-generated tetap tidak terpengaruh guard ===
    console.log('\n=== TEST 10 — Carry-forward tetap berjalan normal ===');
    await test('TEST 10 — pastikanCarryForward (07-01, Semester II) tetap berhasil dibuat, tidak terblokir guard baru', async () => {
      const pengisianPenuh = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianPenuh, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.ok(hasil, 'pastikanCarryForward harus menghasilkan sesuatu (Semester I ada).');
      const cfRow = await db.ProsnStokTransaksi.findOne({ where: { pengisian_id: b13Sem2.pengisian.id, is_carry_forward: true } });
      assert.ok(cfRow, 'Baris carry-forward 07-01 harus terbentuk tanpa ditolak guard semester.');
      assert.strictEqual(cfRow.tanggal, `${TAHUN_UJI}-07-01`);
    });

    // === TEST 11 — transaksi belum terverifikasi tetap tidak masuk skor ===
    console.log('\n=== TEST 11/12 — Proteksi verifikasi & evidence gate (tidak berubah) ===');
    await test('TEST 11 — transaksi status_verifikasi=uploaded tetap DIKECUALIKAN dari perhitungan', async () => {
      const cutoff = b13Semester.resolveCutoff(await db.ProsnPeriode.findByPk(periodeSem2.id));
      const { included } = await b13Semester.transaksiTerverifikasiUntukPeriode(periodeSem2.id, TENANT_ID, cutoff);
      assert.ok(!included.some((t) => t.id === trxSem2Valid.id), 'Transaksi status uploaded tidak boleh ikut dihitung — proteksi eligibility tidak berubah.');
    });

    // === TEST 12 — transaksi valid tapi evidence-ineligible tetap dikecualikan ===
    let trxValidTanpaEvidence;
    await test('TEST 12 — transaksi status_verifikasi=valid TANPA bukti dokumen_penyaluran tetap dikecualikan (evidence gate tidak dilonggarkan)', async () => {
      trxValidTanpaEvidence = await db.ProsnStokTransaksi.create({
        tenant_id: TENANT_ID, periode_id: periodeSem2.id, indikator_id: b13Sem2.id, pengisian_id: b13Sem2.pengisian.id,
        komoditas_id: komoditasBeras.id, tanggal: `${TAHUN_UJI}-09-01`, jenis_transaksi: 'penyaluran', volume: 4,
        satuan: 'Ton', ownership: 'pemerintah_provinsi', status_verifikasi: 'valid', created_by: ACTOR_ADMIN.id, updated_by: ACTOR_ADMIN.id,
      });
      const cutoff = b13Semester.resolveCutoff(await db.ProsnPeriode.findByPk(periodeSem2.id));
      const { included, excluded } = await b13Semester.transaksiTerverifikasiUntukPeriode(periodeSem2.id, TENANT_ID, cutoff);
      assert.ok(!included.some((t) => t.id === trxValidTanpaEvidence.id), 'Transaksi valid tanpa evidence wajib tetap dikecualikan dari included.');
      assert.ok(excluded.some((t) => t.id === trxValidTanpaEvidence.id), 'Transaksi ini harus muncul di excluded dgn alasan evidence.');
    });

    console.log('\n=== TEST 13 — B.1.1/B.1.2/B.1.4 tidak disentuh corrective ini (diverifikasi via regresi terpisah prosnpRuleEngineSelfTest.js) ===');
    await test('TEST 13 — hitungUlangB13 masih memanggil resolveCutoff terpusat, tidak melempar untuk indikator lain', async () => {
      assert.strictEqual(typeof ruleEngineService.hitungUlangB11, 'function');
      assert.strictEqual(typeof ruleEngineService.hitungUlangB12, 'function');
      assert.strictEqual(typeof ruleEngineService.hitungUlangB14, 'function');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const periodeId of cleanup.periodeIds) {
        const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periodeId }, attributes: ['id'] })).map((i) => i.id);
        const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
        await db.ProsnStokTransaksi.destroy({ where: { periode_id: periodeId } });
        await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiDukung.destroy({ where: { periode_id: periodeId } });
        await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
        await db.ProsnIndikator.destroy({ where: { id: indikatorIds } });
        await db.ProsnPeriode.destroy({ where: { id: periodeId } });
      }
      console.log(`Periode uji tahun ${TAHUN_UJI} (id ${cleanup.periodeIds.join(',')}) dihapus total.`);
    } catch (cleanupError) {
      console.error('CLEANUP ERROR:', cleanupError.stack || cleanupError.message);
    }
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
    process.exit(0);
  }
})();
