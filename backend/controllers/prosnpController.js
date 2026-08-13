'use strict';

const db = require('../models');
const workflow = require('../services/prosnp/prosnpWorkflowService');
const { buildExcel } = require('../services/prosnp/prosnpExcelExportService');
const { exportB13Template } = require('../services/prosnp/prosnpExcelTemplateExportService');
const { listDukunganProgramDariSistem } = require('../services/prosnp/prosnpDukunganSistemService');
const foodOpsDocumentService = require('../services/foodOperations/foodOpsDocumentService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');
const fs = require('fs');

const normalizeOpdName = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
async function resolvePerangkatDaerahUser(user) {
  const namaOpd = String(user?.opd || '').trim();
  if (!namaOpd) return { namaOpd, perangkatDaerah: null };
  const rows = await db.PerangkatDaerah.findAll({ where: { aktif: true, is_test: false }, order: [['nama', 'ASC']] });
  const normalized = normalizeOpdName(namaOpd);
  const candidates = rows.filter((row) => {
    const candidate = normalizeOpdName(row.nama);
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  });
  return { namaOpd, perangkatDaerah: candidates.length === 1 ? candidates[0] : null };
}

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  if (error instanceof workflow.ProsnError) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
  console.error('[prosnp]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul ProSN.', code: 'PROSNP_INTERNAL_ERROR' });
};

