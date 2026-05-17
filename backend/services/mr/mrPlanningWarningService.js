// backend/services/mr/mrPlanningWarningService.js
"use strict";

/**
 * MR Planning Warning Service
 * ---------------------------------------------------------------------------
 * PHASE 4 — STEP 16D
 *
 * Guard:
 * - Warning melekat pada MR Planning Risk.
 * - Warning bisa melekat pada Mitigation, Monitoring, Snapshot, atau source_table/source_id.
 * - context_id diturunkan dari risk/monitoring/mitigation.
 * - owner_user_id dan owner_division_id diturunkan dari risk/mitigation/monitoring/context.
 * - Field teknis/ownership/audit/read/resolve/calculated tidak boleh dikirim frontend.
 * - severity_ref_id wajib berasal dari WARNING_SEVERITY jika dikirim.
 * - warning_level bisa diturunkan dari severity_ref_id atau dikirim sebagai enum valid.
 * - read/resolve hanya lewat function khusus, bukan update draft biasa.
 * - source_table + source_id dipakai untuk link fleksibel ke deviation/snapshot/cross-system.
 */

const {
  sequelize,
  MrPlanningRisk,
  MrPlanningWarning,
  MrPlanningMitigation,
  MrPlanningMonitoring,
  MrPlanningContext,
  MrPlanningSnapshot,
  MrReferenceItem,
  MrReferenceGroup,
} = require("../../models");

const ERROR_CODE = "MR_WARNING_VALIDATION_ERROR";

const VALID_PERIODE_TYPES = Object.freeze([
  "bulanan",
  "triwulan",
  "semester",
  "tahunan",
  "adhoc",
]);

const VALID_WARNING_TYPES = Object.freeze([
  "risk_level",
  "deviation",
  "overdue",
  "approval_pending",
  "mitigation_pending",
  "monitoring_pending",
  "broken_chain",
  "duplicate_data",
  "cross_system",
  "risk_above_appetite",
  "mitigation_overdue",
  "monitoring_overdue",
  "risk_event_occurred",
  "control_not_effective",
  "approval_delay",
  "snapshot_generation_failed",
  "deviation_high",
  "evaluation_overdue",
  "system_sync_failed",
]);

const VALID_WARNING_LEVELS = Object.freeze([
  "low",
  "medium",
  "high",
  "critical",
]);

const VALID_SOURCE_TABLES = Object.freeze([
  "mr_planning_risk",
  "mr_planning_mitigation",
  "mr_planning_monitoring",
  "mr_planning_deviation",
  "mr_planning_snapshot",
  "mr_planning_dashboard_summary",
  "mr_cross_system_link",
  "system",
]);

const WARNING_ALLOWED_FIELDS = Object.freeze([
  "mr_planning_mitigation_id",
  "mr_planning_monitoring_id",
  "related_snapshot_id",

  "periode_type",
  "periode_label",

  "warning_code",
  "warning_type",
  "warning_level",
  "warning_message",
  "warning_source",
  "severity_ref_id",
  "due_date",

  "source_table",
  "source_id",
]);

const WARNING_BLOCKED_FIELDS = Object.freeze([
  "id",
  "mr_planning_risk_id",
  "context_id",
  "tahun",

  "days_overdue",
  "warning_status",

  "is_read",
  "read_by",
  "read_at",

  "is_resolved",
  "resolved_by",
  "resolved_at",
  "resolution_note",

  "owner_user_id",
  "owner_division_id",

  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]);

const createValidationError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const createNotFoundError = (message, details = {}) => {
  const error = new Error(message);
  error.statusCode = 404;
  error.blocked = true;
  error.audit_mode = false;
  error.code = ERROR_CODE;
  error.details = details;
  return error;
};

const toPlain = (record) => {
  if (!record) return null;
  if (typeof record.get === "function") return record.get({ plain: true });
  return record;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (Number(value) === 1) return true;
  if (Number(value) === 0) return false;
  if (String(value).toLowerCase() === "true") return true;
  if (String(value).toLowerCase() === "false") return false;
  return defaultValue;
};

