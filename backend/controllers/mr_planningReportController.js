// backend/controllers/mr_planningReportController.js

const reportQueryService = require("../services/mr/mrPlanningReportQueryService");
const reportExportExcelService = require("../services/mr/mrPlanningReportExportExcelService");
const reportExportWordService = require("../services/mr/mrPlanningReportExportWordService");
const reportExportPdfService = require("../services/mr/mrPlanningReportExportPdfService");
const reportExportAuditService = require("../services/mr/mrPlanningReportExportAuditService");
const reportExportHistoryService = require("../services/mr/mrPlanningReportExportHistoryService");
const mrIntegrityScanService = require("../services/mr/mrIntegrityScanService");
const { assertReportExportPolicy } = require("../services/mr/mrPolicyEngineService");

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

module.exports = {
  getSummary,
  getLampiran,
  getFullReport,
  getIntegrityScan,
  getExportHistory,
  exportExcel,
  exportExcelInspektorat,
  exportWord,
  exportPdf,
};


