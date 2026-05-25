"use strict";

/**
 * MR Audit Helper
 * ---------------------------------------------------------------------------
 * Helper ini tidak membuat sistem audit baru.
 * Helper ini hanya menjadi builder/wrapper agar service MR bisa menulis
 * audit ke AuditModel existing jika tersedia.
 *
 * AuditModel bisa berupa:
 * - renstra_audit_log_global
 * - planning_audit_events
 * - tenant_audit_logs
 * - model audit existing lain
 *
 * Payload akan difilter berdasarkan rawAttributes model agar tidak error
 * bila nama field audit existing berbeda.
 */

const { createGovernanceError } = require("./mrApprovalHelper");
const { cloneJson } = require("./mrHistoryHelper");

const MR_AUDIT_ACTION = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  REVISI: "revisi",
  VERIFIKASI: "verifikasi",
  APPROVE: "approve",
  TOLAK: "tolak",
  REBUILD: "rebuild",
  DELETE: "delete",
});

const buildAuditPayload = ({
  moduleName = "MR_EPELARA",
  entityName,
  tableName,
  recordId,
  action,
  userId,
  beforeJson = null,
  afterJson = null,
  description = null,
  metadata = {},
  request = null,
  extra = {},
}) => {
  if (!entityName || !tableName || !action || !userId) {
    throw createGovernanceError({
      message: "Payload audit MR tidak lengkap.",
      code: "MR_AUDIT_PAYLOAD_INVALID",
      details: {
        required_fields: [
          "entityName",
          "tableName",
          "action",
          "userId",
        ],
      },
    });
  }

  const ip =
    request?.ip ||
    request?.headers?.["x-forwarded-for"] ||
    request?.connection?.remoteAddress ||
    null;

  const userAgent = request?.headers?.["user-agent"] || null;

  const normalizedMetadata = {
    ...metadata,
    ip,
    user_agent: userAgent,
  };

    return {
      module: moduleName,
      module_name: moduleName,

      entity: entityName,
      entity_name: entityName,
      entity_type: entityName,

      table_name: tableName,

      record_id: recordId || null,
      ref_id: recordId || null,
      entity_id: recordId || null,

      action,
      aksi: action,

      user_id: userId,
      actor_user_id: userId,
      dibuat_oleh: userId,

      before_json: cloneJson(beforeJson),
      after_json: cloneJson(afterJson),

      metadata_json: cloneJson(normalizedMetadata),
      metadata: cloneJson(normalizedMetadata),

      description,
      keterangan: description,

      created_at: new Date(),

      ...extra,
    };
};

const getModelAttributeNames = (Model) => {
  if (!Model || !Model.rawAttributes) return [];
  return Object.keys(Model.rawAttributes);
};

const filterPayloadByModelAttributes = ({
  Model,
  payload,
}) => {
  const attributes = getModelAttributeNames(Model);

  if (!attributes.length) {
    return payload;
  }

  return Object.keys(payload || {}).reduce((filtered, key) => {
    if (attributes.includes(key)) {
      filtered[key] = payload[key];
    }
    return filtered;
  }, {});
};

const writeAuditLog = async ({
  AuditModel = null,
  payload,
  transaction = null,
  required = false,
}) => {
  if (!AuditModel) {
    if (required) {
      throw createGovernanceError({
        message: "AuditModel wajib tersedia.",
        code: "MR_AUDIT_MODEL_REQUIRED",
      });
    }

    return null;
  }

  if (!payload || typeof payload !== "object") {
    throw createGovernanceError({
      message: "Payload audit tidak valid.",
      code: "MR_AUDIT_PAYLOAD_INVALID",
    });
  }

  const safePayload = filterPayloadByModelAttributes({
    Model: AuditModel,
    payload,
  });

  if (Object.keys(safePayload).length === 0) {
    if (required) {
      throw createGovernanceError({
        message: "Payload audit kosong setelah disesuaikan dengan AuditModel.",
        code: "MR_AUDIT_PAYLOAD_EMPTY_AFTER_FILTER",
      });
    }

    return null;
  }

  return AuditModel.create(safePayload, { transaction });
};

const buildAndWriteAuditLog = async ({
  AuditModel = null,
  transaction = null,
  required = false,
  moduleName = "MR_EPELARA",
  entityName,
  tableName,
  recordId,
  action,
  userId,
  beforeJson = null,
  afterJson = null,
  description = null,
  metadata = {},
  request = null,
  extra = {},
}) => {
  const payload = buildAuditPayload({
    moduleName,
    entityName,
    tableName,
    recordId,
    action,
    userId,
    beforeJson,
    afterJson,
    description,
    metadata,
    request,
    extra,
  });

  return writeAuditLog({
    AuditModel,
    payload,
    transaction,
    required,
  });
};

module.exports = {
  MR_AUDIT_ACTION,
  buildAuditPayload,
  getModelAttributeNames,
  filterPayloadByModelAttributes,
  writeAuditLog,
  buildAndWriteAuditLog,
};
const { EXCEPTIONS } = require("../../services/mr/mrPolicyEngineService");
module.exports.EXCEPTIONS = EXCEPTIONS;
