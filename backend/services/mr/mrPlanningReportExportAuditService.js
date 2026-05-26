// backend/services/mr/mrPlanningReportExportAuditService.js

"use strict";

const db = require("../../models");

const EXPORT_STATUS = Object.freeze({
  SUCCESS: "success",
  FAILED: "failed",
});

const EXPORT_FORMAT = Object.freeze({
  EXCEL: "excel",
  DOCX: "docx",
  PDF: "pdf",
});

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

  if (["excel", "xlsx"].includes(normalized)) return EXPORT_FORMAT.EXCEL;
  if (["word", "docx"].includes(normalized)) return EXPORT_FORMAT.DOCX;
  if (normalized === "pdf") return EXPORT_FORMAT.PDF;

  return EXPORT_FORMAT.EXCEL;
};

const getReportContext = (report = {}) => report.context || {};
const getFinalRecordSummary = (report = {}) =>
  report?.official_report_contract?.final_record_summary ||
  report?.governance_contract?.official_report_contract?.final_record_summary ||
  {};

const getReportQualityGate = (report = {}) =>
  report?.report_quality_gate || report?.quality_gate || {};

const buildCanonicalExportMetadata = ({
  report = {},
  sourceEndpoint = null,
  metadata = {},
} = {}) => {
  const context = getReportContext(report);
  const summary = report?.summary || {};
  const finalRecord = getFinalRecordSummary(report);
  const qualityGate = getReportQualityGate(report);

  const cutoffDate =
    safeText(summary?.cutoff_date) ||
    safeText(context?.periode_akhir) ||
    (safeText(context?.periode_label) ? `PERIODE_LABEL:${safeText(context.periode_label)}` : null);

  const timezone =
    safeText(summary?.timezone) ||
    safeText(context?.timezone) ||
    safeText(process.env.APP_TIMEZONE) ||
    safeText(process.env.TZ) ||
    "Asia/Jayapura";

  const reportVersion =
    safeText(finalRecord?.active_version) ||
    safeText(context?.versi) ||
    safeText(context?.active_version) ||
    safeText(context?.latest_approved_version);

  return {
    official_data_source: safeText(finalRecord?.official_data_source),
    quality_gate_status:
      safeText(qualityGate?.final_report_status) || safeText(qualityGate?.status),
    cutoff_date: cutoffDate,
    timezone,
    report_version: reportVersion,
    source_endpoint: sourceEndpoint || null,
    ...metadata,
  };
};

const buildReportTitle = ({ contextId, report } = {}) => {
  const context = getReportContext(report);
  const opd = safeText(context.nama_opd, "OPD");
  const periode = safeText(context.periode_label, `Context ${contextId}`);

  return `Laporan MR ${opd} ${periode}`;
};

const buildContextFields = ({ contextId, report } = {}) => {
  const context = getReportContext(report);

  return {
    context_id: safeNumber(context.id, safeNumber(contextId)),
    periode_id: safeNumber(context.periode_id),
    tahun: safeNumber(context.tahun),
    periode_type: safeText(context.periode_type),
    periode_label: safeText(context.periode_label),
    periode_awal: context.periode_awal || null,
    periode_akhir: context.periode_akhir || null,
    renstra_id: safeNumber(context.renstra_id),
    opd_id: safeNumber(context.opd_id),
    owner_user_id: safeNumber(context.owner_user_id),
    owner_division_id: safeNumber(context.owner_division_id),
  };
};

const getModel = () => {
  const model = db.MrPlanningReportExport;

  if (!model) {
    const error = new Error(
      "Model MrPlanningReportExport tidak terdaftar di models/index.js."
    );
    error.code = "MR_REPORT_EXPORT_MODEL_NOT_REGISTERED";
    throw error;
  }

  return model;
};

const buildBasePayload = ({
  contextId,
  report,
  format,
  filename,
  mimeType,
  fileSize,
  sourceEndpoint,
  userId,
  status,
  error,
  metadata = {},
} = {}) => {
  const normalizedFormat = normalizeExportFormat(format);
  const contextFields = buildContextFields({ contextId, report });

  return {
    ...contextFields,

    report_code: `MR-REPORT-${contextFields.context_id || contextId || "NA"}`,
    report_title: truncateText(buildReportTitle({ contextId, report }), 255),
    report_type: "adhoc",
    export_format: normalizedFormat,

    file_name: truncateText(filename, 255),
    file_path: null,
    file_url: null,
    file_mime_type: truncateText(mimeType, 150),
    file_size: safeNumber(fileSize),

    storage_provider: "backend-download",
    storage_key: null,

    generate_status: status,
    generated_at: new Date(),
    generated_by: safeNumber(userId),

    error_message:
      status === EXPORT_STATUS.FAILED
        ? safeText(error?.message || error, "Export laporan MR gagal.")
        : null,

    source_system: SOURCE_SYSTEM,

    metadata_json: {
      exported_via: "backend_report_controller",
      report_context_status: report?.context?.status_revisi || null,
      report_quality_gate: report?.report_quality_gate || null,
      error_code: error?.code || null,
      error_status: error?.status || error?.statusCode || null,
      ...buildCanonicalExportMetadata({
        report,
        sourceEndpoint,
        metadata,
      }),
    },

    filter_json: {
      context_id: contextFields.context_id || safeNumber(contextId),
      export_format: normalizedFormat,
    },

    summary_json: report?.summary || null,

    created_by: safeNumber(userId),
    updated_by: safeNumber(userId),
  };
};

const recordExportSuccess = async ({
  contextId,
  report,
  format,
  filename,
  mimeType,
  fileSize,
  sourceEndpoint,
  userId,
  metadata = {},
} = {}) => {
  const Model = getModel();

  const payload = buildBasePayload({
    contextId,
    report,
    format,
    filename,
    mimeType,
    fileSize,
    sourceEndpoint,
    userId,
    status: EXPORT_STATUS.SUCCESS,
    metadata,
  });

  return Model.create(payload);
};

const recordExportFailure = async ({
  contextId,
  report,
  format,
  sourceEndpoint,
  userId,
  error,
  metadata = {},
} = {}) => {
  const Model = getModel();

  const payload = buildBasePayload({
    contextId,
    report,
    format,
    filename: null,
    mimeType: null,
    fileSize: null,
    sourceEndpoint,
    userId,
    status: EXPORT_STATUS.FAILED,
    error,
    metadata,
  });

  return Model.create(payload);
};

module.exports = {
  EXPORT_FORMAT,
  EXPORT_STATUS,
  recordExportSuccess,
  recordExportFailure,
};
