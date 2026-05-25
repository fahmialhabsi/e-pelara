const { assertFinalReportNotOverwrite } = require("./mrPolicyEngineService");
"use strict";

/**
 * MR Approval Service
 * ---------------------------------------------------------------------------
 * Core service untuk approval berbasis history_id.
 *
 * Endpoint controller berikutnya akan memakai:
 * - verifikasiHistory
 * - approveHistory
 * - tolakHistory
 *
 * Prinsip:
 * - Approval dilakukan pada history.
 * - Approve history akan mengubah active record berdasarkan after_json.
 * - Tidak memakai field generic pada history risk:
 *   approved_by, approved_at, verified_by, rejected_by, dst.
 * - History risk memakai:
 *   diverifikasi_oleh, diverifikasi_pada,
 *   disetujui_oleh, disetujui_pada,
 *   ditolak_oleh, ditolak_pada.
 */

const {
  MR_ACTION,
  MR_STATUS,
  createGovernanceError,
  ensureRecordExists,
  ensureStatusAllowed,
  buildActiveRevisionPayload,
  buildHistoryActorPayload,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
  cloneJson,
} = require("../../helpers/mr/mrHistoryHelper");

const {
  buildAndWriteAuditLog,
} = require("../../helpers/mr/mrAuditHelper");

const DEFAULT_APPROVAL_BLOCKED_ACTIVE_FIELDS = Object.freeze([
  "id",
  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "deleted_at",
  "deletedAt",
]);

const MR_APPROVAL_ENTITY_NAME = "mr_planning_risk_history";
const MR_APPROVAL_TABLE_NAME = "mr_planning_risk_history";

const sanitizeAfterJsonForActive = ({
  afterJson,
  extraBlockedFields = [],
}) => {
  const payload = cloneJson(afterJson);

  if (!payload || typeof payload !== "object") {
    throw createGovernanceError({
      message: "after_json history tidak valid.",
      code: "MR_HISTORY_AFTER_JSON_INVALID",
    });
  }

  [...DEFAULT_APPROVAL_BLOCKED_ACTIVE_FIELDS, ...extraBlockedFields].forEach(
    (field) => {
      delete payload[field];
    }
  );

  return payload;
};

const findHistoryById = async ({
  HistoryModel,
  historyId,
  transaction = null,
}) => {
  const history = await HistoryModel.findByPk(historyId, { transaction });

  ensureRecordExists(history, "History MR tidak ditemukan.");

  return history;
};

const findActiveByHistory = async ({
  ActiveModel,
  history,
  historyForeignKey = "mr_planning_risk_id",
  transaction = null,
}) => {
  const plainHistory = getPlainJson(history);
  const activeId = plainHistory?.[historyForeignKey];

  if (!activeId) {
    throw createGovernanceError({
      message: `History tidak memiliki foreign key ${historyForeignKey}.`,
      code: "MR_HISTORY_ACTIVE_FK_MISSING",
    });
  }

  const activeRecord = await ActiveModel.findByPk(activeId, { transaction });

  ensureRecordExists(activeRecord, "Data active MR tidak ditemukan.");

  return activeRecord;
};

const updateHistoryWorkflow = async ({
  history,
  action,
  userId,
  statusRevisi,
  note = null,
  now = new Date(),
  transaction = null,
}) => {
  const actorPayload = buildHistoryActorPayload({
    action,
    userId,
    now,
  });

  const payload = {
    ...actorPayload,
    status_revisi: statusRevisi,
  };

  if (note) {
    payload.alasan_revisi = note;
  }

  await history.update(payload, { transaction });

  return history;
};

