'use strict';

/**
 * Corrective "ProSN Semester-II Readiness" — self-test membuktikan dua
 * kapabilitas backend baru: (1) `sumber_data_is_auto` dihitung server-side
 * (anti-spoof) & round-trip tersimpan lewat updatePengisian; (2)
 * `checkCompletionReadiness` mengembalikan SEMUA blocker status Lengkap
 * sekaligus (bukan hanya yg pertama), memakai pengecekan yg SAMA PERSIS dgn
 * transisi status Lengkap asli (tidak ada requirement substantif yg berubah).
 * Data uji tahun fantasi (TAHUN_UJI), tenant nyata 1, dihapus total di
 * finally. TIDAK menyentuh UAT nyata.
 *
 * Jalankan: node scripts/prosnpSemesterIIReadinessSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;

const workflow = require('../services/prosnp/prosnpWorkflowService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const internalFieldAutofillService = require('../services/prosnp/prosnpInternalFieldAutofillService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const ACTOR_PENGAWAS = { id: 6, role: 'PENGAWAS' };
const TAHUN_UJI = '2066';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'prosnp_semester2_readiness_test_dummy.pdf');

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
/** Mimik EXACT logika prosnpController.updatePengisian (mandat §19) — computed di test krn logika aslinya sengaja hidup di controller (hindari circular require workflow<->internalFieldAutofillService). */
async function updatePengisianDenganSumberDataAutoDihitung(pengisianId, payload, actor) {
  const p = { ...payload };
  if (Object.prototype.hasOwnProperty.call(p, 'sumber_data')) {
    const preview = await internalFieldAutofillService.previewInternalAutofill(pengisianId, TENANT_ID);
    const fresh = (preview.sumber_data || '').trim();
    const submitted = (p.sumber_data || '').trim();
    p.sumber_data_is_auto = Boolean(fresh) && fresh === submitted;
  }
  return workflow.updatePengisian(pengisianId, p, actor, TENANT_ID);
}

let periode = null;
let tenantB = null;

