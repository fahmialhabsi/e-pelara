"use strict";

/**
 * MR Planning Root Cause Controller
 *
 * Guard:
 * - Controller hanya menerima request dan meneruskan ke service.
 * - Business logic, strict schema, reference lookup, context mapping,
 *   ownership mapping, kode_penyebab generation, dan workflow guard berada di service.
 * - Frontend tidak boleh mengirim field teknis.
 */

const mrPlanningRootCauseService = require("../services/mr/mrPlanningRootCauseService");

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
    message: error.message || "Terjadi kesalahan pada MR Planning Root Cause.",
    blocked: error.blocked !== undefined ? error.blocked : statusCode < 500,
    audit_mode: false,
    code: error.code || "MR_ROOT_CAUSE_INTERNAL_SERVER_ERROR",
    details: error.details || {},
    meta: {},
  });
};

/**
 * GET /api/mr-planning-root-cause/risk/:riskId
 *
 * Ambil seluruh root cause aktif berdasarkan MR Planning Risk.
 */
const getRootCausesByRisk = async (req, res) => {
  try {
    const { riskId } = req.params;

    const data = await mrPlanningRootCauseService.getRootCausesByRisk(riskId);

    return buildSuccessResponse({
      res,
      message: "Daftar MR Planning Root Cause berhasil diambil.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * GET /api/mr-planning-root-cause/:id
 *
 * Ambil detail root cause.
 */
const getRootCauseDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await mrPlanningRootCauseService.getRootCauseDetail(id);

    return buildSuccessResponse({
      res,
      message: "Detail MR Planning Root Cause berhasil diambil.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * POST /api/mr-planning-root-cause/risk/:riskId
 *
 * Buat root cause dari MR Planning Risk.
 *
 * Frontend hanya boleh mengirim field bisnis:
 * - mr_planning_risk_analysis_id
 * - jenis_penyebab_ref_id
 * - kategori_penyebab_ref_id
 * - uraian_penyebab
 * - why_1
 * - why_2
 * - why_3
 * - why_4
 * - why_5
 * - akar_penyebab
 * - rekomendasi_pengendalian
 * - prioritas_penyebab
 * - is_mitigation_required
 * - alasan_revisi
 */
const createRootCauseFromRisk = async (req, res) => {
  try {
    const { riskId } = req.params;
    const userId = getUserId(req);

    const data = await mrPlanningRootCauseService.createRootCauseFromRisk({
      riskId,
      body: req.body,
      userId,
    });

    return buildSuccessResponse({
      res,
      statusCode: 201,
      message: "MR Planning Root Cause berhasil dibuat sebagai draft.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

/**
 * PUT /api/mr-planning-root-cause/:id/draft
 *
 * Update root cause hanya jika status_revisi = draft.
 */
const updateDraftRootCause = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const data = await mrPlanningRootCauseService.updateDraftRootCause({
      rootCauseId: id,
      body: req.body,
      userId,
    });

    return buildSuccessResponse({
      res,
      message: "Draft MR Planning Root Cause berhasil diperbarui.",
      data,
    });
  } catch (error) {
    return buildErrorResponse({ res, error });
  }
};

module.exports = {
  getRootCausesByRisk,
  getRootCauseDetail,
  createRootCauseFromRisk,
  updateDraftRootCause,
};