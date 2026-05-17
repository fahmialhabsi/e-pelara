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

const buildSnapshotWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
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
    const payload = buildSnapshotPayload({
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
    ensureSnapshotNotLocked(snapshot);

    const beforeJson = getPlainJson(snapshot);

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

module.exports = {
  MR_SNAPSHOT_TABLE_NAME,
  MR_SNAPSHOT_ENTITY_NAME,

  buildSnapshotWhere,
  findAll,
  createSnapshot,
  approveSnapshot,
};