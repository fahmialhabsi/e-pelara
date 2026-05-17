"use strict";

/**
 * MR Dashboard Summary Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_planning_dashboard_summary.
 *
 * Prinsip:
 * - Dashboard membaca summary table.
 * - Tidak membaca raw aggregation besar langsung dari frontend.
 * - Summary dapat di-sync dari hasil aggregation service/scheduler.
 */

const {
  MR_ACTION,
  ensureRecordExists,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const {
  buildDashboardSummaryPayload,
} = require("../../helpers/mr/mrSnapshotHelper");

const MR_DASHBOARD_SUMMARY_TABLE_NAME = "mr_planning_dashboard_summary";
const MR_DASHBOARD_SUMMARY_ENTITY_NAME = "mr_planning_dashboard_summary";

const buildSummaryWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.periode_type) where.periode_type = query.periode_type;
  if (query.periode_label) where.periode_label = query.periode_label;
  if (query.tahun) where.tahun = query.tahun;
  if (query.renstra_id) where.renstra_id = query.renstra_id;
  if (query.opd_id) where.opd_id = query.opd_id;
  if (query.sync_status) where.sync_status = query.sync_status;

  return where;
};

const findAll = async ({
  DashboardSummaryModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return DashboardSummaryModel.findAndCountAll({
    where: buildSummaryWhere({ query }),
    order: [
      ["last_sync_at", "DESC"],
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const upsertDashboardSummary = async ({
  sequelize,
  DashboardSummaryModel,
  AuditModel = null,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const payload = buildDashboardSummaryPayload({
      periode_type: body.periode_type,
      periode_label: body.periode_label,
      tahun: body.tahun,
      renstra_id: body.renstra_id,
      opd_id: body.opd_id,
      summary: body.summary || body,
      summary_json: body.summary_json || body.summary || {},
      generated_by: userId,
      sync_status: body.sync_status || "success",
    });

    const where = {
      periode_type: payload.periode_type,
      periode_label: payload.periode_label,
      tahun: payload.tahun,
      renstra_id: payload.renstra_id,
      opd_id: payload.opd_id,
    };

    const existing = await DashboardSummaryModel.findOne({
      where,
      transaction,
    });

    let record;
    let beforeJson = null;
    let action = MR_ACTION.CREATE;

    if (existing) {
      beforeJson = getPlainJson(existing);
      await existing.update(payload, { transaction });
      record = existing;
      action = MR_ACTION.UPDATE;
    } else {
      record = await DashboardSummaryModel.create(payload, { transaction });
    }

    const afterJson = getPlainJson(record);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_DASHBOARD_SUMMARY_ENTITY_NAME,
      tableName: MR_DASHBOARD_SUMMARY_TABLE_NAME,
      recordId: record.id,
      action,
      userId,
      beforeJson,
      afterJson,
      description: "Upsert MR dashboard summary.",
      request,
    });

    await transaction.commit();

    return record;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const markSyncFailed = async ({
  sequelize,
  DashboardSummaryModel,
  AuditModel = null,
  id,
  userId,
  reason,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const record = await DashboardSummaryModel.findByPk(id, { transaction });

    ensureRecordExists(record, "Dashboard summary MR tidak ditemukan.");

    const beforeJson = getPlainJson(record);

    await record.update(
      {
        sync_status: "failed",
        summary_json: {
          ...(beforeJson.summary_json || {}),
          failed_reason: reason,
          failed_at: new Date(),
        },
      },
      { transaction }
    );

    const afterJson = getPlainJson(record);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_DASHBOARD_SUMMARY_ENTITY_NAME,
      tableName: MR_DASHBOARD_SUMMARY_TABLE_NAME,
      recordId: record.id,
      action: MR_ACTION.UPDATE,
      userId,
      beforeJson,
      afterJson,
      description: "Mark MR dashboard summary sync failed.",
      request,
    });

    await transaction.commit();

    return record;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_DASHBOARD_SUMMARY_TABLE_NAME,
  MR_DASHBOARD_SUMMARY_ENTITY_NAME,

  buildSummaryWhere,
  findAll,
  upsertDashboardSummary,
  markSyncFailed,
};