const normalizeInteger = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw createValidationError("Nilai integer tidak valid.", {
      value,
    });
  }

  return parsed;
};

const assertAllowedFields = (body = {}) => {
  const fields = Object.keys(body || {});

  const blocked = fields.filter((field) => WARNING_BLOCKED_FIELDS.includes(field));

  const unknown = fields.filter(
    (field) =>
      !WARNING_ALLOWED_FIELDS.includes(field) &&
      !WARNING_BLOCKED_FIELDS.includes(field)
  );

  if (blocked.length > 0) {
    throw createValidationError("Field tidak diperbolehkan.", {
      fields: blocked,
    });
  }

  if (unknown.length > 0) {
    throw createValidationError("Field tidak dikenal.", {
      fields: unknown,
    });
  }
};

const pickAllowedFields = (body = {}) => {
  return WARNING_ALLOWED_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }

    return payload;
  }, {});
};

const requireBusinessFieldsForCreate = (payload = {}) => {
  const missing = [];

  if (!payload.warning_type) missing.push("warning_type");
  if (!payload.warning_message) missing.push("warning_message");

  if (missing.length > 0) {
    throw createValidationError("Field wajib belum lengkap.", {
      fields: missing,
    });
  }
};

const normalizeWarningPayload = (payload = {}) => {
  const normalized = { ...payload };

  if (
    normalized.periode_type &&
    !VALID_PERIODE_TYPES.includes(normalized.periode_type)
  ) {
    throw createValidationError("periode_type tidak valid.", {
      periode_type: normalized.periode_type,
      allowed: VALID_PERIODE_TYPES,
    });
  }

  if (
    normalized.warning_type &&
    !VALID_WARNING_TYPES.includes(normalized.warning_type)
  ) {
    throw createValidationError("warning_type tidak valid.", {
      warning_type: normalized.warning_type,
      allowed: VALID_WARNING_TYPES,
    });
  }

  if (
    normalized.warning_level &&
    !VALID_WARNING_LEVELS.includes(normalized.warning_level)
  ) {
    throw createValidationError("warning_level tidak valid.", {
      warning_level: normalized.warning_level,
      allowed: VALID_WARNING_LEVELS,
    });
  }

  if (
    normalized.source_table &&
    !VALID_SOURCE_TABLES.includes(normalized.source_table)
  ) {
    throw createValidationError("source_table tidak valid.", {
      source_table: normalized.source_table,
      allowed: VALID_SOURCE_TABLES,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "source_id") &&
    normalized.source_id !== null &&
    normalized.source_id !== undefined &&
    normalized.source_id !== ""
  ) {
    normalized.source_id = normalizeInteger(normalized.source_id);
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "mr_planning_mitigation_id") &&
    normalized.mr_planning_mitigation_id !== null &&
    normalized.mr_planning_mitigation_id !== undefined &&
    normalized.mr_planning_mitigation_id !== ""
  ) {
    normalized.mr_planning_mitigation_id = normalizeInteger(
      normalized.mr_planning_mitigation_id
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "mr_planning_monitoring_id") &&
    normalized.mr_planning_monitoring_id !== null &&
    normalized.mr_planning_monitoring_id !== undefined &&
    normalized.mr_planning_monitoring_id !== ""
  ) {
    normalized.mr_planning_monitoring_id = normalizeInteger(
      normalized.mr_planning_monitoring_id
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(normalized, "related_snapshot_id") &&
    normalized.related_snapshot_id !== null &&
    normalized.related_snapshot_id !== undefined &&
    normalized.related_snapshot_id !== ""
  ) {
    normalized.related_snapshot_id = normalizeInteger(normalized.related_snapshot_id);
  }

  return normalized;
};

const buildDaysOverdue = (dueDate) => {
  if (!dueDate) return 0;

  const due = new Date(dueDate);
  const now = new Date();

  if (Number.isNaN(due.getTime())) {
    throw createValidationError("due_date tidak valid.", {
      due_date: dueDate,
    });
  }

  if (due >= now) return 0;

  const diffMs = now.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const getRiskWithContext = async (riskId, transaction = null) => {
  const risk = await MrPlanningRisk.findByPk(riskId, {
    transaction,
    include: [
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!risk) {
    throw createNotFoundError("MR Planning Risk tidak ditemukan.", {
      mr_planning_risk_id: riskId,
    });
  }

  return risk;
};

const getMonitoringWithRisk = async (monitoringId, transaction = null) => {
  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    transaction,
    include: [
      {
        model: MrPlanningRisk,
        as: "risk",
        required: false,
        include: [
          {
            model: MrPlanningContext,
            as: "context",
            required: false,
          },
        ],
      },
      {
        model: MrPlanningMitigation,
        as: "mitigation",
        required: false,
      },
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!monitoring) {
    throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
      mr_planning_monitoring_id: monitoringId,
    });
  }

  return monitoring;
};

const getMitigationWithRisk = async (mitigationId, transaction = null) => {
  const mitigation = await MrPlanningMitigation.findByPk(mitigationId, {
    transaction,
    include: [
      {
        model: MrPlanningRisk,
        as: "risk",
        required: false,
        include: [
          {
            model: MrPlanningContext,
            as: "context",
            required: false,
          },
        ],
      },
      {
        model: MrPlanningContext,
        as: "context",
        required: false,
      },
    ],
  });

  if (!mitigation) {
    throw createNotFoundError("MR Planning Mitigation tidak ditemukan.", {
      mr_planning_mitigation_id: mitigationId,
    });
  }

  return mitigation;
};

const ensureMitigationBelongsToRisk = async ({
  mitigationId,
  riskId,
  transaction = null,
}) => {
  if (!mitigationId) return null;

  const mitigation = await MrPlanningMitigation.findByPk(mitigationId, {
    transaction,
  });

  if (!mitigation) {
    throw createNotFoundError("MR Planning Mitigation tidak ditemukan.", {
      mr_planning_mitigation_id: mitigationId,
    });
  }

  if (Number(mitigation.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Mitigation tidak sesuai dengan risk.", {
      mr_planning_mitigation_id: mitigationId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(mitigation.mr_planning_risk_id),
    });
  }

  return mitigation;
};

const ensureMonitoringBelongsToRisk = async ({
  monitoringId,
  riskId,
  transaction = null,
}) => {
  if (!monitoringId) return null;

  const monitoring = await MrPlanningMonitoring.findByPk(monitoringId, {
    transaction,
  });

  if (!monitoring) {
    throw createNotFoundError("MR Planning Monitoring tidak ditemukan.", {
      mr_planning_monitoring_id: monitoringId,
    });
  }

  if (Number(monitoring.mr_planning_risk_id) !== Number(riskId)) {
    throw createValidationError("MR Planning Monitoring tidak sesuai dengan risk.", {
      mr_planning_monitoring_id: monitoringId,
      expected_mr_planning_risk_id: Number(riskId),
      actual_mr_planning_risk_id: Number(monitoring.mr_planning_risk_id),
    });
  }

  return monitoring;
};

const ensureSnapshotBelongsToContext = async ({
  snapshotId,
  contextId,
  transaction = null,
}) => {
  if (!snapshotId) return null;

  const snapshot = await MrPlanningSnapshot.findByPk(snapshotId, {
    transaction,
  });

  if (!snapshot) {
    throw createNotFoundError("MR Planning Snapshot tidak ditemukan.", {
      related_snapshot_id: snapshotId,
    });
  }

  if (
    contextId &&
    snapshot.context_id &&
    Number(snapshot.context_id) !== Number(contextId)
  ) {
    throw createValidationError("MR Planning Snapshot tidak sesuai dengan context.", {
      related_snapshot_id: snapshotId,
      expected_context_id: Number(contextId),
      actual_context_id: Number(snapshot.context_id),
    });
  }

  return snapshot;
};

const getReferenceItemWithGroup = async ({
  refId,
  field,
  expectedGroups,
  required = false,
  transaction = null,
}) => {
  if (!refId) {
    if (required) {
      throw createValidationError("Reference wajib diisi.", {
        field,
      });
    }

    return null;
  }

  const item = await MrReferenceItem.findByPk(refId, {
    transaction,
    include: [
      {
        model: MrReferenceGroup,
        as: "group",
        required: true,
      },
    ],
  });

  if (!item) {
    throw createNotFoundError("Reference item tidak ditemukan.", {
      field,
      reference_id: refId,
    });
  }

  const plain = toPlain(item);
  const kodeGroup = plain?.group?.kode_group;

  if (!expectedGroups.includes(kodeGroup)) {
    throw createValidationError("Reference item tidak sesuai group yang diizinkan.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
      expected_groups: expectedGroups,
    });
  }

  if (plain.is_active === false || Number(plain.is_active) === 0) {
    throw createValidationError("Reference item tidak aktif.", {
      field,
      reference_id: refId,
      kode_group: kodeGroup,
    });
  }

  return plain;
};

