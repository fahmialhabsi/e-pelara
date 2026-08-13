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
  if (pengisian.indikator.tipe_form !== 'inovasi_dan_perkada') throw new ProsnError('Indikator ini bukan bertipe Inovasi dan Perkada.', 409, 'PROSNP_TIPE_MISMATCH');
  if (!['belum_diisi', 'dalam_pengisian'].includes(pengisian.status)) throw new ProsnError('Register hanya dapat diubah saat pengisian Belum Diisi/Dalam Pengisian.', 409, 'PROSNP_EDIT_LOCKED');
  if (pengisian.indikator.periode.status !== 'aktif') throw new ProsnError('Periode tidak aktif.', 409, 'PROSNP_PERIOD_LOCKED');
  return pengisian;
}

function validatePayload(payload) {
  if (!payload.nama_inovasi) throw new ProsnError('Nama inovasi wajib diisi.');
  // relevansi_umum: generalisasi Indicator Foundation (spek 34 §3.4, D3) dipakai
  // indikator selain Ketahanan Pangan (mis. MBG 2.7) — reuse tabel ini tanpa
  // memaksa 3 checkbox spesifik Ketahanan Pangan yang tidak relevan bagi MBG.
  if (!(payload.relevansi_pengadaan || payload.relevansi_pengelolaan || payload.relevansi_penyaluran || payload.relevansi_umum)) {
    throw new ProsnError('Minimal satu relevansi harus dipilih.');
  }
  if (payload.status_perkada === 'ditetapkan' && !payload.nomor_perkada) {
    throw new ProsnError('Nomor Perkada wajib diisi bila status Perkada sudah Ditetapkan.');
  }
}

function buildFields(payload) {
  return {
    nama_inovasi: payload.nama_inovasi,
    masalah_awal: payload.masalah_awal || null,
    tujuan: payload.tujuan || null,
    unsur_kebaruan: payload.unsur_kebaruan || null,
    proses_sebelum: payload.proses_sebelum || null,
    proses_setelah: payload.proses_setelah || null,
    ruang_lingkup: payload.ruang_lingkup || null,
    relevansi_pengadaan: Boolean(payload.relevansi_pengadaan),
    relevansi_pengelolaan: Boolean(payload.relevansi_pengelolaan),
    relevansi_penyaluran: Boolean(payload.relevansi_penyaluran),
    relevansi_umum: Boolean(payload.relevansi_umum),
    tanggal_mulai: payload.tanggal_mulai || null,
    status_implementasi: payload.status_implementasi || 'gagasan',
    unit_pelaksana: payload.unit_pelaksana || null,
    lokasi: payload.lokasi || null,
    penerima_manfaat: payload.penerima_manfaat || null,
    hasil_kuantitatif: payload.hasil_kuantitatif || null,
    hasil_kualitatif: payload.hasil_kualitatif || null,
    sub_kegiatan_basis: payload.sub_kegiatan_basis || null,
    status_evaluasi: payload.status_evaluasi || null,
    status_perkada: payload.status_perkada || 'belum_ada',
    jenis_perkada: payload.jenis_perkada || null,
    nomor_perkada: payload.nomor_perkada || null,
    tanggal_perkada: payload.tanggal_perkada || null,
    relevansi_dijelaskan: payload.relevansi_dijelaskan || null,
  };
}

async function listByPengisian(pengisianId, tenantId) {
  return db.ProsnInovasi.findAll({ where: { pengisian_id: pengisianId, tenant_id: tenantId }, order: [['created_at', 'ASC']] });
}

async function createCore(pengisianId, payload, actor, tenantId, transaction) {
  const pengisian = await assertPengisianEditable(pengisianId, tenantId, transaction);
  const inovasi = await db.ProsnInovasi.create({
    tenant_id: tenantId, periode_id: pengisian.indikator.periode_id, indikator_id: pengisian.indikator_id, pengisian_id: pengisian.id,
    ...buildFields(payload), created_by: actor.id, updated_by: actor.id,
  }, { transaction });
  await db.ProsnPengisian.update({ status: pengisian.status === 'belum_diisi' ? 'dalam_pengisian' : pengisian.status, diisi_oleh: pengisian.diisi_oleh || actor.id, diisi_at: new Date(), updated_by: actor.id }, { where: { id: pengisian.id }, transaction });
  return inovasi;
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
    const inovasi = await db.ProsnInovasi.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!inovasi) throw new ProsnError('Inovasi tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(inovasi.pengisian_id, tenantId, transaction);
    if (inovasi.lock_version !== expectedVersion) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    const [count] = await db.ProsnInovasi.update({ ...buildFields(payload), updated_by: actor.id, lock_version: expectedVersion + 1 }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new ProsnError('Data telah diubah pengguna lain.', 409, 'PROSNP_VERSION_CONFLICT');
    return db.ProsnInovasi.findByPk(id, { transaction });
  });
}

async function remove(id, tenantId) {
  return db.sequelize.transaction(async (transaction) => {
    const inovasi = await db.ProsnInovasi.findOne({ where: { id, tenant_id: tenantId }, transaction });
    if (!inovasi) throw new ProsnError('Inovasi tidak ditemukan.', 404, 'PROSNP_NOT_FOUND');
    await assertPengisianEditable(inovasi.pengisian_id, tenantId, transaction);
    const pengisianId = inovasi.pengisian_id;
    await inovasi.destroy({ transaction });
    return { pengisian_id: pengisianId };
  });
}

module.exports = { listByPengisian, create, update, remove };
