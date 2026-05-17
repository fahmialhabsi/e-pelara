// backend/controllers/mr_planningWarningController.js
"use strict";

/**
 * MR Planning Warning Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 16E Controller Foundation
 *
 * Controller foundation untuk MR Planning Warning e-Pelara.
 *
 * Prinsip:
 * - Controller tipis.
 * - Controller tidak membuat transaction manual.
 * - Controller tidak membuat audit manual.
 * - Controller tidak membuat kalkulasi manual.
 * - Controller tidak mengisi field teknis manual.
 * - Semua write operation diserahkan ke service.
 * - Semua response diserahkan ke mrResponseHelper.
 * - Read/resolve warning dipisahkan dari update draft.
 * - Tidak membuat endpoint dashboard/export/laporan pada fase foundation.
 */

const mrPlanningWarningService = require("../services/mr/mrPlanningWarningService");

const {
  successResponse,
  createdResponse,
  errorResponse,
} = require("../helpers/mr/mrResponseHelper");

const {
  createGovernanceError,
} = require("../helpers/mr/mrApprovalHelper");

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

const getWarningDetail = async (req, res) => {
  try {
    const warning = await mrPlanningWarningService.getWarningDetail(req.params.id);

    return successResponse({
      res,
      message: "Detail MR planning warning berhasil dimuat.",
      data: warning,
      meta: {
        mr_planning_warning_id: req.params.id,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getWarningsByRisk = async (req, res) => {
  try {
    const warnings = await mrPlanningWarningService.getWarningsByRisk(
      req.params.riskId
    );

    return successResponse({
      res,
      message: "Daftar MR planning warning berdasarkan risk berhasil dimuat.",
      data: warnings,
      meta: {
        mr_planning_risk_id: req.params.riskId,
        total: warnings.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getWarningsByContext = async (req, res) => {
  try {
    const warnings = await mrPlanningWarningService.getWarningsByContext(
      req.params.contextId
    );

    return successResponse({
      res,
      message: "Daftar MR planning warning berdasarkan context berhasil dimuat.",
      data: warnings,
      meta: {
        context_id: req.params.contextId,
        total: warnings.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getWarningsByMonitoring = async (req, res) => {
  try {
    const warnings = await mrPlanningWarningService.getWarningsByMonitoring(
      req.params.monitoringId
    );

    return successResponse({
      res,
      message: "Daftar MR planning warning berdasarkan monitoring berhasil dimuat.",
      data: warnings,
      meta: {
        mr_planning_monitoring_id: req.params.monitoringId,
        total: warnings.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getWarningsByMitigation = async (req, res) => {
  try {
    const warnings = await mrPlanningWarningService.getWarningsByMitigation(
      req.params.mitigationId
    );

    return successResponse({
      res,
      message: "Daftar MR planning warning berdasarkan mitigation berhasil dimuat.",
      data: warnings,
      meta: {
        mr_planning_mitigation_id: req.params.mitigationId,
        total: warnings.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getWarningsBySource = async (req, res) => {
  try {
    const warnings = await mrPlanningWarningService.getWarningsBySource({
      sourceTable: req.params.sourceTable,
      sourceId: req.params.sourceId,
    });

    return successResponse({
      res,
      message: "Daftar MR planning warning berdasarkan source berhasil dimuat.",
      data: warnings,
      meta: {
        source_table: req.params.sourceTable,
        source_id: req.params.sourceId,
        total: warnings.length,
      },
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createWarningFromRisk = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.createWarningFromRisk({
      riskId: req.params.riskId,
      body: req.body,
      userId: getUserId(req),
    });

    return createdResponse({
      res,
      message: "Draft MR planning warning berhasil dibuat dari risk.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createWarningFromMonitoring = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.createWarningFromMonitoring({
      monitoringId: req.params.monitoringId,
      body: req.body,
      userId: getUserId(req),
    });

    return createdResponse({
      res,
      message: "Draft MR planning warning berhasil dibuat dari monitoring.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createWarningFromMitigation = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.createWarningFromMitigation({
      mitigationId: req.params.mitigationId,
      body: req.body,
      userId: getUserId(req),
    });

    return createdResponse({
      res,
      message: "Draft MR planning warning berhasil dibuat dari mitigation.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createWarningFromSource = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.createWarningFromSource({
      riskId: req.params.riskId,
      sourceTable: req.params.sourceTable,
      sourceId: req.params.sourceId,
      body: req.body,
      userId: getUserId(req),
    });

    return createdResponse({
      res,
      message: "Draft MR planning warning berhasil dibuat dari source.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const updateDraftWarning = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.updateDraftWarning({
      id: req.params.id,
      body: req.body,
      userId: getUserId(req),
    });

    return successResponse({
      res,
      message: "Draft MR planning warning berhasil diperbarui.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const markWarningAsRead = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.markWarningAsRead({
      id: req.params.id,
      body: req.body,
      userId: getUserId(req),
    });

    return successResponse({
      res,
      message: "MR planning warning berhasil ditandai sudah dibaca.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const resolveWarning = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.resolveWarning({
      id: req.params.id,
      body: req.body,
      userId: getUserId(req),
    });

    return successResponse({
      res,
      message: "MR planning warning berhasil diselesaikan.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const reopenWarning = async (req, res) => {
  try {
    const result = await mrPlanningWarningService.reopenWarning({
      id: req.params.id,
      body: req.body,
      userId: getUserId(req),
    });

    return successResponse({
      res,
      message: "MR planning warning berhasil dibuka kembali.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getWarningDetail,
  getWarningsByRisk,
  getWarningsByContext,
  getWarningsByMonitoring,
  getWarningsByMitigation,
  getWarningsBySource,

  createWarningFromRisk,
  createWarningFromMonitoring,
  createWarningFromMitigation,
  createWarningFromSource,

  updateDraftWarning,
  markWarningAsRead,
  resolveWarning,
  reopenWarning,
};