// backend/services/mr/mrPlanningReportExportHistoryService.js

"use strict";

const db = require("../../models");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const normalizeNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizePage = (value) => {
  const page = normalizeNumber(value, 1);
  return page > 0 ? page : 1;
};

const normalizeLimit = (value) => {
  const limit = normalizeNumber(value, DEFAULT_LIMIT);

  if (!limit || limit < 1) return DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) return MAX_LIMIT;

  return limit;
};

const normalizeFormat = (value) => {
  const format = String(value || "").trim().toLowerCase();

  if (!format) return null;
  if (["word", "docx"].includes(format)) return "docx";
  if (["excel", "xlsx"].includes(format)) return "excel";
  if (format === "pdf") return "pdf";
  if (["json", "html"].includes(format)) return format;

  return null;
};

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();

  if (!status) return null;
  if (
    [
      "pending",
      "processing",
      "success",
      "failed",
      "cancelled",
      "expired",
    ].includes(status)
  ) {
    return status;
  }

  return null;
};

const getExportModel = () => {
  const model = db.MrPlanningReportExport;

  if (!model) {
    const error = new Error(
      "Model MrPlanningReportExport tidak terdaftar di models/index.js."
    );
    error.status = 500;
    error.statusCode = 500;
    error.code = "MR_REPORT_EXPORT_MODEL_NOT_REGISTERED";
    return error;
  }

  return model;
};

const buildWhere = ({ contextId, query = {} }) => {
  const parsedContextId = normalizeNumber(contextId);

  if (!parsedContextId) {
    const error = new Error("Context laporan MR tidak valid.");
    error.status = 400;
    error.statusCode = 400;
    error.code = "MR_REPORT_EXPORT_CONTEXT_INVALID";
    throw error;
  }

  const where = {
    context_id: parsedContextId,
  };

  const format = normalizeFormat(query.format || query.export_format);
  const status = normalizeStatus(query.status || query.generate_status);

  if (format) {
    where.export_format = format;
  }

  if (status) {
    where.generate_status = status;
  }

  return where;
};

const mapExportRow = (row) => {
  const item = row?.toJSON ? row.toJSON() : row;

  return {
    id: item.id,
    context_id: item.context_id,
    report_title: item.report_title,
    report_type: item.report_type,
    export_format: item.export_format,
    file_name: item.file_name,
    file_mime_type: item.file_mime_type,
    file_size: item.file_size,
    generate_status: item.generate_status,
    generated_by: item.generated_by,
    generated_at: item.generated_at,
    source_system: item.source_system,
    error_message: item.error_message,
    metadata: {
      source_endpoint: item.metadata_json?.source_endpoint || null,
      export_variant: item.metadata_json?.export_variant || null,
      exported_via: item.metadata_json?.exported_via || null,
      report_context_status: item.metadata_json?.report_context_status || null,
      error_code: item.metadata_json?.error_code || null,
      error_status: item.metadata_json?.error_status || null,
    },
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

const getExportHistoryByContext = async (contextId, query = {}) => {
  const Model = getExportModel();

  if (Model instanceof Error) {
    throw Model;
  }

  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const offset = (page - 1) * limit;

  const where = buildWhere({ contextId, query });

  const result = await Model.findAndCountAll({
    where,
    attributes: [
      "id",
      "context_id",
      "report_title",
      "report_type",
      "export_format",
      "file_name",
      "file_mime_type",
      "file_size",
      "generate_status",
      "generated_by",
      "generated_at",
      "source_system",
      "error_message",
      "metadata_json",
      "created_at",
      "updated_at",
    ],
    order: [
      ["generated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit,
    offset,
  });

  const rows = result.rows.map(mapExportRow);

  return {
    rows,
    meta: {
      context_id: normalizeNumber(contextId),
      page,
      limit,
      total: result.count,
      total_pages: Math.ceil(result.count / limit),
      filters: {
        format: normalizeFormat(query.format || query.export_format),
        status: normalizeStatus(query.status || query.generate_status),
      },
    },
  };
};

module.exports = {
  getExportHistoryByContext,
};