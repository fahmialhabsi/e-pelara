"use strict";

/**
 * MR History Service
 * ---------------------------------------------------------------------------
 * Core service untuk membaca history MR.
 *
 * Service ini read-only untuk history, karena history bersifat immutable.
 */

const {
  createGovernanceError,
  ensureRecordExists,
} = require("../../helpers/mr/mrApprovalHelper");

const {
  getPlainJson,
} = require("../../helpers/mr/mrHistoryHelper");

const DEFAULT_HISTORY_ORDER = Object.freeze([
  ["versi_sesudah", "DESC"],
  ["id", "DESC"],
]);

const buildHistoryWhere = ({
  activeId = null,
  historyForeignKey = "mr_planning_risk_id",
  status_revisi = null,
}) => {
  const where = {};

  if (activeId) {
    where[historyForeignKey] = activeId;
  }

  if (status_revisi) {
    where.status_revisi = status_revisi;
  }

  return where;
};

const getHistoryByActiveId = async ({
  HistoryModel,
  activeId,
  historyForeignKey = "mr_planning_risk_id",
  status_revisi = null,
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
      message: "activeId wajib tersedia.",
      code: "MR_HISTORY_ACTIVE_ID_REQUIRED",
    });
  }

  return HistoryModel.findAll({
    where: buildHistoryWhere({
      activeId,
      historyForeignKey,
      status_revisi,
    }),
    order: DEFAULT_HISTORY_ORDER,
    transaction,
  });
};

const getHistoryDetail = async ({
  HistoryModel,
  historyId,
  transaction = null,
}) => {
  if (!HistoryModel) {
    throw createGovernanceError({
      message: "HistoryModel wajib tersedia.",
      code: "MR_HISTORY_MODEL_REQUIRED",
    });
  }

  if (!historyId) {
    throw createGovernanceError({
      message: "historyId wajib tersedia.",
      code: "MR_HISTORY_ID_REQUIRED",
    });
  }

  const history = await HistoryModel.findByPk(historyId, { transaction });

  ensureRecordExists(history, "History MR tidak ditemukan.");

  return history;
};

const getLatestHistoryByActiveId = async ({
  HistoryModel,
  activeId,
  historyForeignKey = "mr_planning_risk_id",
  status_revisi = null,
  transaction = null,
}) => {
  const histories = await getHistoryByActiveId({
    HistoryModel,
    activeId,
    historyForeignKey,
    status_revisi,
    transaction,
  });

  return histories?.[0] || null;
};

const getLatestApprovedHistoryByActiveId = async ({
  HistoryModel,
  activeId,
  historyForeignKey = "mr_planning_risk_id",
  transaction = null,
}) => {
  return getLatestHistoryByActiveId({
    HistoryModel,
    activeId,
    historyForeignKey,
    status_revisi: "approved",
    transaction,
  });
};

const mapHistoryForFrontend = (history) => {
  const plain = getPlainJson(history);

  if (!plain) return null;

  return {
    id: plain.id,

    versi_sebelum: plain.versi_sebelum,
    versi_sesudah: plain.versi_sesudah,

    before_json: plain.before_json,
    after_json: plain.after_json,

    alasan_revisi: plain.alasan_revisi,
    status_revisi: plain.status_revisi,

    dibuat_oleh: plain.dibuat_oleh,
    diverifikasi_oleh: plain.diverifikasi_oleh,
    disetujui_oleh: plain.disetujui_oleh,
    ditolak_oleh: plain.ditolak_oleh,

    dibuat_pada: plain.dibuat_pada,
    diverifikasi_pada: plain.diverifikasi_pada,
    disetujui_pada: plain.disetujui_pada,
    ditolak_pada: plain.ditolak_pada,

    created_at: plain.created_at,
    updated_at: plain.updated_at,
  };
};

const mapHistoriesForFrontend = (histories = []) => {
  return histories.map(mapHistoryForFrontend);
};

const assertHistoryImmutableWriteBlocked = () => {
  throw createGovernanceError({
    message: "History MR bersifat immutable dan tidak boleh diubah langsung.",
    code: "MR_HISTORY_IMMUTABLE_WRITE_BLOCKED",
    auditMode: true,
  });
};

module.exports = {
  DEFAULT_HISTORY_ORDER,

  buildHistoryWhere,
  getHistoryByActiveId,
  getHistoryDetail,
  getLatestHistoryByActiveId,
  getLatestApprovedHistoryByActiveId,
  mapHistoryForFrontend,
  mapHistoriesForFrontend,
  assertHistoryImmutableWriteBlocked,
};