'use strict';

/**
 * CORRECTIVE MANDATE UAT-01D — "Already-Bound Guard for SEMANTICALLY_RELATED
 * / POSSIBLE Evidence Reuse" self-test.
 *
 * Owner-observed defect (real forensic evidence, READ-ONLY, NEVER touched
 * here): FoodOpsDocument 230, already bound as ProSN evidence (bukti 1405,
 * link 1565) to B.1.2 / RAPAT_FORKOPIMDA / entity_id=146, still appeared in
 * "+ Tambah Bukti Lain" candidate discovery as "Cocok Persis" with an
 * actionable "Gunakan/Tautkan" button.
 *
 * Root cause (confirmed by source trace, NOT reproduced against real Owner
 * data): `foodOpsEvidenceCandidateService.findCandidates` already computed
 * `already_bound` correctly per candidate (via canonical `food_ops_document_id`
 * identity, tenant+entity_type+entity_id-scoped — this existed since Req #1),
 * but `FoodOpsEvidenceCandidatePanel.jsx` never read that field before
 * rendering the action button. Separately, the write endpoint
 * (`bindDocumentToProsn`) had zero duplicate-binding defense of its own.
 *
 * This test proves the DISCOVERY identity computation (T1/T2/T6/T7,
 * `findCandidates`, unchanged logic, re-verified) and the NEW write-endpoint
 * defense (T8-T11, `bindDocumentToProsn`), plus regression T12-T18 against
 * POSSIBLE/EXACT discovery, UAT-01A/B/C, and protected scope.
 *
 * Data uji: tenant nyata 1 (indikator ProSN hanya di-seed per tenant nyata)
 * + tahun fantasi TAHUN_UJI + Tenant B sintetis, semua dihapus di finally.
 * TIDAK PERNAH menyentuh evidence 1405 / link 1565 / entity 146 / dokumen 230
 * / data Semester I nyata.
 *
 * Jalankan: node scripts/foodOpsProsnAlreadyBoundGuardSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const rapatService = require('../services/prosnp/prosnpRapatForkopimdaService');
const documentService = require('../services/foodOperations/foodOpsDocumentService');
const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');
const bindingService = require('../services/foodOperations/foodOpsProsnBindingService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2081';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'uat01d_already_bound_test_dummy.pdf');

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
async function cariIndikatorB12(periodeId) {
  const indikator = await db.ProsnIndikator.findOne({ where: { periode_id: periodeId, kode: 'B.1.2' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
  assert.ok(indikator && indikator.pengisian, 'Setup rusak — indikator/pengisian B.1.2 tidak ditemukan.');
  return indikator;
}

const cleanup = { periodeIds: [], documentIds: [], tenantIds: [] };

(async () => {
  let fatalError = null;
  let tenantB, periode, b12, pengisianId, rapat;
  try {
    console.log('=== Setup: periode Semester II ProSN uji tahun', TAHUN_UJI, '+ Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI UAT-01D Tenant B', domain: `uat01d-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (UAT-01D Already-Bound Guard)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-01`, tanggal_cutoff: `${TAHUN_UJI}-12-31`,
      perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periode.id);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    b12 = await cariIndikatorB12(periode.id);
    pengisianId = b12.pengisian.id;

    rapat = await rapatService.create(pengisianId, { tanggal_rapat: `${TAHUN_UJI}-06-30`, nama_forum: 'TEST DATA — NOT OFFICIAL (Rapat Uji UAT-01D)' }, ACTOR_OPERATOR, TENANT_ID);
    console.log(`  Periode id=${periode.id}, B.1.2 pengisian_id=${pengisianId}, rapat_id=${rapat.id} (sintetis, BUKAN entity 146 Owner)`);

    let docUndangan;
    await test('setup — dokumen Undangan sintetis (BUKAN dokumen 230 Owner)', async () => {
      const result = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'undangan', judul: 'TEST DATA — NOT OFFICIAL (Undangan Uji UAT-01D)', nomor_dokumen: `UAT01D/UND/${Date.now()}`, tanggal_dokumen: `${TAHUN_UJI}-06-25` },
        fakeFile('uat01d-undangan', `konten-undangan-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      docUndangan = result.document;
      cleanup.documentIds.push(docUndangan.id);
    });

    console.log('\n=== T1 — kandidat BELUM tertaut: already_bound=false, tetap actionable ===');
    await test('T1 — findCandidates: already_bound=false sebelum binding apa pun', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, document_type: 'undangan' });
      const found = results.find((c) => c.document_id === docUndangan.id);
      assert.ok(found, 'Kandidat harus ditemukan.');
      assert.strictEqual(found.already_bound, false);
    });

    console.log('\n=== T2/T6/T7 — setelah binding: already_bound=true utk target SAMA, TETAP false utk target LAIN/tenant lain ===');
    let bindResult;
    await test('setup — binding pertama (analog persis alur Owner: Gunakan/Tautkan)', async () => {
      bindResult = await bindingService.bindDocumentToProsn(docUndangan.id, { pengisian_id: pengisianId, entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, kategori: 'undangan' }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(bindResult.bukti.food_ops_document_id, docUndangan.id);
      assert.strictEqual(bindResult.bukti.sumber, 'FOOD_OPS_REGISTRY');
    });

    await test('T2 — findCandidates SETELAH binding: already_bound=true utk target yang SAMA persis (mengulang skenario "+ Tambah Bukti Lain")', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, document_type: 'undangan' });
      const found = results.find((c) => c.document_id === docUndangan.id);
      assert.ok(found, 'Kandidat HARUS tetap muncul (transparansi, mandat §4) — bukan disembunyikan.');
      assert.strictEqual(found.already_bound, true);
      assert.strictEqual(found.relevance, 'EXACT', 'already_bound mendorong identityMatch=true -> relevance EXACT ("Cocok Persis") — PERSIS sesuai laporan Owner (sebelum bind: Mungkin Relevan, sesudah bind: Cocok Persis).');
    });

    await test('T6 — dokumen yang SAMA tetap actionable (already_bound=false) utk RAPAT_FORKOPIMDA entity LAIN yang legitimate', async () => {
      const rapatLain = await rapatService.create(pengisianId, { tanggal_rapat: `${TAHUN_UJI}-08-15`, nama_forum: 'TEST DATA — NOT OFFICIAL (Rapat Lain Uji UAT-01D)' }, ACTOR_OPERATOR, TENANT_ID);
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapatLain.id, document_type: 'undangan' });
      const found = results.find((c) => c.document_id === docUndangan.id);
      assert.ok(found, 'Dokumen yang sama harus tetap muncul sbg kandidat utk entitas lain.');
      assert.strictEqual(found.already_bound, false, 'ALREADY_BOUND harus target-scoped, BUKAN global pada dokumen sumber (mandat §7).');
    });

    await test('T7 — tenant lain TIDAK PERNAH melihat already_bound=true krn binding milik Tenant A (isolasi tenant, mandat §7 kedua)', async () => {
      const docTenantB = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'undangan', judul: 'TEST DATA — NOT OFFICIAL (Dokumen Tenant B)' },
        fakeFile('uat01d-tenant-b', `konten-tenant-b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, tenantB.id,
      )).document;
      cleanup.documentIds.push(docTenantB.id);
      // entity_id yang SAMA (id numerik rapat Tenant A) sengaja dipakai utk membuktikan
      // isolasi murni berbasis tenant_id, bukan kebetulan nilai id berbeda.
      const results = await candidateService.findCandidates(tenantB.id, { entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, document_type: 'undangan' });
      const found = results.find((c) => c.document_id === docTenantB.id);
      if (found) assert.strictEqual(found.already_bound, false, 'Tenant B tidak boleh terpengaruh oleh binding milik Tenant A walau entity_id numerik sama.');
    });

    console.log('\n=== T8-T11 — pertahanan endpoint tulis (bindDocumentToProsn) ===');
    await test('T8/T9/T10/T11 — binding KEDUA ke target SAMA PERSIS -> ditolak (409), ZERO baris ProsnBuktiDukung/ProsnBuktiIndikator baru, ZERO berkas fisik disalin', async () => {
      const totalBuktiSebelum = await db.ProsnBuktiDukung.count({ where: { tenant_id: TENANT_ID, food_ops_document_id: docUndangan.id } });
      const totalLinkSebelum = await db.ProsnBuktiIndikator.count({ where: { tenant_id: TENANT_ID, pengisian_id: pengisianId, entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id } });

      await expectFoodOpsError(
        bindingService.bindDocumentToProsn(docUndangan.id, { pengisian_id: pengisianId, entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, kategori: 'undangan' }, ACTOR_OPERATOR, TENANT_ID),
        'FOOD_OPS_PROSN_BINDING_ALREADY_EXISTS', 409,
      );

      const totalBuktiSesudah = await db.ProsnBuktiDukung.count({ where: { tenant_id: TENANT_ID, food_ops_document_id: docUndangan.id } });
      const totalLinkSesudah = await db.ProsnBuktiIndikator.count({ where: { tenant_id: TENANT_ID, pengisian_id: pengisianId, entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id } });
      assert.strictEqual(totalBuktiSesudah, totalBuktiSebelum, 'T9: tidak boleh ada ProsnBuktiDukung baru.');
      assert.strictEqual(totalLinkSesudah, totalLinkSebelum, 'T10: tidak boleh ada ProsnBuktiIndikator baru.');

      const buktiRows = await db.ProsnBuktiDukung.findAll({ where: { tenant_id: TENANT_ID, food_ops_document_id: docUndangan.id } });
      const filePaths = new Set(buktiRows.map((b) => b.file_path));
      assert.strictEqual(filePaths.size, 1, 'T11: semua baris ProsnBuktiDukung utk dokumen ini harus menunjuk SATU file_path yang sama (reuse, bukan penyalinan berkas fisik).');
      assert.strictEqual([...filePaths][0], docUndangan.file_path);
    });

    console.log('\n=== T6 (lanjutan) — binding ke entitas LAIN tetap berhasil normal (bukti cross-target reuse benar-benar berfungsi, bukan hanya di discovery) ===');
    await test('binding dokumen yang sama ke RAPAT_FORKOPIMDA entity LAIN -> berhasil (bukan diblokir oleh guard target-scoped)', async () => {
      const rapatLain2 = await rapatService.create(pengisianId, { tanggal_rapat: `${TAHUN_UJI}-09-10`, nama_forum: 'TEST DATA — NOT OFFICIAL (Rapat Lain 2 Uji UAT-01D)' }, ACTOR_OPERATOR, TENANT_ID);
      const bindLain = await bindingService.bindDocumentToProsn(docUndangan.id, { pengisian_id: pengisianId, entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapatLain2.id, kategori: 'undangan' }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(bindLain.bukti.food_ops_document_id, docUndangan.id);
      assert.notStrictEqual(bindLain.link.entity_id, rapat.id);
    });

    console.log('\n=== T12/T13 — discovery POSSIBLE/EXACT non-already-bound tetap berfungsi (regresi) ===');
    await test('T12/T13 — kandidat baru tanpa binding sama sekali tetap muncul dgn relevance yg benar & already_bound=false', async () => {
      const docBaru = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'undangan', judul: 'TEST DATA — NOT OFFICIAL (Undangan Baru Belum Tertaut)', tanggal_dokumen: `${TAHUN_UJI}-06-20` },
        fakeFile('uat01d-fresh', `konten-fresh-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      )).document;
      cleanup.documentIds.push(docBaru.id);
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'RAPAT_FORKOPIMDA', entity_id: rapat.id, document_type: 'undangan', tahun: TAHUN_UJI });
      const found = results.find((c) => c.document_id === docBaru.id);
      assert.ok(found);
      assert.strictEqual(found.already_bound, false);
      assert.ok(['STRONG', 'POSSIBLE'].includes(found.relevance) || found.relevance === 'EXACT');
    });

    console.log('\n=== T14/T15/T16 — UAT-01A/01B/01C TIDAK berubah (smoke regresi) ===');
    await test('T14 — EXACT duplicate generik (createDocument) tetap diblokir', async () => {
      const fileAsli = fakeFile('uat01d-exact-check', `konten-exact-cek-${Date.now()}-${Math.random()}`);
      const result = await documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01D Exact Check)' }, fileAsli, ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(result.document.id);
      await expectFoodOpsError(
        documentService.createDocument({ document_class: 'OTHER', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Dup)' }, fakeFile('uat01d-exact-check-2', fs.readFileSync(fileAsli.path).toString()), ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DOCUMENT_DUPLICATE', 409,
      );
    });
    await test('T15 — LIKELY_SAME generik (createDocument) tetap intercept', async () => {
      const original = (await documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01D LikelySame Check)', nomor_dokumen: 'UAT01D/LIKELYSAME/001' }, fakeFile('uat01d-likely-src', `konten-likely-src-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID)).document;
      cleanup.documentIds.push(original.id);
      await expectFoodOpsError(
        documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (Beda Isi)', nomor_dokumen: 'UAT01D/LIKELYSAME/001' }, fakeFile('uat01d-likely-diff', `konten-likely-diff-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID),
        'FOOD_OPS_DOCUMENT_LIKELY_SAME', 409,
      );
    });
    await test('T16 — NEW_VERSION (createNewVersion) tetap berfungsi (kelompok_uuid/lineage/identical-guard tidak berubah)', async () => {
      const src = (await documentService.createDocument({ document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'TEST DATA — NOT OFFICIAL (UAT-01D Version Check)' }, fakeFile('uat01d-v1', `konten-v1-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID)).document;
      cleanup.documentIds.push(src.id);
      const v2 = await documentService.createNewVersion(src.id, {}, fakeFile('uat01d-v2', `konten-v2-BEDA-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v2.id);
      assert.strictEqual(v2.versi, 2);
      assert.strictEqual(v2.kelompok_uuid, src.kelompok_uuid);
    });

    console.log('\n=== T17/T18 — tidak menyentuh skor ProSN/data Semester I Owner (struktural + read-only) ===');
    await test('T17 — foodOpsProsnBindingService.js TIDAK mengimpor/memanggil modul rule engine skor secara langsung (skor tetap hanya lewat autoRecalcSkor di controller, tidak berubah)', () => {
      const src = fs.readFileSync(require.resolve('../services/foodOperations/foodOpsProsnBindingService.js'), 'utf8');
      assert.ok(!/prosnpRuleEngineService/.test(src), 'Service binding tidak boleh memanggil rule engine skor langsung — itu tanggung jawab controller (autoRecalcSkor), tidak disentuh mandat ini.');
    });
    await test('T18 — data Semester I Owner nyata (tenant 1, tahun 2025) tidak tersentuh — verifikasi baca saja', async () => {
      const periodeNyata = await db.ProsnPeriode.findOne({ where: { tenant_id: 1, tahun: '2025', semester: '1' } });
      assert.ok(periodeNyata, 'Setup sanity — periode Semester I 2025 harus ada di DB nyata.');
      const b12Nyata = await db.ProsnIndikator.findOne({ where: { periode_id: periodeNyata.id, kode: 'B.1.2' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
      assert.strictEqual(Number(b12Nyata.pengisian.skor_indikatif_internal), 0, 'B.1.2 Semester I harus tetap 0.00 (tidak berubah oleh mandat ini).');
      const linkOwner = await db.ProsnBuktiIndikator.findByPk(1565);
      if (linkOwner) assert.strictEqual(linkOwner.entity_id, 146, 'Link forensik Owner (id 1565) tidak boleh berubah.');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.periodeIds) {
        try {
          const periodeRow = await db.ProsnPeriode.findByPk(id);
          if (periodeRow) {
            const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: id }, attributes: ['id'] })).map((i) => i.id);
            const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
            const buktiIds = (await db.ProsnBuktiIndikator.findAll({ where: { pengisian_id: pengisianIds }, attributes: ['bukti_dukung_id'] })).map((l) => l.bukti_dukung_id);
            await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
            await db.ProsnBuktiDukung.destroy({ where: { id: buktiIds }, force: true });
            await db.ProsnRapatForkopimda.destroy({ where: { pengisian_id: pengisianIds } });
            await db.ProsnPengisian.destroy({ where: { indikator_id: indikatorIds }, force: true });
            await db.ProsnIndikator.destroy({ where: { periode_id: id }, force: true });
            await periodeRow.destroy({ force: true });
          }
        } catch (cleanupErr) { console.error('  Cleanup periode error (non-fatal):', cleanupErr.message); }
      }
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
