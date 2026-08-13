'use strict';

/**
 * FINAL CLOSURE MANDATE — Req #1 "Canonical Duplicate Guard: 4-Tier
 * Distinction" self-test. Membuktikan keempat tier BEDA perilaku:
 *   (A) EXACT DUPLICATE       — findDuplicateByChecksum, MEMBLOKIR (409, sudah
 *                               ada sebelum mandat ini — dibuktikan ulang di
 *                               sini sbg regresi, TIDAK diubah).
 *   (B) LIKELY SAME DOCUMENT  — findLikelySameDocument (BARU, mandat Req #1) —
 *                               nomor_dokumen sama TAPI checksum beda — TIDAK
 *                               PERNAH memblokir, hanya kandidat peringatan.
 *   (C) NEW VERSION           — createNewVersion (SUDAH ADA sebelum mandat ini,
 *                               append-only, status lama -> 'digantikan') —
 *                               dibuktikan TIDAK diblokir oleh (A)/(B).
 *   (D) SEMANTICALLY RELATED  — findCandidates POSSIBLE tier (SUDAH ADA,
 *                               dibuktikan penuh di prosnpB13RegistryEvidence-
 *                               DiscoverySelfTest.js/foodOpsPhase1SelfTest.js —
 *                               TIDAK diulang di sini, hanya smoke-check bahwa
 *                               tier POSSIBLE tetap ada di RELEVANCE export).
 * Plus tenant isolation utk tier (A) dan (B).
 *
 * Data uji: Tenant 1 (nyata, dokumen sintetis dgn judul "TEST DATA — NOT
 * OFFICIAL") + Tenant B sintetis. Semua dihapus di finally. TIDAK menyentuh
 * evidence/UAT nyata.
 *
 * Jalankan: node scripts/prosnpDuplicateGuardTierSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');
const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'duplicate_guard_tier_test_dummy.pdf');

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

const cleanup = { documentIds: [], tenantIds: [] };

(async () => {
  let fatalError = null;
  let tenantB;
  try {
    console.log('=== Setup: Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI Duplicate Guard Tenant B', domain: `dup-guard-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    console.log('\n=== Tier A — EXACT DUPLICATE (findDuplicateByChecksum, regresi — TIDAK diubah mandat ini) ===');
    let docA1;
    await test('A1 — dokumen pertama diunggah -> checksum tersimpan, tidak dianggap duplikat', async () => {
      const file = fakeFile('exact-a', `konten-unik-tier-A-${Date.now()}-${Math.random()}`);
      const checksum = documentService.computeChecksum(file.path);
      const existing = await documentService.findDuplicateByChecksum(TENANT_ID, checksum);
      assert.ok(!existing, 'Konten baru belum pernah diunggah -> tidak boleh terdeteksi sbg duplikat.');
      const result = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Duplicate Guard Tier A)', nomor_dokumen: 'DUP-A/001/TEST' },
        file, ACTOR_ADMIN, TENANT_ID,
      );
      docA1 = result.document;
      cleanup.documentIds.push(docA1.id);
      assert.strictEqual(result.duplicate_of, null);
    });
    await test('A2 — checksum identik (konten sama persis, nama file beda) -> findDuplicateByChecksum MENEMUKAN (tier EXACT harus terdeteksi)', async () => {
      const checksum = docA1.checksum_sha256;
      const found = await documentService.findDuplicateByChecksum(TENANT_ID, checksum);
      assert.ok(found, 'Checksum yg sama dengan dokumen aktif tenant sendiri harus ditemukan.');
      assert.strictEqual(found.id, docA1.id);
    });
    await test('A3 — tenant isolation: checksum identik di Tenant B TIDAK terlihat dari Tenant A', async () => {
      const foundCrossTenant = await documentService.findDuplicateByChecksum(tenantB.id, docA1.checksum_sha256);
      assert.ok(!foundCrossTenant, 'Duplicate guard EXACT tidak boleh bocor lintas tenant.');
    });

    console.log('\n=== Tier B — LIKELY SAME DOCUMENT (findLikelySameDocument, BARU mandat Req #1) — TIDAK PERNAH memblokir ===');
    let docB1;
    await test('B1 — nomor_dokumen SAMA, checksum BEDA -> findLikelySameDocument MENEMUKAN kandidat (bukan blokir)', async () => {
      const fileB1 = fakeFile('likely-b1', `konten-tier-B-versi-1-${Date.now()}-${Math.random()}`);
      const resultB1 = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Duplicate Guard Tier B v1)', nomor_dokumen: 'DUP-B/002/TEST' },
        fileB1, ACTOR_ADMIN, TENANT_ID,
      );
      docB1 = resultB1.document;
      cleanup.documentIds.push(docB1.id);

      const fileB2 = fakeFile('likely-b2', `konten-tier-B-versi-2-BERBEDA-${Date.now()}-${Math.random()}`);
      const checksumB2 = documentService.computeChecksum(fileB2.path);
      assert.notStrictEqual(checksumB2, docB1.checksum_sha256, 'Setup rusak — checksum harus BEDA utk menguji tier LIKELY_SAME (bukan EXACT).');

      const likelySame = await documentService.findLikelySameDocument(TENANT_ID, 'DUP-B/002/TEST', checksumB2);
      assert.ok(likelySame, 'Nomor dokumen persis sama dgn checksum beda harus terdeteksi sbg LIKELY_SAME.');
      assert.strictEqual(likelySame.id, docB1.id);

      const exactCheck = await documentService.findDuplicateByChecksum(TENANT_ID, checksumB2);
      assert.ok(!exactCheck, 'Checksum berbeda TIDAK BOLEH terdeteksi sbg tier EXACT — harus tetap dibedakan dari tier B.');
    });
    await test('B2 — nomor_dokumen kosong/tidak dikirim -> findLikelySameDocument tidak pernah mencari (hindari false-positive dari nomor kosong)', async () => {
      assert.strictEqual(await documentService.findLikelySameDocument(TENANT_ID, '', 'checksum-apa-saja'), null);
      assert.strictEqual(await documentService.findLikelySameDocument(TENANT_ID, null, 'checksum-apa-saja'), null);
      assert.strictEqual(await documentService.findLikelySameDocument(TENANT_ID, '   ', 'checksum-apa-saja'), null);
    });
    await test('B3 — excludeChecksum yg SAMA dgn dokumen existing -> TIDAK dianggap LIKELY_SAME (itu kasusnya EXACT, sudah ditangani tier A)', async () => {
      const notLikelySame = await documentService.findLikelySameDocument(TENANT_ID, 'DUP-B/002/TEST', docB1.checksum_sha256);
      assert.ok(!notLikelySame, 'Jika checksum PERSIS sama dgn dokumen existing, itu tier EXACT — findLikelySameDocument harus exclude kasus ini agar tidak tumpang-tindih dgn tier A.');
    });
    await test('B4 — tenant isolation: nomor_dokumen sama di Tenant B TIDAK terlihat dari Tenant A', async () => {
      const fileCrossTenant = fakeFile('likely-cross-tenant', `konten-tier-B-tenantB-${Date.now()}-${Math.random()}`);
      const resultCrossTenant = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Duplicate Guard Tier B Tenant B)', nomor_dokumen: 'DUP-B/002/TEST' },
        fileCrossTenant, ACTOR_ADMIN, tenantB.id,
      );
      cleanup.documentIds.push(resultCrossTenant.document.id);
      const foundFromTenantA = await documentService.findLikelySameDocument(TENANT_ID, 'DUP-B/002/TEST', 'checksum-tidak-relevan');
      assert.strictEqual(foundFromTenantA.id, docB1.id, 'Pencarian dari Tenant A hanya boleh menemukan dokumen milik Tenant A sendiri, bukan milik Tenant B walau nomor_dokumen sama persis.');
    });

    console.log('\n=== Tier C — NEW VERSION (createNewVersion, SUDAH ADA sebelum mandat ini) — versi baru TIDAK diblokir oleh tier A/B ===');
    let docC1, docC2;
    await test('C1 — createNewVersion pada dokumen existing -> baris lama status="digantikan" (append-only, bukan overwrite)', async () => {
      const fileC1 = fakeFile('newversion-c1', `konten-tier-C-versi-1-${Date.now()}-${Math.random()}`);
      const resultC1 = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Duplicate Guard Tier C v1)', nomor_dokumen: 'DUP-C/003/TEST' },
        fileC1, ACTOR_ADMIN, TENANT_ID,
      );
      docC1 = resultC1.document;
      cleanup.documentIds.push(docC1.id);

      const fileC2 = fakeFile('newversion-c2', `konten-tier-C-versi-2-BERBEDA-${Date.now()}-${Math.random()}`);
      docC2 = await documentService.createNewVersion(docC1.id, { judul: 'TEST DATA — NOT OFFICIAL (Duplicate Guard Tier C v2)' }, fileC2, ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(docC2.id);

      const lamaSetelahVersioning = await documentService.getDocumentDetail(docC1.id, TENANT_ID);
      assert.strictEqual(lamaSetelahVersioning.status, 'digantikan', 'Versi lama harus berstatus "digantikan", bukan dihapus (append-only lineage).');
      assert.strictEqual(docC2.menggantikan_document_id, docC1.id);
      assert.strictEqual(docC2.kelompok_uuid, docC1.kelompok_uuid, 'Versi baru harus tetap satu lineage (kelompok_uuid sama) dgn versi lama.');
    });
    await test('C2 — setelah versioning, versi LAMA (status digantikan) tidak lagi muncul sbg kandidat EXACT/LIKELY_SAME (sudah bukan dokumen aktif)', async () => {
      const exactCheck = await documentService.findDuplicateByChecksum(TENANT_ID, docC1.checksum_sha256);
      assert.ok(!exactCheck, 'Dokumen yg sudah digantikan (status=digantikan) tidak boleh lagi ikut serta di pencarian duplikat aktif.');
      const likelyCheck = await documentService.findLikelySameDocument(TENANT_ID, 'DUP-C/003/TEST', 'checksum-tidak-relevan');
      assert.strictEqual(likelyCheck.id, docC2.id, 'Setelah versioning, nomor_dokumen yg sama harus mengarah ke versi AKTIF (docC2), bukan versi lama yg sudah digantikan.');
    });

    console.log('\n=== Tier D — SEMANTICALLY RELATED ONLY (findCandidates POSSIBLE tier, SUDAH ADA — smoke-check saja, bukti penuh ada di prosnpB13RegistryEvidenceDiscoverySelfTest.js/foodOpsPhase1SelfTest.js) ===');
    await test('D1 — RELEVANCE export tetap punya tier POSSIBLE (tier SEMANTICALLY_RELATED tidak hilang/berubah nama)', () => {
      assert.strictEqual(candidateService.RELEVANCE.POSSIBLE, 'POSSIBLE');
      assert.strictEqual(candidateService.RELEVANCE.EXACT, 'EXACT');
      assert.strictEqual(candidateService.RELEVANCE.STRONG, 'STRONG');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
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
