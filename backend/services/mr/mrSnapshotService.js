"use strict";

/**
 * MR Snapshot Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_planning_snapshot.
 *
 * Prinsip:
 * - Snapshot dipakai untuk laporan periodik.
 * - Snapshot dapat dikunci setelah approved.
 * - Dashboard/laporan tidak boleh menghitung dari raw table besar.
 */

const {
  MR_ACTION,
  ensureRecordExists,
} = require("../../helpers/mr/mrApprovalHelper");
const { assertFinalReportNotOverwrite, assertSnapshotExists } = require("./mrPolicyEngineService");

const {
  getPlainJson,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const {
  buildSnapshotPayload,
  buildSnapshotApprovalPayload,
  ensureSnapshotNotLocked,
} = require("../../helpers/mr/mrSnapshotHelper");

const MR_SNAPSHOT_TABLE_NAME = "mr_planning_snapshot";
const MR_SNAPSHOT_ENTITY_NAME = "mr_planning_snapshot";
const DEFAULT_REPORT_TIMEZONE = "Asia/Jayapura";

const buildSnapshotWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.context_id) where.context_id = query.context_id;
  if (query.periode_type) where.periode_type = query.periode_type;
  if (query.periode_label) where.periode_label = query.periode_label;
  if (query.tahun) where.tahun = query.tahun;
  if (query.renstra_id) where.renstra_id = query.renstra_id;
  if (query.opd_id) where.opd_id = query.opd_id;
  if (query.is_locked !== undefined) where.is_locked = query.is_locked;

  return where;
};

