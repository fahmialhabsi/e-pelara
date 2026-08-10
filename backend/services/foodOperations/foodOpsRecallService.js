'use strict';

/**
 * Evidence & Operasi Pangan — Phase 0 Foundation ONLY (mandat §34/§35).
 * Membangun kontrak envelope recall kanonis + lookup internal TERBATAS pada
 * Regulation dan Event milik FoodOps sendiri. TIDAK melakukan recall
 * RKA/DPA/ProSN/MBG/CPPD pada pass ini — itu bridge fase berikutnya.
 *
 * Recall = PREVIEW/PROPOSE ONLY (mandat §35): fungsi di sini TIDAK PERNAH
 * menulis ke domain lain, TIDAK auto-link, TIDAK auto-apply — murni
 * mengembalikan kandidat + provenance utk keputusan eksplisit user/caller.
 */
const db = require('../../models');

/**
 * Kontrak envelope kanonis (mandat §4/§34) — dipakai SEMUA fungsi recall
 * FoodOps ke depan (termasuk bridge RKA/DPA/ProSN fase mendatang), agar
 * tidak perlu retrofit bentuk data (mandat §73).
 */
function buildRecallEnvelope({
  sourceDomain, sourceEntityType, sourceEntityId, tenantId, opdId = null, tahun = null,
  data, provenance = [], authority = 'SUPPORTING', confidence = 'LOW', requiresReview = true,
}) {
  return {
    source_domain: sourceDomain,
    source_entity_type: sourceEntityType,
    source_entity_id: sourceEntityId,
    tenant_id: tenantId,
    opd_id: opdId,
    tahun,
    data,
    provenance,
    authority,
    confidence,
    recalled_at: new Date().toISOString(),
    requires_review: requiresReview,
  };
}

/** Preview kandidat regulasi FoodOps yang sudah terdaftar — TIDAK auto-link. */
async function recallRegulation(tenantId, { jenis_produk_hukum, tahun, nomor } = {}) {
  const where = { tenant_id: tenantId };
  if (jenis_produk_hukum) where.jenis_produk_hukum = jenis_produk_hukum;
  if (tahun) where.tahun = String(tahun);
  if (nomor) where.nomor = nomor;
  const rows = await db.FoodOpsRegulationMeta.findAll({ where, include: [{ model: db.FoodOpsDocument, as: 'document' }], limit: 20 });
  return rows.map((row) => buildRecallEnvelope({
    sourceDomain: 'FOOD_OPS_REGULATION',
    sourceEntityType: 'FoodOpsRegulationMeta',
    sourceEntityId: row.id,
    tenantId,
    tahun: row.tahun,
    data: { jenis_produk_hukum: row.jenis_produk_hukum, nomor: row.nomor, judul_resmi: row.judul_resmi, status_berlaku: row.status_berlaku },
    provenance: [{ at: new Date().toISOString(), jenis: 'food_ops_regulation_lookup', document_id: row.document_id, document_status_verifikasi: row.document?.status_verifikasi }],
    authority: row.document?.authority_level || 'SUPPORTING',
    confidence: row.document?.status_verifikasi === 'valid' ? 'HIGH' : 'MEDIUM',
    requiresReview: true,
  }));
}

/** Preview kandidat event FoodOps yang sudah terdaftar — TIDAK auto-link. */
async function recallEvent(tenantId, { event_type, tahun, opd_id } = {}) {
  const where = { tenant_id: tenantId, status: 'aktif' };
  if (event_type) where.event_type = event_type;
  if (tahun) where.tahun = String(tahun);
  if (opd_id) where.opd_id = opd_id;
  const rows = await db.FoodOpsEvent.findAll({ where, limit: 20, order: [['tanggal_mulai', 'DESC']] });
  return rows.map((row) => buildRecallEnvelope({
    sourceDomain: 'FOOD_OPS_EVENT',
    sourceEntityType: 'FoodOpsEvent',
    sourceEntityId: row.id,
    tenantId,
    opdId: row.opd_id,
    tahun: row.tahun,
    data: { event_type: row.event_type, nama_kegiatan: row.nama_kegiatan, tanggal_mulai: row.tanggal_mulai, lokasi: row.lokasi },
    provenance: [{ at: new Date().toISOString(), jenis: 'food_ops_event_lookup' }],
    authority: 'STRUCTURED_SYSTEM_SOURCE',
    confidence: 'HIGH',
    requiresReview: true,
  }));
}

module.exports = { buildRecallEnvelope, recallRegulation, recallEvent };