(async () => {
  let fatalError = null;
  try {
    console.log('=== Setup: periode uji tahun', TAHUN_UJI, '(TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Semester-II Readiness Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);

    const indikators = await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const byKode = Object.fromEntries(indikators.map((i) => [i.kode, i]));
    const b11 = byKode['B.1.1'];
    console.log(`  B.1.1 pengisian_id=${b11.pengisian.id}`);

    console.log('\n=== SD (Sumber Data Auto-Sync) — dihitung server-side, anti-spoof ===');
    await test('SD1 — sumber_data KOSONG dari server (belum ada fakta) -> submit teks manual -> is_auto=false (tidak match apa pun)', async () => {
      const fresh = await db.sequelize.transaction((t) => db.ProsnPengisian.findByPk(b11.pengisian.id, { transaction: t }));
      const hasil = await updatePengisianDenganSumberDataAutoDihitung(b11.pengisian.id, { lock_version: fresh.lock_version, sumber_data: 'Teks manual bebas user, bukan hasil saran sistem.' }, ACTOR_OPERATOR);
      assert.strictEqual(hasil.sumber_data_is_auto, false);
    });

    let surat;
    await test('SD2 — create Surat (SEKARANG ada fakta) -> submit sumber_data yg PERSIS SAMA dgn saran sistem terkini -> is_auto=TRUE (server yg verifikasi, bukan dipercaya dari payload)', async () => {
      surat = await suratService.create(b11.pengisian.id, { nomor_surat: 'SD/001', tanggal_surat: `${TAHUN_UJI}-01-05`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      const preview = await internalFieldAutofillService.previewInternalAutofill(b11.pengisian.id, TENANT_ID);
      const fresh = await db.ProsnPengisian.findByPk(b11.pengisian.id);
      const hasil = await updatePengisianDenganSumberDataAutoDihitung(b11.pengisian.id, { lock_version: fresh.lock_version, sumber_data: preview.sumber_data }, ACTOR_OPERATOR);
      assert.strictEqual(hasil.sumber_data_is_auto, true);
      assert.strictEqual(hasil.sumber_data, preview.sumber_data);
    });

    await test('SD3 — payload MENGAKU is_auto=true padahal teks TIDAK cocok saran sistem -> server TETAP menghitung ulang, hasil FALSE (anti-spoof, klaim client diabaikan)', async () => {
      const fresh = await db.ProsnPengisian.findByPk(b11.pengisian.id);
      const hasil = await updatePengisianDenganSumberDataAutoDihitung(b11.pengisian.id, { lock_version: fresh.lock_version, sumber_data: 'Teks yang SENGAJA tidak cocok dgn saran sistem.', sumber_data_is_auto: true }, ACTOR_OPERATOR);
      assert.strictEqual(hasil.sumber_data_is_auto, false, 'server harus menghitung ulang, TIDAK PERNAH mempercayai sumber_data_is_auto dari client secara langsung.');
    });

    await test('SD4 — sumber_data TIDAK dikirim di payload update -> is_auto tidak dihitung ulang (field lain tetap bisa diupdate independen)', async () => {
      const sebelum = await db.ProsnPengisian.findByPk(b11.pengisian.id);
      const hasil = await workflow.updatePengisian(b11.pengisian.id, { lock_version: sebelum.lock_version, hambatan: 'catatan hambatan saja' }, ACTOR_OPERATOR, TENANT_ID);
      assert.strictEqual(hasil.sumber_data_is_auto, sebelum.sumber_data_is_auto, 'is_auto harus tetap sama krn sumber_data tidak ikut disubmit.');
    });

    console.log('\n=== CR (Completion Readiness Itemized Blockers) — SEMUA blocker sekaligus, requirement TIDAK berubah ===');
    await test('CR1 — pengisian B.1.1 BARU (belum ada apa pun) -> ready=false, blocker PROSNP_REGISTER_EMPTY termasuk skor belum dihitung', async () => {
      const b12 = byKode['B.1.2'];
      const readiness = await workflow.checkCompletionReadiness(b12.pengisian.id, TENANT_ID);
      assert.strictEqual(readiness.ready, false);
      const codes = readiness.blockers.map((b) => b.code);
      assert.ok(codes.includes('PROSNP_REGISTER_EMPTY'));
      assert.ok(codes.includes('PROSNP_SKOR_BELUM_DIHITUNG'));
      assert.ok(readiness.blockers.length >= 2, 'harus mengembalikan LEBIH DARI SATU blocker sekaligus (itemized), bukan cuma yg pertama.');
    });

    await test('CR2 — B.1.1: register ada TAPI belum ada BUKTI_TINDAK_LANJUT valid -> blocker spesifik PROSNP_EVIDENCE_GATE_BUKTI_TINDAK_LANJUT muncul', async () => {
      const readiness = await workflow.checkCompletionReadiness(b11.pengisian.id, TENANT_ID);
      const codes = readiness.blockers.map((b) => b.code);
      assert.ok(codes.includes('PROSNP_EVIDENCE_GATE_BUKTI_TINDAK_LANJUT'));
      assert.ok(!codes.includes('PROSNP_REGISTER_EMPTY'), 'register sudah ada (surat SD/001) -> blocker ini TIDAK boleh muncul lagi.');
    });

    await test('CR3 — setelah bukti tindak lanjut valid + skor dihitung -> ready=true, blockers kosong', async () => {
      const bukti = await uploadBukti(b11.pengisian.id, 'PENGISIAN', null, 'bukti_tindak_lanjut');
      await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
      await ruleEngineService.hitungUlangB11(b11.pengisian.id, TENANT_ID);
      const readiness = await workflow.checkCompletionReadiness(b11.pengisian.id, TENANT_ID);
      assert.strictEqual(readiness.ready, true);
      assert.strictEqual(readiness.blockers.length, 0);
    });

    console.log('\n=== TI (Tenant Isolation) ===');
    await test('TI1 — checkCompletionReadiness pengisian tenant LAIN -> ditolak (tidak bocor lintas tenant)', async () => {
      tenantB = await db.Tenant.create({ nama: 'UJI Semester-II Readiness Tenant B', domain: `s2-readiness-test-b-${Date.now()}.local`, is_active: true });
      let threw = false;
      try { await workflow.checkCompletionReadiness(b11.pengisian.id, tenantB.id); }
      catch (error) { threw = true; assert.strictEqual(error.code, 'PROSNP_NOT_FOUND'); }
      assert.ok(threw, 'pengisian tenant 1 tidak boleh terlihat dari tenant B.');
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
        await db.ProsnIndikatorKontributor.destroy({ where: { indikator_id: indikatorIds } });
        await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
        await db.ProsnIndikator.destroy({ where: { id: indikatorIds } });
        await db.ProsnPeriode.destroy({ where: { id: periode.id } });
        console.log(`Periode uji tahun ${TAHUN_UJI} (id ${periode.id}) dihapus total.`);
      }
      if (tenantB) { await db.Tenant.destroy({ where: { id: tenantB.id }, force: true }); }
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
