'use strict';

/**
 * Integration self-test end-to-end (DB nyata) — corrective pass: evidence
 * binding per record, evidence category gate, rekonsiliasi semester.
 * Memakai periode tahun UJI '2099' (label TEST DATA — NOT OFFICIAL, dibuat &
 * dihapus sendiri oleh skrip ini) supaya TIDAK BERSINGGUNGAN SAMA SEKALI
 * dengan data nyata tahun 2025 milik Project Owner.
 *
 * Jalankan: node scripts/prosnpIntegrationSelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const workflow = require('../services/prosnp/prosnpWorkflowService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const rapatService = require('../services/prosnp/prosnpRapatForkopimdaService');
const cadanganService = require('../services/prosnp/prosnpCadanganPanganService');
const inovasiService = require('../services/prosnp/prosnpInovasiService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
const semesterService = require('../services/prosnp/prosnpB13SemesterService');
const dpaSourceService = require('../services/prosnp/prosnpDpaSourceService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const ACTOR_PENGAWAS = { id: 6, role: 'PENGAWAS' };
const TAHUN_UJI = '2099';
const DUMMY_FILE = path.join(__dirname, '..', 'uploads', 'prosnp_integration_test_dummy.pdf');

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

async function uploadBukti(pengisianId, entityType, entityId, kategori, actor) {
  return workflow.createBukti(pengisianId, { judul: `Bukti ${kategori}`, kategori, entity_type: entityType, entity_id: entityId }, fakeFile(kategori), actor, TENANT_ID);
}

(async () => {
  let periodeSemester1, periodeSemester2;
  let fatalError = null;
  try {
    console.log('=== Setup: buat periode uji tahun 2099 (TEST DATA — NOT OFFICIAL) ===');
    periodeSemester1 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Integration Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    periodeSemester2 = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '2', nama: 'TEST DATA — NOT OFFICIAL (Integration Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-07-01`, tanggal_tenggat: `${TAHUN_UJI}-12-31`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periodeSemester1.id, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periodeSemester2.id, ACTOR_ADMIN, TENANT_ID);
    console.log(`  Periode uji dibuat: Semester I id=${periodeSemester1.id}, Semester II id=${periodeSemester2.id}`);

    const indikatorS1 = await db.ProsnIndikator.findAll({ where: { periode_id: periodeSemester1.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const indikatorS2 = await db.ProsnIndikator.findAll({ where: { periode_id: periodeSemester2.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const b11S1 = indikatorS1.find((i) => i.kode === 'B.1.1');
    const b12S1 = indikatorS1.find((i) => i.kode === 'B.1.2');
    const b13S1 = indikatorS1.find((i) => i.kode === 'B.1.3');
    const b14S1 = indikatorS1.find((i) => i.kode === 'B.1.4');
    const b13S2 = indikatorS2.find((i) => i.kode === 'B.1.3');

    console.log('\n=== Evidence Binding — B.1.1 ===');
    await test('surat tanpa bukti terikat tidak dihitung sah; setelah upload SURAT_PENUGASAN valid, baru dihitung sah', async () => {
      const surat = await suratService.create(b11S1.pengisian.id, {
        nomor_surat: 'UJI/001', tanggal_surat: `${TAHUN_UJI}-01-05`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji', cakupan_pengadaan: true,
      }, ACTOR_OPERATOR, TENANT_ID);
      let hasil = await ruleEngineService.hitungUlangB11(b11S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.jumlah_surat_sah, 0, 'sebelum ada bukti, surat tidak boleh dihitung sah');

      const bukti = await uploadBukti(b11S1.pengisian.id, 'SURAT_PENUGASAN', surat.id, 'surat_penugasan', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      hasil = await ruleEngineService.hitungUlangB11(b11S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.jumlah_surat_sah, 1, `setelah bukti valid terikat, surat harus dihitung sah (got ${hasil.detail.jumlah_surat_sah})`);
    });
    await test('evidence CROSS-PENGISIAN ditolak (bukti tidak boleh menunjuk entity milik pengisian lain)', async () => {
      const suratLain = await suratService.create(b11S1.pengisian.id, { nomor_surat: 'UJI/CROSS', tanggal_surat: `${TAHUN_UJI}-02-05`, pejabat_penandatangan: 'Uji', ringkasan_isi: 'uji', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      let threw = false;
      try {
        // Coba upload bukti utk pengisian B.1.2 tapi entity_id menunjuk surat milik B.1.1 -> harus ditolak
        await uploadBukti(b12S1.pengisian.id, 'SURAT_PENUGASAN', suratLain.id, 'surat_penugasan', ACTOR_OPERATOR);
      } catch (error) { threw = true; assert.strictEqual(error.code, 'PROSNP_EVIDENCE_CROSS_PENGISIAN'); }
      assert.ok(threw, 'harus ditolak karena lintas pengisian');
    });
    await test('guard Lengkap B.1.1 menolak tanpa BUKTI_TINDAK_LANJUT valid', async () => {
      const fresh = await db.ProsnPengisian.findByPk(b11S1.pengisian.id);
      let threw = false;
      try { await workflow.transitionPengisian(b11S1.pengisian.id, 'lengkap', { lock_version: fresh.lock_version }, ACTOR_OPERATOR, TENANT_ID); }
      catch (error) { threw = true; assert.strictEqual(error.code, 'PROSNP_EVIDENCE_GATE_BUKTI_TINDAK_LANJUT'); }
      assert.ok(threw);
    });

    console.log('\n=== Evidence Binding — B.1.2 (per-rapat, bukan generik) ===');
    await test('rapat sah hanya jika UNDANGAN+DAFTAR_HADIR+NOTULEN terikat ke rapat itu sendiri', async () => {
      const rapat1 = await rapatService.create(b12S1.pengisian.id, { tanggal_rapat: `${TAHUN_UJI}-01-10`, nama_forum: 'Rapat Uji 1', is_forkopimda: true, topik_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      await rapatService.create(b12S1.pengisian.id, { tanggal_rapat: `${TAHUN_UJI}-01-20`, nama_forum: 'Rapat Uji 2', is_forkopimda: true, topik_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);

      // rapat1 dapat ke-3 bukti lengkap & valid; rapat2 SENGAJA dibiarkan tanpa bukti sama sekali.
      for (const kategori of ['undangan', 'daftar_hadir', 'notulen']) {
        const bukti = await uploadBukti(b12S1.pengisian.id, 'RAPAT_FORKOPIMDA', rapat1.id, kategori, ACTOR_OPERATOR);
        await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      }
      const hasil = await ruleEngineService.hitungUlangB12(b12S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.jumlah_rapat_sah, 1, 'hanya rapat1 yg sah; rapat2 tanpa bukti apa pun harus tetap ditolak (bukti rapat1 TIDAK boleh melegitimasi rapat2)');
    });

    console.log('\n=== Evidence Binding — B.1.3 (per-transaksi + rekonsiliasi semester) ===');
    await test('transaksi pengadaan tanpa bukti dikecualikan dari neraca; setelah bukti valid, masuk hitungan', async () => {
      const target = await cadanganService.createTarget({ tahun_target: TAHUN_UJI, nomor_keputusan: 'KDH/UJI/2099', tanggal_keputusan: `${TAHUN_UJI}-01-01`, target_ton: 100 }, ACTOR_OPERATOR, TENANT_ID);
      const beras = await db.ProsnKomoditas.findOne({ where: { kode: 'BERAS' } });
      await cadanganService.createTransaksi(b13S1.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-01-01`, jenis_transaksi: 'saldo_awal', volume: 50, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const trxPengadaan = await cadanganService.createTransaksi(b13S1.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-02-01`, jenis_transaksi: 'pengadaan', volume: 30, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);

      let hasil = await ruleEngineService.hitungUlangB13(b13S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.saldo_akhir, 50, `pengadaan tanpa bukti harus DIKECUALIKAN (saldo akhir cuma dari saldo_awal=50), got ${hasil.detail.saldo_akhir}`);
      assert.strictEqual(hasil.detail.transaksi_dikecualikan.length, 1);

      const buktiPengadaan = await uploadBukti(b13S1.pengisian.id, 'STOK_TRANSAKSI', trxPengadaan.id, 'dokumen_pengadaan', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(buktiPengadaan.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      const buktiTarget = await uploadBukti(b13S1.pengisian.id, 'CADANGAN_TARGET', target.id, 'keputusan_kdh', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(buktiTarget.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      const buktiKartuStok = await uploadBukti(b13S1.pengisian.id, 'CADANGAN_TARGET', target.id, 'kartu_stok', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(buktiKartuStok.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);

      hasil = await ruleEngineService.hitungUlangB13(b13S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.detail.saldo_akhir, 80, `setelah bukti valid, pengadaan harus ikut terhitung (50+30=80), got ${hasil.detail.saldo_akhir}`);
      assert.strictEqual(hasil.detail.capaian_persen, 80);
    });

    await test('rekonsiliasi semester: carry-forward Semester II = saldo akhir Semester I, tanpa re-entry manual', async () => {
      await ruleEngineService.hitungUlangB13(b13S2.pengisian.id, TENANT_ID);
      const carryForward = await db.ProsnStokTransaksi.findOne({ where: { pengisian_id: b13S2.pengisian.id, is_carry_forward: true } });
      assert.ok(carryForward, 'carry-forward saldo_awal harus otomatis dibuat utk Semester II');
      assert.strictEqual(Number(carryForward.volume), 80, 'carry-forward harus sama dgn saldo akhir Semester I (80)');

      const hasilS2 = await ruleEngineService.hitungUlangB13(b13S2.pengisian.id, TENANT_ID);
      assert.strictEqual(hasilS2.detail.saldo_akhir, 80, 'Semester II tanpa transaksi baru -> saldo akhir = carry-forward saja, TIDAK dobel-hitung Semester I');

      const pengisianS2 = await db.ProsnPengisian.findByPk(b13S2.pengisian.id);
      assert.strictEqual(pengisianS2.rekonsiliasi_status, 'ok', 'tidak ada perubahan di Semester I setelah carry-forward -> status harus ok');
    });

    await test('rekonsiliasi mendeteksi selisih bila Semester I dikoreksi SETELAH carry-forward dibuat', async () => {
      const beras = await db.ProsnKomoditas.findOne({ where: { kode: 'BERAS' } });
      const trxKoreksi = await cadanganService.createTransaksi(b13S1.pengisian.id, { komoditas_id: beras.id, tanggal: `${TAHUN_UJI}-03-01`, jenis_transaksi: 'koreksi_masuk', volume: 20, ownership: 'pemerintah_provinsi', status_verifikasi: 'valid' }, ACTOR_OPERATOR, TENANT_ID);
      const bukti = await uploadBukti(b13S1.pengisian.id, 'STOK_TRANSAKSI', trxKoreksi.id, 'dokumen_koreksi', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      await ruleEngineService.hitungUlangB13(b13S1.pengisian.id, TENANT_ID); // saldo akhir S1 sekarang 100, tapi carry-forward S2 masih 80

      await ruleEngineService.hitungUlangB13(b13S2.pengisian.id, TENANT_ID); // trigger jalankanRekonsiliasi lagi
      const pengisianS2 = await db.ProsnPengisian.findByPk(b13S2.pengisian.id);
      assert.strictEqual(pengisianS2.rekonsiliasi_status, 'perlu_rekonsiliasi', `harus terdeteksi selisih (S1 terkini=100, carry-forward tersimpan=80), got status=${pengisianS2.rekonsiliasi_status}`);
      assert.strictEqual(Number(pengisianS2.rekonsiliasi_selisih), -20);

      const belumDiisi = await db.ProsnPengisian.findByPk(b13S2.pengisian.id);
      await workflow.transitionPengisian(b13S2.pengisian.id, 'dalam_pengisian', { lock_version: belumDiisi.lock_version }, ACTOR_ADMIN, TENANT_ID);

      let threw = false;
      try {
        const fresh = await db.ProsnPengisian.findByPk(b13S2.pengisian.id);
        await workflow.transitionPengisian(b13S2.pengisian.id, 'lengkap', { lock_version: fresh.lock_version }, ACTOR_ADMIN, TENANT_ID);
      } catch (error) { threw = true; assert.strictEqual(error.code, 'PROSNP_RECONCILIATION_REQUIRED'); }
      assert.ok(threw, 'status Lengkap harus ditolak selama rekonsiliasi belum dijelaskan');

      await semesterService.setAlasanRekonsiliasi(b13S2.pengisian.id, 'Koreksi masuk Semester I dicatat setelah carry-forward dibuat.', ACTOR_OPERATOR, TENANT_ID);
      const setelahAlasan = await db.ProsnPengisian.findByPk(b13S2.pengisian.id);
      assert.strictEqual(setelahAlasan.rekonsiliasi_alasan, 'Koreksi masuk Semester I dicatat setelah carry-forward dibuat.');
    });

    console.log('\n=== Evidence Binding — B.1.4 ===');
    await test('Final Regulatory Scoring Decision: inovasi relevan tanpa Perkada -> skor regulasi 1.00 SEJAK AWAL, TIDAK menunggu BUKTI_IMPLEMENTASI (evidence implementasi kini murni internal, tidak menggerbang skor)', async () => {
      const inovasi = await inovasiService.create(b14S1.pengisian.id, { nama_inovasi: 'Uji Inovasi', relevansi_pengadaan: true, status_implementasi: 'diterapkan_penuh', status_perkada: 'belum_ada' }, ACTOR_OPERATOR, TENANT_ID);
      let hasil = await ruleEngineService.hitungUlangB14(b14S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.skor, 1.00, 'inovasi relevan + Perkada belum ada -> skor regulasi 1.00 walau bukti implementasi belum diunggah sama sekali');

      const bukti = await uploadBukti(b14S1.pengisian.id, 'INOVASI', inovasi.id, 'bukti_implementasi', ACTOR_OPERATOR);
      await workflow.setStatusVerifikasiBukti(bukti.id, { status_verifikasi: 'valid', lock_version: 0 }, ACTOR_PENGAWAS, TENANT_ID);
      hasil = await ruleEngineService.hitungUlangB14(b14S1.pengisian.id, TENANT_ID);
      assert.strictEqual(hasil.skor, 1.00, 'skor regulasi tetap 1.00 setelah bukti implementasi diverifikasi — evidence implementasi tidak lagi mengubah tier (Perkada masih belum ada)');
      assert.strictEqual(hasil.detail.inovasi[0].kelengkapan_internal.bukti_implementasi_ada, true, 'kelengkapan internal tetap tercatat terlepas dari skor');
    });

    console.log('\n=== Source-Driven DPA Mapping (§10) — data APBD nyata ===');
    await test('dropdown berjenjang tahun->OPD->Program->Kegiatan->SubKegiatan mengembalikan data DPA nyata', async () => {
      const master = await db.ProsnMasterIndikator.findOne({ where: { kode: 'B.1.3' } });
      const tahunList = await dpaSourceService.listTahunTersedia(master.id);
      assert.ok(tahunList.includes('2025'), 'tahun 2025 (data DPA nyata OPD Dinas Pangan) harus muncul di daftar');

      const opdList = await dpaSourceService.listOpdTersedia(master.id, '2025');
      assert.ok(opdList.length > 0, 'harus ada OPD dgn data DPA nyata utk tahun 2025');
      const opdId = opdList[0].opd_penanggung_jawab_id;

      const programList = await dpaSourceService.listProgramTersedia(master.id, '2025', opdId);
      assert.ok(programList.length > 0);
      const kegiatanList = await dpaSourceService.listKegiatanTersedia(master.id, '2025', opdId, programList[0].kode_program);
      assert.ok(kegiatanList.length > 0);
      const subKegList = await dpaSourceService.listSubKegiatanTersedia(master.id, '2025', opdId, kegiatanList[0].kode_kegiatan);
      assert.ok(subKegList.length > 0);
      assert.ok(subKegList.every((s) => s.status_relevansi !== 'excluded'), 'EXCLUDED tidak boleh pernah muncul di whitelist');
    });

    await test('target Cadangan Pangan sumber sistem menyimpan snapshot pagu DPA nyata + audit trail refresh', async () => {
      const target = await cadanganService.createTarget({
        tahun_target: TAHUN_UJI, nomor_keputusan: 'KDH/DPA-UJI/2099', tanggal_keputusan: `${TAHUN_UJI}-01-01`, target_ton: 500,
        source_tahun: '2025', source_opd_id: 107, source_kode_sub_kegiatan: '2.09.02.1.01.0006',
      }, ACTOR_ADMIN, TENANT_ID);
      assert.strictEqual(target.source_type, 'sistem');
      assert.ok(Number(target.source_pagu_dpa) > 0, 'pagu DPA nyata harus tersimpan (bukan 0/kosong)');
      assert.strictEqual(target.source_trace.length, 1);

      const refreshed = await cadanganService.refreshSnapshot(target.id, ACTOR_ADMIN, TENANT_ID);
      assert.strictEqual(refreshed.source_trace.length, 2, 'refresh snapshot harus menambah riwayat, bukan menimpa (audit trail)');
    });

    await test('override manual ditolak tanpa alasan; sub kegiatan di luar whitelist ditolak', async () => {
      let threw = false;
      try {
        await cadanganService.createTarget({ tahun_target: TAHUN_UJI, nomor_keputusan: 'KDH/MANUAL-UJI/2099', tanggal_keputusan: `${TAHUN_UJI}-01-01`, target_ton: 10, source_not_available: true }, ACTOR_ADMIN, TENANT_ID);
      } catch (error) { threw = true; assert.strictEqual(error.code, 'PROSNP_DPA_SOURCE_ALASAN_WAJIB'); }
      assert.ok(threw, 'override manual tanpa alasan harus ditolak');

      let threwExcluded = false;
      try {
        await cadanganService.createTarget({ tahun_target: TAHUN_UJI, nomor_keputusan: 'X', tanggal_keputusan: `${TAHUN_UJI}-01-01`, target_ton: 1, source_tahun: '2025', source_opd_id: 107, source_kode_sub_kegiatan: '2.09.01.1.01.0001' }, ACTOR_ADMIN, TENANT_ID);
      } catch (error) { threwExcluded = true; assert.strictEqual(error.code, 'PROSNP_DPA_SOURCE_NOT_WHITELISTED'); }
      assert.ok(threwExcluded, 'sub kegiatan di luar whitelist nomenklatur ProSN harus ditolak sbg sumber');
    });

    console.log(`\n=== HASIL: ${pass} lulus, ${fail} gagal ===`);
  } catch (error) {
    fatalError = error;
    console.error('FATAL ERROR (setup/di luar blok test):', error.stack || error.message);
  } finally {
    console.log('\n=== CLEANUP total data uji tahun 2099 ===');
    if (fs.existsSync(DUMMY_FILE)) fs.unlinkSync(DUMMY_FILE);
    if (periodeSemester1 || periodeSemester2) {
      const periodeIds = [periodeSemester1?.id, periodeSemester2?.id].filter(Boolean);
      const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periodeIds }, attributes: ['id'] })).map((i) => i.id);
      const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);

      const buktiIndikatorRows = await db.ProsnBuktiIndikator.findAll({ where: { pengisian_id: pengisianIds } });
      const buktiIds = [...new Set(buktiIndikatorRows.map((b) => b.bukti_dukung_id))];
      const buktiFiles = await db.ProsnBuktiDukung.findAll({ where: { id: buktiIds } });
      for (const b of buktiFiles) { if (fs.existsSync(b.file_path)) fs.unlinkSync(b.file_path); }

      await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnPemeriksaan.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnBuktiDukung.destroy({ where: { id: buktiIds } });
      await db.ProsnSuratPenugasan.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnRapatForkopimda.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnStokTransaksi.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnInovasi.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnCadanganTarget.destroy({ where: { tahun_target: TAHUN_UJI } });
      await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
      await db.ProsnIndikator.destroy({ where: { id: indikatorIds } });
      await db.ProsnPeriode.destroy({ where: { id: periodeIds } });
      console.log(`Periode uji tahun ${TAHUN_UJI} (id ${periodeIds.join(', ')}) dan seluruh data turunannya dihapus total.`);
    }
  }
  process.exit(fail > 0 || fatalError ? 1 : 0);
})().catch((error) => {
  console.error('FATAL ERROR (tidak tertangani):', error.stack || error.message);
  process.exit(1);
});
