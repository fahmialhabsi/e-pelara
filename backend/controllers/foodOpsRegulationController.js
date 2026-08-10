'use strict';

const regulationService = require('../services/foodOperations/foodOpsRegulationService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');
const { logActivity } = require('../services/auditService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  if (error instanceof FoodOpsError) return res.status(error.status).json({ success: false, message: error.message, code: error.code });
  console.error('[foodOps]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul Evidence & Operasi Pangan.', code: 'FOOD_OPS_INTERNAL_ERROR' });
};

async function listRegulations(req, res) {
  try { return ok(res, await regulationService.listRegulations(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}
async function createRegulation(req, res) {
  try {
    const created = await regulationService.createRegulationMeta(req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_REGULATION_CREATE', 'FoodOpsRegulationMeta', created.id, null, { jenis_produk_hukum: created.jenis_produk_hukum, nomor: created.nomor });
    return ok(res, created, 201);
  } catch (e) { return fail(res, e); }
}
async function getRegulationDetail(req, res) {
  try { return ok(res, await regulationService.getRegulationDetail(Number(req.params.id), req.tenantId)); } catch (e) { return fail(res, e); }
}
async function updateRegulation(req, res) {
  try {
    const updated = await regulationService.updateRegulationMeta(Number(req.params.id), req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_REGULATION_UPDATE', 'FoodOpsRegulationMeta', updated.id, null, { status_berlaku: updated.status_berlaku });
    return ok(res, updated);
  } catch (e) { return fail(res, e); }
}

module.exports = { listRegulations, createRegulation, getRegulationDetail, updateRegulation };
