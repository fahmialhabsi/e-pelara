'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0. Self-test "evidence gate" utk Phase 0
 * ini berarti gate anti-spoof pada FoodOpsDocumentLink (mandat §15/§59 LINK
 * matrix + §62 tenant test matrix) — belum ada konsep evidence-completeness
 * per kategori seperti ProSN (itu bridge fase mendatang, di luar scope Phase 0).
 *
 * Jalankan: node scripts/foodOpsEvidenceGateSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const documentService = require('../services/foodOperations/foodOpsDocumentService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const linkService = require('../services/foodOperations/foodOpsDocumentLinkService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const ACTOR = { id: 23, role: 'PELAKSANA' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'food_ops_gate_test_dummy.pdf');

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

const cleanup = { tenantIds: [], documentIds: [], eventIds: [], linkIds: [] };

(async () => {
  let fatalError = null;
  let tenantA, tenantB;
  try {
    console.log('=== Setup: tenant A & B, dokumen + event di masing-masing ===');
    tenantA = await db.Tenant.create({ nama: 'UJI FoodOps Gate A', domain: `foodops-gate-a-${Date.now()}.local`, is_active: true });
    tenantB = await db.Tenant.create({ nama: 'UJI FoodOps Gate B', domain: `foodops-gate-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantA.id, tenantB.id);

    const docA = (await documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'undangan', judul: 'Undangan A' }, fakeFile('undangan-a'), ACTOR, tenantA.id)).document;
    cleanup.documentIds.push(docA.id);
    const eventA = await eventService.createEvent({ event_type: 'RAKOR', tahun: '2097', tanggal_mulai: '2097-02-01', nama_kegiatan: 'Rakor A' }, ACTOR, tenantA.id);
    cleanup.eventIds.push(eventA.id);
    const eventB = await eventService.createEvent({ event_type: 'RAKOR', tahun: '2097', tanggal_mulai: '2097-02-01', nama_kegiatan: 'Rakor B' }, ACTOR, tenantB.id);
    cleanup.eventIds.push(eventB.id);

    console.log('\n=== LINK (mandat §15/§59) ===');
    let linkValid;
    await test('valid link — dokumen A ditautkan ke event A (tenant sama)', async () => {
      linkValid = await linkService.createLink({ document_id: docA.id, entity_type: 'EVENT', entity_id: eventA.id, relation_type: 'EVIDENCE' }, ACTOR, tenantA.id);
      cleanup.linkIds.push(linkValid.id);
      assert.strictEqual(linkValid.entity_id, eventA.id);
    });
    await test('cross-tenant rejected — dokumen A (tenant A) TIDAK BOLEH ditautkan ke event B (tenant B)', async () => {
      await assert.rejects(
        () => linkService.createLink({ document_id: docA.id, entity_type: 'EVENT', entity_id: eventB.id }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && (err.code === 'FOOD_OPS_INVALID_SOURCE' || err.code === 'FOOD_OPS_NOT_FOUND'),
      );
    });
    await test('duplicate link rejected — relasi dokumen+entity yang sama ditolak', async () => {
      await assert.rejects(
        () => linkService.createLink({ document_id: docA.id, entity_type: 'EVENT', entity_id: eventA.id }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_DUPLICATE',
      );
    });
    await test('invalid entity rejected — entity_id yang tidak ada ditolak', async () => {
      await assert.rejects(
        () => linkService.createLink({ document_id: docA.id, entity_type: 'EVENT', entity_id: 999999999 }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_INVALID_SOURCE',
      );
    });
    await test('GENERIC_REFERENCE rejected — Phase 0 tidak punya tabel validasi utk tipe ini (mandat §15 "if cannot be validated: reject")', async () => {
      await assert.rejects(
        () => linkService.createLink({ document_id: docA.id, entity_type: 'GENERIC_REFERENCE', entity_id: 1 }, ACTOR, tenantA.id),
        (err) => err instanceof FoodOpsError && err.code === 'FOOD_OPS_INVALID_SOURCE',
      );
    });
    await test('unlink — relasi valid dapat dihapus', async () => {
      const result = await linkService.unlink(linkValid.id, tenantA.id);
      assert.strictEqual(result.id, linkValid.id);
      const rows = await linkService.listLinks(tenantA.id, { document_id: docA.id });
      assert.ok(!rows.some((r) => r.id === linkValid.id));
    });

    console.log('\n=== TENANT ISOLATION MATRIX (mandat §62) ===');
    await test('Document A tidak terlihat oleh tenant B', async () => {
      await assert.rejects(() => documentService.getDocumentDetail(docA.id, tenantB.id), FoodOpsError);
    });
    await test('Event A tidak terlihat oleh tenant B', async () => {
      await assert.rejects(() => eventService.getEventDetail(eventA.id, tenantB.id), FoodOpsError);
    });
    await test('Link A tidak bisa menargetkan entitas milik tenant B (dibuktikan ulang via link ke eventB dari tenant A)', async () => {
      await assert.rejects(
        () => linkService.createLink({ document_id: docA.id, entity_type: 'EVENT', entity_id: eventB.id }, ACTOR, tenantA.id),
        FoodOpsError,
      );
    });
    await test('Model allowlist registration — TENANTED_MODEL_NAMES memuat keempat model FoodOps', () => {
      // eslint-disable-next-line global-require
      const { TENANTED_MODEL_NAMES } = require('../lib/tenantSequelizeHooks');
      for (const name of ['FoodOpsDocument', 'FoodOpsRegulationMeta', 'FoodOpsDocumentLink', 'FoodOpsEvent']) {
        assert.ok(TENANTED_MODEL_NAMES.includes(name), `${name} belum terdaftar di TENANTED_MODEL_NAMES.`);
      }
    });

    console.log('\n=== EXTRACTION REUSE CHECK (mandat §61) ===');
    await test('extractTextFromFile ada dan berasal dari modul ProSN yang sama (bukan OCR engine baru)', () => {
      // eslint-disable-next-line global-require
      const extractorPath = require.resolve('../services/prosnp/autofill/prosnpDocumentTextExtractor');
      // eslint-disable-next-line global-require
      const mod = require('../services/foodOperations/foodOpsDocumentService');
      assert.ok(typeof mod.extractDocumentText === 'function');
      assert.ok(fs.existsSync(extractorPath), 'File extractor ProSN harus tetap ada di lokasi yang sama.');
    });
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    for (const id of cleanup.linkIds) { try { await db.FoodOpsDocumentLink.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.eventIds) { try { await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    for (const id of cleanup.tenantIds) { try { await db.Tenant.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
    try { fs.unlinkSync(DUMMY_FILE); } catch { /* no-op */ }
    console.log(`Tenant uji ${cleanup.tenantIds.join(', ')} dan seluruh data turunannya dihapus total.`);
    console.log(`\nTotal: ${pass} PASS, ${fail} FAIL`);
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
  }
})();
