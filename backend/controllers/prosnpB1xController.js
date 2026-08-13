'use strict';

/**
 * Controller sub-resource khusus B.1.1-B.1.4 (register penugasan, rapat
 * Forkopimda, target & transaksi stok cadangan pangan, inovasi) + rule engine
 * dan data referensi (master indikator, nomenklatur mapping, komoditas).
 * Dipisah dari prosnpController.js supaya file induk tidak membengkak.
 */

const db = require('../models');
const { ProsnError } = require('../services/prosnp/prosnpWorkflowService');
const suratPenugasanService = require('../services/prosnp/prosnpSuratPenugasanService');
const rapatForkopimdaService = require('../services/prosnp/prosnpRapatForkopimdaService');
const cadanganPanganService = require('../services/prosnp/prosnpCadanganPanganService');
const inovasiService = require('../services/prosnp/prosnpInovasiService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
const semesterService = require('../services/prosnp/prosnpB13SemesterService');
const dpaSourceService = require('../services/prosnp/prosnpDpaSourceService');
const mbgSatgasService = require('../services/prosnp/prosnpMbgSatgasService');
const mbgSarprasService = require('../services/prosnp/prosnpMbgSarprasService');
const mbgLaporanService = require('../services/prosnp/prosnpMbgLaporanService');
const ownershipService = require('../services/prosnp/prosnpIndikatorOwnershipService');
const masterIndikatorService = require('../services/prosnp/prosnpMasterIndikatorService');
const evidenceRebindService = require('../services/prosnp/prosnpEvidenceRebindService');
const autofillOrchestrator = require('../services/prosnp/autofill/prosnpAutoFillOrchestrator');
const internalFieldAutofillService = require('../services/prosnp/prosnpInternalFieldAutofillService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  if (error instanceof ProsnError) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
  console.error('[prosnp-b1x]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul ProSN.', code: 'PROSNP_INTERNAL_ERROR' });
};

