'use strict';

/**
 * Evidence & Operasi Pangan — Phase 1. Controller TIPIS (mandat §50): request
 * -> authorization (di route) -> service call -> response. Tidak ada logika
 * bisnis atau orkestrasi Sequelize langsung di sini.
 */
const candidateService = require('../services/foodOperations/foodOpsEvidenceCandidateService');
const bindingService = require('../services/foodOperations/foodOpsProsnBindingService');
const packageService = require('../services/foodOperations/foodOpsCompliancePackageService');
const recallService = require('../services/foodOperations/foodOpsRecallService');
const { FoodOpsError } = require('../services/foodOperations/foodOpsError');
const { logActivity } = require('../services/auditService');
const ruleEngineService = require('../services/prosnp/prosnpRuleEngineService');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: {} });
const fail = (res, error) => {
  // CORRECTIVE MANDATE UAT-01D — `details` (mis. existing_link_id pada
  // FOOD_OPS_PROSN_BINDING_ALREADY_EXISTS) harus sampai ke frontend.
  if (error instanceof FoodOpsError) return res.status(error.status).json({ success: false, message: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) });
  console.error('[foodOps]', error);
  return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada modul Evidence & Operasi Pangan.', code: 'FOOD_OPS_INTERNAL_ERROR' });
};

async function listCandidates(req, res) {
  try { return ok(res, await candidateService.findCandidates(req.tenantId, req.query)); } catch (e) { return fail(res, e); }
}

async function listProsnBoundEvidence(req, res) {
  try { return ok(res, await recallService.recallProsnBoundEvidence(req.tenantId, Number(req.params.indikatorId))); } catch (e) { return fail(res, e); }
}

// Corrective "ProSN Semester-II Readiness — Automatic Scoring" (mandat §20
// "bind evidence"/"unbind evidence"): no-op utk B.1.3/MBG (lihat
// prosnpRuleEngineService.autoRecalcSkor).
async function bindProsn(req, res) {
  try {
    const result = await bindingService.bindDocumentToProsn(Number(req.body.document_id), req.body, req.user, req.tenantId);
    await logActivity(req, 'FOOD_OPS_PROSN_BIND', 'ProsnBuktiDukung', result.bukti.id, null, { document_id: req.body.document_id, entity_type: result.link.entity_type, entity_id: result.link.entity_id, indikator_id: result.link.indikator_id });
    await ruleEngineService.autoRecalcSkor(req.body.pengisian_id, req.tenantId);
    return ok(res, result, 201);
  } catch (e) { return fail(res, e); }
}

async function unbindProsn(req, res) {
  try {
    const result = await bindingService.unbindFromProsn(Number(req.params.id), req.tenantId, req.user);
    await logActivity(req, 'FOOD_OPS_PROSN_UNBIND', 'ProsnBuktiIndikator', result.id, null, null);
    await ruleEngineService.autoRecalcSkor(result.pengisian_id, req.tenantId);
    return ok(res, result);
  } catch (e) { return fail(res, e); }
}

async function assemblePackageForPengisian(req, res) {
  try { return ok(res, await packageService.assembleForPengisian(Number(req.params.pengisianId), req.tenantId)); } catch (e) { return fail(res, e); }
}

async function assemblePackageForPeriode(req, res) {
  try { return ok(res, await packageService.assembleForPeriode(Number(req.params.periodeId), req.tenantId)); } catch (e) { return fail(res, e); }
}

module.exports = { listCandidates, listProsnBoundEvidence, bindProsn, unbindProsn, assemblePackageForPengisian, assemblePackageForPeriode };
