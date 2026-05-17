// backend/controllers/mr_planningMitigationController.js

"use strict";

/**
 * MR Planning Mitigation Controller
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 13E
 *
 * Guard:
 * - Controller hanya menjadi HTTP layer.
 * - Business logic tetap di service.
 * - Error response menjaga pola blocked/audit_mode/code/details/meta.
 */

const mitigationService = require("../services/mr/mrPlanningMitigationService");
const mrPlanningMitigationDraftPreviewService = require("../services/mr/mrPlanningMitigationDraftPreviewService");

const getUserId = (req) => {
  return req.user?.id || req.user?.userId || req.user?.user_id || null;
};

const buildErrorResponse = (error) => {
  return {
    success: false,
    message: error.message || "Terjadi kesalahan server internal.",
    blocked: error.blocked || false,
    audit_mode: error.audit_mode || false,
    code: error.code || "MR_MITIGATION_INTERNAL_ERROR",
    details: error.details || {},
    meta: {},
  };
};

const getRootStatusCode = (error) => {
  return error.statusCode || error.status || 500;
};

const getMitigationsByRisk = async (req, res) => {
  try {
    const { riskId } = req.params;

    const data = await mitigationService.getMitigationsByRisk(riskId);

    return res.status(200).json({
      success: true,
      message: "Daftar MR Planning Mitigation berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    console.error("GET MITIGATIONS BY RISK ERROR:", error);

    return res.status(getRootStatusCode(error)).json(buildErrorResponse(error));
  }
};

const getMitigationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await mitigationService.getMitigationDetail(id);

    return res.status(200).json({
      success: true,
      message: "Detail MR Planning Mitigation berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    console.error("GET MITIGATION DETAIL ERROR:", error);

    return res.status(getRootStatusCode(error)).json(buildErrorResponse(error));
  }
};

const createMitigationFromRisk = async (req, res) => {
  try {
    const { riskId } = req.params;
    const userId = getUserId(req);

    const data = await mitigationService.createMitigationFromRisk({
      riskId,
      body: req.body,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Draft MR Planning Mitigation berhasil dibuat.",
      data,
      meta: {},
    });
  } catch (error) {
    console.error("CREATE MITIGATION FROM RISK ERROR:", error);

    return res.status(getRootStatusCode(error)).json(buildErrorResponse(error));
  }
};

const updateDraftMitigation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const data = await mitigationService.updateDraftMitigation({
      id,
      body: req.body,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Draft MR Planning Mitigation berhasil diperbarui.",
      data,
      meta: {},
    });
  } catch (error) {
    console.error("UPDATE DRAFT MITIGATION ERROR:", error);

    return res.status(getRootStatusCode(error)).json(buildErrorResponse(error));
  }
};

const previewDraftFromRisk = async (req, res) => {
  try {
    const data = await mrPlanningMitigationDraftPreviewService.buildDraftPreview(
      req.params.riskId,
      {
        user: req.user,
        body: req.body,
      }
    );

    return res.status(200).json({
      success: true,
      message:
        "Draft Rencana Tindak Pengendalian berhasil dibuat. Mohon review dan sesuaikan sebelum disimpan.",
      data,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message:
        error.message ||
        "Draft Rencana Tindak Pengendalian belum dapat dibuat.",
      code: error.code || "MR_MITIGATION_DRAFT_PREVIEW_ERROR",
    });
  }
};

const cancelDraftMitigation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const data = await mitigationService.cancelDraftMitigation({
      id,
      body: req.body,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Draft Rencana Tindak Pengendalian berhasil dibatalkan.",
      data,
      meta: {},
    });
  } catch (error) {
    console.error("CANCEL DRAFT MITIGATION ERROR:", error);

    return res.status(getRootStatusCode(error)).json(buildErrorResponse(error));
  }
};

module.exports = {
  getMitigationsByRisk,
  getMitigationDetail,
  createMitigationFromRisk,
  updateDraftMitigation,
  previewDraftFromRisk,
  cancelDraftMitigation,
};