const findAll = async ({
  SnapshotModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return SnapshotModel.findAndCountAll({
    where: buildSnapshotWhere({ query }),
    order: [
      ["generated_at", "DESC"],
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const createSnapshot = async ({
  sequelize,
  SnapshotModel,
  AuditModel = null,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    assertFinalReportNotOverwrite({
      is_final: !!body?.is_final || !!body?.is_locked,
      is_correction_mode: !!body?.is_correction_mode,
    });

    const payload = buildSnapshotPayload({
      context_id: body.context_id,
      periode_type: body.periode_type,
      periode_label: body.periode_label,
      periode_awal: body.periode_awal,
      periode_akhir: body.periode_akhir,
      tahun: body.tahun,
      renstra_id: body.renstra_id,
      opd_id: body.opd_id,
      summary: body.summary || body,
      snapshot_json: body.snapshot_json || body.summary_json || {},
      generated_by: userId,
    });

    const created = await SnapshotModel.create(payload, { transaction });

    const afterJson = getPlainJson(created);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_SNAPSHOT_ENTITY_NAME,
      tableName: MR_SNAPSHOT_TABLE_NAME,
      recordId: created.id,
      action: MR_ACTION.CREATE,
      userId,
      beforeJson: null,
      afterJson,
      description: "Create MR snapshot.",
      request,
    });

    await transaction.commit();

    return created;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const approveSnapshot = async ({
  sequelize,
  SnapshotModel,
  AuditModel = null,
  id,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const snapshot = await SnapshotModel.findByPk(id, { transaction });
    ensureRecordExists(snapshot, "Snapshot MR tidak ditemukan.");

    const beforeJson = getPlainJson(snapshot);

    assertFinalReportNotOverwrite({
      is_final: !!beforeJson?.is_locked || !!beforeJson?.is_final,
      is_correction_mode: !!request?.body?.is_correction_mode,
    });

    ensureSnapshotNotLocked(snapshot);

    await snapshot.update(
      buildSnapshotApprovalPayload({ userId }),
      { transaction }
    );

    const afterJson = getPlainJson(snapshot);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_SNAPSHOT_ENTITY_NAME,
      tableName: MR_SNAPSHOT_TABLE_NAME,
      recordId: snapshot.id,
      action: MR_ACTION.APPROVE,
      userId,
      beforeJson,
      afterJson,
      description: "Approve and lock MR snapshot.",
      request,
    });

    await transaction.commit();

    return snapshot;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const ensureReportSnapshotForFlow = async ({
  SnapshotModel,
  context = {},
  report = {},
  flow = "report",
  mode = "prefer_existing",
  userId = null,
  sourceEndpoint = null,
  idempotencyKey = null,
  requestId = null,
}) => {
  if (!SnapshotModel || !context?.id) {
    return null;
  }

  const normalizedFlow = String(flow || "report").toLowerCase();
  const normalizedMode = String(mode || "prefer_existing").toLowerCase();
  const snapshotKey = [
    context.id || "",
    context.periode_type || "",
    context.periode_label || "",
    context.tahun || "",
    normalizedMode,
    normalizedFlow,
  ].join("|");

  const where = buildSnapshotWhere({
    query: {
      context_id: context.id,
      periode_type: context.periode_type || null,
      periode_label: context.periode_label || null,
      tahun: context.tahun || null,
    },
  });

  const existing = await SnapshotModel.findOne({
    where,
    order: [
      ["is_locked", "DESC"],
      ["generated_at", "DESC"],
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  if (existing) {
    const qualityGate = report?.report_quality_gate || report?.quality_gate || {};
    const resolver = report?.official_report_contract?.final_record_summary || {};
    const summary = report?.summary || {};
    const reportVersion =
      context?.versi || context?.active_version || context?.latest_approved_version || null;
    const fallbackCutoffDate =
      summary?.cutoff_date ||
      context?.periode_akhir ||
      (context?.periode_label ? `PERIODE_LABEL:${context.periode_label}` : null);
    const existingJson =
      existing?.snapshot_json && typeof existing.snapshot_json === "object"
        ? existing.snapshot_json
        : {};
    const mergedJson = {
      ...existingJson,
      context_id: existingJson.context_id ?? context.id ?? null,
      source_flow: existingJson.source_flow ?? normalizedFlow,
      source_mode: existingJson.source_mode ?? normalizedMode,
      snapshot_key: existingJson.snapshot_key ?? snapshotKey,
      official_data_source:
        existingJson.official_data_source ?? resolver?.official_data_source ?? null,
      quality_gate_status:
        existingJson.quality_gate_status ?? qualityGate?.final_report_status ?? qualityGate?.status ?? null,
      cutoff_date: existingJson.cutoff_date ?? fallbackCutoffDate,
      timezone:
        existingJson.timezone ??
        process.env.APP_TIMEZONE ??
        process.env.TZ ??
        DEFAULT_REPORT_TIMEZONE,
      report_version:
        existingJson.report_version ?? (reportVersion ? String(reportVersion) : null),
      source_endpoint: existingJson.source_endpoint ?? sourceEndpoint ?? null,
      idempotency_key: existingJson.idempotency_key ?? idempotencyKey ?? null,
      request_id: existingJson.request_id ?? requestId ?? null,
    };

    if (normalizedMode === "final_export" && !existing.is_locked) {
      await existing.update({
        is_locked: true,
        approved_at: existing.approved_at || new Date(),
        approved_by: existing.approved_by || (userId || "SYSTEM"),
        snapshot_json: mergedJson,
      });
    } else if (JSON.stringify(existingJson) !== JSON.stringify(mergedJson)) {
      await existing.update({
        snapshot_json: mergedJson,
      });
    }
    assertSnapshotExists(existing.id);
    return existing;
  }

  const mustCreate = ["final_export", "correction", "addendum"].includes(normalizedMode);

  if (!mustCreate) {
    return null;
  }

  const shouldLock = normalizedMode === "final_export";
  const qualityGate = report?.report_quality_gate || report?.quality_gate || {};
  const resolver = report?.official_report_contract?.final_record_summary || {};
  const summary = report?.summary || {};
  const reportVersion =
    context?.versi || context?.active_version || context?.latest_approved_version || null;
  const fallbackCutoffDate =
    summary?.cutoff_date ||
    context?.periode_akhir ||
    (context?.periode_label ? `PERIODE_LABEL:${context.periode_label}` : null);

  const payload = buildSnapshotPayload({
    context_id: context.id,
    periode_type: context.periode_type,
    periode_label: context.periode_label,
    periode_awal: context.periode_awal || null,
    periode_akhir: context.periode_akhir || null,
    tahun: context.tahun || null,
    renstra_id: context.renstra_id || null,
    opd_id: context.opd_id || null,
    summary: {
      source_flow: normalizedFlow,
      source_mode: normalizedMode,
      snapshot_key: snapshotKey,
      created_by_orchestrator: true,
    },
    snapshot_json: {
      context_id: context.id,
      source_flow: normalizedFlow,
      source_mode: normalizedMode,
      snapshot_key: snapshotKey,
      official_data_source: resolver?.official_data_source || null,
      quality_gate_status: qualityGate?.final_report_status || qualityGate?.status || null,
      cutoff_date: fallbackCutoffDate,
      timezone:
        process.env.APP_TIMEZONE ||
        process.env.TZ ||
        DEFAULT_REPORT_TIMEZONE,
      report_version: reportVersion ? String(reportVersion) : null,
      source_endpoint: sourceEndpoint || null,
      idempotency_key: idempotencyKey || null,
      request_id: requestId || null,
    },
    generated_by: userId || "SYSTEM",
    extra: {
      is_locked: shouldLock,
    },
  });

  return SnapshotModel.create(payload);
};

module.exports = {
  MR_SNAPSHOT_TABLE_NAME,
  MR_SNAPSHOT_ENTITY_NAME,

  buildSnapshotWhere,
  findAll,
  createSnapshot,
  approveSnapshot,
  ensureReportSnapshotForFlow,
};
