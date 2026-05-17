"use strict";

/**
 * MR Cross-System Linkage Service
 * ---------------------------------------------------------------------------
 * Supporting service untuk mr_cross_system_link.
 *
 * Prinsip:
 * - Semua linkage e-Pelara ↔ e-SIGAP/SPIP lewat mr_cross_system_link.
 * - e-Pelara tidak membuat ulang SPIP, RTP, monitoring SPIP, atau evidence.
 * - source_system dan target_system wajib memakai kode:
 *   e_pelara, e_sigap, spip, lakip, lk.
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
  buildCrossSystemLinkPayload,
  buildPlanningRiskToSpipRiskPayload,
  buildPlanningRiskToSpipRtpPayload,
  buildPlanningRiskToSpipMonitoringPayload,
  buildPlanningRiskToSpipEvidencePayload,
  buildVerifyCrossSystemLinkPayload,
  buildMarkBrokenCrossSystemLinkPayload,
  ensureNoDuplicateCrossSystemPayload,
} = require("../../helpers/mr/mrCrossSystemHelper");

const MR_CROSS_SYSTEM_TABLE_NAME = "mr_cross_system_link";
const MR_CROSS_SYSTEM_ENTITY_NAME = "mr_cross_system_link";

const buildLinkWhere = ({ query = {} }) => {
  const where = {};

  if (query.id) where.id = query.id;
  if (query.source_system) where.source_system = query.source_system;
  if (query.source_table) where.source_table = query.source_table;
  if (query.source_id) where.source_id = query.source_id;
  if (query.target_system) where.target_system = query.target_system;
  if (query.target_table) where.target_table = query.target_table;
  if (query.target_id) where.target_id = query.target_id;
  if (query.link_type) where.link_type = query.link_type;
  if (query.link_status) where.link_status = query.link_status;
  if (query.is_verified !== undefined) where.is_verified = query.is_verified;

  return where;
};

const findAll = async ({
  LinkModel,
  query = {},
  page = 1,
  limit = 20,
}) => {
  const numericPage = Number(page) || 1;
  const numericLimit = Number(limit) || 20;
  const offset = (numericPage - 1) * numericLimit;

  return LinkModel.findAndCountAll({
    where: buildLinkWhere({ query }),
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    limit: numericLimit,
    offset,
    distinct: true,
  });
};

const createLink = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  body,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const payload = buildCrossSystemLinkPayload({
      ...body,
      created_by: userId,
    });

    await ensureNoDuplicateCrossSystemPayload({
      LinkModel,
      source_system: payload.source_system,
      source_table: payload.source_table,
      source_id: payload.source_id,
      target_system: payload.target_system,
      target_table: payload.target_table,
      target_id: payload.target_id,
      link_type: payload.link_type,
      transaction,
    });

    const created = await LinkModel.create(payload, { transaction });

    const afterJson = getPlainJson(created);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_CROSS_SYSTEM_ENTITY_NAME,
      tableName: MR_CROSS_SYSTEM_TABLE_NAME,
      recordId: created.id,
      action: MR_ACTION.CREATE,
      userId,
      beforeJson: null,
      afterJson,
      description: "Create MR cross-system linkage.",
      request,
    });

    await transaction.commit();

    return created;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const createPlanningRiskToSpipRisk = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  riskId,
  spipRiskId,
  userId,
  note = null,
  request = null,
}) => {
  return createLink({
    sequelize,
    LinkModel,
    AuditModel,
    userId,
    request,
    body: buildPlanningRiskToSpipRiskPayload({
      riskId,
      spipRiskId,
      createdBy: userId,
      note,
    }),
  });
};

const createPlanningRiskToSpipRtp = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  riskId,
  spipRtpId,
  userId,
  note = null,
  request = null,
}) => {
  return createLink({
    sequelize,
    LinkModel,
    AuditModel,
    userId,
    request,
    body: buildPlanningRiskToSpipRtpPayload({
      riskId,
      spipRtpId,
      createdBy: userId,
      note,
    }),
  });
};

const createPlanningRiskToSpipMonitoring = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  riskId,
  spipMonitoringId,
  userId,
  note = null,
  request = null,
}) => {
  return createLink({
    sequelize,
    LinkModel,
    AuditModel,
    userId,
    request,
    body: buildPlanningRiskToSpipMonitoringPayload({
      riskId,
      spipMonitoringId,
      createdBy: userId,
      note,
    }),
  });
};

const createPlanningRiskToSpipEvidence = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  riskId,
  spipEvidenceId,
  userId,
  note = null,
  request = null,
}) => {
  return createLink({
    sequelize,
    LinkModel,
    AuditModel,
    userId,
    request,
    body: buildPlanningRiskToSpipEvidencePayload({
      riskId,
      spipEvidenceId,
      createdBy: userId,
      note,
    }),
  });
};

const verifyLink = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  id,
  userId,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const link = await LinkModel.findByPk(id, { transaction });

    ensureRecordExists(link, "Cross-system link tidak ditemukan.");

    const beforeJson = getPlainJson(link);

    await link.update(
      buildVerifyCrossSystemLinkPayload({ userId }),
      { transaction }
    );

    const afterJson = getPlainJson(link);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_CROSS_SYSTEM_ENTITY_NAME,
      tableName: MR_CROSS_SYSTEM_TABLE_NAME,
      recordId: link.id,
      action: MR_ACTION.VERIFIKASI,
      userId,
      beforeJson,
      afterJson,
      description: "Verify MR cross-system linkage.",
      request,
    });

    await transaction.commit();

    return link;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const markBroken = async ({
  sequelize,
  LinkModel,
  AuditModel = null,
  id,
  userId,
  note = null,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const link = await LinkModel.findByPk(id, { transaction });

    ensureRecordExists(link, "Cross-system link tidak ditemukan.");

    const beforeJson = getPlainJson(link);

    await link.update(
      buildMarkBrokenCrossSystemLinkPayload({ note }),
      { transaction }
    );

    const afterJson = getPlainJson(link);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_CROSS_SYSTEM_ENTITY_NAME,
      tableName: MR_CROSS_SYSTEM_TABLE_NAME,
      recordId: link.id,
      action: MR_ACTION.UPDATE,
      userId,
      beforeJson,
      afterJson,
      description: "Mark MR cross-system linkage as broken.",
      request,
    });

    await transaction.commit();

    return link;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_CROSS_SYSTEM_TABLE_NAME,
  MR_CROSS_SYSTEM_ENTITY_NAME,

  buildLinkWhere,
  findAll,
  createLink,
  createPlanningRiskToSpipRisk,
  createPlanningRiskToSpipRtp,
  createPlanningRiskToSpipMonitoring,
  createPlanningRiskToSpipEvidence,
  verifyLink,
  markBroken,
};