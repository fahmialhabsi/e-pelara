'use strict';

const db = require('../models');
const workflow = require('../services/prosnp/prosnpWorkflowService');
const { buildExcel } = require('../services/prosnp/prosnpExcelExportService');
const { exportB13Template } = require('../services/prosnp/prosnpExcelTemplateExportService');
const { listDukunganProgramDariSistem } = require('../services/prosnp/prosnpDukunganSistemService');
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
async function createBukti(req, res) { try { return ok(res, await workflow.createBukti(Number(req.params.id), req.body, req.file, req.user, req.tenantId), 201); } catch (e) { removeFailedUpload(req.file); return fail(res, e); } }
async function reviseBukti(req, res) { try { return ok(res, await workflow.reviseBukti(Number(req.params.id), req.body, req.file, req.user, req.tenantId), 201); } catch (e) { removeFailedUpload(req.file); return fail(res, e); } }
async function checklistBukti(req, res) { try { return ok(res, await workflow.checklistBukti(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
async function listBuktiEntity(req, res) { try { return ok(res, await workflow.listBuktiUntukEntity(Number(req.params.id), req.query.entity_type, req.query.entity_id, req.tenantId)); } catch (e) { return fail(res, e); } }
async function setStatusVerifikasiBukti(req, res) { try { return ok(res, await workflow.setStatusVerifikasiBukti(Number(req.params.id), req.body, req.user, req.tenantId)); } catch (e) { return fail(res, e); } }
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

module.exports = { getKonteks, listPeriode, createPeriode, createIndikator, initializeIndikator, activatePeriode, getPeriode, getPengisian, updatePengisian, transitionPengisian, createBukti, reviseBukti, checklistBukti, listBuktiEntity, setStatusVerifikasiBukti, downloadBukti, periksaPengisian, listAntrianPemeriksaan, listKategoriReferensi, archivePeriode, reopenPeriode, siapkanEksporPeriode, exportExcel, exportB13TemplateNasional, getDukunganSistem };
