"use strict";

/**
 * MR Planning Risk Analysis Controller
 *
 * Guard:
 * - Controller hanya menerima request dan meneruskan ke service.
 * - Business logic, strict schema, reference lookup, matrix calculation,
 *   context mapping, ownership mapping, dan workflow guard berada di service.
 * - Frontend tidak boleh mengirim field teknis.
 */

const mrPlanningRiskAnalysisService = require("../services/mr/mrPlanningRiskAnalysisService");

const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    req.userId ||
    null
  );
};

const buildSuccessResponse = ({
  res,
  message,
  data = null,
  statusCode = 200,
  meta = {},
}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const buildErrorResponse = ({ res, error }) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada MR Planning Risk Analysis.",
    blocked: error.blocked !== undefined ? error.blocked : statusCode < 500,
    audit_mode: false,
    code: error.code || "MR_ANALYSIS_INTERNAL_SERVER_ERROR",
    details: error.details || {},
    meta: {},
  });
};

/**
 * GET /api/mr-planning-risk-analysis/risk/:riskId
 *
 * Ambil seluruh risk analysis aktif berdasarkan MR Planning Risk.
 */
const getAnalysesByRisk = async (req, res) => {
  try {
    const { riskId } = req.params;

    const data = await mrPlanningRiskAnalysisService.getAnalysesByRisk(riskId);

    return buildSuccessResponse({
      res,
      message: "Daftar MR Planning Risk Analysis berhasil diambil.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * GET /api/mr-planning-risk-analysis/:id
 *
 * Ambil detail risk analysis.
 */
const getAnalysisDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await mrPlanningRiskAnalysisService.getAnalysisDetail(id);

    return buildSuccessResponse({
      res,
      message: "Detail MR Planning Risk Analysis berhasil diambil.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * POST /api/mr-planning-risk-analysis/risk/:riskId
 *
 * Buat risk analysis dari MR Planning Risk.
 *
 * Frontend hanya boleh mengirim field bisnis:
 * - existing_control_status_ref_id
 * - existing_control_description
 * - control_adequacy_ref_id
 * - control_adequacy_note
 * - inherent_likelihood_ref_id
 * - inherent_impact_ref_id
 * - residual_likelihood_ref_id
 * - residual_impact_ref_id
 * - selera_risiko_ref_id
 * - analysis_note
 * - rekomendasi
 * - alasan_revisi
 */
const createAnalysisFromRisk = async (req, res) => {
  try {
    const { riskId } = req.params;
    const userId = getUserId(req);

    const data = await mrPlanningRiskAnalysisService.createAnalysisFromRisk({
      riskId,
      body: req.body,
      userId,
    });

    return buildSuccessResponse({
      res,
      statusCode: 201,
      message: "MR Planning Risk Analysis berhasil dibuat sebagai draft.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * PUT /api/mr-planning-risk-analysis/:id/draft
 *
 * Update risk analysis hanya jika status_revisi = draft.
 */
const updateDraftAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const data = await mrPlanningRiskAnalysisService.updateDraftAnalysis({
      analysisId: id,
      body: req.body,
      userId,
    });

    return buildSuccessResponse({
      res,
      message: "Draft MR Planning Risk Analysis berhasil diperbarui.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

module.exports = {
  getAnalysesByRisk,
  getAnalysisDetail,
  createAnalysisFromRisk,
  updateDraftAnalysis,
};