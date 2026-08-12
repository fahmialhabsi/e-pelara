'use strict';

/**
 * Corrective "B.1.3 Carry-Forward Synchronization + Saldo/Realisasi
 * Presentation + Regulatory Target Provenance" — self-test membuktikan:
 * (1) carry-forward Semester II self-heal IN PLACE saat Semester I berubah,
 * idempotent, transactional; (2) realisasi penyaluran kumulatif TAHUNAN
 * terpisah dari saldo (posisi stok), carry-forward tidak pernah dihitung sbg
 * realisasi; (3) provenance target (nomor_keputusan_kdh/tanggal_keputusan_kdh)
 * TIDAK PERNAH difabrikasi dari sumber operasional (RKA/DPA).
 * Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1 (indikator ProSN di-seed
 * per tenant produksi), dihapus total di finally. TIDAK menyentuh UAT nyata.
 *
 * Jalankan: node scripts/prosnpB13CarryForwardSyncSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const cadanganPangan = require('../services/prosnp/prosnpCadanganPanganService');
const b13Semester = require('../services/prosnp/prosnpB13SemesterService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
const { hitungB13 } = require('../services/prosnp/ruleEngine/prosnpB13RuleEngine');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const ACTOR_PENGAWAS = { id: 6, role: 'PENGAWAS' };
const TAHUN_UJI = '2093';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'b13_cf_sync_test_dummy.pdf');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}
function fakeFile(name) {
  fs.writeFileSync(DUMMY_FILE, Buffer.from(`%PDF-1.4 dummy ${name} ${Date.now()}`));
  const stat = fs.statSync(DUMMY_FILE);
  return { path: DUMMY_FILE, originalname: `${name}.pdf`, filename: `${name}_${Date.now()}.pdf`, mimetype: 'application/pdf', size: stat.size };
}
async function uploadBuktiValid(pengisianId, entityType, entityId, kategori) {
  const bukti = await workflow.createBukti(pengisianId, { judul: `Bukti ${kategori}`, kategori, entity_type: entityType, entity_id: entityId }, fakeFile(kategori), ACTOR_OPERATOR, TENANT_ID);
  await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
  return bukti;
}
async function jumlahCarryForward(pengisianId) {
  return db.ProsnStokTransaksi.count({ where: { pengisian_id: pengisianId, is_carry_forward: true } });
}

const cleanup = { periodeIds: [] };

(async () => {
  let fatalError = null;
  let periodeSem1, periodeSem2;
  try {
    console.log('=== Setup: periode Semester I & II ProSN uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periodeSem1 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (B13 Carry-Forward Sync Semester I)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periodeSem1.id);
    periodeSem2 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (B13 Carry-Forward Sync Semester II)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-01`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periodeSem2.id);
    await workflow.activatePeriod(periodeSem1.id, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periodeSem2.id, ACTOR_ADMIN, TENANT_ID);

    const b13Sem1 = await db.ProsnIndikator.findOne({ where: { periode_id: periodeSem1.id, kode: 'B.1.3' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const b13Sem2 = await db.ProsnIndikator.findOne({ where: { periode_id: periodeSem2.id, kode: 'B.1.3' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const beras = await db.ProsnKomoditas.findOne({ where: { kode: 'BERAS' } });
    console.log(`  Semester I pengisian_id=${b13Sem1.pengisian.id}, Semester II pengisian_id=${b13Sem2.pengisian.id}`);

    const target = await cadanganPangan.createTarget({ tahun_target: TAHUN_UJI, nomor_keputusan: `KDH/UJI/${TAHUN_UJI}`, tanggal_keputusan: `${TAHUN_UJI}-01-01`, target_ton: 65 }, ACTOR_OPERATOR, TENANT_ID);
    await uploadBuktiValid(b13Sem1.pengisian.id, 'CADANGAN_TARGET', target.id, 'keputusan_kdh');

    // === Semester I: saldo_awal 65 Ton (tidak butuh evidence, mandat §84 KATEGORI_WAJIB_PER_JENIS_TRANSAKSI.saldo_awal=[]) ===
    await cadanganPangan.createTransaksi(b13Sem1.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-01-01`, jenis_transaksi: 'saldo_awal', volume: 65, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);

    console.log('\n=== CF1 — belum ada carry-forward, Semester I closing=65 (baru saldo_awal) ===');
    await test('CF1 — pastikanCarryForward membuat SATU baris carry-forward dari saldo akhir Semester I terkini (65)', async () => {
      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.dibuat, true);
      assert.strictEqual(hasil.nilai, 65);
      const cfRow = await db.ProsnStokTransaksi.findOne({ where: { pengisian_id: b13Sem2.pengisian.id, is_carry_forward: true } });
      assert.ok(cfRow, 'baris carry-forward harus terbentuk.');
      assert.strictEqual(Number(cfRow.volume), 65);
      assert.strictEqual(await jumlahCarryForward(b13Sem2.pengisian.id), 1, 'harus tepat SATU baris carry-forward.');
    });

    console.log('\n=== CF2 — panggilan ulang TANPA perubahan Semester I -> tidak ada baris baru, tidak ada perubahan ===');
    await test('CF2 — carry-forward existing SUDAH cocok (65==65) -> tidak dibuat baris baru, tidak disinkronkan', async () => {
      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.dibuat, false);
      assert.strictEqual(hasil.disinkronkan, false);
      assert.strictEqual(hasil.cocok, true);
      assert.strictEqual(await jumlahCarryForward(b13Sem2.pengisian.id), 1);
    });

    console.log('\n=== CF3/CF8 — Semester I berubah (tambah penyaluran 15) -> saldo akhir jadi 50 -> carry-forward SAMA BARISNYA disinkronkan ===');
    let trxPenyaluranSem1;
    let carryForwardId;
    await test('CF3/CF8 — carry-forward existing di-UPDATE IN PLACE (65->50), TIDAK membuat baris baru', async () => {
      trxPenyaluranSem1 = await cadanganPangan.createTransaksi(b13Sem1.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 15, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      await uploadBuktiValid(b13Sem1.pengisian.id, 'STOK_TRANSAKSI', trxPenyaluranSem1.id, 'dokumen_penyaluran');

      const cfSebelum = await db.ProsnStokTransaksi.findOne({ where: { pengisian_id: b13Sem2.pengisian.id, is_carry_forward: true } });
      carryForwardId = cfSebelum.id;

      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.dibuat, false, 'bukan baris baru.');
      assert.strictEqual(hasil.disinkronkan, true);
      assert.strictEqual(hasil.nilai_tersimpan_sebelum, 65);
      assert.strictEqual(hasil.nilai_tersimpan_sesudah, 50);
      assert.strictEqual(hasil.selisih_sebelum_sinkron, 15);

      const cfSesudah = await db.ProsnStokTransaksi.findOne({ where: { pengisian_id: b13Sem2.pengisian.id, is_carry_forward: true } });
      assert.strictEqual(cfSesudah.id, carryForwardId, 'HARUS baris yg SAMA (identitas record dipertahankan), bukan baris baru.');
      assert.strictEqual(Number(cfSesudah.volume), 50);
      assert.strictEqual(await jumlahCarryForward(b13Sem2.pengisian.id), 1, 'tetap tepat SATU baris carry-forward setelah sinkronisasi.');
    });

    console.log('\n=== CF4 — rekonsiliasi berulang setelah sinkron -> idempotent, tetap 50, tetap satu baris ===');
    await test('CF4 — panggilan ulang setelah sinkron -> cocok=true, tidak disinkronkan lagi, volume tetap 50', async () => {
      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.disinkronkan, false);
      assert.strictEqual(hasil.cocok, true);
      const cfRow = await db.ProsnStokTransaksi.findOne({ where: { id: carryForwardId } });
      assert.strictEqual(Number(cfRow.volume), 50);
      assert.strictEqual(await jumlahCarryForward(b13Sem2.pengisian.id), 1);
    });

    console.log('\n=== CF5 — Semester I berubah LAGI (penyaluran 15->20, closing 50->45) -> carry-forward baris SAMA disinkron ulang ===');
    await test('CF5 — carry-forward disinkronkan ulang ke nilai baru (45), baris identitas tetap sama', async () => {
      await cadanganPangan.updateTransaksi(trxPenyaluranSem1.id, { lock_version: 0, komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 20, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.disinkronkan, true);
      assert.strictEqual(hasil.nilai_tersimpan_sebelum, 50);
      assert.strictEqual(hasil.nilai_tersimpan_sesudah, 45);
      const cfRow = await db.ProsnStokTransaksi.findOne({ where: { id: carryForwardId } });
      assert.strictEqual(Number(cfRow.volume), 45);
    });

    console.log('\n=== CF6/CF7 — Semester I kembali ke nilai semula (penyaluran 20->15, closing 45->50) -> carry-forward resync, tetap valid+evidence-exempt ===');
    await test('CF6 — carry-forward resync kembali ke 50 pada baris yg sama', async () => {
      await cadanganPangan.updateTransaksi(trxPenyaluranSem1.id, { lock_version: 1, komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 15, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID);
      const hasil = await db.sequelize.transaction((t) => b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t));
      assert.strictEqual(hasil.disinkronkan, true);
      assert.strictEqual(hasil.nilai_tersimpan_sesudah, 50);
      assert.strictEqual(await jumlahCarryForward(b13Sem2.pengisian.id), 1, 'sepanjang seluruh siklus sync berulang, tetap SATU baris.');
    });
    await test('CF7 — carry-forward tetap is_carry_forward=true, status_verifikasi=valid, evidence-exempt', async () => {
      const cfRow = await db.ProsnStokTransaksi.findOne({ where: { id: carryForwardId } });
      assert.strictEqual(cfRow.is_carry_forward, true);
      assert.strictEqual(cfRow.status_verifikasi, 'valid');
      assert.strictEqual(cfRow.ownership, 'pemerintah_provinsi');
      const evidenceGate = require('../services/prosnp/prosnpEvidenceGateService');
      const cek = await evidenceGate.transaksiMemilikiBuktiValid(cfRow, TENANT_ID);
      assert.strictEqual(cek.valid, true, 'carry-forward tidak boleh memerlukan bukti sendiri (provenance dari neraca Semester I).');
    });

    console.log('\n=== CF10 — rollback aman: kegagalan setelah sinkronisasi carry-forward membatalkan SEMUA perubahan dalam transaksi yg sama ===');
    await test('CF10 — transactional consistency: error setelah sync -> carry-forward DAN transaksi Semester I sama-sama tidak berubah', async () => {
      const cfSebelum = await db.ProsnStokTransaksi.findOne({ where: { id: carryForwardId } });
      const volumeCfSebelum = Number(cfSebelum.volume);
      const trxSebelum = await db.ProsnStokTransaksi.findByPk(trxPenyaluranSem1.id);
      const volumeTrxSebelum = Number(trxSebelum.volume);

      await assert.rejects(db.sequelize.transaction(async (t) => {
        await db.ProsnStokTransaksi.update({ volume: 999 }, { where: { id: trxPenyaluranSem1.id }, transaction: t });
        const pengisianScoped = await workflow.getPengisianScoped(b13Sem2.pengisian.id, TENANT_ID, t);
        await b13Semester.pastikanCarryForward(pengisianScoped, TENANT_ID, ACTOR_ADMIN.id, t);
        throw new Error('SIMULASI kegagalan downstream setelah sinkronisasi carry-forward');
      }), /SIMULASI/);

      const cfSesudah = await db.ProsnStokTransaksi.findOne({ where: { id: carryForwardId } });
      const trxSesudah = await db.ProsnStokTransaksi.findByPk(trxPenyaluranSem1.id);
      assert.strictEqual(Number(cfSesudah.volume), volumeCfSebelum, 'carry-forward tidak boleh berubah -- rollback harus total.');
      assert.strictEqual(Number(trxSesudah.volume), volumeTrxSebelum, 'perubahan transaksi Semester I dalam transaksi DB yg sama jg harus di-rollback.');
    });

    console.log('\n=== R1 — Semester I: saldo=50, realisasi=15 (kumulatif penyaluran, TIDAK termasuk saldo_awal) ===');
    await test('R1 — hitungUlangB13 Semester I: saldo_akhir=50, realisasi_penyaluran_ton=15, capaian=76.92%', async () => {
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.saldo_akhir, 50);
      assert.strictEqual(hasil.detail.realisasi_penyaluran_ton, 15, 'R1/R4: realisasi TIDAK boleh termasuk saldo_awal (65).');
      assert.strictEqual(hasil.detail.capaian_persen, 76.92);
      assert.strictEqual(hasil.skor, 0.25, 'formula/tier skor TIDAK berubah oleh corrective ini.');
    });

    console.log('\n=== R2/R3 — Semester II/Tahunan: saldo=40, realisasi KUMULATIF tahunan=25 (bukan cuma 8+2=10, bukan termasuk carry-forward 50) ===');
    await cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-08-20`, jenis_transaksi: 'penyaluran', volume: 8, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID)
      .then(async (trx) => uploadBuktiValid(b13Sem2.pengisian.id, 'STOK_TRANSAKSI', trx.id, 'dokumen_penyaluran'));
    const trxDesember = await cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-12-24`, jenis_transaksi: 'penyaluran', volume: 2, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
    await uploadBuktiValid(b13Sem2.pengisian.id, 'STOK_TRANSAKSI', trxDesember.id, 'dokumen_penyaluran');

    await test('R2 — hitungUlangB13 Semester II: realisasi TAHUNAN=25 (15 Sem I + 8+2 Sem II), BUKAN 10 (hanya Sem II)', async () => {
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.per_jenis.saldo_awal, 50, 'opening balance Semester II harus = carry-forward tersinkron (50).');
      assert.strictEqual(hasil.detail.saldo_akhir, 40, '50 - 8 - 2 = 40.');
      assert.strictEqual(hasil.detail.realisasi_penyaluran_ton, 25, 'R2: kumulatif TAHUNAN, bukan hanya Semester II sendiri.');
      assert.strictEqual(hasil.detail.capaian_persen, 61.54);
    });
    await test('R3 — carry-forward (50) TIDAK ikut dihitung sbg realisasi', async () => {
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.notStrictEqual(hasil.detail.realisasi_penyaluran_ton, hasil.detail.per_jenis.saldo_awal + hasil.detail.per_jenis.penyaluran, 'realisasi tidak boleh mencampur saldo_awal(carry-forward) dgn penyaluran Semester II sendiri (itu bukan definisi realisasi tahunan).');
      assert.strictEqual(hasil.detail.realisasi_penyaluran_ton, 25);
    });

    console.log('\n=== CF9 — self-heal: hitungUlangB13 Semester II mensinkronkan carry-forward OTOMATIS SEBELUM skoring, tanpa panggilan manual ===');
    await test('CF9 — Semester I berubah (penyaluran 15->10, closing 65->55) TANPA panggil pastikanCarryForward manual -> hitungUlangB13 Semester II otomatis pakai nilai live (55)', async () => {
      await cadanganPangan.updateTransaksi(trxPenyaluranSem1.id, { lock_version: 2, komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 10, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.per_jenis.saldo_awal, 55, 'self-heal harus terjadi otomatis di dalam hitungUlangB13, sebelum neraca dihitung.');
      // Kembalikan ke baseline bersih (65-15=50) utk test R5/R6 di bawah.
      await cadanganPangan.updateTransaksi(trxPenyaluranSem1.id, { lock_version: 3, komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-04-05`, jenis_transaksi: 'penyaluran', volume: 15, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.hitungUlangB13(b13Sem1.pengisian.id, TENANT_ID);
      const hasilRestore = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasilRestore.detail.per_jenis.saldo_awal, 50, 'baseline dipulihkan sebelum lanjut ke R5/R6.');
    });

    console.log('\n=== R5 — pengadaan/penerimaan/koreksi TIDAK menaikkan realisasi (hanya penyaluran) ===');
    await test('R5 — tambahan pengadaan 5 Ton mengubah saldo TAPI TIDAK mengubah realisasi', async () => {
      const trxPengadaan = await cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-09-01`, jenis_transaksi: 'pengadaan', volume: 5, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      await uploadBuktiValid(b13Sem2.pengisian.id, 'STOK_TRANSAKSI', trxPengadaan.id, 'dokumen_pengadaan');
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.saldo_akhir, 45, '50(carry-forward) + 5(pengadaan) - 8 - 2 = 45.');
      assert.strictEqual(hasil.detail.realisasi_penyaluran_ton, 25, 'realisasi TIDAK berubah krn pengadaan bukan penyaluran.');
    });

    console.log('\n=== R6 — transaksi penyaluran TIDAK eligible (tanpa bukti valid) TIDAK ikut realisasi (gate tidak dilonggarkan) ===');
    await test('R6 — penyaluran besar TANPA evidence tetap dikecualikan dari realisasi', async () => {
      await cadanganPangan.createTransaksi(b13Sem2.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-10-01`, jenis_transaksi: 'penyaluran', volume: 100, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const hasil = await ruleEngineService.hitungUlangB13(b13Sem2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.realisasi_penyaluran_ton, 25, 'penyaluran tanpa bukti valid harus TETAP dikecualikan dari realisasi, sama sprt dari saldo.');
    });

    console.log('\n=== TP1-TP5 — Target Provenance (murni fungsi hitungB13, TIDAK butuh DB) ===');
    const cutoffUji = `${TAHUN_UJI}-06-30`;
    await test('TP1 — target 65 tersedia (operasional) walau targetEvidenceValid=false; nomor_keputusan_kdh TIDAK ada di detail (bukan difabrikasi)', () => {
      const hasil = hitungB13([], { target_ton: 65, nomor_keputusan: null, tanggal_keputusan: null }, cutoffUji, false, [], null, '1');
      assert.strictEqual(hasil.detail.target_ton, 65);
      assert.strictEqual(hasil.detail.nomor_keputusan_kdh, undefined);
      assert.strictEqual(hasil.skor, 0);
      assert.ok(/KEPUTUSAN_KDH|Keputusan Kepala Daerah/.test(hasil.alasan));
    });
    await test('TP2 — Keputusan KDH valid tersedia -> nomor/tanggal keputusan tampil apa adanya di detail', () => {
      const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 65 }], { target_ton: 65, nomor_keputusan: 'KEPGUB/001/2093', tanggal_keputusan: '2093-01-01' }, cutoffUji, true, [], null, '1');
      assert.strictEqual(hasil.detail.nomor_keputusan_kdh, 'KEPGUB/001/2093');
      assert.strictEqual(hasil.detail.tanggal_keputusan_kdh, '2093-01-01');
    });
    await test('TP3 — target bersumber RKA (nomor/tanggal keputusan null) meski evidence-exempt -> TIDAK PERNAH memfabrikasi nomor_keputusan_kdh', () => {
      const hasil = hitungB13([{ jenis_transaksi: 'saldo_awal', volume: 65 }], { target_ton: 65, nomor_keputusan: null, tanggal_keputusan: null }, cutoffUji, true, [], null, '1');
      assert.strictEqual(hasil.detail.nomor_keputusan_kdh, null, 'RKA/DPA TIDAK PERNAH dinaikkan jadi instrumen legal — null harus tetap null, bukan diisi otomatis.');
      assert.strictEqual(hasil.detail.tanggal_keputusan_kdh, null);
      assert.strictEqual(hasil.detail.target_ton, 65, 'angka target operasional tetap tersedia utk kalkulasi internal.');
    });
    await test('TP4 — dasar legal hilang TIDAK mengubah angka target itu sendiri', () => {
      const hasilTanpaEvidence = hitungB13([], { target_ton: 65, nomor_keputusan: null, tanggal_keputusan: null }, cutoffUji, false, [], null, '1');
      const hasilDenganEvidence = hitungB13([], { target_ton: 65, nomor_keputusan: 'KEPGUB/002', tanggal_keputusan: '2093-02-01' }, cutoffUji, true, [], null, '1');
      assert.strictEqual(hasilTanpaEvidence.detail.target_ton, 65);
      assert.strictEqual(hasilDenganEvidence.detail.target_ton, 65);
    });
    await test('TP5 — perhitungan skor internal TIDAK dipengaruhi ada/tidaknya provenance regulatif', () => {
      const transaksi = [{ jenis_transaksi: 'saldo_awal', volume: 65 }, { jenis_transaksi: 'penyaluran', volume: 15 }];
      const hasilA = hitungB13(transaksi, { target_ton: 65, nomor_keputusan: 'A/1', tanggal_keputusan: '2093-01-01' }, cutoffUji, true, [], null, '1');
      const hasilB = hitungB13(transaksi, { target_ton: 65, nomor_keputusan: null, tanggal_keputusan: null }, cutoffUji, true, [], null, '1');
      assert.strictEqual(hasilA.skor, hasilB.skor);
      assert.strictEqual(hasilA.detail.capaian_persen, hasilB.detail.capaian_persen);
      assert.strictEqual(hasilA.detail.saldo_akhir, hasilB.detail.saldo_akhir);
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
        const buktiFiles = await db.ProsnBuktiDukung.findAll({ where: { periode_id: periodeId } });
        for (const b of buktiFiles) { if (fs.existsSync(b.file_path)) { try { fs.unlinkSync(b.file_path); } catch { /* no-op */ } } } // eslint-disable-line no-await-in-loop
        await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiDukung.destroy({ where: { periode_id: periodeId } });
        await db.ProsnStokTransaksi.destroy({ where: { periode_id: periodeId } });
        await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
        await db.ProsnIndikator.destroy({ where: { id: indikatorIds } });
        await db.ProsnPeriode.destroy({ where: { id: periodeId } });
      }
      await db.ProsnCadanganTarget.destroy({ where: { tenant_id: TENANT_ID, tahun_target: TAHUN_UJI } });
      console.log(`Periode uji tahun ${TAHUN_UJI} (id ${cleanup.periodeIds.join(',')}) dan target uji dihapus total.`);
    } catch (cleanupError) {
      console.error('CLEANUP ERROR:', cleanupError.stack || cleanupError.message);
    }
    try { fs.unlinkSync(DUMMY_FILE); } catch { /* no-op */ }
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
    process.exit(0);
  }
})();
