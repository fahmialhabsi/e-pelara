'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §30). Metadata regulasi 1:1
 * terhadap `food_ops_document` yang berklasifikasi document_class=REGULATION
 * SAJA. Tidak memindahkan file (file tetap di food_ops_document).
 */
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');

const JENIS_PRODUK_HUKUM = new Set(['uu', 'perpu', 'pp', 'perpres', 'permendagri', 'permen_lain', 'kepmendagri', 'perda', 'pergub', 'kepgub', 'sk', 'lainnya']);

function assertLockVersion(value) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new FoodOpsError('lock_version wajib dikirim dari data terakhir.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  return result;
}

async function assertRegulationDocument(documentId, tenantId, transaction) {
  const document = await db.FoodOpsDocument.findOne({ where: { id: documentId, tenant_id: tenantId }, transaction });
  if (!document) throw new FoodOpsError('Dokumen sumber tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  if (document.document_class !== 'REGULATION') throw new FoodOpsError('Metadata regulasi hanya boleh ditautkan ke dokumen document_class=REGULATION.', 409, 'FOOD_OPS_INVALID_SOURCE');
  return document;
}

async function assertSameTenantDocument(documentId, tenantId, transaction, fieldLabel) {
  if (documentId == null) return null;
  const row = await db.FoodOpsDocument.findOne({ where: { id: documentId, tenant_id: tenantId }, transaction });
  if (!row) throw new FoodOpsError(`${fieldLabel} harus merujuk dokumen pada tenant yang sama.`, 409, 'FOOD_OPS_TENANT_MISMATCH');
  return row;
}

function validatePayload(payload) {
  if (!JENIS_PRODUK_HUKUM.has(payload.jenis_produk_hukum)) throw new FoodOpsError('jenis_produk_hukum tidak valid.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
}

async function createRegulationMeta(payload, actor, tenantId) {
  validatePayload(payload);
  return db.sequelize.transaction(async (transaction) => {
    await assertRegulationDocument(payload.document_id, tenantId, transaction);
    const existing = await db.FoodOpsRegulationMeta.findOne({ where: { document_id: payload.document_id, tenant_id: tenantId }, transaction });
    if (existing) throw new FoodOpsError('Dokumen ini sudah memiliki metadata regulasi.', 409, 'FOOD_OPS_DUPLICATE');
    if (payload.supersedes_document_id) await assertSameTenantDocument(payload.supersedes_document_id, tenantId, transaction, 'supersedes_document_id');
    if (payload.superseded_by_document_id) await assertSameTenantDocument(payload.superseded_by_document_id, tenantId, transaction, 'superseded_by_document_id');

    return db.FoodOpsRegulationMeta.create({
      tenant_id: tenantId,
      document_id: payload.document_id,
      jenis_produk_hukum: payload.jenis_produk_hukum,
      nomor: payload.nomor || null,
      tahun: payload.tahun || null,
      judul_resmi: payload.judul_resmi || null,
      instansi_penerbit: payload.instansi_penerbit || null,
      tanggal_penetapan: payload.tanggal_penetapan || null,
      tanggal_berlaku: payload.tanggal_berlaku || null,
      status_berlaku: payload.status_berlaku || 'berlaku',
      legal_hierarchy: payload.legal_hierarchy || null,
      scope: payload.scope || null,
      supersedes_document_id: payload.supersedes_document_id || null,
      superseded_by_document_id: payload.superseded_by_document_id || null,
      catatan: payload.catatan || null,
      created_by: actor.id,
      updated_by: actor.id,
    }, { transaction });
  });
}

async function updateRegulationMeta(id, payload, actor, tenantId) {
  validatePayload(payload);
  const expectedVersion = assertLockVersion(payload.lock_version);
  return db.sequelize.transaction(async (transaction) => {
    const row = await db.FoodOpsRegulationMeta.findOne({ where: { id, tenant_id: tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new FoodOpsError('Metadata regulasi tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
    if (row.lock_version !== expectedVersion) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    if (payload.supersedes_document_id) await assertSameTenantDocument(payload.supersedes_document_id, tenantId, transaction, 'supersedes_document_id');
    if (payload.superseded_by_document_id) await assertSameTenantDocument(payload.superseded_by_document_id, tenantId, transaction, 'superseded_by_document_id');

    const [count] = await db.FoodOpsRegulationMeta.update({
      jenis_produk_hukum: payload.jenis_produk_hukum,
      nomor: payload.nomor || null,
      tahun: payload.tahun || null,
      judul_resmi: payload.judul_resmi || null,
      instansi_penerbit: payload.instansi_penerbit || null,
      tanggal_penetapan: payload.tanggal_penetapan || null,
      tanggal_berlaku: payload.tanggal_berlaku || null,
      status_berlaku: payload.status_berlaku || row.status_berlaku,
      legal_hierarchy: payload.legal_hierarchy || null,
      scope: payload.scope || null,
      supersedes_document_id: payload.supersedes_document_id || null,
      superseded_by_document_id: payload.superseded_by_document_id || null,
      catatan: payload.catatan || null,
      updated_by: actor.id,
      lock_version: expectedVersion + 1,
    }, { where: { id, tenant_id: tenantId, lock_version: expectedVersion }, transaction });
    if (count !== 1) throw new FoodOpsError('Data telah diubah pengguna lain.', 409, 'FOOD_OPS_LOCK_CONFLICT');
    return db.FoodOpsRegulationMeta.findByPk(id, { transaction });
  });
}

async function listRegulations(tenantId, query = {}) {
  const where = { tenant_id: tenantId };
  if (query.jenis_produk_hukum) where.jenis_produk_hukum = query.jenis_produk_hukum;
  if (query.tahun) where.tahun = String(query.tahun);
  return db.FoodOpsRegulationMeta.findAll({
    where, order: [['created_at', 'DESC']],
    include: [{ model: db.FoodOpsDocument, as: 'document' }],
  });
}

async function getRegulationDetail(id, tenantId) {
  const row = await db.FoodOpsRegulationMeta.findOne({ where: { id, tenant_id: tenantId }, include: [{ model: db.FoodOpsDocument, as: 'document' }] });
  if (!row) throw new FoodOpsError('Metadata regulasi tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  return row;
}

module.exports = { createRegulationMeta, updateRegulationMeta, listRegulations, getRegulationDetail };