const resolveWarningSeverity = async ({ payload, transaction = null }) => {
  const result = { ...payload };

  const severity = await getReferenceItemWithGroup({
    refId: payload.severity_ref_id,
    field: "severity_ref_id",
    expectedGroups: ["WARNING_SEVERITY"],
    transaction,
  });

  if (!severity) {
    return {
      ...result,
      warning_level: result.warning_level || "low",
    };
  }

  const candidateLevel = String(
    severity.nilai_text || severity.kode_item || severity.nama_item || ""
  )
    .trim()
    .toLowerCase();

  if (VALID_WARNING_LEVELS.includes(candidateLevel)) {
    result.warning_level = candidateLevel;
  }

  if (!result.warning_level) {
    result.warning_level = "low";
  }

  return result;
};

const buildWarningCode = ({ riskId, warningType }) => {
  const timestamp = Date.now();
  const safeType = String(warningType || "warning")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  return `MR-WARN-${riskId}-${safeType}-${timestamp}`;
};

const buildSystemFieldsFromRisk = ({
  risk,
  mitigation = null,
  monitoring = null,
  userId,
}) => {
  const plainRisk = toPlain(risk);
  const plainMitigation = toPlain(mitigation);
  const plainMonitoring = toPlain(monitoring);
  const context =
    plainRisk?.context || plainMonitoring?.context || plainMitigation?.context || null;

  return {
    context_id:
      plainMonitoring?.context_id ||
      plainMitigation?.context_id ||
      plainRisk?.context_id ||
      context?.id ||
      null,

    tahun:
      plainMonitoring?.tahun ||
      plainRisk?.tahun ||
      context?.tahun ||
      null,

    periode_type:
      plainMonitoring?.periode_type ||
      context?.periode_type ||
      null,

    periode_label:
      plainMonitoring?.periode_label ||
      context?.periode_label ||
      null,

    owner_user_id:
      plainMonitoring?.owner_user_id ||
      plainMitigation?.owner_user_id ||
      plainRisk?.owner_user_id ||
      context?.owner_user_id ||
      userId ||
      null,

    owner_division_id:
      plainMonitoring?.owner_division_id ||
      plainMitigation?.owner_division_id ||
      plainRisk?.owner_division_id ||
      context?.owner_division_id ||
      null,
  };
};

