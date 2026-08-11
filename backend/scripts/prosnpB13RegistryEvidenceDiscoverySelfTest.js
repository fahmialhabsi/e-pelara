'use strict';

/**
 * Corrective "B.1.3 Registry-First Evidence Discovery" — self-test membuktikan:
 * kategori normalization, resolusi konteks bisnis (FoodOps Event, tanpa ID
 * hardcode), sinyal "berlaku sebelum tanggal" utk saldo_awal/PKS, tenant
 * isolation, no-auto-bind, dan verifikasi tetap tidak berubah sbg efek
 * samping binding. Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1 + Tenant
 * B sintetis, dihapus total di finally. TIDAK menyentuh evidence/UAT nyata.
 *
 * Jalankan: node scripts/prosnpB13RegistryEvidenceDiscoverySelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const cadanganPangan = require('../services/prosnp/prosnpCadanganPanganService');
const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');
const bindingService = require('../services/foodOperations/foodOpsProsnBindingService');
const documentService = require('../services/foodOperations/foodOpsDocumentService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const linkService = require('../services/foodOperations/foodOpsDocumentLinkService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2079';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'b13_registry_evidence_test_dummy.pdf');

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
async function cariIndikatorB13(periodeId) {
  const indikator = await db.ProsnIndikator.findOne({ where: { periode_id: periodeId, kode: 'B.1.3' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
  assert.ok(indikator && indikator.pengisian, 'Setup rusak — indikator/pengisian B.1.3 tidak ditemukan.');
  return indikator;
}

const cleanup = { periodeIds: [], documentIds: [], eventIds: [], tenantIds: [] };

(async () => {
  let fatalError = null;
  let periode, tenantB;
  try {
    console.log('=== Setup: periode Semester II ProSN uji tahun', TAHUN_UJI, '+ Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI B13 Registry Evidence Tenant B', domain: `b13-registry-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (B13 Registry Evidence Discovery)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-01`, tanggal_cutoff: `${TAHUN_UJI}-12-31`,
      perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periode.id);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    const b13 = await cariIndikatorB13(periode.id);
    console.log(`  Periode id=${periode.id}, B.1.3 pengisian_id=${b13.pengisian.id}`);

    const trxSaldoAwal = await cadanganPangan.createTransaksi(b13.pengisian.id, {
      komoditas_id: 1, tanggal: `${TAHUN_UJI}-07-01`, jenis_transaksi: 'saldo_awal', volume: 100,
    }, ACTOR_OPERATOR, TENANT_ID);
    const trxPenyaluran = await cadanganPangan.createTransaksi(b13.pengisian.id, {
      komoditas_id: 1, tanggal: `${TAHUN_UJI}-08-20`, jenis_transaksi: 'penyaluran', volume: 10,
    }, ACTOR_OPERATOR, TENANT_ID);
    console.log(`  Transaksi saldo_awal id=${trxSaldoAwal.id} (${trxSaldoAwal.tanggal}), penyaluran id=${trxPenyaluran.id} (${trxPenyaluran.tanggal})`);

    // === Fixture FoodOps: PKS-like (tanpa Event), event konteks penyaluran cocok, event TIDAK cocok, cross-tenant ===
    const pks = (await documentService.createDocument({
      document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'PKS Uji Ketersediaan CPPD',
      tanggal_dokumen: `${TAHUN_UJI}-06-15`,
    }, fakeFile('pks-uji'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(pks.id);

    const eventCocok = await eventService.createEvent({ event_type: 'PENYALURAN', tahun: TAHUN_UJI, tanggal_mulai: `${TAHUN_UJI}-08-20`, nama_kegiatan: 'Penyaluran Uji — Konteks Cocok' }, ACTOR_ADMIN, TENANT_ID);
    cleanup.eventIds.push(eventCocok.id);
    const bastCocok = (await documentService.createDocument({
      document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'BAST Uji — Penyaluran Cocok',
    }, fakeFile('bast-cocok'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(bastCocok.id);
    await linkService.createLink({ document_id: bastCocok.id, entity_type: 'EVENT', entity_id: eventCocok.id, relation_type: 'Evidence' }, ACTOR_ADMIN, TENANT_ID);

    const eventTidakCocok = await eventService.createEvent({ event_type: 'PENYALURAN', tahun: TAHUN_UJI, tanggal_mulai: `${TAHUN_UJI}-09-01`, nama_kegiatan: 'Penyaluran Uji — Konteks Tidak Cocok' }, ACTOR_ADMIN, TENANT_ID);
    cleanup.eventIds.push(eventTidakCocok.id);
    const bastTidakCocok = (await documentService.createDocument({
      document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'BAST Uji — Penyaluran Tidak Cocok',
    }, fakeFile('bast-tidak-cocok'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(bastTidakCocok.id);
    await linkService.createLink({ document_id: bastTidakCocok.id, entity_type: 'EVENT', entity_id: eventTidakCocok.id, relation_type: 'Evidence' }, ACTOR_ADMIN, TENANT_ID);

    const docTenantB = (await documentService.createDocument({
      document_class: 'ACTIVITY_DOCUMENT', document_type: 'other', judul: 'BAST Uji — Tenant B (harus tidak pernah muncul)',
    }, fakeFile('bast-tenant-b'), ACTOR_ADMIN, tenantB.id)).document;
    const eventTenantB = await eventService.createEvent({ event_type: 'PENYALURAN', tahun: TAHUN_UJI, tanggal_mulai: `${TAHUN_UJI}-08-20`, nama_kegiatan: 'Penyaluran Uji — Tenant B' }, ACTOR_ADMIN, tenantB.id);
    await linkService.createLink({ document_id: docTenantB.id, entity_type: 'EVENT', entity_id: eventTenantB.id, relation_type: 'Evidence' }, ACTOR_ADMIN, tenantB.id);

    const docTypeYear = (await documentService.createDocument({
      document_class: 'REGULATION', document_type: 'keputusan_gubernur', judul: 'Keputusan Uji — Dokumen Penetapan',
      tanggal_dokumen: `${TAHUN_UJI}-01-10`,
    }, fakeFile('kepgub-uji'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(docTypeYear.id);

    const docSuratJalan = (await documentService.createDocument({
      document_class: 'ACTIVITY_DOCUMENT', document_type: 'surat_jalan', judul: 'Surat Jalan Uji — Dokumen Penyaluran',
      tanggal_dokumen: `${TAHUN_UJI}-08-20`,
    }, fakeFile('surat-jalan-uji'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(docSuratJalan.id);

    console.log('\n=== T1/T2 — tahun mencapai discovery + normalisasi Dokumen Penetapan ===');
    await test('T1/T2 — kategori_prosn=dokumen_penetapan + tahun cocok -> docTypeYear STRONG', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { kategori_prosn: 'dokumen_penetapan', tahun: TAHUN_UJI });
      const found = results.find((c) => c.document_id === docTypeYear.id);
      assert.ok(found, 'docTypeYear (keputusan_gubernur) harus muncul via normalisasi kategori dokumen_penetapan.');
      assert.strictEqual(found.relevance, 'STRONG');
    });

    console.log('\n=== T3 — normalisasi Dokumen Penyaluran ===');
    await test('T3 — kategori_prosn=dokumen_penyaluran + tahun cocok -> docSuratJalan STRONG', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { kategori_prosn: 'dokumen_penyaluran', tahun: TAHUN_UJI });
      const found = results.find((c) => c.document_id === docSuratJalan.id);
      assert.ok(found, 'docSuratJalan harus muncul via normalisasi kategori dokumen_penyaluran.');
      assert.strictEqual(found.relevance, 'STRONG');
    });

    console.log('\n=== T4 — saldo_awal menemukan PKS TANPA Event link via sinyal "berlaku sebelum tanggal" ===');
    await test('T4 — PKS (tanggal_dokumen sebelum tanggal transaksi saldo_awal) -> POSSIBLE, tanpa Event link', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, {
        kategori_prosn: 'dokumen_penetapan', jenis_transaksi: trxSaldoAwal.jenis_transaksi, entity_business_date: trxSaldoAwal.tanggal,
      });
      const found = results.find((c) => c.document_id === pks.id);
      assert.ok(found, 'PKS harus ditemukan via sinyal "berlaku sebelum tanggal transaksi" walau tidak punya Event link.');
      assert.strictEqual(found.relevance, 'POSSIBLE', 'PKS tanpa sinyal lain harus POSSIBLE (bukan STRONG/EXACT) — jujur ttg ketidakpastian.');
    });

    console.log('\n=== T5/T6 — resolusi konteks bisnis Event (tanpa hardcode ID) ===');
    await test('T5/T6 — transaksi penyaluran (tanggal persis sama dgn Event) -> dokumen terikat Event tsb EXACT via context_event', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, {
        kategori_prosn: 'dokumen_penyaluran', jenis_transaksi: trxPenyaluran.jenis_transaksi, entity_business_date: trxPenyaluran.tanggal,
      });
      const found = results.find((c) => c.document_id === bastCocok.id);
      assert.ok(found, 'BAST yg terikat ke Event dgn tanggal_mulai persis sama harus ditemukan.');
      assert.strictEqual(found.relevance, 'EXACT');
      assert.ok(found.context_event, 'Field context_event harus terisi.');
      assert.strictEqual(found.context_event.event_id, eventCocok.id);
    });

    console.log('\n=== T7 — dokumen dari Event TIDAK cocok tidak pernah EXACT via context ===');
    await test('T7 — BAST dari Event tanggal berbeda TIDAK EXACT via context_event (boleh tidak muncul sama sekali)', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, {
        kategori_prosn: 'dokumen_penyaluran', jenis_transaksi: trxPenyaluran.jenis_transaksi, entity_business_date: trxPenyaluran.tanggal,
      });
      const found = results.find((c) => c.document_id === bastTidakCocok.id);
      if (found) assert.notStrictEqual(found.relevance, 'EXACT', 'Dokumen dari Event yg tanggalnya TIDAK cocok tidak boleh EXACT.');
    });

    console.log('\n=== T8 — tenant isolation, tidak ada kebocoran lintas tenant ===');
    await test('T8 — dokumen/Event Tenant B TIDAK PERNAH muncul di hasil Tenant 1', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, {
        kategori_prosn: 'dokumen_penyaluran', jenis_transaksi: 'penyaluran', entity_business_date: `${TAHUN_UJI}-08-20`,
      });
      assert.ok(!results.some((c) => c.document_id === docTenantB.id), 'Dokumen Tenant B bocor ke hasil Tenant 1.');
    });

    console.log('\n=== T9 — discovery TIDAK PERNAH auto-bind ===');
    await test('T9 — memanggil findCandidates berkali-kali tidak membuat baris link/binding apa pun', async () => {
      const linksBefore = await db.FoodOpsDocumentLink.count();
      const buktiBefore = await db.ProsnBuktiIndikator.count();
      await candidateService.findCandidates(TENANT_ID, { kategori_prosn: 'dokumen_penyaluran', jenis_transaksi: 'penyaluran', entity_business_date: `${TAHUN_UJI}-08-20` });
      await candidateService.findCandidates(TENANT_ID, { kategori_prosn: 'dokumen_penetapan', jenis_transaksi: 'saldo_awal', entity_business_date: `${TAHUN_UJI}-07-01` });
      assert.strictEqual(await db.FoodOpsDocumentLink.count(), linksBefore);
      assert.strictEqual(await db.ProsnBuktiIndikator.count(), buktiBefore);
    });

    console.log('\n=== T13/T16/T17 — binding & already_bound, verifikasi tidak berubah sbg efek samping ===');
    let boundResult;
    await test('T13 — setelah bind eksplisit, already_bound=true pada pencarian berikutnya', async () => {
      boundResult = await bindingService.bindDocumentToProsn(bastCocok.id, {
        pengisian_id: b13.pengisian.id, entity_type: 'STOK_TRANSAKSI', entity_id: trxPenyaluran.id, kategori: 'dokumen_penyaluran',
      }, ACTOR_OPERATOR, TENANT_ID);
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'STOK_TRANSAKSI', entity_id: trxPenyaluran.id, kategori_prosn: 'dokumen_penyaluran' });
      const found = results.find((c) => c.document_id === bastCocok.id);
      assert.ok(found?.already_bound, 'already_bound harus true setelah binding eksplisit.');
      assert.strictEqual(found.relevance, 'EXACT');
    });
    await test('T16/T17 — binding TIDAK mengubah status_verifikasi dokumen sumber FoodOps', async () => {
      const fresh = await documentService.getDocumentDetail(bastCocok.id, TENANT_ID);
      assert.strictEqual(fresh.status_verifikasi, 'uploaded', 'status_verifikasi dokumen sumber harus tetap apa adanya (bukan otomatis valid krn di-bind).');
    });

    console.log('\n=== T15 — duplikat dinilai murni via checksum, BUKAN nama berkas ===');
    await test('T15 — findDuplicateByChecksum tidak peduli nama berkas, hanya checksum', async () => {
      fakeFile('sama-nama-file-a', 'konten-identik-uji-T15');
      const checksum1 = documentService.computeChecksum(DUMMY_FILE);
      fakeFile('nama-file-yang-sangat-berbeda', 'konten-identik-uji-T15');
      const checksum2 = documentService.computeChecksum(DUMMY_FILE);
      assert.strictEqual(checksum1, checksum2, 'Konten SAMA harus menghasilkan checksum SAMA walau nama file berbeda total (bukan dinilai dari nama file).');

      fakeFile('konten-belum-pernah-diunggah', `konten-benar-benar-baru-${Date.now()}-${Math.random()}`);
      const checksumBaru = documentService.computeChecksum(DUMMY_FILE);
      const dup = await documentService.findDuplicateByChecksum(TENANT_ID, checksumBaru);
      assert.ok(!dup, 'Checksum dari konten yang benar-benar baru (belum pernah diunggah) tidak boleh dianggap duplikat.');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.eventIds) { try { await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      await db.FoodOpsDocumentLink.destroy({ where: { document_id: cleanup.documentIds } });
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.tenantIds) {
        try {
          const tenantDocs = await db.FoodOpsDocument.findAll({ where: { tenant_id: id } });
          await db.FoodOpsDocumentLink.destroy({ where: { document_id: tenantDocs.map((d) => d.id) } });
          await db.FoodOpsDocument.destroy({ where: { tenant_id: id }, force: true });
          await db.FoodOpsEvent.destroy({ where: { tenant_id: id }, force: true });
          await db.Tenant.destroy({ where: { id }, force: true });
        } catch { /* no-op */ } // eslint-disable-line no-await-in-loop
      }

      if (periode) {
        const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
        const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
        const buktiFiles = await db.ProsnBuktiDukung.findAll({ where: { periode_id: periode.id } });
        for (const b of buktiFiles) { if (!b.food_ops_document_id && fs.existsSync(b.file_path)) { try { fs.unlinkSync(b.file_path); } catch { /* no-op */ } } }
        await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiDukung.destroy({ where: { periode_id: periode.id } });
        await db.ProsnStokTransaksi.destroy({ where: { periode_id: periode.id } });
        await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
        await db.ProsnIndikator.destroy({ where: { id: indikatorIds } });
        await db.ProsnPeriode.destroy({ where: { id: periode.id } });
        console.log(`Periode uji tahun ${TAHUN_UJI} (id ${periode.id}) dihapus total.`);
      }
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
