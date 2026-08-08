'use strict';

/**
 * Spesifikasi 35 v3 — Fase 1 self-test (Test P: Admin Mapping Ownership).
 * Dijalankan langsung: `node scripts/prosnpAutofillFase1SelfTest.js`.
 * TIDAK menyentuh data ProSN production selain 1 baris master_indikator
 * (`indikator_renstra_id`, nullable, dikembalikan ke NULL di akhir) dan
 * ActivityLog test yang dihapus lagi di akhir (try/finally).
 */
const db = require('./../models');
const masterIndikatorService = require('../services/prosnp/prosnpMasterIndikatorService');
const { isOwnedBy, assertRenstraOwnershipAmong } = require('../services/prosnp/autofill/renstraOwnershipValidator');
const { ProsnError } = require('../services/prosnp/prosnpWorkflowService');

let pass = 0, fail = 0;
async function step(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

(async () => {
  const MASTER_ID = 1; // B.1.1, Ketahanan Pangan — sah OPD = opd_penanggung_jawab_id 107 (Dinas Pangan)
  const INDIKATOR_RENSTRA_MATCH_ID = 250; // renstra_id=1 -> RenstraOPD.opd_id=107, cocok
  const adminActor = { id: 999001, role: 'ADMINISTRATOR' };
  const pelaksanaActor = { id: 999002, role: 'PELAKSANA' };
  const activityLogIdsCreated = [];
  let originalMapping = null;

  try {
    const before = await db.ProsnMasterIndikator.findByPk(MASTER_ID);
    originalMapping = before.indikator_renstra_id;
    assert(originalMapping === null, `Pre-kondisi: indikator_renstra_id master B.1.1 diharapkan NULL sebelum test, ditemukan ${originalMapping}.`);

    // --- Unit test murni (tidak menyentuh DB): perbandingan ownership ---
    await step('Unit: isOwnedBy() true bila RenstraOPD.opd_id sama persis', async () => {
      const fake = { renstra: { opd_id: 107 } };
      assert(isOwnedBy(fake, 107) === true, 'isOwnedBy seharusnya true.');
    });
    await step('Unit: isOwnedBy() false bila RenstraOPD.opd_id berbeda', async () => {
      const fake = { renstra: { opd_id: 999 } };
      assert(isOwnedBy(fake, 107) === false, 'isOwnedBy seharusnya false.');
    });
    await step('Unit: assertRenstraOwnershipAmong() THROW INDICATOR_MAPPING_OPD_MISMATCH bila tidak ada OPD sah yang cocok', async () => {
      const fake = { renstra: { opd_id: 999 } };
      let threw = null;
      try { assertRenstraOwnershipAmong(fake, [107, 3]); } catch (e) { threw = e; }
      assert(threw instanceof ProsnError, 'Seharusnya melempar ProsnError.');
      assert(threw.code === 'INDICATOR_MAPPING_OPD_MISMATCH', `Kode salah: ${threw.code}`);
      assert(threw.status === 422, `Status salah: ${threw.status}`);
    });
    await step('Unit: assertRenstraOwnershipAmong() TIDAK throw bila salah satu OPD sah cocok', async () => {
      const fake = { renstra: { opd_id: 107 } };
      assertRenstraOwnershipAmong(fake, [3, 107]); // tidak boleh throw
    });

    // --- Endpoint/service test (menyentuh DB nyata, dibersihkan di finally) ---
    await step('Non-admin (PELAKSANA) DITOLAK set mapping (403 PROSNP_FORBIDDEN)', async () => {
      let threw = null;
      try { await masterIndikatorService.setIndikatorRenstraMapping(MASTER_ID, INDIKATOR_RENSTRA_MATCH_ID, pelaksanaActor, 1); }
      catch (e) { threw = e; }
      assert(threw instanceof ProsnError, 'Seharusnya melempar ProsnError.');
      assert(threw.status === 403 && threw.code === 'PROSNP_FORBIDDEN', `Salah: status=${threw.status} code=${threw.code}`);
    });

    await step('Admin BERHASIL set mapping ke IndikatorRenstra milik OPD yang sah (Dinas Pangan)', async () => {
      const result = await masterIndikatorService.setIndikatorRenstraMapping(MASTER_ID, INDIKATOR_RENSTRA_MATCH_ID, adminActor, 1);
      assert(result.mapping_previous === null, 'mapping_previous seharusnya NULL sebelum test ini.');
      assert(result.mapping_new === INDIKATOR_RENSTRA_MATCH_ID, `mapping_new salah: ${result.mapping_new}`);
      const reloaded = await db.ProsnMasterIndikator.findByPk(MASTER_ID);
      assert(Number(reloaded.indikator_renstra_id) === INDIKATOR_RENSTRA_MATCH_ID, 'Kolom DB tidak ter-update.');
      const log = await db.ActivityLog.findOne({ where: { action: 'prosnp_set_indikator_renstra_mapping', entity_id: MASTER_ID, user_id: adminActor.id }, order: [['id', 'DESC']] });
      assert(log, 'ActivityLog tidak tercatat.');
      assert(log.new_data?.indikator_renstra_id === INDIKATOR_RENSTRA_MATCH_ID, 'ActivityLog.new_data salah.');
      activityLogIdsCreated.push(log.id);
    });

    await step('Set ulang dgn nilai SAMA = idempotent no-op (mapping_previous === mapping_new)', async () => {
      const result = await masterIndikatorService.setIndikatorRenstraMapping(MASTER_ID, INDIKATOR_RENSTRA_MATCH_ID, adminActor, 1);
      assert(result.mapping_previous === INDIKATOR_RENSTRA_MATCH_ID && result.mapping_new === INDIKATOR_RENSTRA_MATCH_ID, 'Seharusnya no-op (previous === new).');
      const log = await db.ActivityLog.findOne({ where: { action: 'prosnp_set_indikator_renstra_mapping', entity_id: MASTER_ID, user_id: adminActor.id }, order: [['id', 'DESC']] });
      if (log && !activityLogIdsCreated.includes(log.id)) activityLogIdsCreated.push(log.id);
    });

    await step('Set indikator_renstra_id=null (hapus mapping) TIDAK memerlukan ownership check dan berhasil', async () => {
      const result = await masterIndikatorService.setIndikatorRenstraMapping(MASTER_ID, null, adminActor, 1);
      assert(result.mapping_new === null, 'mapping_new seharusnya NULL.');
      const reloaded = await db.ProsnMasterIndikator.findByPk(MASTER_ID);
      assert(reloaded.indikator_renstra_id === null, 'Kolom DB seharusnya kembali NULL.');
      const log = await db.ActivityLog.findOne({ where: { action: 'prosnp_set_indikator_renstra_mapping', entity_id: MASTER_ID, user_id: adminActor.id }, order: [['id', 'DESC']] });
      if (log && !activityLogIdsCreated.includes(log.id)) activityLogIdsCreated.push(log.id);
    });

    await step('indikator_renstra_id menunjuk baris tidak ada -> 404 PROSNP_NOT_FOUND', async () => {
      let threw = null;
      try { await masterIndikatorService.setIndikatorRenstraMapping(MASTER_ID, 999999999, adminActor, 1); }
      catch (e) { threw = e; }
      assert(threw instanceof ProsnError, 'Seharusnya melempar ProsnError.');
      assert(threw.status === 404 && threw.code === 'PROSNP_NOT_FOUND', `Salah: status=${threw.status} code=${threw.code}`);
    });

    console.log(`\n=== HASIL TEST P (Admin Mapping Ownership): ${pass} lulus, ${fail} gagal ===`);
  } finally {
    // Cleanup: kembalikan kolom ke NULL (state awal) + hapus ActivityLog buatan test.
    await db.ProsnMasterIndikator.update({ indikator_renstra_id: originalMapping }, { where: { id: MASTER_ID } });
    if (activityLogIdsCreated.length) await db.ActivityLog.destroy({ where: { id: activityLogIdsCreated } });
    const finalCheck = await db.ProsnMasterIndikator.findByPk(MASTER_ID);
    console.log(`Cleanup selesai — indikator_renstra_id master B.1.1 dikembalikan ke: ${finalCheck.indikator_renstra_id}`);
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((error) => {
  console.error('FATAL ERROR:', error.stack || error.message);
  process.exit(1);
});
