'use strict';

/**
 * Corrective "B.1.4 Perkada Evidence Auto-Find/Reuse" — self-test membuktikan:
 * dokumen REGULATION/peraturan_gubernur existing dapat ditemukan sbg kandidat
 * utk kategori bukti 'perkada' B.1.4 (root cause: KATEGORI_PROSN_TO_FOOD_OPS_TYPES
 * sebelumnya tidak punya entri 'perkada' sama sekali -> semanticMatch selalu
 * false -> dikecualikan total), "Gunakan/Tautkan" membuat RELASI ke dokumen
 * existing (bukan duplikat), dan tidak ada baris FoodOpsDocument baru tercipta.
 * Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1, dihapus total di finally.
 * TIDAK menyentuh data UAT nyata (dokumen id=233/222 milik Owner sama sekali
 * tidak disentuh — hanya di-query read-only via script terpisah, bukan di sini).
 *
 * Jalankan: node scripts/prosnpB14PerkadaEvidenceDiscoverySelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const inovasiService = require('../services/prosnp/prosnpInovasiService');
const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');
const bindingService = require('../services/foodOperations/foodOpsProsnBindingService');
const documentService = require('../services/foodOperations/foodOpsDocumentService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '3007';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'b14_perkada_evidence_test_dummy.pdf');

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

const cleanup = { periodeIds: [], documentIds: [] };

(async () => {
  let fatalError = null;
  let periode;
  try {
    console.log('=== Setup: periode ProSN uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (B14 Perkada Evidence Discovery)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periode.id);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);

    const b14 = await db.ProsnIndikator.findOne({ where: { periode_id: periode.id, kode: 'B.1.4' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    assert.ok(b14 && b14.pengisian, 'Setup rusak — indikator/pengisian B.1.4 tidak ditemukan.');
    console.log(`  Periode id=${periode.id}, B.1.4 pengisian_id=${b14.pengisian.id}`);

    const inovasi = await inovasiService.create(b14.pengisian.id, {
      nama_inovasi: 'Uji Inovasi Perkada', relevansi_umum: true, status_implementasi: 'diterapkan_penuh',
      status_perkada: 'ditetapkan', nomor_perkada: 'PERGUB-UJI/001',
    }, ACTOR_OPERATOR, TENANT_ID);

    // Fixture: dokumen REGULATION/peraturan_gubernur (analog PERSIS dgn dokumen
    // UAT nyata 233), + satu dokumen document_type LAIN sbg kontrol negatif.
    const dokPergub = (await documentService.createDocument({
      document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'Uji Peraturan Gubernur Perkada',
      nomor_dokumen: 'PERGUB-UJI/TEST/2094', tanggal_dokumen: `${TAHUN_UJI}-01-01`,
    }, fakeFile('pergub-uji'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(dokPergub.id);

    const dokTidakRelevan = (await documentService.createDocument({
      document_class: 'OPERATIONAL_EVIDENCE', document_type: 'laporan', judul: 'Uji Laporan Tidak Relevan dgn Perkada',
    }, fakeFile('laporan-tidak-relevan'), ACTOR_ADMIN, TENANT_ID)).document;
    cleanup.documentIds.push(dokTidakRelevan.id);

    console.log('\n=== T1 — kategori_prosn=perkada menemukan dokumen REGULATION/peraturan_gubernur existing ===');
    await test('T1 — dokumen Peraturan Gubernur muncul sbg kandidat (sebelumnya "Tidak ditemukan" krn kategoriTypes kosong)', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'INOVASI', entity_id: inovasi.id, kategori_prosn: 'perkada' });
      const found = results.find((c) => c.document_id === dokPergub.id);
      assert.ok(found, 'Dokumen Peraturan Gubernur harus ditemukan sbg kandidat kategori perkada.');
      assert.ok(['EXACT', 'STRONG', 'POSSIBLE'].includes(found.relevance));
    });

    console.log('\n=== T2 — dokumen document_type tidak relevan TIDAK ikut sbg kandidat kategori perkada ===');
    await test('T2 — dokumen "laporan"/OPERATIONAL_EVIDENCE tidak muncul sbg kandidat perkada (kategoriTypes tetap sempit/jujur)', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'INOVASI', entity_id: inovasi.id, kategori_prosn: 'perkada' });
      assert.ok(!results.some((c) => c.document_id === dokTidakRelevan.id), 'Dokumen tidak relevan tidak boleh muncul sbg kandidat perkada.');
    });

    console.log('\n=== T3 — "Gunakan/Tautkan" membuat RELASI ke dokumen existing, TIDAK duplikat FoodOpsDocument ===');
    let buktiHasil;
    await test('T3 — bindDocumentToProsn memakai document_id existing, tidak membuat baris FoodOpsDocument baru', async () => {
      const jumlahDokumenSebelum = await db.FoodOpsDocument.count();
      buktiHasil = await bindingService.bindDocumentToProsn(dokPergub.id, {
        pengisian_id: b14.pengisian.id, entity_type: 'INOVASI', entity_id: inovasi.id, kategori: 'perkada',
      }, ACTOR_OPERATOR, TENANT_ID);
      const jumlahDokumenSesudah = await db.FoodOpsDocument.count();
      assert.strictEqual(jumlahDokumenSesudah, jumlahDokumenSebelum, 'Tidak boleh ada baris FoodOpsDocument baru — reuse murni, bukan duplikasi.');
      assert.ok(buktiHasil, 'Binding harus berhasil menghasilkan record bukti.');
    });

    console.log('\n=== T4 — setelah binding, dokumen muncul already_bound=true (EXACT via identity) pada pencarian berikutnya ===');
    await test('T4 — already_bound=true setelah binding eksplisit', async () => {
      const results = await candidateService.findCandidates(TENANT_ID, { entity_type: 'INOVASI', entity_id: inovasi.id, kategori_prosn: 'perkada' });
      const found = results.find((c) => c.document_id === dokPergub.id);
      assert.ok(found?.already_bound, 'already_bound harus true setelah binding eksplisit.');
      assert.strictEqual(found.relevance, 'EXACT');
    });

    console.log('\n=== T5 — bukti Perkada terikat ke record inovasi ini via ProsnBuktiIndikator, kategori=perkada, judul dari sumber ===');
    await test('T5 — ProsnBuktiIndikator + ProsnBuktiDukung terbentuk konsisten, tidak menyalin file fisik (file_path sama)', async () => {
      const link = await db.ProsnBuktiIndikator.findOne({
        where: { tenant_id: TENANT_ID, entity_type: 'INOVASI', entity_id: inovasi.id },
        include: [{ model: db.ProsnBuktiDukung, as: 'buktiDukung' }],
      });
      assert.ok(link, 'Relasi ProsnBuktiIndikator harus terbentuk.');
      assert.strictEqual(link.buktiDukung.kategori, 'perkada');
      assert.strictEqual(link.buktiDukung.file_path, dokPergub.file_path, 'file_path harus SAMA dgn dokumen sumber (reuse, bukan salin fisik).');
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      await db.FoodOpsDocumentLink.destroy({ where: { document_id: cleanup.documentIds } });
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop

      if (periode) {
        const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
        const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
        const buktiFiles = await db.ProsnBuktiDukung.findAll({ where: { periode_id: periode.id } });
        for (const b of buktiFiles) { if (!b.food_ops_document_id && fs.existsSync(b.file_path)) { try { fs.unlinkSync(b.file_path); } catch { /* no-op */ } } } // eslint-disable-line no-await-in-loop
        await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiDukung.destroy({ where: { periode_id: periode.id } });
        await db.ProsnInovasi.destroy({ where: { pengisian_id: pengisianIds } });
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
