// backend/services/mr/mrPlanningTlhpReportExportHistoryService.js

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

const getExportModel = () => {
  const model = db.MrPlanningReportExport;

  if (!model) {
    const error = new Error("Model MrPlanningReportExport tidak terdaftar di models/index.js.");
    error.status = 500;
    error.statusCode = 500;
    error.code = "MR_REPORT_EXPORT_MODEL_NOT_REGISTERED";
    throw error;
  }

  return model;
};

const mapExportRow = (row) => {
  const item = row?.toJSON ? row.toJSON() : row;

  return {
    id: item.id,
    tahun: item.tahun,
    opd_id: item.opd_id,
    report_title: item.report_title,
    report_type: item.report_type,
    export_format: item.export_format,
    file_name: item.file_name,
    file_mime_type: item.file_mime_type,
    file_size: item.file_size,
    generate_status: item.generate_status,
    generated_by: item.generated_by,
    generated_at: item.generated_at,
    error_message: item.error_message,
    created_at: item.created_at,
  };
};

const getExportHistoryByScope = async ({ tahun, opd_id, page, limit } = {}) => {
  const Model = getExportModel();

  if (!tahun) {
    const error = new Error("Parameter tahun wajib diisi.");
    error.status = 400;
    error.code = "MR_TLHP_REPORT_TAHUN_REQUIRED";
    throw error;
  }

  const pageNumber = normalizePage(page);
  const limitNumber = normalizeLimit(limit);
  const offset = (pageNumber - 1) * limitNumber;

  const where = { report_type: "tlhp_monitoring", tahun: Number(tahun) };
  if (opd_id) where.opd_id = Number(opd_id);

  const result = await Model.findAndCountAll({
    where,
    order: [
      ["generated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: limitNumber,
    offset,
  });

  return {
    rows: result.rows.map(mapExportRow),
    meta: {
      tahun: Number(tahun),
      opd_id: opd_id ? Number(opd_id) : null,
      page: pageNumber,
      limit: limitNumber,
      total: result.count,
      total_pages: Math.ceil(result.count / limitNumber),
    },
  };
};

module.exports = {
  getExportHistoryByScope,
};
