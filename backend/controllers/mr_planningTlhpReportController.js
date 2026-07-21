// backend/controllers/mr_planningTlhpReportController.js

"use strict";

const reportQueryService = require("../services/mr/mrPlanningTlhpReportQueryService");
const reportExportWordService = require("../services/mr/mrPlanningTlhpReportExportWordService");
const reportExportPdfService = require("../services/mr/mrPlanningTlhpReportExportPdfService");
const reportExportAuditService = require("../services/mr/mrPlanningTlhpReportExportAuditService");
const reportExportHistoryService = require("../services/mr/mrPlanningTlhpReportExportHistoryService");
const { assertReportExportPolicy } = require("../services/mr/mrPolicyEngineService");
const { runWithHeavyExportGuard } = require("../services/mr/mrHeavyExportGuardService");

const getErrorStatus = (error) => error.status || error.statusCode || 500;

const sendError = (res, error) => {
  const status = getErrorStatus(error);

  return res.status(status).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada modul Laporan Pemantauan TLHP.",
    blocked: status >= 400 && status < 500,
    audit_mode: false,
    code: error.code || "MR_TLHP_REPORT_ERROR",
    details: error.details || null,
    meta: {},
  });
};

const getUserId = (req) => req?.user?.id || req?.user?.user_id || req?.user?.userId || req?.auth?.id || null;
const getSourceEndpoint = (req) => req?.originalUrl || req?.url || null;

const recordExportSuccessSafely = async ({ req, scope, report, format, filename, mimeType, fileSize }) => {
  try {
    await reportExportAuditService.recordExportSuccess({
      scope,
      report,
      format,
      filename,
      mimeType,
      fileSize,
      sourceEndpoint: getSourceEndpoint(req),
      userId: getUserId(req),
    });
  } catch (auditError) {
    console.warn("[MR_TLHP_REPORT_EXPORT_AUDIT] Gagal mencatat export success:", auditError.message);
  }
};

const recordExportFailureSafely = async ({ req, scope, report = null, format, error }) => {
  try {
    await reportExportAuditService.recordExportFailure({
      scope,
      report,
      format,
      sourceEndpoint: getSourceEndpoint(req),
      userId: getUserId(req),
      error,
    });
  } catch (auditError) {
    console.warn("[MR_TLHP_REPORT_EXPORT_AUDIT] Gagal mencatat export failure:", auditError.message);
  }
};

const getSummary = async (req, res) => {
  try {
    const scope = reportQueryService.resolveScope(req.query);
    const data = await reportQueryService.getSummary(scope);
    return res.json({ success: true, message: "Ringkasan TLHP berhasil dimuat.", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getFullReport = async (req, res) => {
  try {
    const data = await reportQueryService.getFullReport(req.query);
    return res.json({ success: true, message: "Laporan Pemantauan TLHP berhasil dimuat.", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getExportHistory = async (req, res) => {
  try {
    const data = await reportExportHistoryService.getExportHistoryByScope(req.query);
    return res.json({ success: true, message: "Riwayat export TLHP berhasil dimuat.", data: data.rows, meta: data.meta });
  } catch (error) {
    return sendError(res, error);
  }
};

const exportWord = async (req, res) => {
  const scope = reportQueryService.resolveScope(req.query);
  let report = null;

  try {
    const result = await runWithHeavyExportGuard(() => reportExportWordService.buildTlhpWordDocument(req.query));
    report = result.report;

    assertReportExportPolicy({ report, format: "docx" });

    await recordExportSuccessSafely({
      req,
      scope,
      report,
      format: "docx",
      filename: result.filename,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: result.buffer.length,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.filename)}"`);
    return res.send(result.buffer);
  } catch (error) {
    await recordExportFailureSafely({ req, scope, report, format: "docx", error });
    return sendError(res, error);
  }
};

const exportPdf = async (req, res) => {
  const scope = reportQueryService.resolveScope(req.query);
  let report = null;

  try {
    const result = await runWithHeavyExportGuard(() => reportExportPdfService.buildTlhpPdfFromWord(req.query));
    report = result.report;

    assertReportExportPolicy({ report, format: "pdf" });

    await recordExportSuccessSafely({
      req,
      scope,
      report,
      format: "pdf",
      filename: result.filename,
      mimeType: "application/pdf",
      fileSize: result.buffer.length,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(result.filename)}"`);
    return res.send(result.buffer);
  } catch (error) {
    await recordExportFailureSafely({ req, scope, report, format: "pdf", error });
    return sendError(res, error);
  }
};

module.exports = {
  getSummary,
  getFullReport,
  getExportHistory,
  exportWord,
  exportPdf,
};