const buildCreatePayload = async ({
  risk,
  body,
  userId,
  defaultSourceTable = null,
  defaultSourceId = null,
  transaction = null,
}) => {
  assertAllowedFields(body);

  let payload = pickAllowedFields(body);
  requireBusinessFieldsForCreate(payload);
  payload = normalizeWarningPayload(payload);

  const plainRisk = toPlain(risk);

  const mitigation = await ensureMitigationBelongsToRisk({
    mitigationId: payload.mr_planning_mitigation_id,
    riskId: plainRisk.id,
    transaction,
  });

  const monitoring = await ensureMonitoringBelongsToRisk({
    monitoringId: payload.mr_planning_monitoring_id,
    riskId: plainRisk.id,
    transaction,
  });

  await ensureSnapshotBelongsToContext({
    snapshotId: payload.related_snapshot_id,
    contextId: plainRisk.context_id,
    transaction,
  });

  payload = await resolveWarningSeverity({
    payload,
    transaction,
  });

  const systemFields = buildSystemFieldsFromRisk({
    risk,
    mitigation,
    monitoring,
    userId,
  });

  return {
    ...payload,
    ...systemFields,

    mr_planning_risk_id: plainRisk.id,

    periode_type: payload.periode_type || systemFields.periode_type,
    periode_label: payload.periode_label || systemFields.periode_label,

    warning_code:
      payload.warning_code ||
      buildWarningCode({
        riskId: plainRisk.id,
        warningType: payload.warning_type,
      }),

    warning_level: payload.warning_level || "low",
    warning_status: "open",
    days_overdue: buildDaysOverdue(payload.due_date),
    is_read: false,
    is_resolved: false,

    source_table: payload.source_table || defaultSourceTable || "mr_planning_risk",
    source_id: payload.source_id || defaultSourceId || plainRisk.id,

    created_by: userId || null,
    updated_by: userId || null,
  };
};

