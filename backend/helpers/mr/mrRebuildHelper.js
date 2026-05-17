"use strict";

/**
 * MR Rebuild Helper
 * ---------------------------------------------------------------------------
 * Helper untuk rebuild active data dari history approved terakhir.
 *
 * Prinsip:
 * - Rebuild TIDAK boleh dari input manual frontend.
 * - Rebuild wajib dari after_json history approved terakhir.
 * - History tetap memakai field nyata:
 *   versi_sebelum, versi_sesudah, before_json, after_json,
 *   dibuat_oleh, dibuat_pada, dst.
 * - Active record memakai:
 *   versi, status_revisi, last_revised_at, last_revised_by.
 */

const {
  MR_ACTION,
  MR_STATUS,
  createGovernanceError,
  ensureRecordExists,
} = require("./mrApprovalHelper");

const {
  cloneJson,
  getPlainJson,
  getLatestApprovedHistory,
  buildHistoryPayload,
  createHistory,
} = require("./mrHistoryHelper");

const DEFAULT_REBUILD_BLOCKED_FIELDS = Object.freeze([
  "id",

  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "deleted_at",
  "deletedAt",

  "before_json",
  "after_json",
  "alasan_revisi",

  "versi_sebelum",
  "versi_sesudah",

  "dibuat_oleh",
  "diverifikasi_oleh",
  "disetujui_oleh",
  "ditolak_oleh",

  "dibuat_pada",
  "diverifikasi_pada",
  "disetujui_pada",
  "ditolak_pada",
]);

const ensureHistoryApproved = (history) => {
  if (!history) {
    throw createGovernanceError({
      message: "History approved terakhir tidak ditemukan.",
      status: 404,
      code: "MR_APPROVED_HISTORY_NOT_FOUND",
    });
  }

  const plainHistory = getPlainJson(history);

  if (plainHistory.status_revisi !== MR_STATUS.APPROVED) {
    throw createGovernanceError({
      message: "History rebuild harus berstatus approved.",
      code: "MR_REBUILD_HISTORY_NOT_APPROVED",
      details: {
        status_revisi: plainHistory.status_revisi,
      },
    });
  }

  return plainHistory;
};

const removeBlockedRebuildFields = ({
  payload,
  extraBlockedFields = [],
}) => {
  const cleanPayload = cloneJson(payload) || {};
  const blockedFields = [
    ...DEFAULT_REBUILD_BLOCKED_FIELDS,
    ...extraBlockedFields,
  ];

  blockedFields.forEach((field) => {
    delete cleanPayload[field];
  });

  return cleanPayload;
};

const buildRebuildActivePayload = ({
  approvedHistory,
  userId,
  now = new Date(),
  extraBlockedFields = [],
  extraPayload = {},
}) => {
  if (!userId) {
    throw createGovernanceError({
      message: "User actor wajib tersedia untuk rebuild.",
      code: "MR_REBUILD_USER_REQUIRED",
    });
  }

  const plainHistory = ensureHistoryApproved(approvedHistory);
  const afterJson = cloneJson(plainHistory.after_json);

  if (!afterJson || typeof afterJson !== "object") {
    throw createGovernanceError({
      message: "after_json pada history approved tidak valid untuk rebuild.",
      code: "MR_REBUILD_AFTER_JSON_INVALID",
    });
  }

  const cleanPayload = removeBlockedRebuildFields({
    payload: afterJson,
    extraBlockedFields,
  });

  return {
    ...cleanPayload,
    ...extraPayload,
    status_revisi: MR_STATUS.APPROVED,
    last_revised_at: now,
    last_revised_by: userId,
  };
};

const getApprovedHistoryForRebuild = async ({
  HistoryModel,
  activeId,
  historyForeignKey,
  transaction = null,
}) => {
  return getLatestApprovedHistory({
    HistoryModel,
    activeId,
    historyForeignKey,
    transaction,
  });
};

