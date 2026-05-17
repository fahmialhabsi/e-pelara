// backend/controllers/mr_planningMonitoringController.js
"use strict";

/**
 * MR Planning Monitoring Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 14F Controller Foundation
 *
 * Controller foundation untuk MR Planning Monitoring e-Pelara.
 *
 * Endpoint foundation:
 * - getMonitoringsByRisk
 * - getMonitoringsByMitigation
 * - getMonitoringDetail
 * - createMonitoringFromRisk
 * - updateDraftMonitoring
 *
 * Prinsip:
 * - Controller tipis.
 * - Controller tidak membuat transaction manual.
 * - Controller tidak membuat history manual.
 * - Controller tidak membuat audit manual.
 * - Controller tidak menghitung actual risk manual.
 * - Controller tidak resolve reference manual.
 * - Controller tidak menerima field teknis dari frontend.
 * - Semua write/read operation diserahkan ke service.
 * - Semua response diserahkan ke mrResponseHelper.
 */

const mrPlanningMonitoringService = require("../services/mr/mrPlanningMonitoringService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const {
  createGovernanceError,
} = require("../helpers/mr/mrApprovalHelper");

/**
 * Actor Helper
 * ---------------------------------------------------------------------------
 * User actor wajib berasal dari middleware verifyToken.
 */

const getUserId = (req) => {
  const userId =
    req.user?.id ||
    req.user?.user_id ||
    req.user?.userId ||
    req.auth?.id ||
    req.auth?.user_id ||
    req.body?.user_id ||
    null;

  if (!userId) {
    throw createGovernanceError({
      message: "User actor tidak ditemukan. Pastikan endpoint memakai verifyToken.",
      status: 401,
      blocked: true,
      auditMode: true,
      code: "MR_USER_ACTOR_NOT_FOUND",
    });
  }

  return userId;
};

/**
 * READ: Monitoring by Risk
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/risk/:riskId
 */

const getMonitoringsByRisk = async (req, res) => {
  try {
    const result = await mrPlanningMonitoringService.getMonitoringsByRisk(
      req.params.riskId
    );

    return successResponse({
      res,
      message: "Daftar MR planning monitoring berdasarkan risk berhasil dimuat.",
      data: result,
      meta: {
        mr_planning_risk_id: req.params.riskId,
        total: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: Monitoring by Mitigation
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/mitigation/:mitigationId
 */

const getMonitoringsByMitigation = async (req, res) => {
  try {
    const result = await mrPlanningMonitoringService.getMonitoringsByMitigation(
      req.params.mitigationId
    );

    return successResponse({
      res,
      message:
        "Daftar MR planning monitoring berdasarkan mitigation berhasil dimuat.",
      data: result,
      meta: {
        mr_planning_mitigation_id: req.params.mitigationId,
        total: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: Monitoring Detail
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-monitoring/:id
 */

const getMonitoringDetail = async (req, res) => {
  try {
    const result = await mrPlanningMonitoringService.getMonitoringDetail(
      req.params.id
    );

    return successResponse({
      res,
      message:
        result?.message || "Detail MR planning monitoring berhasil dimuat.",
      data: result?.data || result,
      meta: {
        mr_planning_monitoring_id: req.params.id,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * CREATE: Monitoring Draft from Risk
 * ---------------------------------------------------------------------------
 * POST /api/mr-planning-monitoring/risk/:riskId
 *
 * Catatan:
 * - riskId berasal dari route.
 * - context_id diturunkan service dari risk.
 * - tahun diturunkan service dari risk/context.
 * - actual risk dihitung service.
 * - field teknis tetap diblokir service.
 */

/**
 * PREVIEW: Draft Monitoring from Risk
 * ---------------------------------------------------------------------------
 * POST /api/mr-planning-monitoring/risk/:riskId/draft-preview
 *
 * Catatan:
 * - Draft dibuat backend dari data Risk + Mitigation/RTP.
 * - Tidak menyimpan ke database.
 * - Tidak mengubah narrative provider.
 * - Tidak memanggil AI eksternal.
 * - User tetap wajib review sebelum simpan.
 */

const buildDraftPreviewFromRisk = async (req, res) => {
  try {
    const result = await mrPlanningMonitoringService.buildDraftPreviewFromRisk({
      riskId: req.params.riskId,
      body: req.body,
    });

    return successResponse({
      res,
      message:
        result?.message || "Draft Pemantauan Pengendalian berhasil dibuat.",
      data: result?.data || result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createMonitoringFromRisk = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await mrPlanningMonitoringService.createMonitoringFromRisk({
      riskId: req.params.riskId,
      body: req.body,
      userId,
      request: req,
    });

    return createdResponse({
      res,
      message:
        result?.message ||
        "Draft MR planning monitoring berhasil dibuat dari risk.",
      data: result?.data || result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * UPDATE: Draft Monitoring
 * ---------------------------------------------------------------------------
 * PUT /api/mr-planning-monitoring/:id/draft
 *
 * Catatan:
 * - Update hanya boleh saat status_revisi = draft.
 * - Guard dilakukan service.
 * - Controller tidak membersihkan field manual.
 */

const updateDraftMonitoring = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await mrPlanningMonitoringService.updateDraftMonitoring({
      id: req.params.id,
      body: req.body,
      userId,
    });

    return successResponse({
      res,
      message:
        result?.message || "Draft MR planning monitoring berhasil diperbarui.",
      data: result?.data || result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getMonitoringsByRisk,
  getMonitoringsByMitigation,
  getMonitoringDetail,
  buildDraftPreviewFromRisk,
  createMonitoringFromRisk,
  updateDraftMonitoring,
};