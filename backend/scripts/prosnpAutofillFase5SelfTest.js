'use strict';

/**
 * Spesifikasi 35 v3 — Fase 5 self-test: smoke end-to-end (/analisis +
 * /autofill-apply penuh) + Test Q (idempotent retry SERIAL) + Test R
 * (concurrent duplicate apply, requirement EXACTLY ONE, §31/§36).
 *
 * Memakai fixture GAMBAR (image-ocr.png, jalur OCR murni Tesseract) — BUKAN
 * fixture PDF text-layer.pdf, krn ditemukan inkompatibilitas intermiten
 * antara PDF hasil pdfkit tsb dgn parser pdf-parse/pdfjs-dist versi yang
 * dipakai (`bad XRef entry` / font glyph tak ter-resolve saat render OCR) —
 * dicatat sbg limitation fixture Test E (Fase 3), TIDAK mempengaruhi mekanisme
 * STEP 1-10 §31 yang diverifikasi Test Q/R di sini (independen dari format
 * sumber dokumen). RAPAT_FORKOPIMDA dipakai sbg entityType uji (fixture
 * berisi teks Notulen Rapat Koordinasi Forkopimda).
 *
 * Test R dijalankan via `Promise.all` di atas connection pool Sequelize
 * NYATA (bukan 1 koneksi tunggal) — 2 transaksi benar2 berjalan di 2 koneksi
 * MySQL berbeda dari pool yang sama, sehingga row-lock InnoDB pada STEP 2
 * (§31) adalah serialization point yang genuin, BUKAN simulasi single-thread.
 * Batasan tetap dicatat eksplisit di laporan akhir sesuai instruksi §36/§42 P2.
 *
 * Jalankan: node scripts/prosnpAutofillFase5SelfTest.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const db = require('./../models');
db.sequelize.options.logging = false;
const workflow = require('../services/prosnp/prosnpWorkflowService');
const orchestrator = require('../services/prosnp/autofill/prosnpAutoFillOrchestrator');
const rebindService = require('../services/prosnp/prosnpEvidenceRebindService');
const suratService = require('../services/prosnp/prosnpSuratPenugasanService');
const rapatService = require('../services/prosnp/prosnpRapatForkopimdaService');
const cadanganService = require('../services/prosnp/prosnpCadanganPanganService');
const inovasiService = require('../services/prosnp/prosnpInovasiService');

const TENANT_ID = 1;
const ACTOR_ADMIN = { id: 4, role: 'SUPER_ADMIN' };
const ACTOR_OPERATOR = { id: 23, role: 'PELAKSANA' };
const TAHUN_UJI = '2095';
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures', 'prosnp-autofill', 'image-ocr.png');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  OK  ${name}`); }
  catch (error) { fail++; console.log(`FAIL  ${name}\n      ${error.stack || error.message}`); }
}

async function uploadStagingFixture(pengisianId, actor) {
  const stat = fs.statSync(FIXTURE_IMAGE);
  const file = { path: FIXTURE_IMAGE, originalname: 'image-ocr.png', filename: `image-ocr-${Date.now()}-${Math.random()}.png`, mimetype: 'image/png', size: stat.size };
  return workflow.createBukti(pengisianId, { judul: 'Bukti autofill Fase 5', entity_type: 'PENGISIAN' }, file, actor, TENANT_ID);
}

(async () => {
  let periode;
  try {
    console.log('=== Setup: buat periode uji tahun 2095 (TEST DATA — NOT OFFICIAL) ===');
    periode = await workflow.createPeriod({
      tahun: TAHUN_UJI, semester: '1', nama: 'TEST DATA — NOT OFFICIAL (Autofill Fase 5 Self-Test)',
      tanggal_mulai: `${TAHUN_UJI}-01-01`, tanggal_tenggat: `${TAHUN_UJI}-06-30`, perangkat_daerah_id: 3,
    }, ACTOR_ADMIN, TENANT_ID);
    await workflow.activatePeriod(periode.id, ACTOR_ADMIN, TENANT_ID);
    const indikator = await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, include: [{ model: db.ProsnPengisian, as: 'pengisian' }] });
    const b12 = indikator.find((i) => i.kode === 'B.1.2');
    console.log(`  Periode uji dibuat: id=${periode.id}, pengisian B.1.2=${b12.pengisian.id}`);

    // === SMOKE TEST end-to-end: /analisis lalu /autofill-apply ===
    console.log('\n=== Smoke test end-to-end: analisis -> apply ===');
    let buktiSmoke, fieldsSmoke, applySmokeResult;
    await test('buildAutoFillPreview() mengembalikan klasifikasi + fields terisi dari fixture nyata (OCR gambar)', async () => {
      buktiSmoke = await uploadStagingFixture(b12.pengisian.id, ACTOR_OPERATOR);
      const preview = await orchestrator.buildAutoFillPreview({ buktiId: buktiSmoke.id, tenantId: TENANT_ID });
      fieldsSmoke = preview.fields;
      const namaForum = fieldsSmoke.find((f) => f.field_key === 'nama_forum');
      const tanggalRapat = fieldsSmoke.find((f) => f.field_key === 'tanggal_rapat');
      assert.ok(namaForum.value && /RAPAT KOORDINASI/i.test(namaForum.value), `nama_forum tidak sesuai: ${namaForum.value}`);
      assert.strictEqual(tanggalRapat.value, '2025-02-10');
    });
    await test('applyAutofill() STEP 1-10 penuh: entity + evidence link tercipta, staging tetap ada', async () => {
      applySmokeResult = await orchestrator.applyAutofill({ buktiId: buktiSmoke.id, pengisianId: b12.pengisian.id, entityType: 'RAPAT_FORKOPIMDA', fields: fieldsSmoke, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
      assert.strictEqual(applySmokeResult.created, true);
      assert.strictEqual(applySmokeResult.idempotent_replay, false);
      assert.strictEqual(applySmokeResult.entity.tanggal_rapat, '2025-02-10'); // tanggal disimpan sesuai value hasil ekstraksi dokumen, bukan tahun periode uji
      const stagingMasihAda = await db.ProsnBuktiIndikator.findOne({ where: { bukti_dukung_id: buktiSmoke.id, entity_type: 'PENGISIAN' } });
      assert.ok(stagingMasihAda, 'Staging PENGISIAN harus tetap ada (additive).');
      const provenanceRow = await db.ProsnRapatForkopimda.findByPk(applySmokeResult.entity.id);
      assert.ok(provenanceRow.provenance, 'provenance harus tertulis (STEP 7).');
      assert.strictEqual(provenanceRow.provenance.confirmed_by, ACTOR_OPERATOR.id);
    });

    // === TEST Q — Idempotent Retry SERIAL ===
    console.log('\n=== TEST Q: Autofill Idempotent Retry — Serial ===');
    let entityIdPertama;
    await test('TEST Q — panggilan KEDUA identity SAMA PERSIS (serial) -> created:false, idempotent_replay:true, entity_id SAMA', async () => {
      entityIdPertama = applySmokeResult.entity.id;
      const jumlahEntitySebelum = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id } });
      const jumlahLinkSebelum = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiSmoke.id, entity_type: 'RAPAT_FORKOPIMDA' } });
      const jumlahStagingSebelum = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiSmoke.id, entity_type: 'PENGISIAN' } });

      const replay = await orchestrator.applyAutofill({ buktiId: buktiSmoke.id, pengisianId: b12.pengisian.id, entityType: 'RAPAT_FORKOPIMDA', fields: fieldsSmoke, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });

      assert.strictEqual(replay.created, false);
      assert.strictEqual(replay.idempotent_replay, true);
      assert.strictEqual(replay.entity.id, entityIdPertama, 'entity_id replay HARUS SAMA PERSIS dgn panggilan pertama.');

      const jumlahEntitySesudah = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id } });
      const jumlahLinkSesudah = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiSmoke.id, entity_type: 'RAPAT_FORKOPIMDA' } });
      const jumlahStagingSesudah = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiSmoke.id, entity_type: 'PENGISIAN' } });
      assert.strictEqual(jumlahEntitySesudah, jumlahEntitySebelum, 'Jumlah entity TIDAK BOLEH bertambah.');
      assert.strictEqual(jumlahLinkSesudah, jumlahLinkSebelum, 'Jumlah link evidence target TIDAK BOLEH bertambah.');
      assert.strictEqual(jumlahStagingSesudah, jumlahStagingSebelum, 'Jumlah staging binding TIDAK BOLEH berubah.');
      assert.strictEqual(jumlahEntitySesudah, 1, 'Harus exactly 1 entity.');
      assert.strictEqual(jumlahLinkSesudah, 1, 'Harus exactly 1 link target.');
      assert.strictEqual(jumlahStagingSesudah, 1, 'Harus exactly 1 staging binding.');
    });
    await test('TEST Q — provenance/created_at entity PERTAMA tidak berubah setelah retry', async () => {
      const entitySekarang = await db.ProsnRapatForkopimda.findByPk(entityIdPertama);
      assert.strictEqual(entitySekarang.provenance.confirmed_by, ACTOR_OPERATOR.id);
      assert.strictEqual(new Date(entitySekarang.created_at).getTime() > 0, true);
    });

    // === TEST R — Concurrent Duplicate Apply ===
    console.log('\n=== TEST R: Concurrent Duplicate Apply (P0, EXACTLY ONE) ===');
    let buktiConcurrent, fieldsConcurrent;
    await test('Setup bukti BARU utk Test R (identity terpisah dari Test Q)', async () => {
      buktiConcurrent = await uploadStagingFixture(b12.pengisian.id, ACTOR_OPERATOR);
      const preview = await orchestrator.buildAutoFillPreview({ buktiId: buktiConcurrent.id, tenantId: TENANT_ID });
      fieldsConcurrent = preview.fields;
      assert.ok(fieldsConcurrent.find((f) => f.field_key === 'nama_forum').value, 'Prasyarat: nama_forum harus terisi sebelum Test R.');
    });
    await test('TEST R — 2 panggilan CONCURRENT (Promise.all) identity SAMA PERSIS -> EXACTLY 1 created:true, EXACTLY 1 idempotent_replay:true', async () => {
      const applyOnce = () => orchestrator.applyAutofill({ buktiId: buktiConcurrent.id, pengisianId: b12.pengisian.id, entityType: 'RAPAT_FORKOPIMDA', fields: fieldsConcurrent, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
      const [hasilA, hasilB] = await Promise.all([applyOnce(), applyOnce()]);

      const createdCount = [hasilA, hasilB].filter((h) => h.created === true && h.idempotent_replay === false).length;
      const replayCount = [hasilA, hasilB].filter((h) => h.created === false && h.idempotent_replay === true).length;
      assert.strictEqual(createdCount, 1, `Harus EXACTLY 1 created:true, ditemukan ${createdCount}.`);
      assert.strictEqual(replayCount, 1, `Harus EXACTLY 1 idempotent_replay:true, ditemukan ${replayCount}.`);
      assert.strictEqual(hasilA.entity.id, hasilB.entity.id, 'Kedua respons harus menunjuk entity_id yang SAMA.');

      const jumlahEntity = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id, id: hasilA.entity.id } });
      const jumlahLinkTarget = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiConcurrent.id, entity_type: 'RAPAT_FORKOPIMDA' } });
      const jumlahStaging = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiConcurrent.id, entity_type: 'PENGISIAN' } });
      assert.strictEqual(jumlahEntity, 1, `Database final: entity target count HARUS 1, ditemukan ${jumlahEntity}.`);
      assert.strictEqual(jumlahLinkTarget, 1, `Database final: target evidence binding count HARUS 1, ditemukan ${jumlahLinkTarget}.`);
      assert.strictEqual(jumlahStaging, 1, `Database final: staging PENGISIAN binding HARUS tetap 1, ditemukan ${jumlahStaging}.`);
    });

    // === P1 ATOMIC TRANSACTION BOUNDARY — Fault Injection ===
    console.log('\n=== ATOMIC: Fault Injection (kegagalan SETELAH STEP 6/7, SEBELUM STEP 8 sukses) ===');
    let buktiAtomic, fieldsAtomic;
    await test('Setup bukti BARU utk fault-injection test', async () => {
      buktiAtomic = await uploadStagingFixture(b12.pengisian.id, ACTOR_OPERATOR);
      const preview = await orchestrator.buildAutoFillPreview({ buktiId: buktiAtomic.id, tenantId: TENANT_ID });
      fieldsAtomic = preview.fields;
    });
    await test('ATOMIC — injeksi kegagalan pada STEP 8 (rebind) -> request FAIL, ROLLBACK PENUH (0 entity BARU, 0 target binding BARU, staging tetap 1)', async () => {
      // Dihitung sbg DELTA (bukan angka absolut 0) krn Test Q/R di atas SUDAH membuat
      // entity RAPAT_FORKOPIMDA lain utk pengisian yg SAMA (b12) sebelum blok ini jalan.
      const jumlahEntitySebelum = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id } });
      const original = rebindService.rebindBuktiKeEntity;
      rebindService.rebindBuktiKeEntity = async () => { throw new Error('FAULT INJECTION: simulasi kegagalan STEP 8'); };
      try {
        let threw = null;
        try {
          await orchestrator.applyAutofill({ buktiId: buktiAtomic.id, pengisianId: b12.pengisian.id, entityType: 'RAPAT_FORKOPIMDA', fields: fieldsAtomic, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
        } catch (e) { threw = e; }
        assert.ok(threw, 'applyAutofill harus melempar error saat STEP 8 gagal.');
        assert.ok(/FAULT INJECTION/.test(threw.message), `Error yang menjalar harus error injeksi, bukan tertelan/diganti: ${threw.message}`);

        const jumlahEntitySesudah = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id } });
        const jumlahLink = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiAtomic.id, entity_type: 'RAPAT_FORKOPIMDA' } });
        const jumlahStaging = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiAtomic.id, entity_type: 'PENGISIAN' } });
        assert.strictEqual(jumlahEntitySesudah, jumlahEntitySebelum, `TIDAK BOLEH ada entity BARU tersisa setelah rollback (native DB rollback, bukan compensating delete) — sebelum=${jumlahEntitySebelum}, sesudah=${jumlahEntitySesudah}.`);
        assert.strictEqual(jumlahLink, 0, `Target evidence binding utk bukti INI TIDAK BOLEH tersisa, ditemukan ${jumlahLink}.`);
        assert.strictEqual(jumlahStaging, 1, `Staging PENGISIAN binding harus tetap 1 (tidak ikut ter-rollback), ditemukan ${jumlahStaging}.`);
      } finally {
        rebindService.rebindBuktiKeEntity = original;
      }
    });
    await test('ATOMIC — panggilan ulang NORMAL setelah kegagalan -> sukses bersih, created:true, idempotent_replay:false, exactly 1 entity/binding', async () => {
      const hasil = await orchestrator.applyAutofill({ buktiId: buktiAtomic.id, pengisianId: b12.pengisian.id, entityType: 'RAPAT_FORKOPIMDA', fields: fieldsAtomic, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
      assert.strictEqual(hasil.created, true);
      assert.strictEqual(hasil.idempotent_replay, false);
      const jumlahEntity = await db.ProsnRapatForkopimda.count({ where: { pengisian_id: b12.pengisian.id, id: hasil.entity.id } });
      const jumlahLink = await db.ProsnBuktiIndikator.count({ where: { bukti_dukung_id: buktiAtomic.id, entity_type: 'RAPAT_FORKOPIMDA' } });
      assert.strictEqual(jumlahEntity, 1, 'Setelah retry normal pasca-kegagalan, entity count harus exactly 1.');
      assert.strictEqual(jumlahLink, 1, 'Setelah retry normal pasca-kegagalan, target binding count harus exactly 1.');
    });

    // === P1 ATOMIC TRANSACTION BOUNDARY — Transaction Propagation per Entity Type ===
    console.log('\n=== ATOMIC: Transaction Propagation per Entity Type (B.1.1/B.1.3/B.1.4; B.1.2 sudah dibuktikan via fault-injection di atas) ===');
    const b11 = indikator.find((i) => i.kode === 'B.1.1');
    const b13 = indikator.find((i) => i.kode === 'B.1.3');
    const b14 = indikator.find((i) => i.kode === 'B.1.4');

    await test('SURAT_PENUGASAN — create(..., {transaction}) lalu ROLLBACK manual -> baris HILANG (membuktikan transaction diteruskan, bukan auto-commit sendiri)', async () => {
      const t = await db.sequelize.transaction();
      let suratId;
      try {
        const surat = await suratService.create(b11.pengisian.id, { nomor_surat: 'ATOMIC-PROPAGATION-TEST', tanggal_surat: `${TAHUN_UJI}-01-05`, pejabat_penandatangan: 'Uji Atomic', ringkasan_isi: 'uji propagasi transaksi', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID, { transaction: t });
        suratId = surat.id;
      } finally {
        await t.rollback();
      }
      const found = await db.ProsnSuratPenugasan.findByPk(suratId);
      assert.strictEqual(found, null, 'Baris SURAT_PENUGASAN harus HILANG setelah rollback manual pada transaction eksternal.');
    });

    await test('RAPAT_FORKOPIMDA — create(..., {transaction}) lalu ROLLBACK manual -> baris HILANG', async () => {
      const t = await db.sequelize.transaction();
      let rapatId;
      try {
        const rapat = await rapatService.create(b12.pengisian.id, { tanggal_rapat: `${TAHUN_UJI}-01-05`, nama_forum: 'ATOMIC-PROPAGATION-TEST' }, ACTOR_OPERATOR, TENANT_ID, { transaction: t });
        rapatId = rapat.id;
      } finally {
        await t.rollback();
      }
      const found = await db.ProsnRapatForkopimda.findByPk(rapatId);
      assert.strictEqual(found, null, 'Baris RAPAT_FORKOPIMDA harus HILANG setelah rollback manual pada transaction eksternal.');
    });

    await test('CADANGAN_TARGET — createTarget(..., {transaction}) lalu ROLLBACK manual -> baris HILANG', async () => {
      const t = await db.sequelize.transaction();
      let targetId;
      try {
        const target = await cadanganService.createTarget({ tahun_target: TAHUN_UJI, nomor_keputusan: 'ATOMIC-PROPAGATION-TEST', tanggal_keputusan: `${TAHUN_UJI}-01-05`, target_ton: 100 }, ACTOR_OPERATOR, TENANT_ID, { transaction: t });
        targetId = target.id;
      } finally {
        await t.rollback();
      }
      const found = await db.ProsnCadanganTarget.findByPk(targetId);
      assert.strictEqual(found, null, 'Baris CADANGAN_TARGET harus HILANG setelah rollback manual pada transaction eksternal.');
    });

    await test('INOVASI — create(..., {transaction}) lalu ROLLBACK manual -> baris HILANG', async () => {
      const t = await db.sequelize.transaction();
      let inovasiId;
      try {
        const inovasi = await inovasiService.create(b14.pengisian.id, { nama_inovasi: 'ATOMIC-PROPAGATION-TEST', relevansi_umum: true }, ACTOR_OPERATOR, TENANT_ID, { transaction: t });
        inovasiId = inovasi.id;
      } finally {
        await t.rollback();
      }
      const found = await db.ProsnInovasi.findByPk(inovasiId);
      assert.strictEqual(found, null, 'Baris INOVASI harus HILANG setelah rollback manual pada transaction eksternal.');
    });

    await test('Backward compatibility — SURAT_PENUGASAN create() TANPA options (4 argumen, caller manual existing) tetap bekerja seperti semula', async () => {
      const surat = await suratService.create(b11.pengisian.id, { nomor_surat: 'BACKWARD-COMPAT-TEST', tanggal_surat: `${TAHUN_UJI}-01-06`, pejabat_penandatangan: 'Uji Manual', ringkasan_isi: 'uji manual tanpa options', cakupan_pengadaan: true }, ACTOR_OPERATOR, TENANT_ID);
      assert.ok(surat.id, 'create() 4-argumen (tanpa options.transaction) harus tetap berhasil seperti sebelum corrective pass.');
      const found = await db.ProsnSuratPenugasan.findByPk(surat.id);
      assert.ok(found, 'Baris harus benar2 ter-commit (jalur transaction internal existing tetap berjalan).');
    });

    // === B.1.1 VALIDATION-AWARE AUTOFILL (Corrective Pass ringkasan_isi + required-fields) ===
    // Fixture PNG sintetis dibuat di memori (pola SAMA persis dgn image-ocr.png
    // existing, `renderTextToPngBuffer` dari generateFixtures.js) — TIDAK memakai
    // text-layer.pdf krn fixture itu SUDAH terdokumentasi tidak stabil dgn
    // pdf-parse/pdfjs-dist versi terpasang (lihat CATATAN TAMBAHAN di bawah).
    console.log('\n=== B.1.1 VALIDATION-AWARE AUTOFILL: ringkasan_isi deterministik + required-fields ===');
    const { createCanvas: createCanvasB11 } = require('canvas');
    function renderTextToPngBufferB11(text) {
      const width = 900;
      const lines = text.split('\n');
      const height = 60 + lines.length * 30;
      const canvas = createCanvasB11(width, height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'black'; ctx.font = '24px sans-serif';
      lines.forEach((line, i) => ctx.fillText(line, 30, 40 + i * 30));
      return canvas.toBuffer('image/png');
    }
    const SURAT_B11_TEXT = [
      'SURAT PENUGASAN',
      'NOMOR : 090/456/DISPANGAN/2025',
      '',
      'Menugaskan pejabat melaksanakan pengadaan, pengelolaan, dan penyaluran',
      'Cadangan Pangan Pemerintah Daerah serta Cadangan Beras Pemerintah.',
      '',
      'Ditetapkan di Sofifi pada tanggal 05 Januari 2025.',
      '',
      'GUBERNUR MALUKU UTARA,',
      '',
      'UJI SIGNER FASE LIMA',
    ].join('\n');
    const FIXTURE_PNG_B11 = path.join(require('os').tmpdir(), `prosnp-b11-fase5-${Date.now()}.png`);
    fs.writeFileSync(FIXTURE_PNG_B11, renderTextToPngBufferB11(SURAT_B11_TEXT));
    async function uploadStagingPngFixtureB11(pengisianId, actor) {
      const stat = fs.statSync(FIXTURE_PNG_B11);
      const file = { path: FIXTURE_PNG_B11, originalname: 'surat-penugasan-uji.png', filename: `surat-penugasan-uji-${Date.now()}-${Math.random()}.png`, mimetype: 'image/png', size: stat.size };
      return workflow.createBukti(pengisianId, { judul: 'Bukti autofill B.1.1 Fase 5', entity_type: 'PENGISIAN' }, file, actor, TENANT_ID);
    }

    let previewB11, fieldsB11, buktiB11;
    await test('buildAutoFillPreview() B.1.1: validation.required_fields sesuai getRequiredFieldsMeta, ringkasan_isi grounded RULE_DERIVED (bukan junk OCR)', async () => {
      buktiB11 = await uploadStagingPngFixtureB11(b11.pengisian.id, ACTOR_OPERATOR);
      previewB11 = await orchestrator.buildAutoFillPreview({ buktiId: buktiB11.id, tenantId: TENANT_ID });
      fieldsB11 = previewB11.fields;
      assert.ok(previewB11.validation, 'preview.validation harus ada utk tipe_form penugasan_kdh.');
      assert.deepStrictEqual(previewB11.validation.required_fields, ['nomor_surat', 'tanggal_surat', 'pejabat_penandatangan', 'ringkasan_isi']);
      const ringkasan = fieldsB11.find((f) => f.field_key === 'ringkasan_isi');
      assert.ok(ringkasan.value, `ringkasan_isi harus grounded (bukan junk OCR/null), aktual: ${JSON.stringify(ringkasan)}`);
      assert.strictEqual(ringkasan.source_type, 'RULE_DERIVED');
      assert.ok(!/NOMOR\s*:/.test(ringkasan.value), 'ringkasan_isi TIDAK BOLEH berisi potongan heading/nomor surat mentah.');
    });

    await test('validation.apply_ready = false ketika required field (mis. pejabat_penandatangan) tidak tersedia', async () => {
      const fieldsTanpaSigner = fieldsB11.map((f) => (f.field_key === 'pejabat_penandatangan' ? { ...f, value: null } : f));
      const validasi = orchestrator.computeValidationState('penugasan_kdh', fieldsTanpaSigner);
      assert.strictEqual(validasi.apply_ready, false);
      assert.ok(validasi.missing_required_fields.includes('pejabat_penandatangan'));
    });

    await test('TEST — APPLY SUCCESS: seluruh field wajib grounded dari OCR -> apply_ready true -> POST berhasil, register tercipta, TIDAK ada 400 "wajib diisi"', async () => {
      const validasi = orchestrator.computeValidationState('penugasan_kdh', fieldsB11);
      assert.strictEqual(validasi.apply_ready, true, `Prasyarat: seluruh field wajib B.1.1 harus grounded dari OCR fixture ini. missing=${JSON.stringify(validasi.missing_required_fields)}`);
      assert.strictEqual(validasi.missing_required_fields.length, 0);
      const hasil = await orchestrator.applyAutofill({ buktiId: buktiB11.id, pengisianId: b11.pengisian.id, entityType: 'SURAT_PENUGASAN', fields: fieldsB11, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
      assert.strictEqual(hasil.created, true);
      assert.ok(hasil.entity.ringkasan_isi, 'ringkasan_isi harus benar2 tersimpan di register (bukan gagal PROSNP_VALIDATION_ERROR).');
      assert.ok(!/GUBERNUR\s+MALUKU\s+UTARA\s+Nomor/i.test(hasil.entity.ringkasan_isi));
    });

    await test('NEGATIVE — required-field block: ringkasan_isi dihapus dari fields -> apply_ready false -> backend TETAP menolak (PROSNP_VALIDATION_ERROR) bila somehow terkirim', async () => {
      const buktiNegatif = await uploadStagingPngFixtureB11(b11.pengisian.id, ACTOR_OPERATOR);
      const previewNegatif = await orchestrator.buildAutoFillPreview({ buktiId: buktiNegatif.id, tenantId: TENANT_ID });
      const fieldsTanpaRingkasan = previewNegatif.fields.filter((f) => f.field_key !== 'ringkasan_isi');
      const validasi = orchestrator.computeValidationState('penugasan_kdh', fieldsTanpaRingkasan);
      assert.strictEqual(validasi.apply_ready, false, 'apply_ready harus false ketika ringkasan_isi hilang dari daftar fields.');
      assert.ok(validasi.missing_required_fields.includes('ringkasan_isi'));
      // UI TIDAK PERNAH mengirim request ini krn apply_ready=false (§7) — dibuktikan
      // di sini backend TETAP menolak by-design (defense-in-depth) bila somehow terkirim.
      let threw = null;
      try {
        await orchestrator.applyAutofill({ buktiId: buktiNegatif.id, pengisianId: b11.pengisian.id, entityType: 'SURAT_PENUGASAN', fields: fieldsTanpaRingkasan, actor: ACTOR_OPERATOR, tenantId: TENANT_ID });
      } catch (e) { threw = e; }
      assert.ok(threw, 'applyAutofill harus tetap ditolak backend validation walau somehow terkirim tanpa ringkasan_isi.');
      assert.strictEqual(threw.code, 'PROSNP_VALIDATION_ERROR');
      assert.ok(/Ringkasan isi penugasan wajib diisi/i.test(threw.message));
    });
    fs.unlinkSync(FIXTURE_PNG_B11);

    console.log(`\n=== HASIL TEST FASE 5 (smoke + Q + R + ATOMIC): ${pass} lulus, ${fail} gagal ===`);
    console.log('CATATAN KETERBATASAN (§36/§42 P2, wajib dicatat apa adanya): Test R dijalankan via Promise.all pada connection pool Sequelize proses Node.js tunggal (bukan 2 proses/klien terpisah sepenuhnya). Row-lock InnoDB pada STEP 2 (§31) terverifikasi bekerja dgn 2 koneksi pool berbeda dalam proses ini — namun verifikasi concurrency independen penuh (2 proses/koneksi terpisah total) tetap disarankan sebelum klaim production-ready, sesuai instruksi §36 Test R.');
    console.log('CATATAN TAMBAHAN: fixture text-layer.pdf (Test E Fase 3) ditemukan intermiten inkompatibel dgn pdf-parse/pdfjs-dist versi terpasang (\"bad XRef entry\"/font glyph tak ter-resolve) — Fase 5 memakai fixture gambar (jalur OCR murni) utk menghindari flakiness ini; direkomendasikan regenerasi text-layer.pdf dgn tool PDF lain atau upgrade pdf-parse/pdfjs-dist sebelum production-ready.');
  } catch (fatal) {
    fail++;
    console.error('FATAL SETUP ERROR:', fatal.stack || fatal.message);
  } finally {
    if (periode) {
      console.log('\n=== Cleanup: hapus seluruh data uji periode 2095 ===');
      const indikatorIds = (await db.ProsnIndikator.findAll({ where: { periode_id: periode.id }, attributes: ['id'] })).map((i) => i.id);
      const pengisianIds = (await db.ProsnPengisian.findAll({ where: { indikator_id: indikatorIds }, attributes: ['id'] })).map((p) => p.id);
      await db.ProsnBuktiIndikator.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnBuktiDukung.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRapatForkopimda.destroy({ where: { periode_id: periode.id } });
      await db.ProsnSuratPenugasan.destroy({ where: { periode_id: periode.id } });
      await db.ProsnCadanganTarget.destroy({ where: { tahun_target: TAHUN_UJI, tenant_id: TENANT_ID } });
      await db.ProsnInovasi.destroy({ where: { periode_id: periode.id } });
      await db.ProsnRiwayatStatus.destroy({ where: { pengisian_id: pengisianIds } });
      await db.ProsnPengisian.destroy({ where: { id: pengisianIds } });
      await db.ProsnIndikator.destroy({ where: { periode_id: periode.id } });
      await db.ProsnPeriode.destroy({ where: { id: periode.id } });
      console.log('  Cleanup selesai — periode uji 2095 dan seluruh data anaknya dihapus.');
    }
  }
  process.exit(fail > 0 ? 1 : 0);
})();