const verifikasiHistory = async ({
  sequelize,
  ActiveModel,
  HistoryModel,
  AuditModel = null,
  historyId,
  userId,
  note = null,
  historyForeignKey = "mr_planning_risk_id",
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    const history = await findHistoryById({
      HistoryModel,
      historyId,
      transaction,
    });

    const activeRecord = await findActiveByHistory({
      ActiveModel,
      history,
      historyForeignKey,
      transaction,
    });

    const beforeHistoryJson = getPlainJson(history);
    const beforeActiveJson = getPlainJson(activeRecord);

    ensureStatusAllowed({
      currentStatus: beforeHistoryJson.status_revisi,
      allowedStatuses: [MR_STATUS.DRAFT, MR_STATUS.DITOLAK],
      action: MR_ACTION.VERIFIKASI,
    });

    await updateHistoryWorkflow({
      history,
      action: MR_ACTION.VERIFIKASI,
      userId,
      statusRevisi: MR_STATUS.VERIFIKASI,
      note,
      transaction,
    });

    await activeRecord.update(
      buildActiveRevisionPayload({
        action: MR_ACTION.VERIFIKASI,
        userId,
        extra: {
          status_revisi: MR_STATUS.VERIFIKASI,
        },
      }),
      { transaction }
    );

    const afterHistoryJson = getPlainJson(history);
    const afterActiveJson = getPlainJson(activeRecord);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_APPROVAL_ENTITY_NAME,
      tableName: MR_APPROVAL_TABLE_NAME,
      recordId: history.id,
      action: MR_ACTION.VERIFIKASI,
      userId,
      beforeJson: {
        history: beforeHistoryJson,
        active: beforeActiveJson,
      },
      afterJson: {
        history: afterHistoryJson,
        active: afterActiveJson,
      },
      description: "Verifikasi history MR.",
      request,
    });

    await transaction.commit();

    return {
      activeRecord,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const approveHistory = async ({
  sequelize,
  ActiveModel,
  HistoryModel,
  AuditModel = null,
  historyId,
  userId,
  note = null,
  historyForeignKey = "mr_planning_risk_id",
  request = null,
  extraBlockedActiveFields = [],
}) => {
  const transaction = await sequelize.transaction();

  try {
    const history = await findHistoryById({
      HistoryModel,
      historyId,
      transaction,
    });

    const activeRecord = await findActiveByHistory({
      ActiveModel,
      history,
      historyForeignKey,
      transaction,
    });

    const beforeHistoryJson = getPlainJson(history);
    const beforeActiveJson = getPlainJson(activeRecord);

    ensureStatusAllowed({
      currentStatus: beforeHistoryJson.status_revisi,
      allowedStatuses: [MR_STATUS.VERIFIKASI],
      action: MR_ACTION.APPROVE,
    });
    assertFinalReportNotOverwrite({
      is_final: activeRecord.is_locked,
      is_correction_mode: beforeHistoryJson.is_correction_mode || false,
    });

    const activePayloadFromHistory = sanitizeAfterJsonForActive({
      afterJson: beforeHistoryJson.after_json,
      extraBlockedFields: extraBlockedActiveFields,
    });

    await activeRecord.update(
      {
        ...activePayloadFromHistory,
        ...buildActiveRevisionPayload({
          action: MR_ACTION.APPROVE,
          userId,
          extra: {
            versi:
              beforeHistoryJson.versi_sesudah ||
              activePayloadFromHistory.versi ||
              beforeActiveJson.versi,
            status_revisi: MR_STATUS.APPROVED,
          },
        }),
      },
      { transaction }
    );

    await updateHistoryWorkflow({
      history,
      action: MR_ACTION.APPROVE,
      userId,
      statusRevisi: MR_STATUS.APPROVED,
      note,
      transaction,
    });

    const afterHistoryJson = getPlainJson(history);
    const afterActiveJson = getPlainJson(activeRecord);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_APPROVAL_ENTITY_NAME,
      tableName: MR_APPROVAL_TABLE_NAME,
      recordId: history.id,
      action: MR_ACTION.APPROVE,
      userId,
      beforeJson: {
        history: beforeHistoryJson,
        active: beforeActiveJson,
      },
      afterJson: {
        history: afterHistoryJson,
        active: afterActiveJson,
      },
      description: "Approve history MR dan update active record dari after_json.",
      request,
    });

    await transaction.commit();

    return {
      activeRecord,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const tolakHistory = async ({
  sequelize,
  ActiveModel,
  HistoryModel,
  AuditModel = null,
  historyId,
  userId,
  note,
  historyForeignKey = "mr_planning_risk_id",
  request = null,
}) => {
  const transaction = await sequelize.transaction();

  try {
    if (!note) {
      throw createGovernanceError({
        message: "Alasan penolakan wajib diisi.",
        code: "MR_REJECT_NOTE_REQUIRED",
      });
    }

    const history = await findHistoryById({
      HistoryModel,
      historyId,
      transaction,
    });

    const activeRecord = await findActiveByHistory({
      ActiveModel,
      history,
      historyForeignKey,
      transaction,
    });

    const beforeHistoryJson = getPlainJson(history);
    const beforeActiveJson = getPlainJson(activeRecord);

    ensureStatusAllowed({
      currentStatus: beforeHistoryJson.status_revisi,
      allowedStatuses: [MR_STATUS.VERIFIKASI],
      action: MR_ACTION.TOLAK,
    });

    await updateHistoryWorkflow({
      history,
      action: MR_ACTION.TOLAK,
      userId,
      statusRevisi: MR_STATUS.DITOLAK,
      note,
      transaction,
    });

    await activeRecord.update(
      buildActiveRevisionPayload({
        action: MR_ACTION.TOLAK,
        userId,
        extra: {
          status_revisi: MR_STATUS.DITOLAK,
        },
      }),
      { transaction }
    );

    const afterHistoryJson = getPlainJson(history);
    const afterActiveJson = getPlainJson(activeRecord);

    await buildAndWriteAuditLog({
      AuditModel,
      transaction,
      moduleName: "MR_EPELARA",
      entityName: MR_APPROVAL_ENTITY_NAME,
      tableName: MR_APPROVAL_TABLE_NAME,
      recordId: history.id,
      action: MR_ACTION.TOLAK,
      userId,
      beforeJson: {
        history: beforeHistoryJson,
        active: beforeActiveJson,
      },
      afterJson: {
        history: afterHistoryJson,
        active: afterActiveJson,
      },
      description: "Tolak history MR.",
      request,
    });

    await transaction.commit();

    return {
      activeRecord,
      history,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  DEFAULT_APPROVAL_BLOCKED_ACTIVE_FIELDS,
  MR_APPROVAL_ENTITY_NAME,
  MR_APPROVAL_TABLE_NAME,

  sanitizeAfterJsonForActive,
  findHistoryById,
  findActiveByHistory,
  updateHistoryWorkflow,
  verifikasiHistory,
  approveHistory,
  tolakHistory,
};