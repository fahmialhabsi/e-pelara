'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §31). CRUD kegiatan/aktivitas
 * operasional generik. TIDAK ADA logika upload dokumen di sini (mandat
 * §31 eksplisit) — linking evidence dilakukan lewat foodOpsDocumentLinkService.
 */
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');

const EVENT_TYPES = new Set(['RAPAT', 'RAKOR', 'MONITORING', 'SOSIALISASI', 'SERAH_TERIMA', 'STOCK_OPNAME', 'PENYALURAN', 'KEGIATAN_LAIN']);

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new FoodOpsError('lock_version wajib dikirim dari data terakhir.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  return result;
}

function validatePayload(payload) {
  if (!payload.nama_kegiatan) throw new FoodOpsError('Nama kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!EVENT_TYPES.has(payload.event_type)) throw new FoodOpsError('event_type tidak dikenali.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!payload.tanggal_mulai) throw new FoodOpsError('Tanggal mulai kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!payload.tahun) throw new FoodOpsError('Tahun kegiatan wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
}

async function createEvent(payload, actor, tenantId) {
  validatePayload(payload);
  return db.FoodOpsEvent.create({
    tenant_id: tenantId,
    opd_id: payload.opd_id || null,
    tahun: String(payload.tahun),
    event_type: payload.event_type,
    tanggal_mulai: payload.tanggal_mulai,
    tanggal_selesai: payload.tanggal_selesai || null,
    nama_kegiatan: payload.nama_kegiatan,
    lokasi: payload.lokasi || null,
    pimpinan: payload.pimpinan || null,
    penanggung_jawab: payload.penanggung_jawab || null,
    agenda: payload.agenda || null,
    hasil: payload.hasil || null,
    tindak_lanjut: payload.tindak_lanjut || null,
    status_tindak_lanjut: payload.status_tindak_lanjut || 'belum_ditindaklanjuti',
    created_by: actor.id,
    updated_by: actor.id,
  });
}

async function listEvents(tenantId, query = {}) {
  const where = { tenant_id: tenantId, status: 'aktif' };
  if (query.tahun) where.tahun = String(query.tahun);
  if (query.event_type) where.event_type = query.event_type;
  if (query.opd_id) where.opd_id = query.opd_id;
  return db.FoodOpsEvent.findAll({ where, order: [['tanggal_mulai', 'DESC']] });
}

async function getEventDetail(id, tenantId) {
  const row = await db.FoodOpsEvent.findOne({ where: { id, tenant_id: tenantId } });
  if (!row) throw new FoodOpsError('Kegiatan tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  return row;
}

async function updateEvent(id, payload, actor, tenantId) {
  validatePayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await db.FoodOpsEvent.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new FoodOpsError('Kegiatan tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
    if (row.lock_version !== expectedVersion) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    const [count] = await db.FoodOpsEvent.update({
      opd_id: payload.opd_id || null,
      tahun: String(payload.tahun),
      event_type: payload.event_type,
      tanggal_mulai: payload.tanggal_mulai,
      tanggal_selesai: payload.tanggal_selesai || null,
      nama_kegiatan: payload.nama_kegiatan,
      lokasi: payload.lokasi || null,
      pimpinan: payload.pimpinan || null,
      penanggung_jawab: payload.penanggung_jawab || null,
      agenda: payload.agenda || null,
      hasil: payload.hasil || null,
      tindak_lanjut: payload.tindak_lanjut || null,
      status_tindak_lanjut: payload.status_tindak_lanjut || row.status_tindak_lanjut,
      updated_by: actor.id,
      lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    return db.FoodOpsEvent.findByPk(id, { transaction });
  });
}

module.exports = { EVENT_TYPES, createEvent, listEvents, getEventDetail, updateEvent };
