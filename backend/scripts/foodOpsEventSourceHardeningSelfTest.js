'use strict';

/**
 * CORRECTIVE MANDATE UAT-03 — "Kegiatan Auto-Fill / Reuse Hardening"
 * backend self-test.
 *
 * Owner UAT-03 found two confirmed defects (real forensic Event ID 166,
 * READ-ONLY, NEVER touched here):
 *   DEFECT A — Tahun stayed "2026" (system calendar year) even though the
 *     selected source document's Tanggal Mulai was 2025-06-30 — a wrong
 *     year was PERSISTED to the DB.
 *   DEFECT B — the same source document remained selectable/actionable
 *     after already being used to create Event 166, allowing a duplicate
 *     Kegiatan from the same canonical source.
 *
 * Root cause A (frontend): `emptyForm(String(new Date().getFullYear()))`
 * pre-seeded `tahun` with the system year BEFORE any document was chosen;
 * `deriveEventAutofill` only fills `tahun` when it's still empty, so the
 * wrong default silently blocked the safe derivation from the document's
 * `tanggal_dokumen`. Fixed frontend-side (no pre-seed) AND backend-side
 * here as defense-in-depth: `createEvent` now derives/normalizes `tahun`
 * from `tanggal_mulai` for any source-driven request, never trusting the
 * client's `tahun` for that path.
 *
 * Root cause B: FoodOpsEvent never stored ANY reference to the document it
 * was created from — traced and confirmed no `document_id` column exists
 * on `FoodOpsEvent` at all. Fixed by reusing the EXISTING generic
 * `food_ops_document_link` table (already used for evidence links) with a
 * distinguishing `relation_type='KEGIATAN_SOURCE'`, scoped by LINEAGE
 * (`kelompok_uuid`, not the specific version row) — matching UAT-01C's
 * frozen version semantics (a document's lineage stays "the same source"
 * across versions). No schema migration.
 *
 * Data uji: tenant nyata 1 (utk konsistensi lintas modul) + Tenant B
 * sintetis, semua dihapus di finally. TIDAK PERNAH menyentuh Event ID 166
 * atau data Semester I Owner.
 *
 * Jalankan: node scripts/foodOpsEventSourceHardeningSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const documentService = require('../services/foodOperations/foodOpsDocumentService');
const eventService = require('../services/foodOperations/foodOpsEventService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'uat03_event_source_test_dummy.pdf');

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

const cleanup = { documentIds: [], eventIds: [], tenantIds: [] };

(async () => {
  let fatalError = null;
  let tenantB;
  try {
    console.log('=== Setup: Tenant B sintetis (TEST DATA — NOT OFFICIAL) ===');
    tenantB = await db.Tenant.create({ nama: 'UJI UAT-03 Tenant B', domain: `uat03-test-b-${Date.now()}.local`, is_active: true });
    cleanup.tenantIds.push(tenantB.id);

    let docNotulen;
    await test('setup — dokumen Notulen sintetis, tanggal_dokumen=2025-06-30 (analog kasus Owner, BUKAN Event 166)', async () => {
      const result = await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Uji UAT-03)', nomor_dokumen: `UAT03/NOT/${Date.now()}`, tanggal_dokumen: '2025-06-30' },
        fakeFile('uat03-notulen', `konten-notulen-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      );
      docNotulen = result.document;
      cleanup.documentIds.push(docNotulen.id);
    });

    console.log('\n=== T1/T2 — DEFECT A: Tahun diturunkan/dinormalisasi dari tanggal_mulai, BUKAN dipercaya dari klien ===');
    let event1;
    await test('T1/T2 — payload klien tahun=2026 (SALAH) + tanggal_mulai=2025-06-30 + source_document_id -> backend TETAP menyimpan Tahun 2025', async () => {
      event1 = await eventService.createEvent(
        { event_type: 'RAKOR', tahun: '2026', tanggal_mulai: '2025-06-30', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Uji Tahun)', source_document_id: docNotulen.id },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.eventIds.push(event1.id);
      assert.strictEqual(event1.tahun, '2025', 'DEFECT A: backend HARUS menormalisasi tahun dari tanggal_mulai (2025), bukan mempercayai payload klien (2026) — persis skenario Owner (Event 166: tahun=2026, tanggal_mulai=2025-06-30, SALAH).');
      assert.strictEqual(event1.tanggal_mulai, '2025-06-30');
    });

    console.log('\n=== T3 — sumber kanonis unik bisa membuat SATU Kegiatan ===');
    await test('T3 — event1 berhasil tercatat dgn benar', async () => {
      const fresh = await eventService.getEventDetail(event1.id, TENANT_ID);
      assert.strictEqual(fresh.nama_kegiatan, 'TEST DATA — NOT OFFICIAL (Kegiatan Uji Tahun)');
    });

    console.log('\n=== T4/T5/T6 — DEFECT B: sumber kanonis yang SAMA TIDAK BISA membuat Kegiatan KEDUA ===');
    await test('T4/T5/T6 — createEvent KEDUA dgn source_document_id SAMA -> ditolak 409, ZERO FoodOpsEvent baru, ZERO link duplikat', async () => {
      const totalEventSebelum = await db.FoodOpsEvent.count({ where: { tenant_id: TENANT_ID } });
      const totalLinkSebelum = await db.FoodOpsDocumentLink.count({ where: { tenant_id: TENANT_ID, document_id: docNotulen.id, entity_type: 'EVENT', relation_type: 'KEGIATAN_SOURCE' } });

      await expectFoodOpsError(
        eventService.createEvent(
          { event_type: 'RAPAT', tahun: '2025', tanggal_mulai: '2025-06-30', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Percobaan Duplikat)', source_document_id: docNotulen.id },
          ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_EVENT_SOURCE_ALREADY_REGISTERED', 409,
      );

      const totalEventSesudah = await db.FoodOpsEvent.count({ where: { tenant_id: TENANT_ID } });
      const totalLinkSesudah = await db.FoodOpsDocumentLink.count({ where: { tenant_id: TENANT_ID, document_id: docNotulen.id, entity_type: 'EVENT', relation_type: 'KEGIATAN_SOURCE' } });
      assert.strictEqual(totalEventSesudah, totalEventSebelum, 'T5: tidak boleh ada FoodOpsEvent baru.');
      assert.strictEqual(totalLinkSesudah, totalLinkSebelum, 'T6: tidak boleh ada link KEGIATAN_SOURCE duplikat.');
      assert.strictEqual(totalLinkSebelum, 1, 'Sanity — harus tepat SATU link sumber dari event1.');
    });

    console.log('\n=== T7 — dokumen sumber LAIN (lineage berbeda) tetap bisa dipakai normal ===');
    await test('T7 — dokumen sumber berbeda -> createEvent berhasil normal', async () => {
      const docLain = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Lain Uji UAT-03)', tanggal_dokumen: '2025-08-15' },
        fakeFile('uat03-notulen-lain', `konten-notulen-lain-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      )).document;
      cleanup.documentIds.push(docLain.id);
      const eventLain = await eventService.createEvent(
        { event_type: 'MONITORING', tahun: '2025', tanggal_mulai: '2025-08-15', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan dari Sumber Lain)', source_document_id: docLain.id },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.eventIds.push(eventLain.id);
      assert.strictEqual(eventLain.tahun, '2025');
    });

    console.log('\n=== T8 — Kegiatan manual (tanpa sumber kanonis) tetap bisa dibuat, tidak terpengaruh guard ===');
    await test('T8 — createEvent tanpa source_document_id -> berhasil normal, tahun TIDAK dinormalisasi (perilaku manual persis seperti sebelumnya)', async () => {
      const eventManual = await eventService.createEvent(
        { event_type: 'KEGIATAN_LAIN', tahun: '2030', tanggal_mulai: '2025-01-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Manual, tahun sengaja beda utk uji)' },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.eventIds.push(eventManual.id);
      assert.strictEqual(eventManual.tahun, '2030', 'Kegiatan manual (tanpa source_document_id) TIDAK BOLEH terkena normalisasi tahun — hanya berlaku utk jalur source-driven (mandat §5 scoping).');
    });

    console.log('\n=== T9 — isolasi tenant ===');
    await test('T9 — dokumen sumber Tenant B, meski di-link ke Event Tenant B, tidak menghalangi Tenant A membuat Kegiatan dari dokumen SERUPA miliknya sendiri', async () => {
      const docTenantB = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Tenant B)' },
        fakeFile('uat03-tenant-b', `konten-tenant-b-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, tenantB.id,
      )).document;
      cleanup.documentIds.push(docTenantB.id);
      const eventTenantB = await eventService.createEvent(
        { event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-06-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Tenant B)', source_document_id: docTenantB.id },
        ACTOR_ADMIN, tenantB.id,
      );
      cleanup.eventIds.push(eventTenantB.id);

      // Percobaan dari Tenant A memakai document_id milik Tenant B harus gagal krn dokumen tidak ditemukan di tenant A (bukan krn "already registered").
      await expectFoodOpsError(
        eventService.createEvent(
          { event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-06-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Percobaan Akses Tenant B dari A)', source_document_id: docTenantB.id },
          ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_NOT_FOUND', 404,
      );
    });

    console.log('\n=== T10/T11 — semantik lineage versi: dokumen versi baru dari lineage yang SUDAH dipakai TETAP dianggap sudah terdaftar ===');
    await test('T10/T11 — createNewVersion pada docNotulen (sudah dipakai event1) -> versi baru dari LINEAGE yang sama TETAP ditolak sbg sumber baru', async () => {
      const v2 = await documentService.createNewVersion(docNotulen.id, {}, fakeFile('uat03-notulen-v2', `konten-notulen-v2-BEDA-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID);
      cleanup.documentIds.push(v2.id);
      assert.strictEqual(v2.kelompok_uuid, docNotulen.kelompok_uuid, 'Sanity — versi baru harus tetap satu lineage dgn docNotulen.');

      await expectFoodOpsError(
        eventService.createEvent(
          { event_type: 'RAPAT', tahun: '2025', tanggal_mulai: '2025-06-30', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Percobaan via Versi Baru)', source_document_id: v2.id },
          ACTOR_ADMIN, TENANT_ID,
        ),
        'FOOD_OPS_EVENT_SOURCE_ALREADY_REGISTERED', 409,
        'Versi baru (v2) dari lineage yang SAMA dgn docNotulen (yg sudah dipakai event1) HARUS tetap dikenali sbg sudah terdaftar — identitas sumber adalah lineage (kelompok_uuid), bukan document_id spesifik (mandat §9).',
      );
    });

    console.log('\n=== T12 — data Kegiatan lama (dibuat sebelum mandat ini, mis. tanpa source_document_id) tidak berubah ===');
    await test('T12 — Kegiatan manual lama tetap dapat dibaca & diubah normal (updateEvent, jalur TIDAK disentuh mandat ini)', async () => {
      const eventLama = await eventService.createEvent(
        { event_type: 'SOSIALISASI', tahun: '2025', tanggal_mulai: '2025-02-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Lama)' },
        ACTOR_ADMIN, TENANT_ID,
      );
      cleanup.eventIds.push(eventLama.id);
      const updated = await eventService.updateEvent(eventLama.id, {
        event_type: 'SOSIALISASI', tahun: '2025', tanggal_mulai: '2025-02-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Kegiatan Lama, Diubah)', lock_version: eventLama.lock_version,
      }, ACTOR_ADMIN, TENANT_ID);
      assert.strictEqual(updated.nama_kegiatan, 'TEST DATA — NOT OFFICIAL (Kegiatan Lama, Diubah)');
    });

    console.log('\n=== T13 — tidak ada field yang difabrikasi ===');
    await test('T13 — field tanpa sumber aman (lokasi/pimpinan/agenda/hasil/tindak_lanjut) tetap null krn tidak dikirim, TIDAK ditebak backend', async () => {
      const fresh = await eventService.getEventDetail(event1.id, TENANT_ID);
      assert.strictEqual(fresh.lokasi, null);
      assert.strictEqual(fresh.pimpinan, null);
      assert.strictEqual(fresh.agenda, null);
      assert.strictEqual(fresh.hasil, null);
      assert.strictEqual(fresh.tindak_lanjut, null);
    });

    console.log('\n=== T14 — default Status Tindak Lanjut tidak berubah ===');
    await test('T14 — status_tindak_lanjut default tetap "belum_ditindaklanjuti"', async () => {
      const fresh = await eventService.getEventDetail(event1.id, TENANT_ID);
      assert.strictEqual(fresh.status_tindak_lanjut, 'belum_ditindaklanjuti');
    });

    console.log('\n=== T15 — konkurensi: dua request bersamaan dgn sumber SAMA tidak menghasilkan dua Kegiatan ===');
    await test('T15 — dua createEvent KONKUREN dgn source_document_id SAMA (dokumen baru) -> TEPAT SATU berhasil', async () => {
      const docRace = (await documentService.createDocument(
        { document_class: 'ACTIVITY_DOCUMENT', document_type: 'notulen', judul: 'TEST DATA — NOT OFFICIAL (Notulen Uji Race UAT-03)', tanggal_dokumen: '2025-09-01' },
        fakeFile('uat03-race', `konten-race-${Date.now()}-${Math.random()}`), ACTOR_ADMIN, TENANT_ID,
      )).document;
      cleanup.documentIds.push(docRace.id);

      const results = await Promise.allSettled([
        eventService.createEvent({ event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-09-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Race A)', source_document_id: docRace.id }, ACTOR_ADMIN, TENANT_ID),
        eventService.createEvent({ event_type: 'RAKOR', tahun: '2025', tanggal_mulai: '2025-09-01', nama_kegiatan: 'TEST DATA — NOT OFFICIAL (Race B)', source_document_id: docRace.id }, ACTOR_ADMIN, TENANT_ID),
      ]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      fulfilled.forEach((r) => cleanup.eventIds.push(r.value.id));
      assert.strictEqual(fulfilled.length, 1, 'Tepat SATU dari dua request konkuren dgn sumber sama boleh berhasil.');
      const totalLink = await db.FoodOpsDocumentLink.count({ where: { tenant_id: TENANT_ID, document_id: docRace.id, entity_type: 'EVENT', relation_type: 'KEGIATAN_SOURCE' } });
      assert.strictEqual(totalLink, 1, 'Hanya boleh ada SATU link KEGIATAN_SOURCE utk dokumen ini walau ada percobaan konkuren.');
    });

    console.log('\n=== Read-only — Event ID 166 Owner tidak tersentuh ===');
    await test('Event 166 (forensik Owner) tidak dimutasi — verifikasi baca saja', async () => {
      const event166 = await db.FoodOpsEvent.findByPk(166);
      if (event166) {
        assert.strictEqual(event166.event_type, 'RAKOR');
        assert.strictEqual(event166.tanggal_mulai, '2025-06-30');
        // TIDAK menguji/memaksa tahun=2026 di sini — itulah defect asli, dibiarkan sbg bukti forensik apa adanya, TIDAK diperbaiki/dinormalisasi.
      }
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      await db.FoodOpsDocumentLink.destroy({ where: { document_id: cleanup.documentIds } });
      for (const id of cleanup.eventIds) { try { await db.FoodOpsEvent.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.documentIds) { try { await db.FoodOpsDocument.destroy({ where: { id }, force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
      for (const id of cleanup.tenantIds) {
        try {
          const tenantEvents = await db.FoodOpsEvent.findAll({ where: { tenant_id: id } });
          for (const e of tenantEvents) { try { await e.destroy({ force: true }); } catch { /* no-op */ } } // eslint-disable-line no-await-in-loop
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
