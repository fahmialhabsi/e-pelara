"use strict";

/**
 * MR Monitoring Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_planning_monitoring.
 *
 * Prinsip:
 * - Monitoring wajib periodik.
 * - Mendukung bulanan, triwulan, semester, tahunan, adhoc.
 * - Perubahan monitoring masuk history.
 */

const {
  MR_ACTION,
  MR_STATUS,
  ensureRecordExists,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
  buildHistoryPayload,
  createHistory,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const {
  sanitizePayload,
  requireFields,
  validateIntegerId,
} = require("../../helpers/mr/mrValidationHelper");

const {
  ensureValidPeriodType,
} = require("../../helpers/mr/mrSnapshotHelper");

const MR_MONITORING_TABLE_NAME = "mr_planning_monitoring";
const MR_MONITORING_ENTITY_NAME = "mr_planning_monitoring";
const MR_MONITORING_HISTORY_FOREIGN_KEY = "mr_planning_monitoring_id";

const MR_MONITORING_ALLOWED_FIELDS = Object.freeze([
  "mr_planning_risk_id",
  "mr_planning_mitigation_id",
  "periode_type",
  "periode_label",
  "periode_awal",
  "periode_akhir",
  "monitoring_date",
  "status_monitoring",
  "hasil_monitoring",
  "kendala",
  "tindak_lanjut",
  "rekomendasi",
  "realisasi_mitigasi",
  "progress_persen",
  "terjadi_risiko",
  "tanggal_kejadian",
  "uraian_kejadian",
  "dampak_kejadian",
]);

const MR_MONITORING_REQUIRED_FIELDS = Object.freeze([
  "mr_planning_risk_id",
  "periode_type",
  "periode_label",
]);

const pickModelAttributes = ({ Model, payload }) => {
  if (!Model?.rawAttributes) return payload;

  const allowed = Object.keys(Model.rawAttributes);

  return Object.keys(payload || {}).reduce((result, key) => {
    if (allowed.includes(key)) result[key] = payload[key];
    return result;
  }, {});
};

const validateMonitoringPayload = (payload) => {
  requireFields({
    body: payload,
    fields: MR_MONITORING_REQUIRED_FIELDS,
    label: "MR planning monitoring",
  });

  validateIntegerId({
    value: payload.mr_planning_risk_id,
    fieldName: "mr_planning_risk_id",
  });

  if (payload.mr_planning_mitigation_id) {
    validateIntegerId({
      value: payload.mr_planning_mitigation_id,
      fieldName: "mr_planning_mitigation_id",
      required: false,
    });
  }

  ensureValidPeriodType(payload.periode_type);
};

const buildMonitoringWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.mr_planning_risk_id) {
    where.mr_planning_risk_id = query.mr_planning_risk_id;
  }
  if (query.mr_planning_mitigation_id) {
    where.mr_planning_mitigation_id = query.mr_planning_mitigation_id;
  }
  if (query.periode_type) where.periode_type = query.periode_type;
  if (query.periode_label) where.periode_label = query.periode_label;
  if (query.status_monitoring) {
    where.status_monitoring = query.status_monitoring;
  }

  return where;
};

const findAll = async ({
  MonitoringModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return MonitoringModel.findAndCountAll({
    where: buildMonitoringWhere({ query }),
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const findById = async ({
  MonitoringModel,
  id,
  transaction = null,
}) => {
  const record = await MonitoringModel.findByPk(id, { transaction });
  ensureRecordExists(record, "Data MR monitoring tidak ditemukan.");
  return record;
};

const createMonitoring = async ({
  sequelize,
  MonitoringModel,
  MonitoringHistoryModel,
  AuditModel = null,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const payload = sanitizePayload({
      body,
      allowedFields: MR_MONITORING_ALLOWED_FIELDS,
      label: "MR monitoring create",
    });

    validateMonitoringPayload(payload);

    const createPayload = pickModelAttributes({
      Model: MonitoringModel,
      payload: {
        ...payload,
        created_by: userId,
      },
    });

    const created = await MonitoringModel.create(createPayload, { transaction });

    const afterJson = getPlainJson(created);

    const historyPayload = buildHistoryPayload({
      activeRecord: created,
      activeId: created.id,
      historyForeignKey: MR_MONITORING_HISTORY_FOREIGN_KEY,
      beforeJson: null,
      afterJson,
      action: MR_ACTION.CREATE,
      statusRevisi: MR_STATUS.DRAFT,
      alasanRevisi: body?.alasan_revisi || "Create MR monitoring.",
      userId,
      nextVersi: 1,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: MonitoringHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_MONITORING_ENTITY_NAME,
      tableName: MR_MONITORING_TABLE_NAME,
      recordId: created.id,
      action: MR_ACTION.CREATE,
      userId,
      beforeJson: null,
      afterJson,
      description: "Create MR monitoring.",
      request,
    });

    await transaction.commit();

    return { record: created, history };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateMonitoring = async ({
  sequelize,
  MonitoringModel,
  MonitoringHistoryModel,
  AuditModel = null,
  id,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await MonitoringModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Data MR monitoring tidak ditemukan.");

    const payload = sanitizePayload({
      body,
      allowedFields: MR_MONITORING_ALLOWED_FIELDS,
      label: "MR monitoring update",
    });

    const beforeJson = getPlainJson(record);

    const updatePayload = pickModelAttributes({
      Model: MonitoringModel,
      payload,
    });

    await record.update(updatePayload, { transaction });

    const afterJson = getPlainJson(record);

    const historyPayload = buildHistoryPayload({
      activeRecord: record,
      activeId: record.id,
      historyForeignKey: MR_MONITORING_HISTORY_FOREIGN_KEY,
      beforeJson,
      afterJson,
      action: MR_ACTION.UPDATE,
      statusRevisi: MR_STATUS.DRAFT,
      alasanRevisi: body?.alasan_revisi || "Update MR monitoring.",
      userId,
      nextVersi: Number(beforeJson.versi || 0) + 1,
      incrementVersi: false,
    });

    const history = await createHistory({
      HistoryModel: MonitoringHistoryModel,
      payload: historyPayload,
      transaction,
    });

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_MONITORING_ENTITY_NAME,
      tableName: MR_MONITORING_TABLE_NAME,
      recordId: record.id,
      action: MR_ACTION.UPDATE,
      userId,
      beforeJson,
      afterJson,
      description: "Update MR monitoring.",
      request,
    });

    await transaction.commit();

    return { record, history };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_MONITORING_TABLE_NAME,
  MR_MONITORING_ENTITY_NAME,
  MR_MONITORING_HISTORY_FOREIGN_KEY,
  MR_MONITORING_ALLOWED_FIELDS,
  MR_MONITORING_REQUIRED_FIELDS,

  pickModelAttributes,
  validateMonitoringPayload,
  buildMonitoringWhere,
  findAll,
  findById,
  createMonitoring,
  updateMonitoring,
};