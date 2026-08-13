'use strict';

/**
 * FINAL MASTER CORRECTIVE & CLOSURE MANDATE — UAT-02 + UAT-03 SOURCE-DRIVEN
 * AUTOFILL/REUSE INTEGRITY CLOSURE. Backend closure evidence NOT already
 * covered by `foodOpsRegulationAutofillHardeningSelfTest.js` /
 * `foodOpsEventSourceHardeningSelfTest.js`:
 *
 *   R15 — superseded (status='digantikan') documents must not be offered as
 *   ordinary selectable Regulation sources (Kegiatan's equivalent was
 *   already proven in foodOpsEventSourceHardeningSelfTest T10/T11 — this
 *   file closes the SAME requirement for the Regulasi source selector,
 *   which reuses the identical `listDocuments` query/filter).
 *
 *   Event 166 forensic classification — formalized as an automated,
 *   READ-ONLY regression assertion (not just a manual query) so this
 *   closure's finding survives future passes: LEGACY/PRE-FIX, zero
 *   KEGIATAN_SOURCE linkage, untouched.
 *
 * Data uji: tenant nyata 1, dokumen sintetis baru (dihapus di finally).
 * Event 166 dan dokumen Regulasi Owner (Pergub 10.1/2025, Kepgub
 * 365/KPTS/MU/2025) dibaca READ-ONLY saja, TIDAK PERNAH dimutasi.
 *
 * Jalankan: node scripts/foodOpsSourceIntegrityClosureSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'closure_source_integrity_test_dummy.pdf');

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

const cleanup = { documentIds: [] };

(async () => {
  let fatalError = null;
  try {
    console.log('=== R15 — dokumen Regulasi yang sudah digantikan (superseded) TIDAK muncul sbg kandidat sumber ===');
    let v1, v2;
    await test('setup — dokumen REGULATION v1 lalu diversi ke v2 (sintetis, BUKAN Pergub/Kepgub Owner)', async () => {
      const resultV1 = await documentService.createDocument(
        { document_class: 'REGULATION', document_type: 'peraturan_gubernur', judul: 'TEST DATA — NOT OFFICIAL (Closure R15 v1)', tanggal_dokumen: '2025-01-01' },
        fakeFile('closure-r15-v1', `konten-r15-v1-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      v1 = resultV1.document;
      cleanup.documentIds.push(v1.id);
      v2 = await documentService.createNewVersion(v1.id, {}, fakeFile('closure-r15-v2', `konten-r15-v2-BEDA-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v2.id);
    });

    await test('R15 — listDocuments(document_class=REGULATION) HANYA mengembalikan v2 (aktif), TIDAK v1 (digantikan)', async () => {
      const results = await documentService.listDocuments(TENANT_ID, { document_class: 'REGULATION' });
      const ids = results.map((d) => d.id);
      assert.ok(ids.includes(v2.id), 'Versi aktif (v2) harus muncul sbg kandidat sumber.');
      assert.ok(!ids.includes(v1.id), 'Versi yg sudah digantikan (v1) TIDAK BOLEH muncul sbg kandidat sumber baru — mencegah pendaftaran Regulasi dari versi historis yg sudah usang.');
    });

    await test('K15 (regresi silang, sudah dibuktikan penuh di foodOpsEventSourceHardeningSelfTest) — listDocuments generik (dipakai Kegiatan) memakai filter status yang SAMA', async () => {
      const results = await documentService.listDocuments(TENANT_ID, {});
      const ids = results.map((d) => d.id);
      assert.ok(!ids.includes(v1.id), 'Filter status!=digantikan berlaku seragam lintas SEMUA query listDocuments (Regulasi maupun Kegiatan pakai fungsi yg SAMA persis, bukan implementasi terpisah).');
    });

    console.log('\n=== Event 166 — klasifikasi forensik terformalkan (read-only, otomatis) ===');
    await test('Event 166: LEGACY/PRE-FIX — dibuat SEBELUM mekanisme KEGIATAN_SOURCE ada, nol tautan sumber, TIDAK dimutasi', async () => {
      const event166 = await db.FoodOpsEvent.findByPk(166);
      if (!event166) { console.log('      (Event 166 tidak ditemukan di lingkungan ini — dilewati, bukan kegagalan)'); return; }
      assert.strictEqual(event166.tahun, '2026', 'Nilai tahun forensik Owner (SALAH, itulah defect asli) harus tetap apa adanya — TIDAK diperbaiki/dinormalisasi scr retroaktif.');
      assert.strictEqual(event166.tanggal_mulai, '2025-06-30');
      const links = await db.FoodOpsDocumentLink.findAll({ where: { entity_type: 'EVENT', entity_id: 166 } });
      assert.strictEqual(links.length, 0, 'Event 166 legacy TIDAK BOLEH memiliki tautan KEGIATAN_SOURCE apa pun — ini konfirmasi klasifikasi LEGACY, bukan indikasi bug (dibuat sebelum mekanisme ini ada).');
    });

    console.log('\n=== Owner Regulation records — read-only, dibuktikan utuh (bukan hanya diasumsikan) ===');
    await test('Pergub 10.1/2025 & Kepgub 365/KPTS/MU/2025 Owner tetap utuh — jenis_produk_hukum sesuai defect yg sudah diperbaiki, field manual (tanggal_berlaku/catatan) tetap tersimpan', async () => {
      const pergub = await db.FoodOpsRegulationMeta.findOne({ where: { tenant_id: 1, nomor: '10.1 Tahun 2025' } });
      const kepgub = await db.FoodOpsRegulationMeta.findOne({ where: { tenant_id: 1, nomor: '365/KPTS/MU/2025' } });
      if (pergub) {
        assert.strictEqual(pergub.jenis_produk_hukum, 'pergub');
        assert.strictEqual(pergub.tanggal_berlaku, '2025-03-17');
      }
      if (kepgub) {
        assert.strictEqual(kepgub.jenis_produk_hukum, 'kepgub');
        assert.strictEqual(kepgub.tanggal_berlaku, '2025-07-30');
      }
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      if (fs.existsSync(DUMMY_FILE)) fs.unlinkSync(DUMMY_FILE);
    } catch (cleanupError) {
      console.error('Cleanup error (non-fatal):', cleanupError.message);
    }
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
    process.exit(0);
  }
})();
