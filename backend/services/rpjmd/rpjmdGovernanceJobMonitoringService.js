"use strict";

const { RpjmdSyncJob, RpjmdSyncJobItem, RpjmdSyncAuditLog, Sequelize } = require("../../models");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_MODES = new Set(["scan", "preview", "execute", "resolve_map"]);
const VALID_STATUSES = new Set([
  "draft",
  "running",
  "completed",
  "failed",
  "cancelled",
  "blocked",
]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function normalizeBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  return null;
}

function safeJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { value: String(value) };
  }
}

function getSafeErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
}

function parseDateOrNull(value) {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeMonitoringQuery(query) {
  const source = query && typeof query === "object" ? query : {};
  return {
    target_module: normalizeText(source.target_module)?.toUpperCase() || VALID_TARGET_MODULE,
    rpjmd_id: safeNumber(source.rpjmd_id),
    renstra_id: safeNumber(source.renstra_id),
    mode: normalizeText(source.mode)?.toLowerCase() || null,
    status: normalizeText(source.status)?.toLowerCase() || null,
    scope: normalizeText(source.scope) || null,
    requested_by: safeNumber(source.requested_by),
    date_from: parseDateOrNull(source.date_from),
    date_to: parseDateOrNull(source.date_to),
    page: safeNumber(source.page) || 1,
    limit: safeNumber(source.limit) || DEFAULT_LIMIT,
    classification: normalizeText(source.classification)?.toLowerCase() || null,
    severity: normalizeText(source.severity)?.toLowerCase() || null,
    is_blocking: normalizeBoolean(source.is_blocking),
    stage: normalizeText(source.stage)?.toLowerCase() || null,
    action: normalizeText(source.action)?.toLowerCase() || null,
    event_type: normalizeText(source.event_type)?.toLowerCase() || null,
    actor_user_id: safeNumber(source.actor_user_id),
    jobId: safeNumber(source.jobId || source.job_id),
  };
}

function validateTargetModule(targetModule) {
  return normalizeText(targetModule)?.toUpperCase() === VALID_TARGET_MODULE;
}

function validateJobListQuery(query) {
  const normalized = normalizeMonitoringQuery(query);
  const errors = [];

  if (!validateTargetModule(normalized.target_module)) {
    errors.push({
      field: "target_module",
      message: "target_module hanya RENSTRA pada phase ini.",
    });
  }

  if (!normalized.page || normalized.page <= 0) {
    errors.push({
      field: "page",
      message: "page harus angka positif.",
    });
  }

  if (!normalized.limit || normalized.limit <= 0) {
    errors.push({
      field: "limit",
      message: "limit harus angka positif.",
    });
  }

  if (normalized.mode && !VALID_MODES.has(normalized.mode)) {
    errors.push({
      field: "mode",
      message: "mode tidak valid.",
    });
  }

  if (normalized.status && !VALID_STATUSES.has(normalized.status)) {
    errors.push({
      field: "status",
      message: "status tidak valid.",
    });
  }

  if (normalized.date_from && normalized.date_to && normalized.date_from > normalized.date_to) {
    errors.push({
      field: "date_to",
      message: "date_to tidak boleh lebih kecil dari date_from.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_JOB_MONITORING_VALIDATION_ERROR",
      message: "Validasi query monitoring job gagal.",
      errors,
    };
  }

  normalized.limit = Math.min(normalized.limit, MAX_LIMIT);

  return {
    success: true,
    data: normalized,
  };
}

function validateJobDetailQuery(query) {
  const normalized = normalizeMonitoringQuery(query);
  const errors = [];

  if (!normalized.jobId || normalized.jobId <= 0) {
    errors.push({
      field: "jobId",
      message: "jobId wajib diisi dan harus angka positif.",
    });
  }

  if (!validateTargetModule(normalized.target_module)) {
    errors.push({
      field: "target_module",
      message: "target_module hanya RENSTRA pada phase ini.",
    });
  }

  if (normalized.page && normalized.page < 0) {
    errors.push({
      field: "page",
      message: "page tidak valid.",
    });
  }

  if (normalized.limit && normalized.limit < 0) {
    errors.push({
      field: "limit",
      message: "limit tidak valid.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_JOB_MONITORING_VALIDATION_ERROR",
      message: "Validasi job detail gagal.",
      errors,
    };
  }

  normalized.limit = Math.min(normalized.limit, MAX_LIMIT);

  return {
    success: true,
    data: normalized,
  };
}

function buildJobWhereClause(filters) {
  const where = {
    target_module: VALID_TARGET_MODULE,
  };

  if (filters?.rpjmd_id) {
    where.rpjmd_id = filters.rpjmd_id;
  }

  if (filters?.renstra_id) {
    where.renstra_id = filters.renstra_id;
  }

  if (filters?.mode) {
    where.mode = filters.mode;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.scope) {
    where.scope = filters.scope;
  }

  if (filters?.requested_by) {
    where.requested_by = filters.requested_by;
  }

  if (filters?.date_from || filters?.date_to) {
    where.created_at = {};
    if (filters.date_from) {
      where.created_at[Sequelize.Op.gte] = filters.date_from;
    }
    if (filters.date_to) {
      where.created_at[Sequelize.Op.lte] = filters.date_to;
    }
  }

  return where;
}

function buildPagination(page, limit, totalRows) {
  const safePage = page && page > 0 ? Math.trunc(page) : 1;
  const safeLimit = limit && limit > 0 ? Math.trunc(limit) : DEFAULT_LIMIT;
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / safeLimit) : 0;

  return {
    page: safePage,
    limit: safeLimit,
    total_rows: totalRows,
    total_pages: totalPages,
  };
}

function normalizeJobRow(row) {
  return {
    id: row?.id || null,
    job_code: normalizeText(row?.job_code) || null,
    rpjmd_id: safeNumber(row?.rpjmd_id),
    renstra_id: safeNumber(row?.renstra_id),
    target_module: normalizeText(row?.target_module)?.toUpperCase() || null,
    scope: normalizeText(row?.scope) || null,
    mode: normalizeText(row?.mode) || null,
    status: normalizeText(row?.status) || null,
    requested_by: safeNumber(row?.requested_by),
    confirmed_by: safeNumber(row?.confirmed_by),
    reason: normalizeText(row?.reason) || null,
    summary_json: safeJson(row?.summary_json),
    error_message: normalizeText(row?.error_message) || null,
    started_at: row?.started_at || null,
    finished_at: row?.finished_at || null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  };
}

function normalizeJobItemRow(row) {
  return {
    id: row?.id || null,
    job_id: safeNumber(row?.job_id),
    stage: normalizeText(row?.stage) || null,
    source_table: normalizeText(row?.source_table) || null,
    source_ref_id: safeNumber(row?.source_ref_id),
    source_code: normalizeText(row?.source_code) || null,
    source_name: normalizeText(row?.source_name) || null,
    target_table: normalizeText(row?.target_table) || null,
    target_ref_id: safeNumber(row?.target_ref_id),
    target_code: normalizeText(row?.target_code) || null,
    target_name: normalizeText(row?.target_name) || null,
    action: normalizeText(row?.action) || null,
    classification: normalizeText(row?.classification) || null,
    severity: normalizeText(row?.severity) || null,
    is_blocking: Boolean(row?.is_blocking),
    before_json: safeJson(row?.before_json),
    after_json: safeJson(row?.after_json),
    diff_json: safeJson(row?.diff_json),
    message: normalizeText(row?.message) || null,
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null,
  };
}

function normalizeAuditLogRow(row) {
  return {
    id: row?.id || null,
    job_id: safeNumber(row?.job_id),
    actor_user_id: safeNumber(row?.actor_user_id),
    actor_role: normalizeText(row?.actor_role) || null,
    event_type: normalizeText(row?.event_type) || null,
    target_module: normalizeText(row?.target_module)?.toUpperCase() || null,
    rpjmd_id: safeNumber(row?.rpjmd_id),
    renstra_id: safeNumber(row?.renstra_id),
    payload_json: safeJson(row?.payload_json),
    result_json: safeJson(row?.result_json),
    ip_address: normalizeText(row?.ip_address) || null,
    user_agent: normalizeText(row?.user_agent) || null,
    created_at: row?.created_at || null,
  };
}

function buildJobMonitoringSummary(rows) {
  const items = Array.isArray(rows) ? rows : [];
  const statusCounts = {};
  const modeCounts = {};
  let totalJobs = 0;

  items.forEach((row) => {
    const status = normalizeText(row?.status) || "unknown";
    const mode = normalizeText(row?.mode) || "unknown";
    const total = safeNumber(row?.total) || 0;

    totalJobs += total;
    statusCounts[status] = (statusCounts[status] || 0) + total;
    modeCounts[mode] = (modeCounts[mode] || 0) + total;
  });

  return {
    total_jobs: totalJobs,
    completed: statusCounts.completed || 0,
    blocked: statusCounts.blocked || 0,
    failed: statusCounts.failed || 0,
    preview: modeCounts.preview || 0,
    execute: modeCounts.execute || 0,
    status_counts: statusCounts,
    mode_counts: modeCounts,
  };
}

function buildItemSummary(rows) {
  const items = Array.isArray(rows) ? rows : [];
  const classificationCounts = {};
  const severityCounts = {};
  const actionCounts = {};
  let totalBlocking = 0;

  items.forEach((row) => {
    const classification = normalizeText(row?.classification) || "unknown";
    const severity = normalizeText(row?.severity) || "unknown";
    const action = normalizeText(row?.action) || "unknown";

    classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    actionCounts[action] = (actionCounts[action] || 0) + 1;

    if (row?.is_blocking) {
      totalBlocking += 1;
    }
  });

  return {
    total_items: items.length,
    total_blocking: totalBlocking,
    classification_counts: classificationCounts,
    severity_counts: severityCounts,
    action_counts: actionCounts,
  };
}

function buildAuditSummary(rows) {
  const items = Array.isArray(rows) ? rows : [];
  const eventCounts = {};
  const roleCounts = {};

  items.forEach((row) => {
    const eventType = normalizeText(row?.event_type) || "unknown";
    const role = normalizeText(row?.actor_role) || "unknown";
    eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  return {
    total_logs: items.length,
    event_counts: eventCounts,
    role_counts: roleCounts,
  };
}

function ensureJobScope(job, filters) {
  if (!job) {
    return false;
  }

  if (filters?.target_module && normalizeText(job.target_module)?.toUpperCase() !== filters.target_module) {
    return false;
  }

  if (filters?.renstra_id && safeNumber(job.renstra_id) !== filters.renstra_id) {
    return false;
  }

  if (filters?.rpjmd_id && safeNumber(job.rpjmd_id) !== filters.rpjmd_id) {
    return false;
  }

  return true;
}

async function findScopedJob(jobId, filters) {
  const where = {
    id: jobId,
    target_module: VALID_TARGET_MODULE,
  };

  if (filters?.renstra_id) {
    where.renstra_id = filters.renstra_id;
  }

  if (filters?.rpjmd_id) {
    where.rpjmd_id = filters.rpjmd_id;
  }

  const job = await RpjmdSyncJob.findOne({
    where,
    raw: true,
  });

  if (!ensureJobScope(job, filters)) {
    return null;
  }

  return job;
}

async function listGovernanceJobs(params) {
  const normalized = validateJobListQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  const filters = normalized.data;

  try {
    const where = buildJobWhereClause(filters);
    const totalRows = await RpjmdSyncJob.count({ where });
    const grouped = await RpjmdSyncJob.findAll({
      attributes: [
        "status",
        "mode",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "total"],
      ],
      where,
      group: ["status", "mode"],
      raw: true,
    });
    const rows = await RpjmdSyncJob.findAll({
      where,
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      offset: (filters.page - 1) * filters.limit,
      limit: filters.limit,
      raw: true,
    });

    return {
      success: true,
      data: {
        filters: {
          target_module: filters.target_module,
          rpjmd_id: filters.rpjmd_id,
          renstra_id: filters.renstra_id,
          mode: filters.mode,
          status: filters.status,
        },
        pagination: buildPagination(filters.page, filters.limit, totalRows),
        summary: buildJobMonitoringSummary(grouped),
        rows: rows.map(normalizeJobRow),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_JOB_MONITORING_FAILED",
      message: getSafeErrorMessage(error, "Daftar job Governance Hub gagal diambil."),
    };
  }
}

async function getGovernanceJobDetail(params) {
  const normalized = validateJobDetailQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  const filters = normalized.data;

  try {
    const job = await findScopedJob(filters.jobId, filters);
    if (!job) {
      return {
        success: false,
        code: "RPJMD_JOB_NOT_FOUND",
        message: "Job Governance Hub tidak ditemukan.",
      };
    }

    const items = await RpjmdSyncJobItem.findAll({
      where: {
        job_id: job.id,
      },
      order: [
        ["created_at", "ASC"],
        ["id", "ASC"],
      ],
      raw: true,
    });

    const auditLogs = await RpjmdSyncAuditLog.findAll({
      where: {
        job_id: job.id,
      },
      order: [["created_at", "ASC"]],
      raw: true,
    });

    return {
      success: true,
      data: {
        job: normalizeJobRow(job),
        items_summary: buildItemSummary(items),
        audit_summary: buildAuditSummary(auditLogs),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_JOB_MONITORING_FAILED",
      message: getSafeErrorMessage(error, "Detail job Governance Hub gagal diambil."),
    };
  }
}

async function listGovernanceJobItems(params) {
  const normalized = validateJobDetailQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  const filters = normalized.data;
  const page = filters.page || 1;
  const limit = filters.limit || DEFAULT_LIMIT;

  try {
    const job = await findScopedJob(filters.jobId, filters);
    if (!job) {
      return {
        success: false,
        code: "RPJMD_JOB_NOT_FOUND",
        message: "Job Governance Hub tidak ditemukan.",
      };
    }

    const itemFilters = normalizeMonitoringQuery(params);
    const where = {
      job_id: job.id,
    };

    if (itemFilters.classification) {
      where.classification = itemFilters.classification;
    }

    if (itemFilters.severity) {
      where.severity = itemFilters.severity;
    }

    if (itemFilters.is_blocking !== null) {
      where.is_blocking = itemFilters.is_blocking;
    }

    if (itemFilters.stage) {
      where.stage = itemFilters.stage;
    }

    if (itemFilters.action) {
      where.action = itemFilters.action;
    }

    const totalRows = await RpjmdSyncJobItem.count({ where });
    const rows = await RpjmdSyncJobItem.findAll({
      where,
      order: [
        ["created_at", "ASC"],
        ["id", "ASC"],
      ],
      offset: (page - 1) * limit,
      limit,
      raw: true,
    });

    return {
      success: true,
      data: {
        filters: {
          jobId: job.id,
          classification: itemFilters.classification,
          severity: itemFilters.severity,
          is_blocking: itemFilters.is_blocking,
          stage: itemFilters.stage,
          action: itemFilters.action,
        },
        pagination: buildPagination(page, limit, totalRows),
        summary: buildItemSummary(rows),
        rows: rows.map(normalizeJobItemRow),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_JOB_ITEMS_FAILED",
      message: getSafeErrorMessage(error, "Job items Governance Hub gagal diambil."),
    };
  }
}

async function listGovernanceJobAuditLogs(params) {
  const normalized = validateJobDetailQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  const filters = normalized.data;
  const page = filters.page || 1;
  const limit = filters.limit || DEFAULT_LIMIT;

  try {
    const job = await findScopedJob(filters.jobId, filters);
    if (!job) {
      return {
        success: false,
        code: "RPJMD_JOB_NOT_FOUND",
        message: "Job Governance Hub tidak ditemukan.",
      };
    }

    const auditFilters = normalizeMonitoringQuery(params);
    const where = {
      job_id: job.id,
    };

    if (auditFilters.event_type) {
      where.event_type = auditFilters.event_type;
    }

    if (auditFilters.actor_user_id) {
      where.actor_user_id = auditFilters.actor_user_id;
    }

    const totalRows = await RpjmdSyncAuditLog.count({ where });
    const rows = await RpjmdSyncAuditLog.findAll({
      where,
      order: [["created_at", "ASC"]],
      offset: (page - 1) * limit,
      limit,
      raw: true,
    });

    return {
      success: true,
      data: {
        filters: {
          jobId: job.id,
          event_type: auditFilters.event_type,
          actor_user_id: auditFilters.actor_user_id,
        },
        pagination: buildPagination(page, limit, totalRows),
        summary: buildAuditSummary(rows),
        rows: rows.map(normalizeAuditLogRow),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_JOB_AUDIT_LOGS_FAILED",
      message: getSafeErrorMessage(error, "Audit logs Governance Hub gagal diambil."),
    };
  }
}

module.exports = {
  listGovernanceJobs,
  getGovernanceJobDetail,
  listGovernanceJobItems,
  listGovernanceJobAuditLogs,
  validateJobListQuery,
  validateJobDetailQuery,
  buildJobMonitoringSummary,
};
