'use strict';

/**
 * FINAL CLOSURE MANDATE — Req #30 "User Edit Preservation: Hard Regression
 * Proof". Membuktikan alur penuh Cari -> Gunakan/Abaikan tidak pernah diam-
 * diam menimpa teks Hambatan/Tindak Lanjut yang sudah disimpan user:
 *   (A) sistem menghasilkan saran (previewInternalAutofill, READ-ONLY).
 *   (B) user menerapkan saran ("Gunakan" — updatePengisian biasa).
 *   (C) user mengedit Hambatan scr manual.
 *   (D) user mengedit Tindak Lanjut scr manual.
 *   (E) skor/status sumber berubah (tambah data register + autoRecalcSkor) ->
 *       Hambatan/Tindak Lanjut user TIDAK berubah.
 *   (F) saran baru bisa dihitung ulang (preview lain menghasilkan teks
 *       berbeda) TANPA menimpa apa pun di DB.
 *   (G) teks tersimpan user tetap utuh sampai penggantian eksplisit.
 * Plus: "Gunakan" scr eksplisit MENGGANTI saat diminta; "Abaikan" (preview
 * tanpa updatePengisian) membiarkan teks user utuh; automatic scoring
 * (simpanSkor) tidak pernah menimpa teks user (dibuktikan struktural via
 * field yang ditulis); Sumber Data tetap memakai arsitektur `is_auto`
 * miliknya sendiri (regresi ringan, bukti penuh SD1-SD4 di
 * prosnpSemesterIIReadinessSelfTest.js).
 *
 * Data uji: tenant nyata 1, tahun fantasi TAHUN_UJI, dihapus total di finally.
 * TIDAK menyentuh evidence/UAT nyata.
 *
 * Jalankan: node scripts/prosnpUserEditPreservationSelfTest.js
 */