async function listPeriode(req, res) { try { return ok(res, await workflow.listPeriods(req.tenantId, req.query)); } catch (e) { return fail(res, e); } }
async function getKonteks(req, res) {
  try {
    const { namaOpd, perangkatDaerah } = await resolvePerangkatDaerahUser(req.user);
    if (!namaOpd) return res.status(422).json({ success: false, message: 'Profil pengguna belum memiliki OPD.', code: 'PROSNP_OPD_PROFILE_MISSING' });
    if (!perangkatDaerah) return res.status(422).json({ success: false, message: `OPD “${namaOpd}” belum dipetakan ke Perangkat Daerah.`, code: 'PROSNP_OPD_MAPPING_MISSING' });
    return ok(res, { perangkat_daerah_id: perangkatDaerah.id, perangkat_daerah_nama: perangkatDaerah.nama });
  } catch (e) { return fail(res, e); }
}
async function createPeriode(req, res) {
  try {
    const payload = { ...req.body };
    const { perangkatDaerah } = await resolvePerangkatDaerahUser(req.user);
    if (!perangkatDaerah) return res.status(422).json({ success: false, message: 'Perangkat Daerah pengguna belum dapat ditentukan dari profil.', code: 'PROSNP_OPD_MAPPING_MISSING' });
    payload.perangkat_daerah_id = perangkatDaerah.id;
    return ok(res, await workflow.createPeriod(payload, req.user, req.tenantId), 201);
  } catch (e) { return fail(res, e); }
}
/** Corrective "B.1.3 Period Cutoff Wiring" (mandat §3) — update terbatas (tanggal_cutoff/tanggal_tenggat/catatan). */
async function updatePeriode(req, res) { try { return ok(res, await workflow.updatePeriode(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function activatePeriode(req, res) { try { return ok(res, await workflow.activatePeriod(Number(req.params.id), req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function initializeIndikator(req, res) { try { return ok(res, await workflow.initializePeriodIndicators(Number(req.params.id), req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function createIndikator(req, res) { try { return ok(res, await workflow.createIndikator(Number(req.params.id), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function getPeriode(req, res) {
  try {
    const row = await db.ProsnPeriode.findOne({ where: { id: Number(req.params.id), tenant_id: req.tenantId }, include: [{ model: db.ProsnIndikator, as: 'indikators', include: [
      { model: db.ProsnPengisian, as: 'pengisian', include: [
        { model: db.ProsnKategoriReferensi, as: 'hambatanKategori' },
        { model: db.ProsnKategoriReferensi, as: 'tindakLanjutKategori' },
      ] },
      { model: db.ProsnBuktiDukung, as: 'buktiDukung', through: { attributes: ['id', 'checklist_status', 'catatan_kekurangan', 'relevansi', 'lock_version'] } },
      { model: db.ProsnMasterIndikator, as: 'masterIndikator', attributes: ['id', 'kelompok_tematik', 'evidence_requirement_provenance', 'kriteria_skor', 'objek_kertas_kerja'] },
      { model: db.PerangkatDaerah, as: 'responsibleOpd', attributes: ['id', 'nama'] },
      { model: db.PerangkatDaerah, as: 'dataOwnerOpd', attributes: ['id', 'nama'] },
    ] }] });
    if (!row) return res.status(404).json({ success: false, message: 'Periode ProSN tidak ditemukan.', code: 'PROSNP_NOT_FOUND' });
    return ok(res, row);
  } catch (e) { return fail(res, e); }
}
async function updatePengisian(req, res) { try { return ok(res, await workflow.updatePengisian(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function transitionPengisian(req, res) { try { return ok(res, await workflow.transitionPengisian(Number(req.params.id), req.body.status_tujuan, req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function getPengisian(req, res) { try { return ok(res, await workflow.getPengisianScoped(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); } }
function removeFailedUpload(file) { if (file?.path) fs.unlink(file.path, () => {}); }
/**
 * Corrective "B.1.3 Registry-First Evidence Discovery" §11/STATE F — guard
 * duplikat-unggah TERBATAS ke entity_type=STOK_TRANSAKSI SAJA (mandat: "for
 * B.1.3 evidence"). SENGAJA tidak menyentuh workflow.createBukti (dipakai
 * bersama B.1.1/B.1.2/B.1.4/MBG, protected) — reuse checksum FoodOps registry
 * yang sudah ada (`foodOpsDocumentService.computeChecksum`/
 * `findDuplicateByChecksum`), tidak menciptakan mekanisme duplikat baru.
 */
async function createBukti(req, res) {
  try {
    if (req.body.entity_type === 'STOK_TRANSAKSI' && req.file) {
      const checksum = foodOpsDocumentService.computeChecksum(req.file.path);
      const duplicate = await foodOpsDocumentService.findDuplicateByChecksum(req.tenantId, checksum);
      if (duplicate) {
        removeFailedUpload(req.file);
        return res.status(409).json({
          success: false,
          message: `Berkas ini identik dengan dokumen yang sudah terdaftar di Evidence & Operasi Pangan: "${duplicate.judul}". Gunakan dokumen yang sudah ada, jangan unggah ulang.`,
          code: 'PROSNP_EVIDENCE_DUPLICATE_IN_REGISTRY',
          data: { existing_document: { id: duplicate.id, judul: duplicate.judul, document_type: duplicate.document_type, status_verifikasi: duplicate.status_verifikasi } },
        });
      }
    }
    const hasil = await workflow.createBukti(Number(req.params.id), req.body, req.file, req.user, req.tenantId);
    // Corrective "ProSN Semester-II Readiness — Automatic Scoring" (mandat §20
    // "bind evidence"): pengisianId sudah tersedia langsung dari route param,
    // no-op utk B.1.3/MBG (lihat autoRecalcSkor).
    await ruleEngineService.autoRecalcSkor(Number(req.params.id), req.tenantId);
    return ok(res, hasil, 201);
  } catch (e) { removeFailedUpload(req.file); return fail(res, e); }
}
async function reviseBukti(req, res) { try { return ok(res, await workflow.reviseBukti(Number(req.params.id), req.body, req.file, req.user, req.tenantId), 201); } catch (e) { removeFailedUpload(req.file); return fail(res, e); } }
async function checklistBukti(req, res) { try { return ok(res, await workflow.checklistBukti(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function listBuktiEntity(req, res) { try { return ok(res, await workflow.listBuktiUntukEntity(Number(req.params.id), req.query.entity_type, req.query.entity_id, req.tenantId)); } catch (e) { return fail(res, e); } }
/**
 * Corrective "ProSN Semester-II Readiness — Automatic Scoring" (mandat §20
 * "evidence verification-status change"): satu ProsnBuktiDukung bisa terikat
 * ke >1 entity/pengisian scr teoretis lewat ProsnBuktiIndikator — refresh
 * SEMUA pengisian yg terikat, no-op utk yg tidak eligible (B.1.3/MBG).
 */
async function setStatusVerifikasiBukti(req, res) {
  try {
    const hasil = await workflow.setStatusVerifikasiBukti(Number(req.params.id), req.body, req.user, req.tenantId);
    const links = await db.ProsnBuktiIndikator.findAll({ where: { bukti_dukung_id: Number(req.params.id), tenant_id: req.tenantId }, attributes: ['pengisian_id'] });
    await ruleEngineService.autoRecalcSkorBanyak(links.map((l) => l.pengisian_id), req.tenantId);
    return ok(res, hasil);
  } catch (e) { return fail(res, e); }
}
async function downloadBukti(req, res) {
  try {
    const bukti = await db.ProsnBuktiDukung.findOne({ where: { id: Number(req.params.id), tenant_id: req.tenantId } });
    if (!bukti) return res.status(404).json({ success: false, message: 'Bukti tidak ditemukan.', code: 'PROSNP_NOT_FOUND' });
    return res.download(bukti.file_path, bukti.nama_asli);
  } catch (e) { return fail(res, e); }
}
async function periksaPengisian(req, res) { try { return ok(res, await workflow.periksaPengisian(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function listAntrianPemeriksaan(req, res) { try { return ok(res, await workflow.listAntrianPemeriksaan(req.tenantId)); } catch (e) { return fail(res, e); } }
async function listKategoriReferensi(req, res) { try { return ok(res, await workflow.listKategoriReferensi(req.query.kelompok)); } catch (e) { return fail(res, e); } }
async function archivePeriode(req, res) { try { return ok(res, await workflow.archivePeriod(Number(req.params.id), req.body, req.user, req.tenantId), 201); } catch (e) { return fail(res, e); } }
async function reopenPeriode(req, res) { try { return ok(res, await workflow.reopenPeriod(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function siapkanEksporPeriode(req, res) { try { return ok(res, await workflow.siapkanEksporPeriode(Number(req.params.id), req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function getDukunganSistem(req, res) {
  try {
    const periode = await db.ProsnPeriode.findOne({ where: { id: Number(req.params.id), tenant_id: req.tenantId } });
    if (!periode) return res.status(404).json({ success: false, message: 'Periode ProSN tidak ditemukan.', code: 'PROSNP_NOT_FOUND' });
    const kodeSubKegiatan = req.query.kode_sub_kegiatan || null;
    return ok(res, await listDukunganProgramDariSistem(periode.tahun, kodeSubKegiatan));
  } catch (e) { return fail(res, e); }
}
async function exportExcel(req, res) {
  try {
    const output = await buildExcel(Number(req.params.id), req.tenantId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
    return res.send(Buffer.from(output.buffer));
  } catch (e) { return fail(res, e); }
}
async function exportB13TemplateNasional(req, res) {
  try {
    const output = await exportB13Template(Number(req.params.id), req.tenantId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
    return res.send(Buffer.from(output.buffer));
  } catch (e) { return fail(res, e); }
}

module.exports = { getKonteks, listPeriode, createPeriode, updatePeriode, createIndikator, initializeIndikator, activatePeriode, getPeriode, getPengisian, updatePengisian, transitionPengisian, createBukti, reviseBukti, checklistBukti, listBuktiEntity, setStatusVerifikasiBukti, downloadBukti, periksaPengisian, listAntrianPemeriksaan, listKategoriReferensi, archivePeriode, reopenPeriode, siapkanEksporPeriode, exportExcel, exportB13TemplateNasional, getDukunganSistem };
