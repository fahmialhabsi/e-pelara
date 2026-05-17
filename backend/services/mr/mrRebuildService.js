"use strict";

/**
 * MR Rebuild Service
 * ---------------------------------------------------------------------------
 * Core service untuk rebuild active record dari history approved terakhir.
 *
 * Prinsip:
 * - Rebuild tidak menerima payload manual frontend.
 * - Rebuild memakai after_json dari history approved terakhir.
 * - Rebuild membuat history baru.
 * - Rebuild menulis audit jika AuditModel tersedia.
 */

const {
  MR_ACTION,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  rebuildActiveRecordFromApprovedHistory,
} = require("../../helpers/mr/mrRebuildHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const MR_REBUILD_ENTITY_NAME = "mr_planning_risk";
const MR_REBUILD_TABLE_NAME = "mr_planning_risk";
const MR_REBUILD_HISTORY_FOREIGN_KEY = "mr_planning_risk_id";

const rebuildRiskActiveFromHistory = async ({
  sequelize,
  RiskModel,
  RiskHistoryModel,
  AuditModel = null,
  id,
  userId,
  alasanRevisi = null,
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const beforeRecord = await RiskModel.findByPk(id, { transaction });
    const beforeJson = getPlainJson(beforeRecord);

    const result = await rebuildActiveRecordFromApprovedHistory({
      ActiveModel: RiskModel,
      HistoryModel: RiskHistoryModel,
      activeRecord: beforeRecord,
      activeId: id,
      historyForeignKey: MR_REBUILD_HISTORY_FOREIGN_KEY,
      userId,
      alasanRevisi,
      transaction,
    });

    const afterJson = getPlainJson(result.record);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_REBUILD_ENTITY_NAME,
      tableName: MR_REBUILD_TABLE_NAME,
      recordId: id,
      action: MR_ACTION.REBUILD,
      userId,
      beforeJson,
      afterJson,
      description:
        result.alasan_revisi ||
        "Rebuild active MR planning risk from latest approved history.",
      request,
      metadata: {
        rebuild_history_id: result.history?.id,
        source_approved_history_id:
          result.source_approved_history_id || result.approved_history?.id,
        rebuild_reason: result.alasan_revisi,
      },
    });

    await transaction.commit();

    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  MR_REBUILD_ENTITY_NAME,
  MR_REBUILD_TABLE_NAME,
  MR_REBUILD_HISTORY_FOREIGN_KEY,

  rebuildRiskActiveFromHistory,
};