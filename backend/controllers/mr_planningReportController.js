// backend/controllers/mr_planningReportController.js

const reportQueryService = require("../services/mr/mrPlanningReportQueryService");
const reportExportExcelService = require("../services/mr/mrPlanningReportExportExcelService");
const reportExportWordService = require("../services/mr/mrPlanningReportExportWordService");
const reportExportPdfService = require("../services/mr/mrPlanningReportExportPdfService");
const reportExportAuditService = require("../services/mr/mrPlanningReportExportAuditService");
const reportExportHistoryService = require("../services/mr/mrPlanningReportExportHistoryService");
const mrIntegrityScanService = require("../services/mr/mrIntegrityScanService");
const mrPlanningReportRepairDraftService = require("../services/mr/mrPlanningReportRepairDraftService");
const { recalculateRiskMatrixForPayload } = require("../services/mr/mrPlanningRiskService");
const { assertReportExportPolicy } = require("../services/mr/mrPolicyEngineService");
const { logActivity } = require("../services/auditService");
const db = require("../models");

const getErrorStatus = (error) => error.status || error.statusCode || 500;

const sendError = (res, error) => {
  const status = getErrorStatus(error);

  return res.status(status).json({
    success: false,
    message: error.message || "Terjadi kesalahan pada modul laporan MR.",
    blocked: status >= 400 && status < 500,
    audit_mode: false,
    code: error.code || "MR_REPORT_ERROR",
    details: error.details || null,
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

const getSourceEndpoint = (req) => {
  return req?.originalUrl || req?.url || null;
};

const MAX_CONCURRENT_HEAVY_EXPORT = 2;
let heavyExportInFlight = 0;

const runWithHeavyExportGuard = async (fn) => {
  if (heavyExportInFlight >= MAX_CONCURRENT_HEAVY_EXPORT) {
    const error = new Error("Antrian export sedang penuh. Coba beberapa saat lagi.");
    error.status = 429;
    error.statusCode = 429;
    error.code = "MR_EXPORT_QUEUE_BUSY";
    throw error;
  }

  heavyExportInFlight += 1;
  try {
    return await fn();
  } finally {
    heavyExportInFlight = Math.max(0, heavyExportInFlight - 1);
  }
};

const recordExportSuccessSafely = async ({
  req,
  contextId,
  report,
  format,
  filename,
  mimeType,
  fileSize,
  metadata = {},
}) => {
  try {
    await reportExportAuditService.recordExportSuccess({
      contextId,
      report,
      format,
      filename,
      mimeType,
      fileSize,
      sourceEndpoint: getSourceEndpoint(req),
      userId: getUserId(req),
      metadata,
    });
  } catch (auditError) {
    console.warn(
      "[MR_REPORT_EXPORT_AUDIT] Gagal mencatat export success:",
      auditError.message
    );
  }
};

const recordExportFailureSafely = async ({
  req,
  contextId,
  report = null,
  format,
  error,
  metadata = {},
}) => {
  try {
    await reportExportAuditService.recordExportFailure({
      contextId,
      report,
      format,
      sourceEndpoint: getSourceEndpoint(req),
      userId: getUserId(req),
      error,
      metadata,
    });
  } catch (auditError) {
    console.warn(
      "[MR_REPORT_EXPORT_AUDIT] Gagal mencatat export failure:",
      auditError.message
    );
  }
};

const getSummary = async (req, res) => {
  try {
    const { contextId } = req.params;

    const data = await reportQueryService.getSummary(contextId);

    return res.status(200).json({
      success: true,
      message: "Summary laporan MR berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getLampiran = async (req, res) => {
  try {
    const { contextId } = req.params;

    const data = await reportQueryService.getLampiran(contextId);

    return res.status(200).json({
      success: true,
      message: "Lampiran laporan MR berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getFullReport = async (req, res) => {
  try {
    const { contextId } = req.params;

    const data = await reportQueryService.getFullReport(contextId, {
      flow: req.query?.flow,
      snapshot_mode: req.query?.snapshot_mode,
      user_id: getUserId(req),
      source_endpoint: getSourceEndpoint(req),
      request_id: req.headers["x-request-id"] || null,
      idempotency_key: req.headers["idempotency-key"] || null,
    });

    return res.status(200).json({
      success: true,
      message: "Full report laporan MR berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getIntegrityScan = async (req, res) => {
  try {
    const { contextId } = req.params;
    const data = await mrIntegrityScanService.scanContextIntegrity(contextId, {
      user_id: getUserId(req),
      source_endpoint: getSourceEndpoint(req),
      request_id: req.headers["x-request-id"] || null,
      idempotency_key: req.headers["idempotency-key"] || null,
      flow: req.query?.flow,
      snapshot_mode: req.query?.snapshot_mode,
    });

    await logActivity(
      req,
      "READ_INTEGRITY_SCAN",
      "MR_REPORT_INTEGRITY_SCAN",
      Number(contextId),
      null,
      {
        context_id: Number(contextId),
        overall_status: data?.overall_status || null,
        blocking_count: data?.blocking_count || 0,
        warning_count: data?.warning_count || 0,
        final_report_status: data?.final_report_status || null,
        source_endpoint: getSourceEndpoint(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Integrity scan context laporan MR berhasil diambil.",
      data,
      meta: {},
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const repairDraftFromFindings = async (req, res) => {
  try {
    const { contextId } = req.params;
    const data = await mrPlanningReportRepairDraftService.repairDraftFromFindings(
      contextId,
      req.body || {},
      {
        user_id: getUserId(req),
        source_endpoint: getSourceEndpoint(req),
        request_id: req.headers["x-request-id"] || null,
        idempotency_key: req.headers["idempotency-key"] || null,
      }
    );

    await logActivity(
      req,
      "REPAIR_DRAFT_FROM_FINDINGS",
      "MR_REPORT_INTEGRITY_REPAIR",
      Number(contextId),
      null,
      {
        context_id: Number(contextId),
        repaired_count: data?.repaired_count || 0,
        skipped_count: data?.skipped_count || 0,
        requested_codes: data?.requested_codes || [],
        source_endpoint: getSourceEndpoint(req),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Proses repair draft dari findings selesai diproses.",
      data,
      meta: {},
    });
  } catch (error) {
    return sendError(res, error);
  }
};
const getExportHistory = async (req, res) => {
  try {
    const { contextId } = req.params;

    const result = await reportExportHistoryService.getExportHistoryByContext(
      contextId,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Histori export laporan MR berhasil diambil.",
      data: result.rows,
      meta: result.meta,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const exportExcel = async (req, res) => {
  const { contextId } = req.params;
  const isFinalExcel = String(req.query?.final || "").toLowerCase() === "true";

  try {
    const { workbook, filename, report } =
      await reportExportExcelService.buildExcelWorkbook(contextId);
    assertReportExportPolicy({ report, format: isFinalExcel ? "excel_final" : "excel" });

    const buffer = await workbook.xlsx.writeBuffer();

    const safeFilename =
      filename || `Laporan_MR_Context_${contextId}.xlsx`;

    const mimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    await recordExportSuccessSafely({
      req,
      contextId,
      report,
      format: "excel",
      filename: safeFilename,
      mimeType,
      fileSize: buffer.length,
      metadata: {
        export_variant: "main",
      },
    });

    res.setHeader("Content-Type", mimeType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
        safeFilename
      )}`
    );

    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).send(buffer);
  } catch (error) {
    await recordExportFailureSafely({
      req,
      contextId,
      format: "excel",
      error,
      metadata: {
        export_variant: "main",
      },
    });

    return sendError(res, error);
  }
};

const exportExcelInspektorat = async (req, res) => {
  const { contextId } = req.params;
  const isFinalExcel = String(req.query?.final || "").toLowerCase() === "true";

  try {
    const { workbook, filename, report } =
      await reportExportExcelService.buildExcelWorkbookInspektorat(contextId);
    assertReportExportPolicy({ report, format: isFinalExcel ? "excel_final" : "excel" });

    const buffer = await workbook.xlsx.writeBuffer();

    const safeFilename =
      filename || `Workbook_MR_Inspektorat_Context_${contextId}.xlsx`;

    const mimeType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    await recordExportSuccessSafely({
      req,
      contextId,
      report,
      format: "excel",
      filename: safeFilename,
      mimeType,
      fileSize: buffer.length,
      metadata: {
        export_variant: "inspektorat_alias",
      },
    });

    res.setHeader("Content-Type", mimeType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
        safeFilename
      )}`
    );

    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).send(buffer);
  } catch (error) {
    await recordExportFailureSafely({
      req,
      contextId,
      format: "excel",
      error,
      metadata: {
        export_variant: "inspektorat_alias",
      },
    });

    return sendError(res, error);
  }
};

const exportWord = async (req, res) => {
  const { contextId } = req.params;

  try {
    const { buffer, filename, report } = await runWithHeavyExportGuard(() =>
      reportExportWordService.buildWordDocument(contextId)
    );
    assertReportExportPolicy({ report, format: "docx" });

    const safeFilename = filename || `Laporan_MR_Context_${contextId}.docx`;
    const encodedFilename = encodeURIComponent(safeFilename);

    const mimeType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    await recordExportSuccessSafely({
      req,
      contextId,
      report,
      format: "docx",
      filename: safeFilename,
      mimeType,
      fileSize: buffer.length,
      metadata: {
        export_variant: "word_final",
      },
    });

    res.setHeader("Content-Type", mimeType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).send(buffer);
  } catch (error) {
    await recordExportFailureSafely({
      req,
      contextId,
      format: "docx",
      error,
      metadata: {
        export_variant: "word_final",
      },
    });

    return sendError(res, error);
  }
};

const exportPdf = async (req, res) => {
  const { contextId } = req.params;

  try {
    const { buffer, filename, report } = await runWithHeavyExportGuard(() =>
      reportExportPdfService.buildPdfFromWord(contextId)
    );
    assertReportExportPolicy({ report, format: "pdf" });

    const safeFilename = filename || `Laporan_MR_Context_${contextId}.pdf`;
    const encodedFilename = encodeURIComponent(safeFilename);

    const mimeType = "application/pdf";

    await recordExportSuccessSafely({
      req,
      contextId,
      report,
      format: "pdf",
      filename: safeFilename,
      mimeType,
      fileSize: buffer.length,
      metadata: {
        export_variant: "pdf_from_docx",
        converter: "libreoffice",
      },
    });

    res.setHeader("Content-Type", mimeType);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).send(buffer);
  } catch (error) {
    await recordExportFailureSafely({
      req,
      contextId,
      format: "pdf",
      error,
      metadata: {
        export_variant: "pdf_from_docx",
        converter: "libreoffice",
      },
    });

    return sendError(res, error);
  }
};

const quickRepair = async (req, res) => {
  try {
    const contextId = Number(req.params.contextId);
    const { repairs = [] } = req.body || {};
    const results = [];
    for (const item of repairs) {
      const { risk_id, fields = {} } = item;
      if (!risk_id || !Object.keys(fields).length) continue;
      await db.MrPlanningRiskAnalysis.upsert({
        mr_planning_risk_id: risk_id,
      is_active: 1,
      is_latest: 1,
      inherent_score: fields.inherent_score ?? 6,
      inherent_level: fields.inherent_level ?? 'Sedang',
      residual_score: fields.residual_score ?? 3,
      residual_level: fields.residual_level ?? 'Rendah',
        ...fields,
        updated_by: req.user?.id || null,
        updated_at: new Date(),
      });
      try {
        await recalculateRiskMatrixForPayload({
          riskId: risk_id,
          userId: req.user?.id || null,
        });
      } catch (e) { /* kalkulasi gagal tidak batalkan repair */ }
      results.push({ risk_id, status: "repaired" });
    }
    return res.json({ success: true, context_id: contextId, repaired: results.length, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSummary,
  getLampiran,
  getFullReport,
  getIntegrityScan,
  repairDraftFromFindings,
  quickRepair,
  getExportHistory,
  exportExcel,
  exportExcelInspektorat,
  exportWord,
  exportPdf,
};
