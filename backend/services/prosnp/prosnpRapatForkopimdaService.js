'use strict';

const db = require('../../models');
const { ProsnError } = require('./prosnpWorkflowService');

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new ProsnError('lock_version wajib dikirim dari data terakhir.');
  return result;
}

async function assertPengisianEditable(pengisianId, tenantId, transaction) {
  const pengisian = await db.ProsnPengisian.findOne({
    where: { id: pengisianId, tenant_id: tenantId },
    include: [{ model: db.ProsnIndikator, as: 'indikator', include: [{ model: db.ProsnPeriode, as: 'periode' }] }],
    transaction,
  });
  if (!pengisian) throw new ProsnError('Pengisian tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
  if (pengisian.indikator.tipe_form !== 'koordinasi_forkopimda') throw new ProsnError('Indikator ini bukan bertipe Koordinasi Forkopimda.', 409, 'PROSNP_TIPE_MISMATCH');
  if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Register hanya dapat diubah saat pengisian Belum Diisi/Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
  if (pengisian.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
  return pengisian;
}

function validatePayload(payload) {
  if (!payload.tanggal_rapat) throw new ProsnError('Tanggal rapat wajib diisi.');
  if (!payload.nama_forum) throw new ProsnError('Nama forum wajib diisi.');
}

function buildFields(payload) {
  const tanggal = new Date(payload.tanggal_rapat);
  return {
    tanggal_rapat: payload.tanggal_rapat,
    bulan: tanggal.getMonth() + 1,
    nama_forum: payload.nama_forum,
    jenis_forum: payload.jenis_forum || null,
    is_forkopimda: Boolean(payload.is_forkopimda),
    pimpinan_rapat: payload.pimpinan_rapat || null,
    lokasi: payload.lokasi || null,
    unsur_forkopimda_hadir: Array.isArray(payload.unsur_forkopimda_hadir) ? payload.unsur_forkopimda_hadir : [],
    instansi_lain_hadir: payload.instansi_lain_hadir || null,
    topik_pengadaan: Boolean(payload.topik_pengadaan),
    topik_pengelolaan: Boolean(payload.topik_pengelolaan),
    topik_penyaluran: Boolean(payload.topik_penyaluran),
    agenda: payload.agenda || null,
    masalah: payload.masalah || null,
    keputusan: payload.keputusan || null,
    tindak_lanjut: payload.tindak_lanjut || null,
    penanggung_jawab_tindak_lanjut: payload.penanggung_jawab_tindak_lanjut || null,
    batas_waktu_tindak_lanjut: payload.batas_waktu_tindak_lanjut || null,
    status_tindak_lanjut: payload.status_tindak_lanjut || 'belum_ditindaklanjuti',
    sub_kegiatan_pendukung: payload.sub_kegiatan_pendukung || null,
    materi: payload.materi || null,
  };
}

async function listByPengisian(pengisianId, tenantId) {
  return db.ProsnRapatForkopimda.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, order: [['tanggal_rapat', 'ASC']] });
}

async function createCore(pengisianId, payload, actor, tenantId, transaction) {
  const pengisian = await assertPengisianEditable(pengisianId, tenantId, transaction);
  const rapat = await db.ProsnRapatForkopimda.create({
    tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
    ...buildFields(payload), created_by: actor.id, updated_by: actor.id,
  }, { transaction });
  await db.ProsnPengisian.update({ status: pengisian.status === 'belum_diisi' ? 'dalam_pengisian' : pengisian.status, diisi_oleh: pengisian.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id }, { where: { id: pengisian.id }, transaction });
  return rapat;
}

/** P1 Atomic Transaction Boundary — lihat catatan sama di prosnpSuratPenugasanService.js. */
async function create(pengisianId, payload, actor, tenantId, options = {}) {
  validatePayload(payload);
  if (options.transaction) return createCore(pengisianId, payload, actor, tenantId, options.transaction);
  return db.sequelize.transaction((transaction) => createCore(pengisianId, payload, actor, tenantId, transaction));
}

async function update(id, payload, actor, tenantId) {
  validatePayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const rapat = await db.ProsnRapatForkopimda.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!rapat) throw new ProsnError('Rapat tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(rapat.pengisian_id, tenantId, transaction);
    if (rapat.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    const [count] = await db.ProsnRapatForkopimda.update({ ...buildFields(payload), updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain. Muat ulang terlebih dahulu.', 409, 'PROSNP_VERSION_CONFLICT');
    return db.ProsnRapatForkopimda.findByPk(id, { transaction });
  });
}

async function remove(id, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const rapat = await db.ProsnRapatForkopimda.findOne({ where: { id, tenant_id: tenantId }, transaction });
    if (!rapat) throw new ProsnError('Rapat tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(rapat.pengisian_id, tenantId, transaction);
    const pengisianId = rapat.pengisian_id;
    await rapat.destroy({ transaction });
    return { pengisian_id: pengisianId };
  });
}

module.exports = { listByPengisian, create, update, remove };