const buildUpdatePayload = async ({
  warning,
  body,
  userId,
  transaction = null,
}) => {
  assertAllowedFields(body);

  if (normalizeBoolean(warning.is_resolved, false)) {
    throw createValidationError("Warning yang sudah resolved tidak bisa diubah via draft update.", {
      id: warning.id,
      is_resolved: warning.is_resolved,
    });
  }

  let payload = pickAllowedFields(body);
  payload = normalizeWarningPayload(payload);

  const risk = await getRiskWithContext(warning.mr_planning_risk_id, transaction);

  await ensureMitigationBelongsToRisk({
    mitigationId:
      payload.mr_planning_mitigation_id || warning.mr_planning_mitigation_id,
    riskId: warning.mr_planning_risk_id,
    transaction,
  });

  await ensureMonitoringBelongsToRisk({
    monitoringId:
      payload.mr_planning_monitoring_id || warning.mr_planning_monitoring_id,
    riskId: warning.mr_planning_risk_id,
    transaction,
  });

  await ensureSnapshotBelongsToContext({
    snapshotId: payload.related_snapshot_id || warning.related_snapshot_id,
    contextId: risk.context_id,
    transaction,
  });

  payload = await resolveWarningSeverity({
    payload,
    transaction,
  });

  const finalPayload = {
    ...payload,
    updated_by: userId || null,
  };

  if (Object.prototype.hasOwnProperty.call(payload, "due_date")) {
    finalPayload.days_overdue = buildDaysOverdue(payload.due_date);
  }

  return finalPayload;
};

const warningInclude = () => [
  {
    model: MrPlanningRisk,
    as: "risk",
    required: false,
  },
  {
    model: MrPlanningMitigation,
    as: "mitigation",
    required: false,
  },
  {
    model: MrPlanningMonitoring,
    as: "monitoring",
    required: false,
  },
  {
    model: MrPlanningContext,
    as: "context",
    required: false,
  },
  {
    model: MrPlanningSnapshot,
    as: "snapshot",
    required: false,
  },
  {
    model: MrReferenceItem,
    as: "severity_ref",
    required: false,
  },
];