const assert = require('assert');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const internalFieldAutofillService = require('../services/prosnp/prosnpInternalFieldAutofillService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2080';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

/** Mimik EXACT logika prosnpController.updatePengisian (anti-spoof sumber_data_is_auto hidup di controller). */
async function updatePengisianViaController(id, payload, actor, tenantId) {
  const body = { ...payload };
  if (Object.prototype.hasOwnProperty.call(body, 'sumber_data')) {
    try {
      const preview = await internalFieldAutofillService.previewInternalAutofill(id, tenantId);
      const fresh = (preview.sumber_data || '').trim();
      const submitted = (body.sumber_data || '').trim();
      body.sumber_data_is_auto = Boolean(fresh) && fresh === submitted;
    } catch { body.sumber_data_is_auto = false; }
  }
  return workflow.updatePengisian(id, body, actor, tenantId);
}

async function cariIndikatorB11(periodeId) {
  const indikator = await db.ProsnIndikator.findOne({ where: { periode_id: periodeId, kode: 'B.1.1' }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
  assert.ok(indikator && indikator.pengisian, 'Setup rusak — indikator/pengisian B.1.1 tidak ditemukan.');
  return indikator;
}

const cleanup = { periodeIds: [] };

(async () => {
  let fatalError = null;
  let periode, b11, pengisianId;
  try {
    console.log('=== Setup: periode Semester II ProSN uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (Req #30 User Edit Preservation)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-01`, tanggal_cutoff: `${TAHUN_UJI}-12-31`,
      perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    cleanup.periodeIds.push(periode.id);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    b11 = await cariIndikatorB11(periode.id);
    pengisianId = b11.pengisian.id;
    console.log(`  Periode id=${periode.id}, B.1.1 pengisian_id=${pengisianId}`);

    let saran1;
    await test('A — previewInternalAutofill (kondisi kosong, total surat=0) READ-ONLY, tidak menulis DB', async () => {
      saran1 = await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
      assert.ok(saran1.hambatan, 'Saran hambatan harus ada utk kondisi kosong.');
      assert.ok(saran1.tindak_lanjut, 'Saran tindak lanjut harus ada utk kondisi kosong.');
      const fresh = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      assert.strictEqual(fresh.hambatan, null, 'previewInternalAutofill TIDAK BOLEH menulis apa pun ke DB — hambatan harus tetap null.');
      assert.strictEqual(fresh.tindak_lanjut, null, 'previewInternalAutofill TIDAK BOLEH menulis apa pun ke DB — tindak_lanjut harus tetap null.');
    });

    await test('B — "Gunakan": user menerapkan saran -> tersimpan persis sesuai saran', async () => {
      const current = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const saved = await updatePengisianViaController(pengisianId, {
        lock_version: current.lock_version, hambatan: saran1.hambatan, tindak_lanjut: saran1.tindak_lanjut,
      }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(saved.hambatan, saran1.hambatan);
      assert.strictEqual(saved.tindak_lanjut, saran1.tindak_lanjut);
    });

    const hambatanUserManual = 'TEST DATA — Hambatan hasil edit manual user (bukan dari saran sistem).';
    await test('C — user mengedit Hambatan scr manual (bukan lewat saran) -> tersimpan persis teks user', async () => {
      const current = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const saved = await updatePengisianViaController(pengisianId, { lock_version: current.lock_version, hambatan: hambatanUserManual }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(saved.hambatan, hambatanUserManual);
      assert.strictEqual(saved.tindak_lanjut, saran1.tindak_lanjut, 'Mengedit Hambatan saja tidak boleh mengubah Tindak Lanjut yang sudah tersimpan.');
    });

    const tindakLanjutUserManual = 'TEST DATA — Tindak Lanjut hasil edit manual user (bukan dari saran sistem).';
    await test('D — user mengedit Tindak Lanjut scr manual -> tersimpan persis teks user, Hambatan (C) tetap utuh', async () => {
      const current = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const saved = await updatePengisianViaController(pengisianId, { lock_version: current.lock_version, tindak_lanjut: tindakLanjutUserManual }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(saved.tindak_lanjut, tindakLanjutUserManual);
      assert.strictEqual(saved.hambatan, hambatanUserManual, 'Mengedit Tindak Lanjut saja tidak boleh mengubah Hambatan yang sudah tersimpan (C).');
    });

    await test('E — skor berubah (tambah surat + autoRecalcSkor) -> Hambatan/Tindak Lanjut user (C)/(D) TIDAK berubah', async () => {
      const sebelum = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      assert.strictEqual(sebelum.skor_indikatif_internal, null, 'Setup rusak — skor seharusnya belum pernah dihitung.');

      await suratService.create(pengisianId, {
        nomor_surat: 'SRT-UJI-30/001', tanggal_surat: `${TAHUN_UJI}-07-10`, pejabat_penandatangan: 'TEST DATA — Pejabat Uji',
        ringkasan_isi: 'TEST DATA — Ringkasan uji Req #30', cakupan_pengadaan: true,
      }, ACTOR_OPERATOR, TENANT_ID);

      const hasilRecalc = await ruleEngineService.autoRecalcSkor(pengisianId, TENANT_ID);
      assert.ok(hasilRecalc, 'autoRecalcSkor harus berhasil menghitung ulang setelah surat ditambahkan.');

      const sesudah = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      assert.notStrictEqual(sesudah.skor_indikatif_internal, null, 'Skor harus berubah (dari null) setelah data register bertambah.');
      assert.strictEqual(sesudah.hambatan, hambatanUserManual, 'Perubahan skor TIDAK BOLEH menimpa teks Hambatan user yang sudah tersimpan.');
      assert.strictEqual(sesudah.tindak_lanjut, tindakLanjutUserManual, 'Perubahan skor TIDAK BOLEH menimpa teks Tindak Lanjut user yang sudah tersimpan.');
    });

    let saran2;
    await test('F — saran baru bisa dihitung ulang (fakta sudah berubah pasca surat ditambahkan) TANPA menimpa DB', async () => {
      saran2 = await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
      assert.notStrictEqual(saran2.hambatan, saran1.hambatan, 'Saran segar harus berbeda dari saran awal (fakta register sudah berubah: surat.total 0->1, surat.valid masih 0).');
      const fresh = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      assert.strictEqual(fresh.hambatan, hambatanUserManual, 'Menghitung ulang saran (preview) TIDAK BOLEH menimpa Hambatan user tersimpan.');
      assert.strictEqual(fresh.tindak_lanjut, tindakLanjutUserManual, 'Menghitung ulang saran (preview) TIDAK BOLEH menimpa Tindak Lanjut user tersimpan.');
    });

    await test('G — "Abaikan": preview dipanggil berkali-kali tanpa updatePengisian -> teks user (C)/(D) tetap utuh', async () => {
      await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
      await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
      const fresh = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      assert.strictEqual(fresh.hambatan, hambatanUserManual);
      assert.strictEqual(fresh.tindak_lanjut, tindakLanjutUserManual);
    });

    await test('H — "Gunakan" eksplisit atas saran BARU (saran2) -> secara SENGAJA mengganti teks user (C)/(D), bukti replace hanya terjadi saat diminta eksplisit', async () => {
      const current = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const saved = await updatePengisianViaController(pengisianId, {
        lock_version: current.lock_version, hambatan: saran2.hambatan, tindak_lanjut: saran2.tindak_lanjut,
      }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(saved.hambatan, saran2.hambatan);
      assert.strictEqual(saved.tindak_lanjut, saran2.tindak_lanjut);
      assert.notStrictEqual(saved.hambatan, hambatanUserManual, 'Setelah Gunakan eksplisit, teks lama (C) harus benar-benar terganti (bukan digabung/diam-diam dipertahankan).');
    });

    await test('I — simpanSkor (jalur automatic scoring) struktural TIDAK PERNAH menyentuh kolom hambatan/tindak_lanjut/sumber_data (bukti kode sumber, bukan hanya perilaku observasi)', () => {
      const src = require('fs').readFileSync(require.resolve('../services/prosnp/prosnpRuleEngineService.js'), 'utf8');
      const simpanSkorMatch = src.match(/async function simpanSkor\([^)]*\)\s*\{[\s\S]*?\n\}/);
      assert.ok(simpanSkorMatch, 'Fungsi simpanSkor tidak ditemukan — setup pembacaan sumber rusak.');
      const body = simpanSkorMatch[0];
      assert.ok(!/\bhambatan\b/.test(body), 'simpanSkor TIDAK BOLEH menyebut field hambatan sama sekali.');
      assert.ok(!/\btindak_lanjut\b/.test(body), 'simpanSkor TIDAK BOLEH menyebut field tindak_lanjut sama sekali.');
      assert.ok(!/\bsumber_data\b/.test(body), 'simpanSkor TIDAK BOLEH menyebut field sumber_data sama sekali.');
    });

    await test('J — Sumber Data tetap memakai arsitektur is_auto miliknya sendiri (regresi ringan; bukti penuh SD1-SD4 di prosnpSemesterIIReadinessSelfTest.js): submit sama persis dgn saran -> is_auto TRUE, submit berbeda -> is_auto FALSE', async () => {
      const saranTerkini = await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
      const current1 = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const savedAuto = await updatePengisianViaController(pengisianId, { lock_version: current1.lock_version, sumber_data: saranTerkini.sumber_data }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(savedAuto.sumber_data_is_auto, true, 'sumber_data yg persis sama dgn saran sistem harus is_auto=true.');

      const current2 = await workflow.getPengisianScoped(pengisianId, TENANT_ID);
      const savedManual = await updatePengisianViaController(pengisianId, { lock_version: current2.lock_version, sumber_data: 'TEST DATA — sumber data diedit manual, tidak sama dgn saran.' }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(savedManual.sumber_data_is_auto, false, 'sumber_data yg berbeda dari saran sistem harus is_auto=false (anti-spoof, dihitung server, bukan dipercaya dari client).');
      assert.strictEqual(savedManual.hambatan, saran2.hambatan, 'Perubahan Sumber Data tidak boleh menyentuh Hambatan (H).');
      assert.strictEqual(savedManual.tindak_lanjut, saran2.tindak_lanjut, 'Perubahan Sumber Data tidak boleh menyentuh Tindak Lanjut (H).');
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
            await db.ProsnSuratPenugasanDukungan.destroy({ where: { surat_penugasan_id: (await db.ProsnSuratPenugasan.findAll({ where: { pengisian_id: pengisianIds }, attributes: ['id'] })).map((s) => s.id) } });
            await db.ProsnSuratPenugasan.destroy({ where: { pengisian_id: pengisianIds } });
            await db.ProsnPengisian.destroy({ where: { indikator_id: indikatorIds }, force: true });
            await db.ProsnIndikator.destroy({ where: { periode_id: id }, force: true });
            await periodeRow.destroy({ force: true });
          }
        } catch (cleanupErr) { console.error('  Cleanup periode error (non-fatal):', cleanupErr.message); }
      }
    } catch (cleanupError) {
      console.error('Cleanup error (non-fatal):', cleanupError.message);
    }
    await db.sequelize.close();
    if (fatalError || fail > 0) process.exit(1);
    process.exit(0);
  }
})();
