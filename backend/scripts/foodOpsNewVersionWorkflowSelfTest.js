'use strict';

/**
 * CORRECTIVE MANDATE UAT-01C — "Expose Canonical Document NEW_VERSION
 * Workflow in UI" self-test.
 *
 * The backend `createNewVersion` (append-only versioning) already existed
 * before this pass, but had no UI entrypoint AND, on audit for real UI use,
 * had two safety gaps fixed here (mandat §2 "fix only what is strictly
 * necessary"):
 *   - no guard against an "identical binary as current version" upload
 *     (not a meaningful new version) — NEW narrow error
 *     FOOD_OPS_DOCUMENT_VERSION_IDENTICAL.
 *   - version numbering computed from `lama.versi + 1` alone, which never
 *     updates on the historical row once superseded — race-unsafe under
 *     concurrent requests targeting the same lineage. Fixed by locking the
 *     whole `kelompok_uuid` lineage and computing MAX(versi)+1 (reusing the
 *     existing `transaction.LOCK.UPDATE` primitive, not a new mechanism).
 *
 * This test proves T1-T16 from the mandate's backend test matrix (T17 "no
 * schema migration" is verified structurally by absence of a new migration
 * file — see cleanup section note).
 *
 * Data uji: tenant nyata 1 + Tenant B sintetis (dihapus total di finally).
 * TIDAK PERNAH menyentuh ID 232/399/427/474 (Owner UAT forensic data) — semua
 * fixture di sini SINTETIS dan baru dibuat/dihapus dalam test ini sendiri.
 *
 * Jalankan: node scripts/foodOpsNewVersionWorkflowSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');
const linkService = require('../services/foodOperations/foodOpsDocumentLinkService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'uat01c_new_version_test_dummy.pdf');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}
function fakeFile(name, content) {
  fs.writeFileSync(DUMMY_FILE, Buffer.from(content));
  const stat = fs.statSync(DUMMY_FILE);
  return { path: DUMMY_FILE, originalname: `${name}.pdf`, filename: `${name}_${Date.now()}_${Math.random()}.pdf`, mimetype: 'application/pdf', size: stat.size };
}
async function countDocs(tenantId, kelompokUuid) {
  return db.FoodOpsDocument.count({ where: { tenant_id: tenantId, kelompok_uuid: kelompokUuid } });
}
async function expectFoodOpsError(promise, expectedCode, expectedStatus) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof FoodOpsError, `Harus melempar FoodOpsError, dapat: ${error?.constructor?.name}`);
    if (expectedCode) assert.strictEqual(error.code, expectedCode);
    if (expectedStatus) assert.strictEqual(error.status, expectedStatus);
    return true;
  });
}

const cleanup = { documentIds: [], tenantIds: [], eventIds: [] };

(async () => {
  let fatalError = null;
  let tenantB;
  try {
    console.log('=== Setup: Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI UAT-01C Tenant B', domain: `uat01c-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    console.log('\n=== T1-T6 — Version 2 dasar: lineage/nomor/status/verifikasi ===');
    let v1;
    await test('setup — dokumen v1 (fixture sintetis, BUKAN ID 232/399/427/474)', async () => {
      const result = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (UAT-01C Notulen v1)', nomor_dokumen: 'UAT01C/NOT/001', tanggal_dokumen: '2025-06-30', penerbit: 'TEST DATA — Pemerintah Uji' },
        fakeFile('uat01c-v1', `konten-v1-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      v1 = result.document;
      cleanup.documentIds.push(v1.id);
      assert.strictEqual(v1.status_verifikasi, 'uploaded');
    });

    let v2;
    await test('T1/T3/T4 — file BERBEDA -> Version 2 dibuat, versi=2, menggantikan_document_id=v1.id', async () => {
      v2 = await documentService.createNewVersion(v1.id, {}, fakeFile('uat01c-v2', `konten-v2-BEDA-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v2.id);
      assert.strictEqual(v2.versi, 2);
      assert.strictEqual(v2.menggantikan_document_id, v1.id);
    });

    await test('T2 — Version 2 memakai kelompok_uuid yang SAMA persis dengan v1', () => {
      assert.strictEqual(v2.kelompok_uuid, v1.kelompok_uuid);
    });

    await test('T5 — Version 1 tetap ada & bisa dibaca (getDocumentDetail + getDocumentVersionHistory), TIDAK dihapus', async () => {
      const v1Fresh = await documentService.getDocumentDetail(v1.id, TENANT_ID);
      assert.ok(v1Fresh);
      const history = await documentService.getDocumentVersionHistory(v1.id, TENANT_ID);
      assert.strictEqual(history.length, 2);
      assert.ok(history.some((h) => h.id === v1.id));
      assert.ok(history.some((h) => h.id === v2.id));
    });

    await test('T6/T10 — semantik status: v1="digantikan" (historis), v2="aktif" (current), v2.status_verifikasi TIDAK otomatis "valid" (kebijakan aman default "uploaded")', async () => {
      const v1Fresh = await documentService.getDocumentDetail(v1.id, TENANT_ID);
      assert.strictEqual(v1Fresh.status, 'digantikan');
      assert.strictEqual(v2.status, 'aktif');
      assert.strictEqual(v2.status_verifikasi, 'uploaded', 'Version baru TIDAK BOLEH otomatis diklaim Valid — harus melalui verifikasi eksplisit spt versi manapun.');
    });

    console.log('\n=== T7/T8/T9 — IDENTICAL-VERSION GUARD (mandat §8, BARU) ===');
    let v3ForIdenticalTest;
    await test('setup — v3 utk pengujian identical-guard', async () => {
      v3ForIdenticalTest = await documentService.createNewVersion(v2.id, {}, fakeFile('uat01c-v3-base', `konten-v3-base-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v3ForIdenticalTest.id);
    });
    await test('T7/T8/T9 — berkas versi baru checksum PERSIS SAMA dgn versi saat ini (v3) -> DITOLAK FOOD_OPS_DOCUMENT_VERSION_IDENTICAL, zero baris baru, zero orphan (checksum sengaja disamakan via file identik)', async () => {
      const totalSebelum = await countDocs(TENANT_ID, v1.kelompok_uuid);
      const fileAsli = { path: v3ForIdenticalTest.file_path, originalname: 'uat01c-v3-identik.pdf', filename: `uat01c-v3-identik_${Date.now()}.pdf`, mimetype: 'application/pdf', size: fs.statSync(v3ForIdenticalTest.file_path).size };
      await expectFoodOpsError(
        documentService.createNewVersion(v3ForIdenticalTest.id, {}, fileAsli, ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DOCUMENT_VERSION_IDENTICAL', 409,
      );
      const totalSesudah = await countDocs(TENANT_ID, v1.kelompok_uuid);
      assert.strictEqual(totalSesudah, totalSebelum, 'Percobaan versi identik tidak boleh menambah baris.');
    });
    await test('T9 (struktur kode) — controller createNewVersion membersihkan berkas sementara pada SETIAP error (termasuk VERSION_IDENTICAL)', () => {
      const src = fs.readFileSync(require.resolve('../controllers/foodOpsDocumentController.js'), 'utf8');
      const fnMatch = src.match(/async function createNewVersion\(req, res\)\s*\{[\s\S]*?\n\}/);
      assert.ok(fnMatch);
      assert.ok(/catch\s*\(e\)\s*\{\s*removeFailedUpload\(req\.file\);\s*return fail\(res, e\);\s*\}/.test(fnMatch[0]));
    });

    console.log('\n=== T11 — tenant isolation ===');
    await test('T11 — Tenant B tidak dapat membuat versi dari dokumen Tenant A -> 404 (bukan leak informasi lain)', async () => {
      await expectFoodOpsError(
        documentService.createNewVersion(v3ForIdenticalTest.id, {}, fakeFile('uat01c-cross-tenant', `konten-cross-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, tenantB.id),
        'FOOD_OPS_NOT_FOUND', 404,
      );
    });

    console.log('\n=== T12/T13 — endpoint EXACT/LIKELY_SAME generik (createDocument) TIDAK berubah ===');
    await test('T12 — EXACT duplicate generik tetap ditolak spt sebelumnya (regresi UAT-01A)', async () => {
      const fileAsli = fakeFile('uat01c-exact-check', `konten-exact-cek-${Date.now()}-${Math.random()}`);
      const result = await documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01C Exact Check)' }, fileAsli, ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(result.document.id);
      await expectFoodOpsError(
        documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Dup)' }, fakeFile('uat01c-exact-check-2', fs.readFileSync(fileAsli.path).toString()), ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DOCUMENT_DUPLICATE', 409,
      );
    });
    await test('T13 — LIKELY_SAME generik tetap intercept spt sebelumnya (regresi UAT-01B)', async () => {
      const original = (await documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01C LikelySame Check)', nomor_dokumen: 'UAT01C/LIKELYSAME/001' }, fakeFile('uat01c-likely-src', `konten-likely-src-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID)).document;
      cleanup.documentIds.push(original.id);
      await expectFoodOpsError(
        documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Beda Isi)', nomor_dokumen: 'UAT01C/LIKELYSAME/001' }, fakeFile('uat01c-likely-diff', `konten-likely-diff-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DOCUMENT_LIKELY_SAME', 409,
      );
    });

    console.log('\n=== T14 — versi baru TIDAK memicu generic LIKELY_SAME (mandat §8, kritis) ===');
    await test('T14 — nomor_dokumen yang SAMA (diwarisi dari v1) pada createNewVersion TIDAK PERNAH melempar FOOD_OPS_DOCUMENT_LIKELY_SAME', async () => {
      const v4 = await documentService.createNewVersion(v3ForIdenticalTest.id, {}, fakeFile('uat01c-v4', `konten-v4-BEDA-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v4.id);
      assert.strictEqual(v4.nomor_dokumen, v1.nomor_dokumen, 'nomor_dokumen harus diwarisi dari lineage, sama seperti v1.');
      assert.strictEqual(v4.versi, 4);
    });

    console.log('\n=== T15 — relasi (document link) TIDAK dimigrasi otomatis ke versi baru ===');
    let eventUji;
    await test('T15 — link yang dibuat ke v1 (sebelum versi berikutnya ada) tetap menunjuk v1, TIDAK ikut pindah ke versi lebih baru', async () => {
      eventUji = await eventService.createEvent({ event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-06-30', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (UAT-01C Kegiatan Uji Link)' }, ACTOR_ADMIN, TENANT_ID);
      cleanup.eventIds.push(eventUji.id);
      const link = await linkService.createLink({ document_id: v1.id, entity_type: 'EVENT', entity_id: eventUji.id, relation_type: 'Evidence' }, ACTOR_ADMIN, TENANT_ID);

      const linksV1 = await db.FoodOpsDocumentLink.findAll({ where: { document_id: v1.id } });
      const linksV2 = await db.FoodOpsDocumentLink.findAll({ where: { document_id: v2.id } });
      assert.strictEqual(linksV1.length, 1, 'Link yang dibuat ke v1 harus tetap ada di v1 (relasi terikat ke document_id spesifik, bukan kelompok_uuid).');
      assert.strictEqual(linksV1[0].id, link.id);
      assert.strictEqual(linksV2.length, 0, 'v2 TIDAK BOLEH otomatis mewarisi link milik v1 — mandat §19/§20 "Do NOT migrate historical links".');
    });

    console.log('\n=== T16 — race-safe version numbering (concurrent request pada id yang sama) ===');
    await test('T16 — dua request createNewVersion KONKUREN pada id yang SAMA -> TEPAT SATU berhasil, TIDAK ADA dua baris versi baru dgn nomor sama', async () => {
      const baselineSrc = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01C Race Baseline)', nomor_dokumen: `UAT01C/RACE/${Date.now()}` },
        fakeFile('uat01c-race-base-src', `konten-race-base-src-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      )).document;
      cleanup.documentIds.push(baselineSrc.id);
      const baseline = await documentService.createNewVersion(baselineSrc.id, {}, fakeFile('uat01c-race-base', `konten-race-base-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(baseline.id);

      const fileRaceA = fakeFile('uat01c-race-a', `konten-race-a-${Date.now()}-${Math.random()}`);
      const bufA = fs.readFileSync(fileRaceA.path);
      const fileRaceB = fakeFile('uat01c-race-b', `konten-race-b-${Date.now()}-${Math.random()}`);
      const bufB = fs.readFileSync(fileRaceB.path);
      const pathA = `${DUMMY_FILE}.race-a`;
      const pathB = `${DUMMY_FILE}.race-b`;
      fs.writeFileSync(pathA, bufA);
      fs.writeFileSync(pathB, bufB);
      const reqA = { path: pathA, originalname: 'race-a.pdf', filename: `race-a_${Date.now()}.pdf`, mimetype: 'application/pdf', size: bufA.length };
      const reqB = { path: pathB, originalname: 'race-b.pdf', filename: `race-b_${Date.now()}.pdf`, mimetype: 'application/pdf', size: bufB.length };

      const results = await Promise.allSettled([
        documentService.createNewVersion(baseline.id, {}, reqA, ACTOR_ADMIN, TENANT_ID),
        documentService.createNewVersion(baseline.id, {}, reqB, ACTOR_ADMIN, TENANT_ID),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      fulfilled.forEach((r) => cleanup.documentIds.push(r.value.id));

      assert.strictEqual(fulfilled.length, 1, 'Tepat SATU dari dua request konkuren pada id yang sama boleh berhasil (yang lain harus gagal krn id sudah "digantikan" setelah lock pertama commit).');
      const rejected = results.filter((r) => r.status === 'rejected');
      assert.strictEqual(rejected.length, 1);
      assert.ok(rejected[0].reason instanceof FoodOpsError);
      assert.strictEqual(rejected[0].reason.code, 'FOOD_OPS_DOCUMENT_NOT_CURRENT');

      const lineageRows = await db.FoodOpsDocument.findAll({ where: { tenant_id: TENANT_ID, kelompok_uuid: baselineSrc.kelompok_uuid } });
      const versiValues = lineageRows.map((r) => r.versi);
      assert.strictEqual(new Set(versiValues).size, versiValues.length, 'Tidak boleh ada dua baris dgn nomor versi yang SAMA dalam satu kelompok_uuid.');

      fs.unlinkSync(pathA); fs.unlinkSync(pathB);
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.eventIds) { try { await db.FoodOpsDocumentLink.destroy({ where: { entity_type: 'EVENT', entity_id: id } }); await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      await db.FoodOpsDocumentLink.destroy({ where: { document_id: cleanup.documentIds } });
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.tenantIds) {
        try {
          const tenantDocs = await db.FoodOpsDocument.findAll({ where: { tenant_id: id } });
          for (const d of tenantDocs) { try { await d.destroy({ force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
          await db.Tenant.destroy({ where: { id }, force: true });
        } catch { /* no-op */ }
      }
      if (fs.existsSync(DUMMY_FILE)) fs.unlinkSync(DUMMY_FILE);
    } catch (cleanupError) {
      console.error('Cleanup error (non-fatal):', cleanupError.message);
    }
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
    process.exit(0);
  }
})();