const createWarningFromRisk = async ({ riskId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const risk = await getRiskWithContext(riskId, transaction);

    const payload = await buildCreatePayload({
      risk,
      body,
      userId,
      defaultSourceTable: "mr_planning_risk",
      defaultSourceId: Number(riskId),
      transaction,
    });

    const created = await MrPlanningWarning.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createWarningFromMonitoring = async ({ monitoringId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const monitoring = await getMonitoringWithRisk(monitoringId, transaction);
    const plainMonitoring = toPlain(monitoring);

    const risk = plainMonitoring.risk
      ? monitoring.risk
      : await getRiskWithContext(plainMonitoring.mr_planning_risk_id, transaction);

    const mergedBody = {
      ...body,
      mr_planning_monitoring_id: Number(monitoringId),
    };

    const payload = await buildCreatePayload({
      risk,
      body: mergedBody,
      userId,
      defaultSourceTable: "mr_planning_monitoring",
      defaultSourceId: Number(monitoringId),
      transaction,
    });

    const created = await MrPlanningWarning.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createWarningFromMitigation = async ({ mitigationId, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const mitigation = await getMitigationWithRisk(mitigationId, transaction);
    const plainMitigation = toPlain(mitigation);

    const risk = plainMitigation.risk
      ? mitigation.risk
      : await getRiskWithContext(plainMitigation.mr_planning_risk_id, transaction);

    const mergedBody = {
      ...body,
      mr_planning_mitigation_id: Number(mitigationId),
    };

    const payload = await buildCreatePayload({
      risk,
      body: mergedBody,
      userId,
      defaultSourceTable: "mr_planning_mitigation",
      defaultSourceId: Number(mitigationId),
      transaction,
    });

    const created = await MrPlanningWarning.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createWarningFromSource = async ({
  riskId,
  sourceTable,
  sourceId,
  body,
  userId,
}) => {
  const transaction = await sequelize.transaction();

  try {
    if (!VALID_SOURCE_TABLES.includes(sourceTable)) {
      throw createValidationError("source_table tidak valid.", {
        source_table: sourceTable,
        allowed: VALID_SOURCE_TABLES,
      });
    }

    const risk = await getRiskWithContext(riskId, transaction);

    const mergedBody = {
      ...body,
      source_table: sourceTable,
      source_id: Number(sourceId),
    };

    const payload = await buildCreatePayload({
      risk,
      body: mergedBody,
      userId,
      defaultSourceTable: sourceTable,
      defaultSourceId: Number(sourceId),
      transaction,
    });

    const created = await MrPlanningWarning.create(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(created.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// =====================================================
// STEP 16F — WARNING READ / RESOLVE / REOPEN WORKFLOW
// =====================================================

const assertOnlyAllowedWorkflowFields = (body = {}, allowedFields = []) => {
  const fields = Object.keys(body || {});
  const blockedFields = fields.filter((field) => !allowedFields.includes(field));

  if (blockedFields.length > 0) {
    throw createValidationError("Field tidak diperbolehkan.", {
      fields: blockedFields,
    });
  }
};

const getWorkflowWarningOrFail = async (id, transaction = null) => {
  const warning = await MrPlanningWarning.findByPk(id, {
    transaction,
  });

  if (!warning) {
    throw createNotFoundError("MR Planning Warning tidak ditemukan.", {
      id,
    });
  }

  return warning;
};

const updateDraftWarning = async ({ id, body, userId }) => {
  const transaction = await sequelize.transaction();

  try {
    const warning = await MrPlanningWarning.findByPk(id, {
      transaction,
    });

    if (!warning) {
      throw createNotFoundError("MR Planning Warning tidak ditemukan.", {
        id,
      });
    }

    const payload = await buildUpdatePayload({
      warning,
      body,
      userId,
      transaction,
    });

    await warning.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const markWarningAsRead = async ({ id, body = {}, userId }) => {
  assertOnlyAllowedWorkflowFields(body, []);

  const transaction = await sequelize.transaction();

  try {
    const warning = await getWorkflowWarningOrFail(id, transaction);

    const payload = {
      updated_by: userId || null,
    };

    // Guard idempotent:
    // Jika sudah dibaca, jangan timpa read_by/read_at lama.
    if (!normalizeBoolean(warning.is_read, false)) {
      payload.is_read = true;
      payload.read_by = userId || null;
      payload.read_at = new Date();
    }

    await warning.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const resolveWarning = async ({ id, body = {}, resolutionNote = null, userId }) => {
  assertOnlyAllowedWorkflowFields(body, ["resolution_note"]);

  const finalResolutionNote =
    typeof body.resolution_note === "string"
      ? body.resolution_note.trim()
      : typeof resolutionNote === "string"
      ? resolutionNote.trim()
      : null;

  if (!finalResolutionNote) {
    throw createValidationError("Catatan penyelesaian wajib diisi.", {
      field: "resolution_note",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const warning = await getWorkflowWarningOrFail(id, transaction);

    const now = new Date();

    const payload = {
      is_resolved: true,
      resolved_by: userId || null,
      resolved_at: now,
      resolution_note: finalResolutionNote,
      warning_status: "resolved",
      updated_by: userId || null,
    };

    // Resolve otomatis dianggap sudah dibaca.
    // Kalau sebelumnya belum read, isi read_by/read_at.
    // Kalau sudah read, jangan timpa data read lama.
    if (!normalizeBoolean(warning.is_read, false)) {
      payload.is_read = true;
      payload.read_by = userId || null;
      payload.read_at = now;
    }

    await warning.update(payload, {
      transaction,
    });

    await transaction.commit();

    return getWarningDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const reopenWarning = async ({ id, body = {}, resolutionNote = null, userId }) => {
  assertOnlyAllowedWorkflowFields(body, ["resolution_note"]);

  const reopenNote =
    typeof body.resolution_note === "string"
      ? body.resolution_note.trim()
      : typeof resolutionNote === "string"
      ? resolutionNote.trim()
      : null;

  const transaction = await sequelize.transaction();

  try {
    const warning = await getWorkflowWarningOrFail(id, transaction);

    await warning.update(
      {
        is_resolved: false,
        resolved_by: null,
        resolved_at: null,
        resolution_note: reopenNote || null,
        warning_status: "open",
        updated_by: userId || null,
      },
      {
        transaction,
      }
    );

    await transaction.commit();

    return getWarningDetail(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getWarningDetail = async (id) => {
  const warning = await MrPlanningWarning.findByPk(id, {
    include: warningInclude(),
  });

  if (!warning) {
    throw createNotFoundError("MR Planning Warning tidak ditemukan.", {
      id,
    });
  }

  return warning;
};

const getWarningsByRisk = async (riskId) => {
  return MrPlanningWarning.findAll({
    where: {
      mr_planning_risk_id: riskId,
    },
    include: warningInclude(),
    order: [["id", "ASC"]],
  });
};

const getWarningsByContext = async (contextId) => {
  return MrPlanningWarning.findAll({
    where: {
      context_id: contextId,
    },
    include: warningInclude(),
    order: [["id", "ASC"]],
  });
};

const getWarningsByMonitoring = async (monitoringId) => {
  return MrPlanningWarning.findAll({
    where: {
      mr_planning_monitoring_id: monitoringId,
    },
    include: warningInclude(),
    order: [["id", "ASC"]],
  });
};

const getWarningsByMitigation = async (mitigationId) => {
  return MrPlanningWarning.findAll({
    where: {
      mr_planning_mitigation_id: mitigationId,
    },
    include: warningInclude(),
    order: [["id", "ASC"]],
  });
};

const getWarningsBySource = async ({ sourceTable, sourceId }) => {
  return MrPlanningWarning.findAll({
    where: {
      source_table: sourceTable,
      source_id: sourceId,
    },
    include: warningInclude(),
    order: [["id", "ASC"]],
  });
};

module.exports = {
  ERROR_CODE,

  VALID_PERIODE_TYPES,
  VALID_WARNING_TYPES,
  VALID_WARNING_LEVELS,
  VALID_SOURCE_TABLES,

  WARNING_ALLOWED_FIELDS,
  WARNING_BLOCKED_FIELDS,

  createValidationError,
  createNotFoundError,

  getRiskWithContext,
  getMonitoringWithRisk,
  getMitigationWithRisk,
  ensureMitigationBelongsToRisk,
  ensureMonitoringBelongsToRisk,
  ensureSnapshotBelongsToContext,
  getReferenceItemWithGroup,
  resolveWarningSeverity,
  buildWarningCode,
  buildSystemFieldsFromRisk,
  buildCreatePayload,
  buildUpdatePayload,
  warningInclude,

  createWarningFromRisk,
  createWarningFromMonitoring,
  createWarningFromMitigation,
  createWarningFromSource,
  updateDraftWarning,
  markWarningAsRead,
  resolveWarning,
  reopenWarning,

  getWarningDetail,
  getWarningsByRisk,
  getWarningsByContext,
  getWarningsByMonitoring,
  getWarningsByMitigation,
  getWarningsBySource,
};