// ── B.1.1 Surat Penugasan ──
// Corrective "ProSN Semester-II Readiness — Automatic Scoring" (mandat §20):
// setiap create/update/delete register memicu autoRecalcSkor best-effort
// (no-op utk B.1.3/MBG, lihat prosnpRuleEngineService.autoRecalcSkor) supaya
// user tidak wajib menekan "Hitung Ulang Skor" manual utk alur normal.
async function listSuratPenugasan(req, res) { try { return ok(res, await suratPenugasanService.listByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createSuratPenugasan(req, res) {
  try {
    const hasil = await suratPenugasanService.create(Number(req.params.pengisianId), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(Number(req.params.pengisianId), req.tenantId);
    return ok(res, hasil, 201);
  } catch (e) { return fail(res, e); }
}
async function updateSuratPenugasan(req, res) {
  try {
    const hasil = await suratPenugasanService.update(Number(req.params.id), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil.pengisian_id, req.tenantId);
    return ok(res, hasil);
  } catch (e) { return fail(res, e); }
}
async function deleteSuratPenugasan(req, res) {
  try {
    const hasil = await suratPenugasanService.remove(Number(req.params.id), req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil?.pengisian_id, req.tenantId);
    return ok(res, { deleted: true });
  } catch (e) { return fail(res, e); }
}

// ── B.1.2 Rapat Forkopimda ──
async function listRapatForkopimda(req, res) { try { return ok(res, await rapatForkopimdaService.listByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createRapatForkopimda(req, res) {
  try {
    const hasil = await rapatForkopimdaService.create(Number(req.params.pengisianId), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(Number(req.params.pengisianId), req.tenantId);
    return ok(res, hasil, 201);
  } catch (e) { return fail(res, e); }
}
async function updateRapatForkopimda(req, res) {
  try {
    const hasil = await rapatForkopimdaService.update(Number(req.params.id), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil.pengisian_id, req.tenantId);
    return ok(res, hasil);
  } catch (e) { return fail(res, e); }
}
async function deleteRapatForkopimda(req, res) {
  try {
    const hasil = await rapatForkopimdaService.remove(Number(req.params.id), req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil?.pengisian_id, req.tenantId);
    return ok(res, { deleted: true });
  } catch (e) { return fail(res, e); }
}

// ── B.1.3 Target KDH & Transaksi Stok ──
async function listCadanganTarget(req, res) { try { return ok(res, await cadanganPanganService.listTarget(req.tenantId, req.query.tahun)); } catch (e) { return fail(res, e); } }
async function createCadanganTarget(req, res) { try { return ok(res, await cadanganPanganService.createTarget(req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function updateCadanganTarget(req, res) { try { return ok(res, await cadanganPanganService.updateTarget(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function listStokTransaksi(req, res) { try { return ok(res, await cadanganPanganService.listTransaksi(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createStokTransaksi(req, res) { try { return ok(res, await cadanganPanganService.createTransaksi(Number(req.params.pengisianId), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function updateStokTransaksi(req, res) { try { return ok(res, await cadanganPanganService.updateTransaksi(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function deleteStokTransaksi(req, res) { try { await cadanganPanganService.removeTransaksi(Number(req.params.id), req.tenantId); return ok(res, { deleted: true }); } catch (e) { return fail(res, e); } }
async function refreshCadanganTargetSnapshot(req, res) { try { return ok(res, await cadanganPanganService.refreshSnapshot(Number(req.params.id), req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── B.1.3 Source-Driven DPA Mapping (dropdown berjenjang) ──
async function getMasterIndikatorB13Id() {
  const row = await db.ProsnMasterIndikator.findOne({ where: { kode: 'B.1.3' }, attributes: ['id'] });
  if (!row) throw new ProsnError('Master Indikator B.1.3 tidak ditemukan.', 500, 'PROSNP_MASTER_INDIKATOR_MISSING');
  return row.id;
}
const includeContextOnlyDari = (req) => String(req.query.include_context_only || '').toLowerCase() === 'true';
async function listDpaSourceTahun(req, res) {
  try { return ok(res, await dpaSourceService.listTahunTersedia(await getMasterIndikatorB13Id(), { includeContextOnly: includeContextOnlyDari(req) })); }
  catch (e) { return fail(res, e); }
}
async function listDpaSourceOpd(req, res) {
  try { return ok(res, await dpaSourceService.listOpdTersedia(await getMasterIndikatorB13Id(), req.query.tahun, { includeContextOnly: includeContextOnlyDari(req) })); }
  catch (e) { return fail(res, e); }
}
async function listDpaSourceProgram(req, res) {
  try { return ok(res, await dpaSourceService.listProgramTersedia(await getMasterIndikatorB13Id(), req.query.tahun, Number(req.query.opd_id), { includeContextOnly: includeContextOnlyDari(req) })); }
  catch (e) { return fail(res, e); }
}
async function listDpaSourceKegiatan(req, res) {
  try { return ok(res, await dpaSourceService.listKegiatanTersedia(await getMasterIndikatorB13Id(), req.query.tahun, Number(req.query.opd_id), req.query.kode_program, { includeContextOnly: includeContextOnlyDari(req) })); }
  catch (e) { return fail(res, e); }
}
async function listDpaSourceSubKegiatan(req, res) {
  try { return ok(res, await dpaSourceService.listSubKegiatanTersedia(await getMasterIndikatorB13Id(), req.query.tahun, Number(req.query.opd_id), req.query.kode_kegiatan, { includeContextOnly: includeContextOnlyDari(req) })); }
  catch (e) { return fail(res, e); }
}

// ── B.1.4 Inovasi ──
async function listInovasi(req, res) { try { return ok(res, await inovasiService.listByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createInovasi(req, res) {
  try {
    const hasil = await inovasiService.create(Number(req.params.pengisianId), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(Number(req.params.pengisianId), req.tenantId);
    return ok(res, hasil, 201);
  } catch (e) { return fail(res, e); }
}
async function updateInovasi(req, res) {
  try {
    const hasil = await inovasiService.update(Number(req.params.id), req.body, req.user, req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil.pengisian_id, req.tenantId);
    return ok(res, hasil);
  } catch (e) { return fail(res, e); }
}
async function deleteInovasi(req, res) {
  try {
    const hasil = await inovasiService.remove(Number(req.params.id), req.tenantId);
    await ruleEngineService.autoRecalcSkor(hasil?.pengisian_id, req.tenantId);
    return ok(res, { deleted: true });
  } catch (e) { return fail(res, e); }
}

// ── Rule Engine ──
async function hitungUlangSkor(req, res) { try { return ok(res, await ruleEngineService.hitungUlang(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }

// ── Internal Field Autofill (Sumber Data/Hambatan/Tindak Lanjut) — READ-ONLY, tidak menulis DB ──
async function previewInternalAutofill(req, res) { try { return ok(res, await internalFieldAutofillService.previewInternalAutofill(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }

// ── MBG 2.1 Satgas ──
async function getSatgasMbg(req, res) { try { return ok(res, await mbgSatgasService.getByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createSatgasMbg(req, res) { try { return ok(res, await mbgSatgasService.create(Number(req.params.pengisianId), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function updateSatgasMbg(req, res) { try { return ok(res, await mbgSatgasService.update(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── MBG 2.2 Sarpras Komponen ──
async function listSarprasKomponenMbg(req, res) { try { return ok(res, await mbgSarprasService.listByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function bootstrapSarprasKomponenMbg(req, res) { try { return ok(res, await mbgSarprasService.bootstrap(Number(req.params.pengisianId), req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function updateSarprasKomponenMbg(req, res) { try { return ok(res, await mbgSarprasService.update(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── MBG 2.3 Laporan Satgas ──
async function listLaporanSatgasMbg(req, res) { try { return ok(res, await mbgLaporanService.listByPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); } }
async function createLaporanSatgasMbg(req, res) { try { return ok(res, await mbgLaporanService.create(Number(req.params.pengisianId), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function updateLaporanSatgasMbg(req, res) { try { return ok(res, await mbgLaporanService.update(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── Ownership per-indikator (spek 34 D4, ADMIN-only) ──
async function setKepemilikanIndikator(req, res) { try { return ok(res, await ownershipService.setKepemilikan(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function listKontributorIndikator(req, res) { try { return ok(res, await ownershipService.listKontributor(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); } }
async function tambahKontributorIndikator(req, res) { try { return ok(res, await ownershipService.tambahKontributor(Number(req.params.id), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function hapusKontributorIndikator(req, res) { try { await ownershipService.hapusKontributor(Number(req.params.id), req.user, req.tenantId); return ok(res, { deleted: true }); } catch (e) { return fail(res, e); } }

// ── Master Indikator — edit kriteria_skor (ADMIN-only, spek 34 koreksi #2) ──
async function updateKriteriaSkorMasterIndikator(req, res) { try { return ok(res, await masterIndikatorService.updateKriteriaSkor(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── Master Indikator — pemetaan Indikator Renstra (ADMIN-only, spek 35 v3 §27) ──
async function setIndikatorRenstraMapping(req, res) { try { return ok(res, await masterIndikatorService.setIndikatorRenstraMapping(Number(req.params.id), req.body.indikator_renstra_id, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }

// ── Evidence Rebind — bukti staging PENGISIAN -> entity spesifik (spek 35 v3 §7 Phase E) ──
async function rebindBukti(req, res) {
  try {
    const { entity_type, entity_id, kategori } = req.body;
    const result = await evidenceRebindService.rebindBuktiKeEntity(Number(req.params.buktiId), entity_type, Number(entity_id), kategori, req.user, req.tenantId);
    return ok(res, result, result.created ? 201 : 200);
  } catch (e) { return fail(res, e); }
}

// ── Daftar OPD (utk dropdown Atur Kepemilikan §7) ──
async function listPerangkatDaerah(req, res) {
  try { return ok(res, await db.PerangkatDaerah.findAll({ where: { aktif: true, is_test: false }, order: [['nama', 'ASC']] })); }
  catch (e) { return fail(res, e); }
}

// ── Rekonsiliasi Semester B.1.3 ──
async function setAlasanRekonsiliasi(req, res) {
  try { return ok(res, await semesterService.setAlasanRekonsiliasi(Number(req.params.pengisianId), req.body.alasan, req.user, req.tenantId)); }
  catch (e) { return fail(res, e); }
}
async function getNeracaTahunan(req, res) {
  try {
    const periode = await db.ProsnPeriode.findOne({ where: { id: Number(req.params.id), tenant_id: req.tenantId } });
    if (!periode) return res.status(404).json({ success: false, message: 'Periode tidak ditemukan.', code: 'PROSNP_NOT_FOUND' });
    return ok(res, await semesterService.getNeracaTahunan(req.tenantId, periode.tahun, periode.perangkat_daerah_id));
  } catch (e) { return fail(res, e); }
}

// ── Data referensi ──
async function listMasterIndikator(req, res) {
  try {
    return ok(res, await db.ProsnMasterIndikator.findAll({ where: { aktif: true }, order: [['urutan', 'ASC']] }));
  } catch (e) { return fail(res, e); }
}
async function listNomenklaturMapping(req, res) {
  try {
    const where = { is_active: true };
    if (req.query.master_indikator_id) where.master_indikator_id = Number(req.query.master_indikator_id);
    if (req.query.status_relevansi) {
      const list = String(req.query.status_relevansi).split(',').map((s) => s.trim());
      where.status_relevansi = list;
    } else {
      where.status_relevansi = ['core', 'direct_conditional', 'supporting'];
    }
    return ok(res, await db.ProsnNomenklaturMapping.findAll({ where, order: [['status_relevansi', 'ASC'], ['kode_sub_kegiatan', 'ASC']] }));
  } catch (e) { return fail(res, e); }
}
async function listKomoditas(req, res) {
  try { return ok(res, await db.ProsnKomoditas.findAll({ where: { aktif: true }, order: [['nama', 'ASC']] })); } catch (e) { return fail(res, e); }
}

// ── Autofill — Document Intelligence + Recall (spek 35 v3 §12/§27) ──
async function analisisBukti(req, res) {
  try {
    const result = await autofillOrchestrator.buildAutoFillPreview({
      buktiId: Number(req.params.buktiId), tenantId: req.tenantId, actor: req.user, jenisDokumenHint: req.body.jenis_dokumen_hint || null,
    });
    return ok(res, result);
  } catch (e) { return fail(res, e); }
}
async function terapkanAutofill(req, res) {
  try {
    const result = await autofillOrchestrator.applyAutofill({
      buktiId: Number(req.body.bukti_id), pengisianId: Number(req.params.pengisianId), entityType: req.body.entity_type, fields: Array.isArray(req.body.fields) ? req.body.fields : [], actor: req.user, tenantId: req.tenantId,
    });
    return ok(res, result, result.created ? 201 : 200);
  } catch (e) {
    if (e.code === 'AUTOFILL_STALE') return res.status(409).json({ success: false, message: e.message, code: e.code, stale_fields: e.staleFields || [] });
    return fail(res, e);
  }
}

module.exports = {
  listSuratPenugasan, createSuratPenugasan, updateSuratPenugasan, deleteSuratPenugasan,
  listRapatForkopimda, createRapatForkopimda, updateRapatForkopimda, deleteRapatForkopimda,
  listCadanganTarget, createCadanganTarget, updateCadanganTarget, refreshCadanganTargetSnapshot,
  listStokTransaksi, createStokTransaksi, updateStokTransaksi, deleteStokTransaksi,
  listInovasi, createInovasi, updateInovasi, deleteInovasi,
  hitungUlangSkor, previewInternalAutofill, listMasterIndikator, listNomenklaturMapping, listKomoditas,
  setAlasanRekonsiliasi, getNeracaTahunan,
  listDpaSourceTahun, listDpaSourceOpd, listDpaSourceProgram, listDpaSourceKegiatan, listDpaSourceSubKegiatan,
  getSatgasMbg, createSatgasMbg, updateSatgasMbg,
  listSarprasKomponenMbg, bootstrapSarprasKomponenMbg, updateSarprasKomponenMbg,
  listLaporanSatgasMbg, createLaporanSatgasMbg, updateLaporanSatgasMbg,
  setKepemilikanIndikator, listKontributorIndikator, tambahKontributorIndikator, hapusKontributorIndikator,
  updateKriteriaSkorMasterIndikator,
  setIndikatorRenstraMapping,
  rebindBukti,
  analisisBukti,
  terapkanAutofill,
  listPerangkatDaerah,
};
