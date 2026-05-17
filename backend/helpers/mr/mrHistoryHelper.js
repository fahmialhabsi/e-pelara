"use strict";

/**
 * MR History Helper
 * ---------------------------------------------------------------------------
 * Reusable helper untuk history immutable MR e-Pelara.
 *
 * Field yang dipakai sesuai model nyata:
 * - versi_sebelum
 * - versi_sesudah
 * - before_json
 * - after_json
 * - alasan_revisi
 * - status_revisi
 * - dibuat_oleh
 * - diverifikasi_oleh
 * - disetujui_oleh
 * - ditolak_oleh
 * - dibuat_pada
 * - diverifikasi_pada
 * - disetujui_pada
 * - ditolak_pada
 *
 * Dilarang memakai:
 * - version
 * - approved_by
 * - approved_at
 * - verified_by
 * - verified_at
 * - rejected_by
 * - rejected_at
 * untuk tabel history risk/mitigation/monitoring.
 */

const {
  MR_ACTION,
  MR_STATUS,
  ensureValidAction,
  ensureValidStatus,
  buildHistoryActorPayload,
  createGovernanceError,
} = require("./mrApprovalHelper");

const DEFAULT_HISTORY_FIELD = "mr_planning_risk_id";

const HISTORY_FOREIGN_KEYS = Object.freeze({
  risk: "mr_planning_risk_id",
  mitigation: "mr_planning_mitigation_id",
  monitoring: "mr_planning_monitoring_id",
});

const cloneJson = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  return JSON.parse(JSON.stringify(value));
};

const getPlainJson = (record) => {
  if (!record) return null;

  if (typeof record.get === "function") {
    return cloneJson(record.get({ plain: true }));
  }

  return cloneJson(record);
};

const getCurrentVersi = (record) => {
  const plain = getPlainJson(record);
  const rawVersi = plain?.versi;

  if (rawVersi === undefined || rawVersi === null || rawVersi === "") {
    return 0;
  }

  const versi = Number(rawVersi);

  if (Number.isNaN(versi)) {
    throw createGovernanceError({
      message: "Field versi pada active record tidak valid.",
      code: "MR_INVALID_ACTIVE_VERSI",
      details: {
        versi: rawVersi,
      },
    });
  }

  return versi;
};

const buildNextVersi = ({
  currentVersi = 0,
  increment = true,
}) => {
  const versiNumber = Number(currentVersi || 0);

  if (Number.isNaN(versiNumber)) {
    throw createGovernanceError({
      message: "Versi saat ini tidak valid.",
      code: "MR_INVALID_CURRENT_VERSI",
      details: {
        currentVersi,
      },
    });
  }

  return increment ? versiNumber + 1 : versiNumber;
};

const getHistoryForeignKey = (entityType = "risk") => {
  return HISTORY_FOREIGN_KEYS[entityType] || DEFAULT_HISTORY_FIELD;
};

