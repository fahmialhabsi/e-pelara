'use strict';

/**
 * Spesifikasi 35 v3 §20 — Penatausahaan (Realisasi Anggaran), BARU. Filter OPD
 * WAJIB di query ini SENDIRI (defense in depth P0, §13) — tidak cukup
 * dipercaya dari caller.
 */
const db = require('../../../../models');

async function recall({ dpaId, opdPenanggungJawabId, transaction }) {
  const dpa = await db.Dpa.findOne({ where: { id: dpaId, opd_id: opdPenanggungJawabId }, transaction });
  if (!dpa) return { value: null, source_type: 'NOT_FOUND', code: 'DPA_NOT_FOUND', confidence: 'NONE', requires_review: true };

  const rows = await db.Penatausahaan.findAll({ where: { dpa_id: dpa.id }, attributes: ['jumlah'], transaction, raw: true });
  if (!rows.length) return { value: null, source_type: 'NOT_FOUND', code: 'PENATAUSAHAAN_NOT_FOUND', confidence: 'NONE', requires_review: true };

  const total = rows.reduce((sum, row) => sum + Number(row.jumlah || 0), 0);
  return {
    value: total,
    source_type: 'PENATAUSAHAAN_RECALL',
    source_reference: { dpa_id: dpa.id },
    source_snapshot_at: new Date().toISOString(),
    confidence: 'HIGH',
    requires_review: false,
  };
}

module.exports = { recall };