const buildExplicitRebuildReason = ({
  alasanRevisi = null,
  activeId,
  approvedHistory,
  beforeJson,
  afterJson,
}) => {
  const plainApprovedHistory = getPlainJson(approvedHistory) || {};

  const sourceApprovedHistoryId = plainApprovedHistory.id || null;
  const versiSebelum = beforeJson?.versi ?? null;
  const versiSesudah = afterJson?.versi ?? null;
  const statusSebelum = beforeJson?.status_revisi ?? null;
  const statusSesudah = afterJson?.status_revisi ?? null;

  const baseReason =
    alasanRevisi &&
    String(alasanRevisi).trim() &&
    !String(alasanRevisi).includes("history approved terakhir")
      ? String(alasanRevisi).trim()
      : "Rebuild active dari history approved terakhir.";

  return [
    baseReason,
    `Active ID ${activeId} dikembalikan dari history approved terakhir ID ${sourceApprovedHistoryId}.`,
    `Active versi ${versiSebelum} status ${statusSebelum} dikembalikan menjadi versi ${versiSesudah} status ${statusSesudah}.`,
    "Rebuild ini merupakan rollback governance berbasis immutable history, bukan update manual frontend.",
  ].join(" ");
};

const rebuildActiveRecordFromApprovedHistory = async ({
  ActiveModel,
  HistoryModel,
  activeRecord,
  activeId,
  historyForeignKey,
  userId,
  alasanRevisi = "Rebuild active data dari history approved terakhir.",
  now = new Date(),
  transaction = null,
  extraBlockedFields = [],
  extraPayload = {},
}) => {
  if (!ActiveModel) {
    throw createGovernanceError({
      message: "ActiveModel wajib tersedia untuk rebuild.",
      code: "MR_REBUILD_ACTIVE_MODEL_REQUIRED",
    });
  }

  if (!HistoryModel) {
    throw createGovernanceError({
      message: "HistoryModel wajib tersedia untuk rebuild.",
      code: "MR_REBUILD_HISTORY_MODEL_REQUIRED",
    });
  }

  if (!userId) {
    throw createGovernanceError({
      message: "User actor wajib tersedia untuk rebuild.",
      code: "MR_REBUILD_USER_REQUIRED",
    });
  }

  let record = activeRecord || null;

  if (!record) {
    if (!activeId) {
      throw createGovernanceError({
        message: "activeId wajib tersedia jika activeRecord tidak dikirim.",
        code: "MR_REBUILD_ACTIVE_ID_REQUIRED",
      });
    }

    record = await ActiveModel.findByPk(activeId, { transaction });
  }

  ensureRecordExists(record, "Data active MR untuk rebuild tidak ditemukan.");

  const plainBefore = getPlainJson(record);
  const resolvedActiveId = activeId || plainBefore.id;

  const approvedHistory = await getApprovedHistoryForRebuild({
    HistoryModel,
    activeId: resolvedActiveId,
    historyForeignKey,
    transaction,
  });

  const rebuildPayload = buildRebuildActivePayload({
    approvedHistory,
    userId,
    now,
    extraBlockedFields,
    extraPayload,
  });

  await record.update(rebuildPayload, { transaction });

  const plainAfter = getPlainJson(record);

  const explicitRebuildReason = buildExplicitRebuildReason({
  alasanRevisi,
  activeId: resolvedActiveId,
  approvedHistory,
  beforeJson: plainBefore,
  afterJson: plainAfter,
});

  const historyPayload = buildHistoryPayload({
    activeRecord: record,
    activeId: resolvedActiveId,
    historyForeignKey,
    beforeJson: plainBefore,
    afterJson: plainAfter,
    action: MR_ACTION.REBUILD,
    statusRevisi: MR_STATUS.APPROVED,
    alasanRevisi: explicitRebuildReason,
    userId,
    now,
    nextVersi: plainAfter.versi,
    incrementVersi: false,
  });

  const history = await createHistory({
    HistoryModel,
    payload: historyPayload,
    transaction,
  });

  return {
    record,
    history,
    approved_history: approvedHistory,
    rebuild_payload: rebuildPayload,
    alasan_revisi: explicitRebuildReason,
    source_approved_history_id: getPlainJson(approvedHistory)?.id || null,
  };
};

module.exports = {
  DEFAULT_REBUILD_BLOCKED_FIELDS,

  ensureHistoryApproved,
  removeBlockedRebuildFields,
  buildRebuildActivePayload,
  getApprovedHistoryForRebuild,
  rebuildActiveRecordFromApprovedHistory,
  buildExplicitRebuildReason,
};