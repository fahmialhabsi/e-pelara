'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 (mandat §13/§14/§15/§32). Relasi
 * generik satu dokumen -> banyak entitas. Anti-spoof WAJIB: backend
 * memvalidasi dokumen DAN entitas target ada, sama tenant, sebelum
 * membuat baris relasi (mandat §15 "Never trust client entity existence").
 *
 * Phase 0 hanya mendukung entity_type yang punya tabel backing nyata utk
 * divalidasi (EVENT/REGULATION/DOCUMENT). GENERIC_REFERENCE SENGAJA ditolak
 * pada pass ini karena tidak ada tabel utk membuktikan entitasnya benar ada
 * (mandat §15: "If entity cannot be validated: reject") — bukan silent no-op.
 */
const db = require('../../models');
const { FoodOpsError } = require('./foodOpsError');

const ENTITY_MODEL_BY_TYPE = {
  EVENT: 'FoodOpsEvent',
  REGULATION: 'FoodOpsRegulationMeta',
  DOCUMENT: 'FoodOpsDocument',
};
const ALLOWED_ENTITY_TYPES = new Set(['EVENT', 'REGULATION', 'DOCUMENT', 'GENERIC_REFERENCE']);

async function assertEntityExists(entityType, entityId, tenantId, transaction) {
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) throw new FoodOpsError('entity_type tidak dikenali.', 400, 'FOOD_OPS_INVALID_SOURCE');
  const modelName = ENTITY_MODEL_BY_TYPE[entityType];
  if (!modelName) {
    // GENERIC_REFERENCE — tidak ada tabel utk verifikasi keberadaan entitas (Phase 0).
    throw new FoodOpsError('entity_type GENERIC_REFERENCE belum didukung utk validasi keberadaan pada Phase 0 — link ditolak.', 409, 'FOOD_OPS_INVALID_SOURCE');
  }
  const row = await db[modelName].findOne({ where: { id: entityId, tenant_id: tenantId }, transaction });
  if (!row) throw new FoodOpsError(`Entitas ${entityType} tidak ditemukan pada tenant ini.`, 404, 'FOOD_OPS_INVALID_SOURCE');
  return row;
}

async function createLink(payload, actor, tenantId) {
  if (!payload.document_id) throw new FoodOpsError('document_id wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');
  if (!payload.entity_id) throw new FoodOpsError('entity_id wajib diisi.', 400, 'FOOD_OPS_INVALID_DOCUMENT');

  return db.sequelize.transaction(async (transaction) => {
    const document = await db.FoodOpsDocument.findOne({ where: { id: payload.document_id, tenant_id: tenantId }, transaction });
    if (!document) throw new FoodOpsError('Dokumen tidak ditemukan pada tenant ini.', 404, 'FOOD_OPS_INVALID_DOCUMENT');
    await assertEntityExists(payload.entity_type, payload.entity_id, tenantId, transaction);

    const existing = await db.FoodOpsDocumentLink.findOne({
      where: { tenant_id: tenantId, document_id: payload.document_id, entity_type: payload.entity_type, entity_id: payload.entity_id },
      transaction,
    });
    if (existing) throw new FoodOpsError('Relasi dokumen-entitas ini sudah ada.', 409, 'FOOD_OPS_DUPLICATE');

    return db.FoodOpsDocumentLink.create({
      tenant_id: tenantId,
      document_id: payload.document_id,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      relation_type: payload.relation_type || null,
      purpose: payload.purpose || null,
      valid_from: payload.valid_from || null,
      valid_until: payload.valid_until || null,
      linked_by: actor.id,
      linked_at: new Date(),
    }, { transaction });
  });
}

async function unlink(id, tenantId) {
  const row = await db.FoodOpsDocumentLink.findOne({ where: { id, tenant_id: tenantId } });
  if (!row) throw new FoodOpsError('Relasi tidak ditemukan.', 404, 'FOOD_OPS_NOT_FOUND');
  await row.destroy();
  return { id };
}

async function listLinks(tenantId, query = {}) {
  const where = { tenant_id: tenantId };
  if (query.document_id) where.document_id = query.document_id;
  if (query.entity_type) where.entity_type = query.entity_type;
  if (query.entity_id) where.entity_id = query.entity_id;
  return db.FoodOpsDocumentLink.findAll({ where, order: [['linked_at', 'DESC']], include: [{ model: db.FoodOpsDocument, as: 'document' }] });
}

module.exports = { createLink, unlink, listLinks, assertEntityExists };
