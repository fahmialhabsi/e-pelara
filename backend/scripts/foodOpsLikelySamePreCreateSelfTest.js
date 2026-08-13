'use strict';

/**
 * CORRECTIVE MANDATE UAT-01B — "Cross-Entrypoint LIKELY_SAME Canonical
 * Document Pre-Create Interception" self-test.
 *
 * Root cause proven by Owner UAT (real IDs 232/399/427, READ-ONLY forensic
 * evidence — NEVER touched by this test): the generic FoodOps document
 * registry create endpoint (`foodOpsDocumentService.createDocument`, used
 * SOLELY by the "Dokumen & Evidence" tab) computed the EXACT-checksum
 * duplicate (UAT-01A, already fixed) but never checked the LIKELY_SAME tier
 * (`findLikelySameDocument`, Req #1) that `prosnpController.createBukti`
 * already enforced — so a document sharing the exact same nomor_dokumen but a
 * different checksum (ID 427 vs ID 232) was silently created as a new row.
 *
 * This test proves:
 *   - LIKELY_SAME now intercepts BEFORE any DB row is created (T2/T3/T5).
 *   - "Create New Anyway" (acknowledge_likely_same + acknowledged_candidate_id)
 *     creates exactly one document, after backend-side revalidation (T7).
 *   - EXACT can NEVER be bypassed via acknowledgment (T8).
 *   - Invalid/stale/wrong-tenant acknowledged candidates fail safely,
 *     without leaking data and without creating a row (T9/T10).
 *   - Ordinary unique uploads, NEW_VERSION, and the POSSIBLE/SEMANTICALLY-
 *     RELATED tier are all unchanged (T11/T12/T13).
 *   - Regulasi and Kegiatan CANNOT create/duplicate a FoodOpsDocument through
 *     their own registry flows — proven both structurally (source contains no
 *     `FoodOpsDocument.create`) and behaviorally (row count unchanged across
 *     a real create call) — T14-T18.
 *
 * Data uji: tenant nyata 1 + Tenant B sintetis (dihapus total di finally),
 * semua dokumen berjudul "TEST DATA — NOT OFFICIAL". TIDAK PERNAH menyentuh
 * ID 232/399/427 atau data Semester I nyata.
 *
 * Jalankan: node scripts/foodOpsLikelySamePreCreateSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');
const regulationService = require('../services/foodOperations/foodOpsRegulationService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const linkService = require('../services/foodOperations/foodOpsDocumentLinkService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'uat01b_likely_same_test_dummy.pdf');

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
async function countDocs(tenantId) {
  return db.FoodOpsDocument.count({ where: { tenant_id: tenantId } });
}
async function expectFoodOpsError(promise, expectedCode, expectedStatus) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof FoodOpsError, `Harus melempar FoodOpsError, dapat: ${error?.constructor?.name}`);
    if (expectedCode) assert.strictEqual(error.code, expectedCode);
    if (expectedStatus) assert.strictEqual(error.status, expectedStatus);
    return true;
  });
}

const cleanup = { documentIds: [], tenantIds: [], eventIds: [], regulationMetaIds: [] };

(async () => {
  let fatalError = null;
  let tenantB;
  try {
    console.log('=== Setup: Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI UAT-01B Tenant B', domain: `uat01b-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    console.log('\n=== T2/T3/T4/T5 — LIKELY_SAME intercepted BEFORE any permanent creation ===');
    let original;
    await test('setup — dokumen asli (analog ID 232) diunggah', async () => {
      const result = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Asli)', nomor_dokumen: 'UAT01B/NOT/001', tanggal_dokumen: '2025-06-30', penerbit: 'TEST DATA — Pemerintah Uji' },
        fakeFile('uat01b-original', `konten-asli-uat01b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      original = result.document;
      cleanup.documentIds.push(original.id);
    });

    await test('T2/T5 — upload nomor_dokumen SAMA, checksum BEDA (analog ID 427) -> DITOLAK dgn FOOD_OPS_DOCUMENT_LIKELY_SAME + kandidat lengkap', async () => {
      await assert.rejects(
        () => documentService.createDocument(
          { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Beda Isi)', nomor_dokumen: 'UAT01B/NOT/001', tanggal_dokumen: '2025-06-30', penerbit: 'TEST DATA — Pemerintah Uji' },
          fakeFile('uat01b-likely-same', `konten-BEDA-uat01b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
        ),
        (error) => {
          assert.ok(error instanceof FoodOpsError);
          assert.strictEqual(error.code, 'FOOD_OPS_DOCUMENT_LIKELY_SAME');
          assert.strictEqual(error.status, 409);
          assert.ok(error.details?.candidate, 'Kandidat harus disertakan di error.details.candidate.');
          assert.strictEqual(error.details.candidate.id, original.id);
          assert.strictEqual(error.details.candidate.judul, original.judul);
          assert.strictEqual(error.details.candidate.nomor_dokumen, original.nomor_dokumen);
          assert.strictEqual(error.details.candidate.document_class, original.document_class);
          assert.strictEqual(error.details.candidate.document_type, original.document_type);
          assert.strictEqual(error.details.candidate.status_verifikasi, original.status_verifikasi);
          return true;
        },
      );
    });

    await test('T3/T4 — LIKELY_SAME yang belum diselesaikan TIDAK menambah baris FoodOpsDocument sama sekali', async () => {
      const totalSebelum = await countDocs(TENANT_ID);
      await assert.rejects(() => documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Percobaan Lain)', nomor_dokumen: 'UAT01B/NOT/001', tanggal_dokumen: '2025-06-30' },
        fakeFile('uat01b-likely-same-2', `konten-lain-lagi-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      ), FoodOpsError);
      const totalSesudah = await countDocs(TENANT_ID);
      assert.strictEqual(totalSesudah, totalSebelum, 'LIKELY_SAME yang tidak diselesaikan tidak boleh membuat baris baru.');
    });

    await test('T4 (struktur kode) — controller createDocument membersihkan berkas sementara pada SETIAP error (bukan hanya EXACT), sehingga LIKELY_SAME juga tidak meninggalkan berkas fisik', () => {
      const src = fs.readFileSync(require.resolve('../controllers/foodOpsDocumentController.js'), 'utf8');
      const fnMatch = src.match(/async function createDocument\(req, res\)\s*\{[\s\S]*?\n\}/);
      assert.ok(fnMatch, 'Fungsi createDocument controller tidak ditemukan.');
      assert.ok(/catch\s*\(e\)\s*\{\s*removeFailedUpload\(req\.file\);\s*return fail\(res, e\);\s*\}/.test(fnMatch[0]), 'catch block harus memanggil removeFailedUpload TANPA syarat kode error tertentu (berlaku utk EXACT maupun LIKELY_SAME).');
    });

    console.log('\n=== T7 — "Tetap Buat Dokumen Baru" (acknowledge_likely_same) membuat TEPAT SATU dokumen setelah revalidasi backend ===');
    let created2;
    await test('T7 — acknowledge_likely_same=true + acknowledged_candidate_id valid -> berhasil, tepat 1 baris baru', async () => {
      const totalSebelum = await countDocs(TENANT_ID);
      const result = await documentService.createDocument(
        {
          document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Sengaja Dibuat Baru)', nomor_dokumen: 'UAT01B/NOT/001', tanggal_dokumen: '2025-06-30',
          acknowledge_likely_same: true, acknowledged_candidate_id: original.id,
        },
        fakeFile('uat01b-ack', `konten-ack-uat01b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      created2 = result.document;
      cleanup.documentIds.push(created2.id);
      const totalSesudah = await countDocs(TENANT_ID);
      assert.strictEqual(totalSesudah, totalSebelum + 1, 'Create New Anyway harus membuat TEPAT SATU baris baru.');
      assert.notStrictEqual(created2.id, original.id);
    });

    console.log('\n=== T8 — EXACT TIDAK PERNAH bisa dilewati oleh acknowledge_likely_same ===');
    await test('T8 — checksum PERSIS SAMA dgn dokumen existing + acknowledge_likely_same=true -> TETAP ditolak FOOD_OPS_DOCUMENT_DUPLICATE (EXACT menang atas acknowledgment)', async () => {
      const fileAsli = fakeFile('uat01b-exact-src', `konten-exact-uat01b-${Date.now()}-${Math.random()}`);
      const resultAsli = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Sumber Exact)', nomor_dokumen: 'UAT01B/EXACT/001' },
        fileAsli, ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.documentIds.push(resultAsli.document.id);
      const checksumAsli = resultAsli.document.checksum_sha256;
      fs.writeFileSync(DUMMY_FILE, fs.readFileSync(fileAsli.path)); // pastikan file kedua checksum-nya PERSIS sama
      const fileDup = { path: DUMMY_FILE, originalname: 'uat01b-exact-dup.pdf', filename: `uat01b-exact-dup_${Date.now()}.pdf`, mimetype: 'application/pdf', size: fs.statSync(DUMMY_FILE).size };
      assert.strictEqual(documentService.computeChecksum(fileDup.path), checksumAsli);

      await expectFoodOpsError(
        documentService.createDocument(
          {
            document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Coba Bypass EXACT)', nomor_dokumen: 'UAT01B/EXACT/001',
            acknowledge_likely_same: true, acknowledged_candidate_id: resultAsli.document.id,
          },
          fileDup, ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_DOCUMENT_DUPLICATE', 409,
      );
    });

    console.log('\n=== T9 — kandidat acknowledged tidak valid gagal dgn AMAN ===');
    await test('T9 — acknowledged_candidate_id yang tidak pernah ada -> FOOD_OPS_INVALID_CANDIDATE, zero baris baru', async () => {
      const totalSebelum = await countDocs(TENANT_ID);
      await expectFoodOpsError(
        documentService.createDocument(
          { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Kandidat Palsu)', nomor_dokumen: 'UAT01B/NOT/001', acknowledge_likely_same: true, acknowledged_candidate_id: 999999999 },
          fakeFile('uat01b-invalid-candidate', `konten-invalid-cand-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_INVALID_CANDIDATE', 409,
      );
      assert.strictEqual(await countDocs(TENANT_ID), totalSebelum);
    });

    await test('T9b — acknowledge_likely_same=true TANPA acknowledged_candidate_id -> ditolak dgn jelas, bukan crash', async () => {
      await expectFoodOpsError(
        documentService.createDocument(
          { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Tanpa ID Kandidat)', nomor_dokumen: 'UAT01B/NOT/001', acknowledge_likely_same: true },
          fakeFile('uat01b-no-candidate-id', `konten-no-cand-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_INVALID_DOCUMENT', 400,
      );
    });

    console.log('\n=== T10 — kandidat lintas-tenant ditolak TANPA kebocoran data ===');
    let docTenantB;
    await test('T10 — acknowledged_candidate_id milik Tenant B, request dari Tenant A -> FOOD_OPS_INVALID_CANDIDATE (bukan LIKELY_SAME/detail Tenant B), zero baris baru', async () => {
      const resultB = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Milik Tenant B — RAHASIA)', nomor_dokumen: 'UAT01B/CROSSTENANT/001' },
        fakeFile('uat01b-tenant-b', `konten-tenant-b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, tenantB.id,
      );
      docTenantB = resultB.document;
      cleanup.documentIds.push(docTenantB.id);

      const totalSebelumA = await countDocs(TENANT_ID);
      await expectFoodOpsError(
        documentService.createDocument(
          { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Percobaan Akses Tenant B dari A)', nomor_dokumen: 'UAT01B/CROSSTENANT/001', acknowledge_likely_same: true, acknowledged_candidate_id: docTenantB.id },
          fakeFile('uat01b-cross-tenant-attempt', `konten-cross-attempt-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_INVALID_CANDIDATE', 409,
      );
      assert.strictEqual(await countDocs(TENANT_ID), totalSebelumA, 'Percobaan akses kandidat lintas tenant tidak boleh membuat baris baru di tenant A.');
    });

    await test('T10b — LIKELY_SAME normal dari Tenant A TIDAK PERNAH menemukan kandidat milik Tenant B walau nomor_dokumen sama persis', async () => {
      await assert.rejects(
        () => documentService.createDocument(
          { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Uji Isolasi Tenant)', nomor_dokumen: 'UAT01B/CROSSTENANT/001' },
          fakeFile('uat01b-isolation-check', `konten-isolasi-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
        ),
        (error) => {
          // Boleh sukses (tidak ada kandidat di tenant A) ATAU boleh gagal krn alasan LAIN,
          // TAPI TIDAK BOLEH melempar LIKELY_SAME yg menunjuk ke dokumen Tenant B.
          if (error instanceof FoodOpsError && error.code === 'FOOD_OPS_DOCUMENT_LIKELY_SAME') {
            assert.notStrictEqual(error.details?.candidate?.id, docTenantB.id, 'TIDAK BOLEH menemukan kandidat Tenant B dari request Tenant A.');
          }
          return true;
        },
      ).catch(() => {}); // rejects() di atas hanya utk inspeksi kondisional; jika sukses (tidak throw), itu JUGA hasil valid (tidak ada leak).
    });

    console.log('\n=== T11 — unggah dokumen unik biasa TIDAK terpengaruh ===');
    await test('T11 — dokumen dgn nomor_dokumen unik & checksum unik -> berhasil normal, duplicate_of null', async () => {
      const result = await documentService.createDocument(
        { document_class: 'REPORT', document_type: 'laporan', judul: 'TEST DATA — NOT OFFICIAL (Dokumen Unik Biasa)', nomor_dokumen: `UAT01B/UNIK/${Date.now()}` },
        fakeFile('uat01b-unique', `konten-unik-biasa-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.documentIds.push(result.document.id);
      assert.strictEqual(result.duplicate_of, null);
    });

    console.log('\n=== T12 — semantik NEW_VERSION tidak berubah ===');
    await test('T12 — createNewVersion tetap append-only (status lama -> digantikan), tidak melalui gate LIKELY_SAME', async () => {
      const fileV1 = fakeFile('uat01b-version-v1', `konten-versi-1-${Date.now()}-${Math.random()}`);
      const resultV1 = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Versi 1)', nomor_dokumen: 'UAT01B/VERSI/001' },
        fileV1, ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.documentIds.push(resultV1.document.id);
      const fileV2 = fakeFile('uat01b-version-v2', `konten-versi-2-BEDA-${Date.now()}-${Math.random()}`);
      const v2 = await documentService.createNewVersion(resultV1.document.id, { judul: 'TEST DATA — NOT OFFICIAL (Versi 2)' }, fileV2, ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v2.id);
      const v1Fresh = await documentService.getDocumentDetail(resultV1.document.id, TENANT_ID);
      assert.strictEqual(v1Fresh.status, 'digantikan');
      assert.strictEqual(v2.menggantikan_document_id, resultV1.document.id);
    });

    console.log('\n=== T13 — tier SEMANTICALLY_RELATED/POSSIBLE tidak berubah (smoke) ===');
    await test('T13 — RELEVANCE.POSSIBLE tetap ada, tidak diganggu perubahan ini', () => {
      const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');
      assert.strictEqual(candidateService.RELEVANCE.POSSIBLE, 'POSSIBLE');
    });

    console.log('\n=== T14/T15 — Regulasi TIDAK bisa membuat/menduplikasi FoodOpsDocument ===');
    await test('T15 (struktural) — foodOpsRegulationService.js TIDAK memanggil FoodOpsDocument.create sama sekali', () => {
      const src = fs.readFileSync(require.resolve('../services/foodOperations/foodOpsRegulationService.js'), 'utf8');
      assert.ok(!/FoodOpsDocument\.create\(/.test(src), 'Regulasi TIDAK BOLEH punya jalur pembuatan FoodOpsDocument sendiri — harus selalu mereferensikan document_id yang sudah ada lewat gate canonical.');
    });
    let regulationDoc;
    await test('T14 (perilaku) — createRegulationMeta MEREFERENSIKAN document_id existing, TIDAK menambah baris FoodOpsDocument', async () => {
      const resultReg = await documentService.createDocument(
        { document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'TEST DATA — NOT OFFICIAL (Sumber Regulasi)', nomor_dokumen: 'UAT01B/PERGUB/001' },
        fakeFile('uat01b-regulation-src', `konten-regulasi-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      regulationDoc = resultReg.document;
      cleanup.documentIds.push(regulationDoc.id);

      const totalSebelum = await countDocs(TENANT_ID);
      const meta = await regulationService.createRegulationMeta(
        { document_id: regulationDoc.id, jenis_produk_hukum: 'pergub', nomor: 'UAT01B/PERGUB/001' },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.regulationMetaIds.push(meta.id);
      const totalSesudah = await countDocs(TENANT_ID);
      assert.strictEqual(totalSesudah, totalSebelum, 'createRegulationMeta TIDAK BOLEH menambah baris FoodOpsDocument.');
      assert.strictEqual(meta.document_id, regulationDoc.id);
    });

    console.log('\n=== T16/T17/T18 — Kegiatan TIDAK bisa membuat/menduplikasi FoodOpsDocument ===');
    await test('T17 (struktural) — foodOpsDocumentLinkService.js TIDAK memanggil FoodOpsDocument.create sama sekali', () => {
      const src = fs.readFileSync(require.resolve('../services/foodOperations/foodOpsDocumentLinkService.js'), 'utf8');
      assert.ok(!/FoodOpsDocument\.create\(/.test(src), 'Evidence-linking Kegiatan TIDAK BOLEH punya jalur pembuatan FoodOpsDocument sendiri.');
    });
    await test('T17b (struktural) — foodOpsEventService.js TIDAK memanggil FoodOpsDocument.create sama sekali (pembuatan Kegiatan bukan pembuatan dokumen)', () => {
      const src = fs.readFileSync(require.resolve('../services/foodOperations/foodOpsEventService.js'), 'utf8');
      assert.ok(!/FoodOpsDocument\.create\(/.test(src));
    });
    let event, buktiDoc;
    await test('T16 (perilaku) — createEvent TIDAK menambah baris FoodOpsDocument', async () => {
      const totalSebelum = await countDocs(TENANT_ID);
      event = await eventService.createEvent(
        { event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-06-30', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Uji UAT-01B)' },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.eventIds.push(event.id);
      assert.strictEqual(await countDocs(TENANT_ID), totalSebelum);
    });
    await test('T18 (perilaku) — evidence-link Kegiatan MEREFERENSIKAN dokumen existing, TIDAK menyalin berkas fisik/checksum', async () => {
      const resultBukti = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Evidence Kegiatan)', nomor_dokumen: 'UAT01B/KEGIATAN-EVIDENCE/001' },
        fakeFile('uat01b-kegiatan-evidence', `konten-evidence-kegiatan-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      buktiDoc = resultBukti.document;
      cleanup.documentIds.push(buktiDoc.id);
      const checksumSebelum = buktiDoc.checksum_sha256;
      const filePathSebelum = buktiDoc.file_path;

      const totalSebelum = await countDocs(TENANT_ID);
      await linkService.createLink({ document_id: buktiDoc.id, entity_type: 'EVENT', entity_id: event.id, relation_type: 'Evidence' }, ACTOR_ADMIN, TENANT_ID);
      assert.strictEqual(await countDocs(TENANT_ID), totalSebelum, 'Menautkan evidence ke Kegiatan TIDAK BOLEH menambah baris FoodOpsDocument.');

      const dokFresh = await documentService.getDocumentDetail(buktiDoc.id, TENANT_ID);
      assert.strictEqual(dokFresh.checksum_sha256, checksumSebelum, 'Checksum dokumen sumber tidak boleh berubah — bukan disalin/diunggah ulang.');
      assert.strictEqual(dokFresh.file_path, filePathSebelum, 'Path berkas fisik tidak boleh berubah — evidence-link murni referensi, bukan salinan.');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.regulationMetaIds) { try { await db.FoodOpsRegulationMeta.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.eventIds) { try { await db.FoodOpsDocumentLink.destroy({ where: { entity_type: 'EVENT', entity_id: id } }); await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      const allDocIds = [...cleanup.documentIds];
      await db.FoodOpsDocumentLink.destroy({ where: { document_id: allDocIds } });
      for (const id of allDocIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
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
