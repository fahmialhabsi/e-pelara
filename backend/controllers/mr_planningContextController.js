"use strict";

/**
 * MR Planning Context Controller
 * ---------------------------------------------------------------------------
 * PHASE REPORT 2026 — STEP R13A
 * MR Planning Risk Source Selector & Context Item Auto Mapping Foundation
 *
 * Controller tetap tipis:
 * - Tidak membuat business logic.
 * - Tidak menghitung field teknis.
 * - Semua logic context item/generate diserahkan ke service.
 */

const mrPlanningContextService = require("../services/mr/mrPlanningContextService");

const getStatusCode = (error) => {
  return error?.statusCode || error?.status || 500;
};

const successResponse = ({ res, statusCode = 200, message, data = null, meta = {} }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const errorResponse = ({ res, error }) => {
  const statusCode = getStatusCode(error);

  return res.status(statusCode).json({
    success: false,
    message: error?.message || "Terjadi kesalahan pada MR planning context.",
    blocked: Boolean(error?.blocked),
    audit_mode: Boolean(error?.audit_mode),
    code: error?.code || error?.name || "MR_CONTEXT_ERROR",
    details: error?.details || {},
    meta: {},
  });
};

const getUserId = (req) => {
  return (
    req?.user?.id ||
    req?.user?.user_id ||
    req?.user?.userId ||
    req?.auth?.id ||
    null
  );
};

const getContextDetail = async (req, res) => {
  try {
    const result = await mrPlanningContextService.getContextDetail(req.params.id);

    return successResponse({
      res,
      message: "Detail MR planning context berhasil dimuat.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getContexts = async (req, res) => {
  try {
    const result = await mrPlanningContextService.getContexts(req.query);

    return successResponse({
      res,
      message: "Daftar MR planning context berhasil dimuat.",
      data: result.rows,
      meta: result.meta,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const createReportPeriodContext = async (req, res) => {
  try {
    const result = await mrPlanningContextService.createReportPeriodContext({
      payload: req.body || {},
      userId: getUserId(req),
    });

    return successResponse({
      res,
      statusCode: result?.created ? 201 : 200,
      message: result?.created
        ? "Context laporan periodik MR berhasil dibuat."
        : "Context laporan periodik MR sudah tersedia.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const getContextItems = async (req, res) => {
  try {
    const result = await mrPlanningContextService.getContextItems(
      req.params.contextId
    );

    return successResponse({
      res,
      message: "Daftar sumber perencanaan MR planning context berhasil dimuat.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const submitContext = async (req, res) => {
  try {
    const result = await mrPlanningContextService.submitContext(req.params.id, {
      userId: getUserId(req),
      note: req.body?.note || req.body?.alasan || null,
    });

    return successResponse({
      res,
      message: "MR planning context berhasil diajukan untuk verifikasi.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const verifyContext = async (req, res) => {
  try {
    const result = await mrPlanningContextService.verifyContext(req.params.id, {
      userId: getUserId(req),
      note: req.body?.note || req.body?.catatan_verifikasi || null,
    });

    return successResponse({
      res,
      message: "MR planning context berhasil diverifikasi.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const approveContext = async (req, res) => {
  try {
    const result = await mrPlanningContextService.approveContext(req.params.id, {
      userId: getUserId(req),
      note: req.body?.note || req.body?.catatan_persetujuan || null,
    });

    return successResponse({
      res,
      message: "MR planning context berhasil disetujui.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const rejectContext = async (req, res) => {
  try {
    const result = await mrPlanningContextService.rejectContext(req.params.id, {
      userId: getUserId(req),
      reason:
        req.body?.reason ||
        req.body?.alasan_penolakan ||
        req.body?.note ||
        null,
    });

    return successResponse({
      res,
      message: "MR planning context berhasil ditolak.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

const generateContextItems = async (req, res) => {
  try {
    const result = await mrPlanningContextService.generateContextItems(
      req.params.contextId,
      {
        userId: getUserId(req),
      }
    );

    return successResponse({
      res,
      statusCode: 201,
      message: "Context item MR berhasil digenerate dari sumber Renstra.",
      data: result,
    });
  } catch (error) {
    return errorResponse({ res, error });
  }
};

module.exports = {
  getContexts,
  getContextDetail,
  getContextItems,
  generateContextItems,
  createReportPeriodContext,

  submitContext,
  verifyContext,
  approveContext,
  rejectContext,
};