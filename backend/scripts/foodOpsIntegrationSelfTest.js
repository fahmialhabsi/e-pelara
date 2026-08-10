'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Self-test integrasi (DB nyata),
 * mandat §58/§59. Sintetis, isolated, self-cleaning — tenant sungguhan
 * dibuat khusus utk pass ini (id baru, DIHAPUS TOTAL di finally), TIDAK
 * PERNAH menyentuh tenant produksi/tabel ProSN.
 *
 * Jalankan: node scripts/foodOpsIntegrationSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const documentService = require('../services/foodOperations/foodOpsDocumentService');
const regulationService = require('../services/foodOperations/foodOpsRegulationService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const ACTOR = { id: 23, role: 'PELAKSANA' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'food_ops_integration_test_dummy.pdf');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

function fakeFile(name, content) {
  fs.writeFileSync(DUMMY_FILE, Buffer.from(content || `%PDF-1.4 dummy ${name} ${Date.now()}`));
  const stat = fs.statSync(DUMMY_FILE);
  return { path: DUMMY_FILE, originalname: `${name}.pdf`, filename: `${name}_${Date.now()}.pdf`, mimetype: 'application/pdf', size: stat.size };
}

const cleanup = { tenantIds: [], documentIds: [], regulationIds: [], eventIds: [] };

(async () => {
  let fatalError = null;
  let tenantA, tenantB;
  try {
    console.log('=== Setup: tenant uji A & B (TEST DATA — NOT OFFICIAL) ===');
    tenantA = await db.Tenant.create({ nama: 'UJI FoodOps Tenant A', domain: `foodops-test-a-${Date.now()}.local`, is_active: true });
    tenantB = await db.Tenant.create({ nama: 'UJI FoodOps Tenant B', domain: `foodops-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantA.id, tenantB.id);
    console.log(`  Tenant A id=${tenantA.id}, Tenant B id=${tenantB.id}`);

    // === DOCUMENT (mandat §59) ===
    console.log('\n=== DOCUMENT ===');
    let docV1;
    await test('create — dokumen baru versi 1', async () => {
      const result = await documentService.createDocument({
        document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'Notulen Uji FoodOps',
      }, fakeFile('notulen-uji'), ACTOR, tenantA.id);
      docV1 = result.document;
      cleanup.documentIds.push(docV1.id);
      assert.strictEqual(docV1.versi, 1);
      assert.strictEqual(docV1.status, 'aktif');
      assert.ok(docV1.checksum_sha256 && docV1.checksum_sha256.length === 64);
    });
    await test('read — getDocumentDetail mengembalikan dokumen yang baru dibuat', async () => {
      const row = await documentService.getDocumentDetail(docV1.id, tenantA.id);
      assert.strictEqual(row.id, docV1.id);
    });
    await test('list — dokumen muncul di listDocuments tenant A', async () => {
      const rows = await documentService.listDocuments(tenantA.id, {});
      assert.ok(rows.some((r) => r.id === docV1.id));
    });
    let docV2;
    await test('create version 2 — kelompok_uuid sama, versi bertambah, versi lama jadi digantikan', async () => {
      docV2 = await documentService.createNewVersion(docV1.id, { judul: 'Notulen Uji FoodOps (revisi)' }, fakeFile('notulen-uji-v2'), ACTOR, tenantA.id);
      cleanup.documentIds.push(docV2.id);
      assert.strictEqual(docV2.versi, 2);
      assert.strictEqual(docV2.kelompok_uuid, docV1.kelompok_uuid);
      assert.strictEqual(docV2.menggantikan_document_id, docV1.id);
      const lama = await documentService.getDocumentDetail(docV1.id, tenantA.id);
      assert.strictEqual(lama.status, 'digantikan');
    });
    await test('checksum — versi 1 dan versi 2 punya checksum berbeda (isi berbeda)', async () => {
      assert.notStrictEqual(docV1.checksum_sha256, docV2.checksum_sha256);
    });
    let docDup;
    await test('duplicate handling — unggah ulang isi PERSIS SAMA -> ditandai duplicate_of, TIDAK menolak keras', async () => {
      const contohIsi = `%PDF-1.4 dummy konten-identik ${Date.now()}`;
      const first = await documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'Dok A' }, fakeFile('dupe-a', contohIsi), ACTOR, tenantA.id);
      cleanup.documentIds.push(first.document.id);
      const second = await documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'Dok B (isi sama)' }, fakeFile('dupe-b', contohIsi), ACTOR, tenantA.id);
      cleanup.documentIds.push(second.document.id);
      docDup = second.document;
      assert.ok(second.duplicate_of, 'duplicate_of harus terisi krn checksum sama persis dgn dokumen sebelumnya.');
      assert.strictEqual(second.duplicate_of.id, first.document.id);
    });
    await test('tenant isolation — dokumen tenant A TIDAK ditemukan oleh tenant B', async () => {
      await assert.rejects(() => documentService.getDocumentDetail(docV1.id, tenantB.id), FoodOpsError);
      const rowsB = await documentService.listDocuments(tenantB.id, {});
      assert.ok(!rowsB.some((r) => r.id === docV1.id));
    });
    await test('lock_version conflict — verifyDocument dgn lock_version usang ditolak 409', async () => {
      await documentService.verifyDocument(docV1.id, { status_verifikasi: 'valid', lock_version: 1 }, ACTOR, tenantA.id);
      await assert.rejects(
        () => documentService.verifyDocument(docV1.id, { status_verifikasi: 'invalid', lock_version: 1 }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_LOCK_CONFLICT',
      );
    });

    // === REGULATION (mandat §59) ===
    console.log('\n=== REGULATION ===');
    let regDoc;
    await test('setup — dokumen document_class=REGULATION utk metadata', async () => {
      const result = await documentService.createDocument({ document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'Pergub Uji CPPD' }, fakeFile('pergub-uji'), ACTOR, tenantA.id);
      regDoc = result.document;
      cleanup.documentIds.push(regDoc.id);
    });
    let regMeta;
    await test('create meta — metadata regulasi berhasil dibuat utk dokumen REGULATION', async () => {
      regMeta = await regulationService.createRegulationMeta({ document_id: regDoc.id, jenis_produk_hukum: 'pergub', nomor: '10/2025', tahun: '2025' }, ACTOR, tenantA.id);
      cleanup.regulationIds.push(regMeta.id);
      assert.strictEqual(regMeta.jenis_produk_hukum, 'pergub');
    });
    await test('only REGULATION document allowed — dokumen document_class BUKAN REGULATION ditolak', async () => {
      const nonReg = await documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'Bukan Regulasi' }, fakeFile('bukan-regulasi'), ACTOR, tenantA.id);
      cleanup.documentIds.push(nonReg.document.id);
      await assert.rejects(
        () => regulationService.createRegulationMeta({ document_id: nonReg.document.id, jenis_produk_hukum: 'sk' }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_INVALID_SOURCE',
      );
    });
    await test('update — metadata regulasi dapat diperbarui dgn lock_version benar', async () => {
      const updated = await regulationService.updateRegulationMeta(regMeta.id, { jenis_produk_hukum: 'pergub', nomor: '10/2025', tahun: '2025', status_berlaku: 'diubah', lock_version: 0 }, ACTOR, tenantA.id);
      assert.strictEqual(updated.status_berlaku, 'diubah');
    });
    await test('supersedes reference — supersedes_document_id harus dokumen tenant yang sama (ID tidak ada -> ditolak)', async () => {
      const regDoc2 = await documentService.createDocument({ document_class: 'REGULATION', document_type: 'keputusan_gubernur', judul: 'Kepgub Uji Pengganti' }, fakeFile('kepgub-uji-2'), ACTOR, tenantA.id);
      cleanup.documentIds.push(regDoc2.document.id);
      await assert.rejects(
        () => regulationService.createRegulationMeta({ document_id: regDoc2.document.id, jenis_produk_hukum: 'kepgub', supersedes_document_id: 999999999 }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_TENANT_MISMATCH',
      );
    });
    await test('tenant isolation — metadata regulasi tenant A tidak terlihat tenant B', async () => {
      const rowsB = await regulationService.listRegulations(tenantB.id, {});
      assert.ok(!rowsB.some((r) => r.id === regMeta.id));
    });

    // === EVENT (mandat §59) ===
    console.log('\n=== EVENT ===');
    let event;
    await test('create — event baru', async () => {
      event = await eventService.createEvent({ event_type: 'RAKOR', tahun: '2098', tanggal_mulai: '2098-01-10', nama_kegiatan: 'Rakor Uji FoodOps' }, ACTOR, tenantA.id);
      cleanup.eventIds.push(event.id);
      assert.strictEqual(event.lock_version, 0);
    });
    await test('update — event dgn lock_version benar', async () => {
      const updated = await eventService.updateEvent(event.id, { event_type: 'RAKOR', tahun: '2098', tanggal_mulai: '2098-01-10', nama_kegiatan: 'Rakor Uji FoodOps (update)', lock_version: 0 }, ACTOR, tenantA.id);
      assert.strictEqual(updated.nama_kegiatan, 'Rakor Uji FoodOps (update)');
    });
    await test('lock conflict — update dgn lock_version usang ditolak', async () => {
      await assert.rejects(
        () => eventService.updateEvent(event.id, { event_type: 'RAKOR', tahun: '2098', tanggal_mulai: '2098-01-10', nama_kegiatan: 'X', lock_version: 0 }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_LOCK_CONFLICT',
      );
    });
    await test('tenant isolation — event tenant A tidak terlihat tenant B', async () => {
      const rowsB = await eventService.listEvents(tenantB.id, {});
      assert.ok(!rowsB.some((r) => r.id === event.id));
      await assert.rejects(() => eventService.getEventDetail(event.id, tenantB.id), FoodOpsError);
    });
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    for (const id of cleanup.eventIds) { try { await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.regulationIds) { try { await db.FoodOpsRegulationMeta.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.tenantIds) { try { await db.Tenant.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    try { fs.unlinkSync(DUMMY_FILE); } catch { /* no-op */ }
    console.log(`Tenant uji ${cleanup.tenantIds.join(', ')} dan seluruh data turunannya dihapus total.`);
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
  }
})();