const getLatestHistory = async ({
  HistoryModel,
  activeId,
  historyForeignKey = DEFAULT_HISTORY_FIELD,
  transaction = null,
}) => {
  if (!HistoryModel) {
    throw createGovernanceError({
      message: "HistoryModel wajib tersedia.",
      code: "MR_HISTORY_MODEL_REQUIRED",
    });
  }

  if (!activeId) {
    throw createGovernanceError({
      message: "activeId wajib tersedia untuk mencari history terakhir.",
      code: "MR_ACTIVE_ID_REQUIRED",
    });
  }

  return HistoryModel.findOne({
    where: {
      [historyForeignKey]: activeId,
    },
    order: [
      ["versi_sesudah", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });
};

const getLatestApprovedHistory = async ({
  HistoryModel,
  activeId,
  historyForeignKey = DEFAULT_HISTORY_FIELD,
  transaction = null,
}) => {
  if (!HistoryModel) {
    throw createGovernanceError({
      message: "HistoryModel wajib tersedia.",
      code: "MR_HISTORY_MODEL_REQUIRED",
    });
  }

  if (!activeId) {
    throw createGovernanceError({
      message: "activeId wajib tersedia untuk mencari history approved.",
      code: "MR_ACTIVE_ID_REQUIRED",
    });
  }

  return HistoryModel.findOne({
    where: {
      [historyForeignKey]: activeId,
      status_revisi: MR_STATUS.APPROVED,
    },
    order: [
      ["versi_sesudah", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });
};

const resolveVersiPair = ({
  activeRecord = null,
  beforeJson = null,
  nextVersi = null,
  increment = true,
}) => {
  const sourceVersi =
    beforeJson?.versi !== undefined && beforeJson?.versi !== null
      ? Number(beforeJson.versi)
      : getCurrentVersi(activeRecord);

  if (Number.isNaN(sourceVersi)) {
    throw createGovernanceError({
      message: "versi_sebelum tidak valid.",
      code: "MR_INVALID_VERSI_SEBELUM",
      details: {
        beforeJsonVersi: beforeJson?.versi,
      },
    });
  }

  const resolvedNextVersi =
    nextVersi !== null && nextVersi !== undefined
      ? Number(nextVersi)
      : buildNextVersi({
          currentVersi: sourceVersi,
          increment,
        });

  if (Number.isNaN(resolvedNextVersi)) {
    throw createGovernanceError({
      message: "versi_sesudah tidak valid.",
      code: "MR_INVALID_VERSI_SESUDAH",
      details: {
        nextVersi,
      },
    });
  }

  return {
    versi_sebelum: sourceVersi,
    versi_sesudah: resolvedNextVersi,
  };
};

const ensureHistoryJsonValid = ({
  before_json,
  after_json,
  action,
}) => {
  ensureValidAction(action);

  if (action !== MR_ACTION.CREATE && before_json === null) {
    throw createGovernanceError({
      message: "before_json wajib tersedia untuk history selain create.",
      code: "MR_BEFORE_JSON_REQUIRED",
    });
  }

  if (action !== MR_ACTION.DELETE && after_json === null) {
    throw createGovernanceError({
      message: "after_json wajib tersedia untuk history.",
      code: "MR_AFTER_JSON_REQUIRED",
    });
  }
};

const buildHistoryPayload = ({
  activeRecord,
  activeId = null,
  entityType = "risk",
  historyForeignKey = null,
  beforeJson = null,
  afterJson = null,
  action = MR_ACTION.UPDATE,
  statusRevisi = null,
  alasanRevisi = null,
  userId,
  now = new Date(),
  nextVersi = null,
  incrementVersi = true,
  extra = {},
}) => {
  ensureValidAction(action);

  const resolvedHistoryForeignKey =
    historyForeignKey || getHistoryForeignKey(entityType);

  const plainActive = getPlainJson(activeRecord);
  const resolvedActiveId = activeId || plainActive?.id;

  if (!resolvedActiveId) {
    throw createGovernanceError({
      message: "ID active record wajib tersedia untuk membuat history.",
      code: "MR_HISTORY_ACTIVE_ID_REQUIRED",
    });
  }

  if (!userId) {
    throw createGovernanceError({
      message: "User actor wajib tersedia untuk membuat history.",
      code: "MR_HISTORY_USER_REQUIRED",
    });
  }

  const before_json =
    beforeJson !== undefined ? cloneJson(beforeJson) : getPlainJson(activeRecord);

  const after_json =
    afterJson !== undefined ? cloneJson(afterJson) : getPlainJson(activeRecord);

  ensureHistoryJsonValid({
    before_json,
    after_json,
    action,
  });

  const finalStatus =
    statusRevisi ||
    after_json?.status_revisi ||
    before_json?.status_revisi ||
    MR_STATUS.DRAFT;

  ensureValidStatus(finalStatus);

  const { versi_sebelum, versi_sesudah } = resolveVersiPair({
    activeRecord,
    beforeJson: before_json,
    nextVersi,
    increment: incrementVersi,
  });

  const actorPayload = buildHistoryActorPayload({
    action,
    userId,
    now,
  });

  return {
    [resolvedHistoryForeignKey]: resolvedActiveId,
    versi_sebelum,
    versi_sesudah,
    before_json,
    after_json,
    alasan_revisi: alasanRevisi || null,
    status_revisi: finalStatus,
    ...actorPayload,
    ...extra,
  };
};

const createHistory = async ({
  HistoryModel,
  payload,
  transaction = null,
}) => {
  if (!HistoryModel) {
    throw createGovernanceError({
      message: "HistoryModel wajib tersedia.",
      code: "MR_HISTORY_MODEL_REQUIRED",
    });
  }

  if (!payload || typeof payload !== "object") {
    throw createGovernanceError({
      message: "Payload history tidak valid.",
      code: "MR_HISTORY_PAYLOAD_INVALID",
    });
  }

  return HistoryModel.create(payload, { transaction });
};

const buildRebuildPayloadFromHistory = ({
  history,
  userId,
  now = new Date(),
  blockedFields = [],
}) => {
  if (!history) {
    throw createGovernanceError({
      message: "History approved terakhir tidak ditemukan.",
      status: 404,
      code: "MR_APPROVED_HISTORY_NOT_FOUND",
    });
  }

  const plainHistory = getPlainJson(history);
  const afterJson = cloneJson(plainHistory?.after_json);

  if (!afterJson || typeof afterJson !== "object") {
    throw createGovernanceError({
      message: "after_json pada history approved tidak valid.",
      code: "MR_INVALID_APPROVED_AFTER_JSON",
    });
  }

  const defaultBlockedFields = [
    "id",
    "created_at",
    "updated_at",
    "createdAt",
    "updatedAt",
    "deleted_at",
    "deletedAt",
    "before_json",
    "after_json",
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
  ];

  [...defaultBlockedFields, ...blockedFields].forEach((field) => {
    delete afterJson[field];
  });

  return {
    ...afterJson,
    status_revisi: MR_STATUS.APPROVED,
    last_revised_at: now,
    last_revised_by: userId,
  };
};

module.exports = {
  DEFAULT_HISTORY_FIELD,
  HISTORY_FOREIGN_KEYS,

  cloneJson,
  getPlainJson,
  getCurrentVersi,
  buildNextVersi,
  getHistoryForeignKey,
  getLatestHistory,
  getLatestApprovedHistory,
  resolveVersiPair,
  ensureHistoryJsonValid,
  buildHistoryPayload,
  createHistory,
  buildRebuildPayloadFromHistory,
};