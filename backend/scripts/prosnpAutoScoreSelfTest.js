'use strict';

/**
 * Corrective "ProSN Semester-II Readiness — Automatic Scoring" (mandat §20/
 * §21/§40/§46) — self-test membuktikan: skor B.1.1/B.1.2/B.1.4 disegarkan
 * OTOMATIS (tanpa panggilan manual "Hitung Ulang Skor") setelah create/
 * update/delete register DAN setelah bind/unbind/verifikasi evidence; B.1.3
 * (FUNCTIONAL BASELINE FROZEN) dan seluruh tipe_form MBG SENGAJA dikecualikan
 * (tetap manual-only, tidak berubah); auto-recalc idempotent, best-effort/
 * non-fatal (tidak pernah melempar meski input tidak valid).
 * Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1, dihapus total di
 * finally. TIDAK menyentuh UAT nyata.
 *
 * Jalankan: node scripts/prosnpAutoScoreSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const rapatService = require('../services/prosnp/prosnpRapatForkopimdaService');
const inovasiService = require('../services/prosnp/prosnpInovasiService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const ACTOR_PENGAWAS = { id: 6, role: 'PENGAWAS' };
const TAHUN_UJI = '2065';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'prosnp_autoscore_test_dummy.pdf');

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
async function uploadBukti(pengisianId, entityType, entityId, kategori) {
  return workflow.createBukti(pengisianId, { judul: `Bukti ${kategori}`, kategori, entity_type: entityType, entity_id: entityId }, fakeFile(kategori), ACTOR_OPERATOR, TENANT_ID);
}
async function freshPengisian(id) {
  return db.ProsnPengisian.findByPk(id);
}

let periode = null;

(async () => {
  let fatalError = null;
  try {
    console.log('=== Setup: periode uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Automatic Scoring Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);

    const indikators = await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const byKode = Object.fromEntries(indikators.map((i) => [i.kode, i]));
    const b11 = byKode['B.1.1'], b12 = byKode['B.1.2'], b13 = byKode['B.1.3'], b14 = byKode['B.1.4'];
    const mbgKode = Object.keys(byKode).find((k) => k.startsWith('MBG'));
    const mbg = byKode[mbgKode];
    console.log(`  B.1.1=${b11.pengisian.id} B.1.2=${b12.pengisian.id} B.1.3=${b13.pengisian.id} B.1.4=${b14.pengisian.id} ${mbgKode}=${mbg.pengisian.id}`);

    console.log('\n=== AS1-AS3 — B.1.1: create/update/delete register memicu auto-recalc ===');
    let surat;
    await test('AS1 — create Surat Penugasan -> autoRecalcSkor mengisi skor_dihitung_at otomatis (tanpa panggil hitungUlang manual)', async () => {
      const sebelum = await freshPengisian(b11.pengisian.id);
      assert.strictEqual(sebelum.skor_dihitung_at, null, 'baseline: belum pernah dihitung.');
      surat = await suratService.create(b11.pengisian.id, { nomor_surat: 'AS/001', tanggal_surat: `${TAHUN_UJI}-01-05`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.autoRecalcSkor(b11.pengisian.id, TENANT_ID);
      const sesudah = await freshPengisian(b11.pengisian.id);
      assert.ok(sesudah.skor_dihitung_at, 'skor harus otomatis dihitung setelah create, tanpa endpoint hitung-ulang manual.');
      assert.strictEqual(sesudah.skor_detail.jumlah_surat_sah, 0, 'surat baru belum ada evidence -> belum sah (formula TIDAK berubah).');
    });
    await test('AS2 — update Surat Penugasan -> auto-recalc menyegarkan skor', async () => {
      const fresh = await db.ProsnSuratPenugasan.findByPk(surat.id);
      surat = await suratService.update(surat.id, { nomor_surat: 'AS/001-REV', tanggal_surat: `${TAHUN_UJI}-01-06`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji revisi', cakupan_pengadaan: true, lock_version: fresh.lock_version }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.autoRecalcSkor(surat.pengisian_id, TENANT_ID);
      const sesudah = await freshPengisian(b11.pengisian.id);
      assert.ok(sesudah.skor_dihitung_at, 'auto-recalc harus tetap berjalan setelah update.');
    });
    await test('AS3 — delete Surat Penugasan -> auto-recalc menyegarkan skor (mencerminkan register kosong lagi)', async () => {
      const hasil = await suratService.remove(surat.id, TENANT_ID);
      assert.strictEqual(hasil.pengisian_id, b11.pengisian.id, 'remove() harus mengembalikan pengisian_id (utk pemicu auto-recalc controller).');
      await ruleEngineService.autoRecalcSkor(hasil.pengisian_id, TENANT_ID);
      const sesudah = await freshPengisian(b11.pengisian.id);
      assert.strictEqual(sesudah.skor_detail.jumlah_surat_dikeluarkan, 0, 'register kosong lagi setelah delete, tercermin otomatis di skor_detail.');
    });

    console.log('\n=== AS4 — B.1.2: create Rapat memicu auto-recalc ===');
    await test('AS4 — create Rapat Forkopimda -> autoRecalcSkor mengisi skor_dihitung_at', async () => {
      await rapatService.create(b12.pengisian.id, { tanggal_rapat: `${TAHUN_UJI}-01-10`, nama_forum: 'Rapat Uji', is_forkopimda: true, topik_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.autoRecalcSkor(b12.pengisian.id, TENANT_ID);
      const sesudah = await freshPengisian(b12.pengisian.id);
      assert.ok(sesudah.skor_dihitung_at, 'skor B.1.2 harus otomatis dihitung.');
    });

    console.log('\n=== AS5 — B.1.4: create Inovasi memicu auto-recalc ===');
    await test('AS5 — create Inovasi -> autoRecalcSkor mengisi skor_dihitung_at', async () => {
      await inovasiService.create(b14.pengisian.id, { nama_inovasi: 'Inovasi Uji', relevansi_pengadaan: true, status_implementasi: 'diterapkan_penuh', status_perkada: 'belum_ada' }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.autoRecalcSkor(b14.pengisian.id, TENANT_ID);
      const sesudah = await freshPengisian(b14.pengisian.id);
      assert.ok(sesudah.skor_dihitung_at, 'skor B.1.4 harus otomatis dihitung.');
    });

    console.log('\n=== AS6 — B.1.3 (FUNCTIONAL BASELINE FROZEN) SENGAJA dikecualikan dari auto-recalc ===');
    await test('AS6 — autoRecalcSkor pada pengisian B.1.3 -> NO-OP (return null, skor_dihitung_at TETAP null)', async () => {
      const sebelum = await freshPengisian(b13.pengisian.id);
      assert.strictEqual(sebelum.skor_dihitung_at, null, 'baseline B.1.3 belum pernah dihitung (manual-only).');
      const hasil = await ruleEngineService.autoRecalcSkor(b13.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil, null, 'B.1.3 harus no-op — TIDAK PERNAH auto-recalc (mandat: FUNCTIONAL BASELINE FROZEN, DO NOT alter UI behavior).');
      const sesudah = await freshPengisian(b13.pengisian.id);
      assert.strictEqual(sesudah.skor_dihitung_at, null, 'skor_dihitung_at B.1.3 harus TETAP null — auto-recalc tidak pernah menyentuhnya.');
    });

    console.log(`\n=== AS7 — MBG (${mbgKode}) PROTECTED, SENGAJA dikecualikan dari auto-recalc ===`);
    await test('AS7 — autoRecalcSkor pada pengisian MBG -> NO-OP (return null, skor_dihitung_at TETAP null)', async () => {
      const sebelum = await freshPengisian(mbg.pengisian.id);
      assert.strictEqual(sebelum.skor_dihitung_at, null, 'baseline MBG belum pernah dihitung (manual-only).');
      const hasil = await ruleEngineService.autoRecalcSkor(mbg.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil, null, 'MBG harus no-op — mandat "MBG PROTECTED, DO NOT alter business logic/scoring/evidence semantics".');
      const sesudah = await freshPengisian(mbg.pengisian.id);
      assert.strictEqual(sesudah.skor_dihitung_at, null);
    });

    console.log('\n=== AS8 — idempotency: panggilan berulang tanpa perubahan data -> hasil identik, tidak ada efek samping duplikat ===');
    await test('AS8 — autoRecalcSkor dipanggil 2x berturut-turut tanpa perubahan -> skor/detail identik', async () => {
      const hasil1 = await ruleEngineService.autoRecalcSkor(b12.pengisian.id, TENANT_ID);
      const jumlahRapatSebelum = (await rapatService.listByPengisian(b12.pengisian.id, TENANT_ID)).length;
      const hasil2 = await ruleEngineService.autoRecalcSkor(b12.pengisian.id, TENANT_ID);
      const jumlahRapatSesudah = (await rapatService.listByPengisian(b12.pengisian.id, TENANT_ID)).length;
      assert.strictEqual(hasil1.skor, hasil2.skor, 'skor harus identik pada pemanggilan berulang tanpa perubahan data.');
      assert.deepStrictEqual(hasil1.detail.jumlah_rapat_sah, hasil2.detail.jumlah_rapat_sah);
      assert.strictEqual(jumlahRapatSebelum, jumlahRapatSesudah, 'tidak boleh ada baris register duplikat akibat auto-recalc berulang.');
    });

    console.log('\n=== AS9 — bind evidence (createBukti) memicu auto-recalc, mencerminkan evidence baru ===');
    let surat2;
    await test('AS9 — surat baru tanpa bukti -> skor tetap 0 surat sah; setelah bind evidence valid + auto-recalc -> jadi sah', async () => {
      surat2 = await suratService.create(b11.pengisian.id, { nomor_surat: 'AS/002', tanggal_surat: `${TAHUN_UJI}-02-01`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      await ruleEngineService.autoRecalcSkor(b11.pengisian.id, TENANT_ID);
      let fresh = await freshPengisian(b11.pengisian.id);
      assert.strictEqual(fresh.skor_detail.jumlah_surat_sah, 0, 'sebelum evidence valid, surat belum sah.');

      const bukti = await uploadBukti(b11.pengisian.id, 'SURAT_PENUGASAN', surat2.id, 'surat_penugasan');
      await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      // Mimik EXACT urutan controller createBukti: autoRecalcSkor dipanggil dgn pengisianId dari route param.
      await ruleEngineService.autoRecalcSkor(b11.pengisian.id, TENANT_ID);
      fresh = await freshPengisian(b11.pengisian.id);
      assert.strictEqual(fresh.skor_detail.jumlah_surat_sah, 1, 'setelah bind+verifikasi evidence valid DAN auto-recalc, surat harus otomatis dihitung sah.');
    });

    console.log('\n=== AS10 — perubahan status verifikasi evidence memicu auto-recalc via resolusi pengisian_id dari ProsnBuktiIndikator ===');
    await test('AS10 — verifikasi evidence diubah invalid -> auto-recalc (mimik controller setStatusVerifikasiBukti) -> surat kembali tidak sah', async () => {
      const links = await db.ProsnBuktiIndikator.findAll({ where: { entity_type: 'SURAT_PENUGASAN', entity_id: surat2.id, tenant_id: TENANT_ID } });
      assert.ok(links.length >= 1, 'setup rusak — link evidence AS9 tidak ditemukan.');
      const buktiDukungId = links[0].bukti_dukung_id;
      const buktiFresh = await db.ProsnBuktiDukung.findByPk(buktiDukungId);
      await workflow.setStatusVerifikasiBukti(buktiDukungId, { status_verifikasi: 'invalid', lock_version: buktiFresh.lock_version }, ACTOR_PENGAWAS, TENANT_ID);

      // Mimik EXACT logika controller: resolve SEMUA pengisian_id terikat ke bukti ini, lalu autoRecalcSkorBanyak.
      const linkRows = await db.ProsnBuktiIndikator.findAll({ where: { bukti_dukung_id: buktiDukungId, tenant_id: TENANT_ID }, attributes: ['pengisian_id'] });
      await ruleEngineService.autoRecalcSkorBanyak(linkRows.map((l) => l.pengisian_id), TENANT_ID);

      const fresh = await freshPengisian(b11.pengisian.id);
      assert.strictEqual(fresh.skor_detail.jumlah_surat_sah, 0, 'setelah evidence diubah invalid + auto-recalc, surat harus kembali tidak sah (evidence gate tidak dilonggarkan).');
    });

    console.log('\n=== AS11 — best-effort/non-fatal: input tidak valid TIDAK PERNAH melempar ===');
    await test('AS11 — autoRecalcSkor dgn pengisianId tidak ada -> return null, TIDAK melempar error', async () => {
      const hasil = await ruleEngineService.autoRecalcSkor(999999999, TENANT_ID);
      assert.strictEqual(hasil, null);
    });
    await test('AS11b — autoRecalcSkor dgn pengisianId null/undefined -> return null, TIDAK melempar error', async () => {
      assert.strictEqual(await ruleEngineService.autoRecalcSkor(null, TENANT_ID), null);
      assert.strictEqual(await ruleEngineService.autoRecalcSkor(undefined, TENANT_ID), null);
    });
    await test('AS11c — autoRecalcSkorBanyak dgn array kosong/berisi null -> tidak melempar', async () => {
      await ruleEngineService.autoRecalcSkorBanyak([], TENANT_ID);
      await ruleEngineService.autoRecalcSkorBanyak([null, undefined], TENANT_ID);
    });

    console.log(`\n=== SELESAI: ${pass} PASS, ${fail} FAIL ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR:', error.stack || error.message);
  } finally {
    console.log('\n=== Cleanup ===');
    try {
      if (periode) {
        const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
        const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
        const buktiIndikatorRows = await db.ProsnBuktiIndikator.findAll({ where: { pengisian_id: pengisianIds } });
        const buktiIds = [...new Set(buktiIndikatorRows.map((b) => b.bukti_dukung_id))];
        const buktiFiles = await db.ProsnBuktiDukung.findAll({ where: { id: buktiIds } });
        for (const b of buktiFiles) { if (fs.existsSync(b.file_path)) { try { fs.unlinkSync(b.file_path); } catch { /* no-op */ } } } // eslint-disable-line no-await-in-loop
        await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnBuktiDukung.destroy({ where: { id: buktiIds } });
        await db.ProsnSuratPenugasan.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnRapatForkopimda.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnInovasi.destroy({ where: { pengisian_id: pengisianIds } });
        await db.ProsnIndikatorKontributor.destroy({ where: { indikator_id: indikatorIds } });
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
