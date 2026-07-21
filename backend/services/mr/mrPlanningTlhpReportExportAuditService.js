// backend/services/mr/mrPlanningTlhpReportExportAuditService.js

"use strict";

const db = require("../../models");

const EXPORT_STATUS = Object.freeze({ SUCCESS: "success", FAILED: "failed" });
const SOURCE_SYSTEM = "e_pelara";

const safeText = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const safeNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const truncateText = (value, maxLength = 255) => {
  const text = safeText(value, null);
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const normalizeExportFormat = (format) => {
  const normalized = String(format || "").trim().toLowerCase();
  if (["word", "docx"].includes(normalized)) return "docx";
  if (normalized === "pdf") return "pdf";
  return "docx";
};

const getModel = () => {
  const model = db.MrPlanningReportExport;

  if (!model) {
    const error = new Error("Model MrPlanningReportExport tidak terdaftar di models/index.js.");
    error.code = "MR_REPORT_EXPORT_MODEL_NOT_REGISTERED";
    throw error;
  }

  return model;
};

const buildBasePayload = ({
  scope,
  report,
  format,
  filename,
  mimeType,
  fileSize,
  sourceEndpoint,
  userId,
  status,
  error,
} = {}) => {
  const normalizedFormat = normalizeExportFormat(format);
  const namaOpd = report?.report_scope?.nama_opd || scope?.nama_opd;

  return {
    context_id: null,
    report_code: `MR-TLHP-REPORT-${scope?.tahun || "NA"}-${scope?.opd_id || "ALL"}`,
    report_title: truncateText(`Laporan Pemantauan TLHP ${namaOpd || "Seluruh OPD"} ${scope?.tahun || ""}`, 255),
    report_type: "tlhp_monitoring",
    export_format: normalizedFormat,

    tahun: safeNumber(scope?.tahun),
    opd_id: safeNumber(scope?.opd_id),

    file_name: truncateText(filename, 255),
    file_mime_type: truncateText(mimeType, 150),
    file_size: safeNumber(fileSize),

    storage_provider: "backend-download",

    generate_status: status,
    generated_at: new Date(),
    generated_by: safeNumber(userId),

    error_message: status === EXPORT_STATUS.FAILED ? safeText(error?.message || error, "Export TLHP gagal.") : null,

    source_system: SOURCE_SYSTEM,

    metadata_json: {
      exported_via: "mr_planningTlhpReportController",
      report_quality_gate: report?.report_quality_gate || null,
      report_approval_gate: report?.report_approval_gate || null,
      error_code: error?.code || null,
      error_status: error?.status || error?.statusCode || null,
      source_endpoint: sourceEndpoint || null,
    },

    filter_json: {
      tahun: safeNumber(scope?.tahun),
      opd_id: safeNumber(scope?.opd_id),
      entitas_pemeriksa_ref_id: safeNumber(scope?.entitas_pemeriksa_ref_id),
      lhp_id: safeNumber(scope?.lhp_id),
    },

    summary_json: report?.summary || null,

    created_by: safeNumber(userId),
    updated_by: safeNumber(userId),
  };
};

const recordExportSuccess = async ({ scope, report, format, filename, mimeType, fileSize, sourceEndpoint, userId } = {}) => {
  const Model = getModel();

  const payload = buildBasePayload({
    scope,
    report,
    format,
    filename,
    mimeType,
    fileSize,
    sourceEndpoint,
    userId,
    status: EXPORT_STATUS.SUCCESS,
  });

  return Model.create(payload);
};

const recordExportFailure = async ({ scope, report, format, sourceEndpoint, userId, error } = {}) => {
  const Model = getModel();

  const payload = buildBasePayload({
    scope,
    report,
    format,
    filename: null,
    mimeType: null,
    fileSize: null,
    sourceEndpoint,
    userId,
    status: EXPORT_STATUS.FAILED,
    error,
  });

  return Model.create(payload);
};

module.exports = {
  EXPORT_STATUS,
  recordExportSuccess,
  recordExportFailure,
};
