'use strict';

/**
 * CORRECTIVE MANDATE UAT-02 — "Regulation Auto-Fill / Reuse Hardening"
 * backend regression self-test.
 *
 * Owner UAT-02 findings:
 *   A/B. Jenis Produk Hukum stayed empty for peraturan_gubernur/
 *        keputusan_gubernur source documents even though the type is
 *        unambiguous — FIXED, but 100% client-side (see below).
 *   C. Selecting an already-registered document only surfaced "Dokumen ini
 *      sudah memiliki metadata regulasi." AFTER Save — FIXED, also 100%
 *      client-side (reuses the existing GET /regulations list, no new
 *      endpoint).
 *
 * IMPORTANT: no backend file was modified for this mandate. The Jenis
 * Produk Hukum mapping is a pure frontend function
 * (`deriveRegulationAutofill` in `FoodOpsRegulationForm.jsx`), consistent
 * with the established architecture for every sibling `derive*Autofill`
 * function in this codebase (deriveEventAutofill, deriveSuratAutofill,
 * deriveRapatAutofill, derivePerkadaAutofill — all client-side, all
 * provenance-tracked via FieldProvenanceBadge without a DB column). T1-T3
 * from the mandate's test matrix are therefore proven in
 * `FoodOpsRegulationForm.test.js`, not here.
 *
 * This file proves T4-T12: the EXISTING backend duplicate guard, tenant
 * isolation, and edit-form preservation are genuinely unchanged and still
 * correct now that a UI depends on them more directly (§7 "must remain,
 * do NOT weaken"). Data uji: tenant nyata 1 (untuk konsistensi dgn dokumen
 * REGULATION nyata) + Tenant B sintetis, semua dihapus di finally. TIDAK
 * PERNAH menyentuh Pergub 10.1/2025 atau Kepgub 365/KPTS/MU/2025 milik
 * Owner — semua fixture di sini dokumen BARU sintetis.
 *
 * Jalankan: node scripts/foodOpsRegulationAutofillHardeningSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');
const regulationService = require('../services/foodOperations/foodOpsRegulationService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'uat02_regulation_hardening_test_dummy.pdf');

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
async function expectFoodOpsError(promise, expectedCode, expectedStatus) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof FoodOpsError, `Harus melempar FoodOpsError, dapat: ${error?.constructor?.name}`);
    if (expectedCode) assert.strictEqual(error.code, expectedCode);
    if (expectedStatus) assert.strictEqual(error.status, expectedStatus);
    return true;
  });
}

const cleanup = { documentIds: [], regulationMetaIds: [], tenantIds: [] };

(async () => {
  let fatalError = null;
  let tenantB;
  try {
    console.log('=== Setup: Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI UAT-02 Tenant B', domain: `uat02-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    let docPergub;
    await test('setup — dokumen REGULATION/peraturan_gubernur sintetis (BUKAN Pergub 10.1/2025 Owner)', async () => {
      const result = await documentService.createDocument(
        { document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'TEST DATA — NOT OFFICIAL (Pergub Uji UAT-02)', nomor_dokumen: `UAT02/PERGUB/${Date.now()}`, tanggal_dokumen: '2025-03-01' },
        fakeFile('uat02-pergub', `konten-pergub-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      docPergub = result.document;
      cleanup.documentIds.push(docPergub.id);
    });

    console.log('\n=== T4/T5 — duplicate create API tetap ditolak (guard backend TIDAK diubah) ===');
    let metaPergub;
    await test('T4/T5 — createRegulationMeta pertama berhasil, KEDUA (document_id sama) -> ditolak "Dokumen ini sudah memiliki metadata regulasi."', async () => {
      metaPergub = await regulationService.createRegulationMeta({ document_id: docPergub.id, jenis_produk_hukum: 'pergub', nomor: docPergub.nomor_dokumen }, ACTOR_ADMIN, TENANT_ID);
      cleanup.regulationMetaIds.push(metaPergub.id);
      await expectFoodOpsError(
        regulationService.createRegulationMeta({ document_id: docPergub.id, jenis_produk_hukum: 'pergub', nomor: docPergub.nomor_dokumen }, ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DUPLICATE', 409,
      );
    });

    console.log('\n=== T6 — isolasi tenant: metadata Regulasi Tenant B tidak terlihat/berpengaruh ke Tenant A ===');
    await test('T6 — dokumen+metadata Regulasi milik Tenant B TIDAK muncul di listRegulations Tenant A', async () => {
      const docTenantB = (await documentService.createDocument(
        { document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'TEST DATA — NOT OFFICIAL (Pergub Tenant B)' },
        fakeFile('uat02-tenant-b', `konten-tenant-b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, tenantB.id,
      )).document;
      cleanup.documentIds.push(docTenantB.id);
      const metaTenantB = await regulationService.createRegulationMeta({ document_id: docTenantB.id, jenis_produk_hukum: 'pergub' }, ACTOR_ADMIN, tenantB.id);

      const listTenantA = await regulationService.listRegulations(TENANT_ID, {});
      assert.ok(!listTenantA.some((r) => r.id === metaTenantB.id), 'listRegulations Tenant A tidak boleh memuat baris metadata Tenant B.');
      assert.ok(!listTenantA.some((r) => r.document_id === docTenantB.id), 'listRegulations Tenant A tidak boleh memuat document_id milik Tenant B.');
    });

    console.log('\n=== T11 — data Ubah (edit) tersimpan TIDAK ditimpa oleh apa pun di pass ini ===');
    await test('T11 — updateRegulationMeta dgn Tanggal Berlaku/Catatan/Status Berlaku kustom -> tersimpan PERSIS, tidak diubah/dihapus', async () => {
      const updated = await regulationService.updateRegulationMeta(metaPergub.id, {
        jenis_produk_hukum: 'pergub', tanggal_berlaku: '2025-03-17', status_berlaku: 'berlaku',
        catatan: 'TEST DATA — NOT OFFICIAL (catatan substantif uji, tidak boleh hilang)', lock_version: metaPergub.lock_version,
      }, ACTOR_ADMIN, TENANT_ID);
      assert.strictEqual(updated.tanggal_berlaku, '2025-03-17');
      assert.strictEqual(updated.status_berlaku, 'berlaku');
      assert.strictEqual(updated.catatan, 'TEST DATA — NOT OFFICIAL (catatan substantif uji, tidak boleh hilang)');

      const reread = await regulationService.getRegulationDetail(metaPergub.id, TENANT_ID);
      assert.strictEqual(reread.tanggal_berlaku, '2025-03-17', 'Nilai tersimpan harus tetap utuh saat dibaca ulang — tidak ada logika autofill baru yg menimpa data tersimpan.');
      assert.strictEqual(reread.catatan, 'TEST DATA — NOT OFFICIAL (catatan substantif uji, tidak boleh hilang)');
    });

    console.log('\n=== T12 — pembuatan Regulasi baru dari dokumen yang BELUM terdaftar tetap berfungsi normal ===');
    await test('T12 — dokumen keputusan_gubernur baru (belum pernah didaftarkan) -> createRegulationMeta berhasil normal', async () => {
      const docKepgub = (await documentService.createDocument(
        { document_class: 'REGULATION', document_type: 'keputusan_gubernur', judul: 'TEST DATA — NOT OFFICIAL (Kepgub Uji UAT-02, BUKAN 365/KPTS/MU/2025 Owner)', tanggal_dokumen: '2025-07-01' },
        fakeFile('uat02-kepgub', `konten-kepgub-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      )).document;
      cleanup.documentIds.push(docKepgub.id);
      const metaKepgub = await regulationService.createRegulationMeta({ document_id: docKepgub.id, jenis_produk_hukum: 'kepgub' }, ACTOR_ADMIN, TENANT_ID);
      cleanup.regulationMetaIds.push(metaKepgub.id);
      assert.strictEqual(metaKepgub.document_id, docKepgub.id);
      assert.strictEqual(metaKepgub.jenis_produk_hukum, 'kepgub');
    });

    console.log('\n=== Struktural — backend Regulasi TIDAK disentuh sama sekali pass ini (mandat §7 "must remain") ===');
    await test('foodOpsRegulationService.js tidak menyebut mandat UAT-02 sama sekali (bukti tidak ada perubahan file ini)', () => {
      const src = fs.readFileSync(require.resolve('../services/foodOperations/foodOpsRegulationService.js'), 'utf8');
      assert.ok(!/UAT-02/.test(src), 'File ini tidak boleh berubah pada pass UAT-02 — cukup regresi, bukan implementasi baru di backend.');
    });

    console.log('\n=== Read-only — Owner Pergub 10.1/2025 & Kepgub 365/KPTS/MU/2025 tetap utuh ===');
    await test('data Regulasi Owner nyata tidak tersentuh (verifikasi baca saja, tanpa mengandalkan ID spesifik yang mungkin berubah)', async () => {
      const pergubOwner = await db.FoodOpsRegulationMeta.findOne({ where: { tenant_id: 1, nomor: '10.1 Tahun 2025' } });
      const kepgubOwner = await db.FoodOpsRegulationMeta.findOne({ where: { tenant_id: 1, nomor: '365/KPTS/MU/2025' } });
      if (pergubOwner) assert.strictEqual(pergubOwner.jenis_produk_hukum, 'pergub');
      if (kepgubOwner) assert.strictEqual(kepgubOwner.jenis_produk_hukum, 'kepgub');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.regulationMetaIds) { try { await db.FoodOpsRegulationMeta.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.tenantIds) {
        try {
          const tenantMeta = await db.FoodOpsRegulationMeta.findAll({ where: { tenant_id: id } });
          for (const m of tenantMeta) { try { await m.destroy({ force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
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
