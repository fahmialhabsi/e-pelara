// backend/controllers/mr_planningDeviationController.js
"use strict";

/**
 * MR Planning Deviation Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 15E Controller Foundation
 *
 * Controller foundation untuk MR Planning Deviation e-Pelara.
 *
 * Endpoint foundation:
 * - getDeviationsByRisk
 * - getDeviationsByMonitoring
 * - getDeviationsByContext
 * - getDeviationDetail
 * - createDeviationFromRisk
 * - createDeviationFromMonitoring
 * - updateDraftDeviation
 *
 * Prinsip:
 * - Controller tipis.
 * - Controller tidak membuat transaction manual.
 * - Controller tidak membuat audit manual.
 * - Controller tidak menghitung deviasi manual.
 * - Controller tidak resolve reference manual.
 * - Controller tidak menerima field teknis dari frontend.
 * - Semua read/write operation diserahkan ke service.
 * - Semua response diserahkan ke mrResponseHelper.
 */

const mrPlanningDeviationService = require("../services/mr/mrPlanningDeviationService");

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
 * READ: Deviation by Risk
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-deviation/risk/:riskId
 */

const getDeviationsByRisk = async (req, res) => {
  try {
    const result = await mrPlanningDeviationService.getDeviationsByRisk(
      req.params.riskId
    );

    return successResponse({
      res,
      message: "Daftar MR planning deviation berdasarkan risk berhasil dimuat.",
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
 * READ: Deviation by Monitoring
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-deviation/monitoring/:monitoringId
 */

const getDeviationsByMonitoring = async (req, res) => {
  try {
    const result = await mrPlanningDeviationService.getDeviationsByMonitoring(
      req.params.monitoringId
    );

    return successResponse({
      res,
      message:
        "Daftar MR planning deviation berdasarkan monitoring berhasil dimuat.",
      data: result,
      meta: {
        mr_planning_monitoring_id: req.params.monitoringId,
        total: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: Deviation by Context
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-deviation/context/:contextId
 */

const getDeviationsByContext = async (req, res) => {
  try {
    const result = await mrPlanningDeviationService.getDeviationsByContext(
      req.params.contextId
    );

    return successResponse({
      res,
      message:
        "Daftar MR planning deviation berdasarkan context berhasil dimuat.",
      data: result,
      meta: {
        context_id: req.params.contextId,
        total: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * READ: Deviation Detail
 * ---------------------------------------------------------------------------
 * GET /api/mr-planning-deviation/:id
 */

const getDeviationDetail = async (req, res) => {
  try {
    const result = await mrPlanningDeviationService.getDeviationDetail(
      req.params.id
    );

    return successResponse({
      res,
      message: "Detail MR planning deviation berhasil dimuat.",
      data: result,
      meta: {
        mr_planning_deviation_id: req.params.id,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * CREATE: Deviation Draft from Risk
 * ---------------------------------------------------------------------------
 * POST /api/mr-planning-deviation/risk/:riskId
 *
 * Catatan:
 * - riskId berasal dari route.
 * - context/planning scope diturunkan service dari risk.
 * - field calculated dihitung service.
 * - field teknis tetap diblokir service.
 */

const createDeviationFromRisk = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await mrPlanningDeviationService.createDeviationFromRisk({
      riskId: req.params.riskId,
      body: req.body,
      userId,
    });

    return createdResponse({
      res,
      message: "Draft MR planning deviation berhasil dibuat dari risk.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * CREATE: Deviation Draft from Monitoring
 * ---------------------------------------------------------------------------
 * POST /api/mr-planning-deviation/monitoring/:monitoringId
 *
 * Catatan:
 * - monitoringId berasal dari route.
 * - risk/context/planning scope diturunkan service dari monitoring.
 * - field calculated dihitung service.
 * - field teknis tetap diblokir service.
 */

const createDeviationFromMonitoring = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result =
      await mrPlanningDeviationService.createDeviationFromMonitoring({
        monitoringId: req.params.monitoringId,
        body: req.body,
        userId,
      });

    return createdResponse({
      res,
      message: "Draft MR planning deviation berhasil dibuat dari monitoring.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

/**
 * UPDATE: Draft Deviation
 * ---------------------------------------------------------------------------
 * PUT /api/mr-planning-deviation/:id/draft
 *
 * Catatan:
 * - Foundation ini belum membuat workflow submit/verify/approve.
 * - Update draft tetap dijaga service.
 * - Controller tidak membersihkan field manual.
 */

const updateDraftDeviation = async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await mrPlanningDeviationService.updateDraftDeviation({
      id: req.params.id,
      body: req.body,
      userId,
    });

    return successResponse({
      res,
      message: "Draft MR planning deviation berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getDeviationsByRisk,
  getDeviationsByMonitoring,
  getDeviationsByContext,
  getDeviationDetail,
  createDeviationFromRisk,
  createDeviationFromMonitoring,
  updateDraftDeviation,
};