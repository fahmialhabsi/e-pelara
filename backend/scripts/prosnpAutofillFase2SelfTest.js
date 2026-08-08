'use strict';

/**
 * Spesifikasi 35 v3 — Fase 2 self-test (Test C: Evidence Rebind, Test D:
 * Cross-Indicator Leakage) + primitive serialization §31 STEP 2. `/autofill-apply`
 * belum ada (Fase 5) — Test C/D di sini menguji `prosnpEvidenceRebindService`
 * langsung, sesuai cakupan Fase 2. Q/R (retry/concurrent penuh via endpoint)
 * menyusul Fase 5.
 *
 * Periode uji tahun fiktif '2098' (BUKAN '2099' — dipakai `prosnpIntegrationSelfTest.js`
 * lain, hindari kolisi bila dijalankan berdekatan), dibuat & dihapus sendiri.
 * Jalankan: node scripts/prosnpAutofillFase2SelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const workflow = require('../services/prosnp/prosnpWorkflowService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const rapatService = require('../services/prosnp/prosnpRapatForkopimdaService');
const rebindService = require('../services/prosnp/prosnpEvidenceRebindService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2098';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'prosnp_autofill_fase2_test_dummy.pdf');

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
async function uploadStaging(pengisianId, actor) {
  return workflow.createBukti(pengisianId, { judul: 'Bukti staging autofill', entity_type: 'PENGISIAN' }, fakeFile('staging'), actor, TENANT_ID);
}

(async () => {
  let periode;
  try {
    console.log('=== Setup: buat periode uji tahun 2098 (TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Autofill Fase 2 Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    const indikator = await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const b11 = indikator.find((i) => i.kode === 'B.1.1');
    const b12 = indikator.find((i) => i.kode === 'B.1.2');
    console.log(`  Periode uji dibuat: id=${periode.id}, pengisian B.1.1=${b11.pengisian.id}, B.1.2=${b12.pengisian.id}`);

    await test('lockStagingPengisianBinding() THROW PROSNP_EVIDENCE_NOT_STAGED bila belum pernah upload staging', async () => {
      await assert.rejects(
        () => db.sequelize.transaction((t) => rebindService.lockStagingPengisianBinding(999999999, b11.pengisian.id, TENANT_ID, t)),
        (e) => e.code === 'PROSNP_EVIDENCE_NOT_STAGED',
      );
    });

    let stagingBukti;
    await test('Upload staging PENGISIAN berhasil sebelum entity ada (Test B, prasyarat Fase 2)', async () => {
      stagingBukti = await uploadStaging(b11.pengisian.id, ACTOR_OPERATOR);
      assert.ok(stagingBukti.id, 'Bukti staging harus punya id.');
      const link = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: stagingBukti.id, entity_type: 'PENGISIAN' } });
      assert.ok(link, 'Binding staging PENGISIAN harus ada.');
    });

    await test('lockStagingPengisianBinding() BERHASIL mengunci baris staging yang sudah ada', async () => {
      const row = await db.sequelize.transaction((t) => rebindService.lockStagingPengisianBinding(stagingBukti.id, b11.pengisian.id, TENANT_ID, t));
      assert.strictEqual(row.entity_type, 'PENGISIAN');
      assert.strictEqual(Number(row.bukti_dukung_id), stagingBukti.id);
    });

    let suratB11;
    await test('TEST C — rebind ke entity SURAT_PENUGASAN benar: link baru dgn entity_id benar, staging PENGISIAN tetap ada', async () => {
      suratB11 = await suratService.create(b11.pengisian.id, {
        nomor_surat: 'UJI-FASE2/001', tanggal_surat: `${TAHUN_UJI}-01-05`, pejabat_penandatangan: 'Uji Fase 2', ringkasan_isi: 'uji rebind', cakupan_pengadaan: true,
      }, ACTOR_OPERATOR, TENANT_ID);
      const result = await rebindService.rebindBuktiKeEntity(stagingBukti.id, 'SURAT_PENUGASAN', suratB11.id, 'surat_penugasan', ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(result.created, true, 'created harus true pada rebind pertama.');
      assert.strictEqual(Number(result.link.entity_id), suratB11.id, 'entity_id link harus sama dgn surat yang baru dibuat.');
      assert.strictEqual(result.link.entity_type, 'SURAT_PENUGASAN');

      const stagingMasihAda = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: stagingBukti.id, entity_type: 'PENGISIAN' } });
      assert.ok(stagingMasihAda, 'Binding staging PENGISIAN lama harus TETAP ADA (additive, bukan replace).');

      const jumlahLink = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: stagingBukti.id } });
      assert.strictEqual(jumlahLink, 2, 'Harus ada tepat 2 link: staging PENGISIAN + SURAT_PENUGASAN baru.');
    });

    await test('Rebind ulang identity SAMA PERSIS = idempotent (created:false, tidak duplikat link)', async () => {
      const result = await rebindService.rebindBuktiKeEntity(stagingBukti.id, 'SURAT_PENUGASAN', suratB11.id, 'surat_penugasan', ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(result.created, false, 'Rebind kedua dgn identity sama harus idempotent (created:false).');
      const jumlahLink = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: stagingBukti.id, entity_type: 'SURAT_PENUGASAN', entity_id: suratB11.id } });
      assert.strictEqual(jumlahLink, 1, 'Tidak boleh ada duplikat link SURAT_PENUGASAN utk identity yang sama.');
    });

    await test('Rebind dgn kategori tidak valid utk entityType ditolak (PROSNP_EVIDENCE_KATEGORI_INVALID)', async () => {
      await assert.rejects(
        () => rebindService.rebindBuktiKeEntity(stagingBukti.id, 'SURAT_PENUGASAN', suratB11.id, 'kategori_ngawur', ACTOR_OPERATOR, TENANT_ID),
        (e) => e.code === 'PROSNP_EVIDENCE_KATEGORI_INVALID',
      );
    });

    await test('TEST D — Cross-Indicator Leakage: rebind paksa bukti staging B.1.1 ke entity B.1.2 DITOLAK (PROSNP_EVIDENCE_CROSS_PENGISIAN)', async () => {
      const rapatB12 = await rapatService.create(b12.pengisian.id, {
        tanggal_rapat: `${TAHUN_UJI}-02-10`, nama_forum: 'Rapat Uji Fase 2', is_forkopimda: true, topik_pengadaan: true,
      }, ACTOR_OPERATOR, TENANT_ID);
      await assert.rejects(
        () => rebindService.rebindBuktiKeEntity(stagingBukti.id, 'RAPAT_FORKOPIMDA', rapatB12.id, 'undangan', ACTOR_OPERATOR, TENANT_ID),
        (e) => e.code === 'PROSNP_EVIDENCE_CROSS_PENGISIAN',
      );
      const bocor = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: stagingBukti.id, entity_type: 'RAPAT_FORKOPIMDA' } });
      assert.strictEqual(bocor, null, 'TIDAK boleh ada link RAPAT_FORKOPIMDA tercipta akibat percobaan cross-pengisian.');
    });

    await test('entity_type tidak dikenal DITOLAK (PROSNP_EVIDENCE_ENTITY_TYPE_INVALID)', async () => {
      await assert.rejects(
        () => rebindService.rebindBuktiKeEntity(stagingBukti.id, 'TIPE_TIDAK_ADA', 1, 'lainnya', ACTOR_OPERATOR, TENANT_ID),
        (e) => e.code === 'PROSNP_EVIDENCE_ENTITY_TYPE_INVALID',
      );
    });

    await test('rebind bukti yang belum pernah staging (bukti_id acak) DITOLAK 404', async () => {
      await assert.rejects(
        () => rebindService.rebindBuktiKeEntity(999999999, 'SURAT_PENUGASAN', suratB11.id, 'surat_penugasan', ACTOR_OPERATOR, TENANT_ID),
        (e) => e.status === 404,
      );
    });

    console.log(`\n=== HASIL TEST FASE 2 (B/C/D + serialization primitive): ${pass} lulus, ${fail} gagal ===`);
  } catch (fatal) {
    fail++;
    console.error('FATAL SETUP ERROR:', fatal.stack || fatal.message);
  } finally {
    if (periode) {
      console.log('\n=== Cleanup: hapus seluruh data uji periode 2098 ===');
      const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
      const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
      await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnBuktiDukung.destroy({ where: { periode_id: periode.id } });
      await db.ProsnSuratPenugasan.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRapatForkopimda.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
      await db.ProsnIndikator.destroy({ where: { periode_id: periode.id } });
      await db.ProsnPeriode.destroy({ where: { id: periode.id } });
      if (fs.existsSync(DUMMY_FILE)) fs.unlinkSync(DUMMY_FILE);
      console.log('  Cleanup selesai — periode uji 2098 dan seluruh data anaknya dihapus.');
    }
  }
  process.exit(fail > 0 ? 1 : 0);
})();
