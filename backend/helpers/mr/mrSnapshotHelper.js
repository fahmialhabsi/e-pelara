"use strict";

/**
 * MR Snapshot Helper
 * ---------------------------------------------------------------------------
 * Helper snapshot governance untuk laporan periodik, dashboard summary,
 * dan reporting-ready architecture.
 *
 * Prinsip:
 * - Dashboard/laporan tidak boleh membaca raw table besar langsung.
 * - Snapshot harus periodik:
 *   bulanan, triwulan, semester, tahunan, adhoc.
 * - Snapshot dapat locked setelah approved.
 *
 * Catatan:
 * Model mr_planning_snapshot memang memiliki approved_by dan approved_at.
 * Field tersebut hanya dipakai pada snapshot table, bukan history risk.
 */

const { createGovernanceError } = require("./mrApprovalHelper");
const { cloneJson } = require("./mrHistoryHelper");

const MR_PERIOD_TYPE = Object.freeze({
  BULANAN: "bulanan",
  TRIWULAN: "triwulan",
  SEMESTER: "semester",
  TAHUNAN: "tahunan",
  ADHOC: "adhoc",
});

const MR_PERIOD_TYPE_LIST = Object.freeze(Object.values(MR_PERIOD_TYPE));

const DEFAULT_SNAPSHOT_NUMERIC_FIELDS = Object.freeze([
  "total_risk",
  "total_high_risk",
  "total_medium_risk",
  "total_low_risk",
  "total_mitigated",
  "total_unmitigated",
  "total_overdue",
  "total_warning",
  "total_deviation",
  "approval_pending",
  "approval_approved",
  "approval_rejected",
]);

const DEFAULT_DASHBOARD_NUMERIC_FIELDS = Object.freeze([
  "risk_total",
  "risk_high",
  "risk_medium",
  "risk_low",
  "mitigation_total",
  "mitigation_done",
  "mitigation_overdue",
  "deviation_total",
  "warning_total",
  "approval_pending",
  "approval_approved",
  "approval_rejected",
]);

const isValidPeriodType = (periodeType) => {
  return MR_PERIOD_TYPE_LIST.includes(periodeType);
};

const ensureValidPeriodType = (periodeType) => {
  if (!isValidPeriodType(periodeType)) {
    throw createGovernanceError({
      message: `periode_type tidak valid: ${periodeType}`,
      code: "MR_INVALID_PERIOD_TYPE",
      details: {
        allowed_period_types: MR_PERIOD_TYPE_LIST,
      },
    });
  }
};

const ensurePeriodPayload = ({
  periode_type,
  periode_label,
}) => {
  ensureValidPeriodType(periode_type);

  if (!periode_label) {
    throw createGovernanceError({
      message: "periode_label wajib diisi.",
      code: "MR_PERIOD_LABEL_REQUIRED",
    });
  }
};

const normalizeNumericSummary = ({
  payload = {},
  fields = [],
}) => {
  return fields.reduce((result, field) => {
    const rawValue = payload[field];
    const numericValue = Number(rawValue || 0);

    result[field] = Number.isNaN(numericValue) ? 0 : numericValue;

    return result;
  }, {});
};

const buildSnapshotPayload = ({
  periode_type,
  periode_label,
  periode_awal = null,
  periode_akhir = null,
  tahun = null,
  renstra_id = null,
  opd_id = null,
  summary = {},
  snapshot_json = {},
  generated_by,
  generated_at = new Date(),
  extra = {},
}) => {
  ensurePeriodPayload({
    periode_type,
    periode_label,
  });

  if (!generated_by) {
    throw createGovernanceError({
      message: "generated_by wajib tersedia untuk snapshot.",
      code: "MR_SNAPSHOT_GENERATED_BY_REQUIRED",
    });
  }

  const numericSummary = normalizeNumericSummary({
    payload: summary,
    fields: DEFAULT_SNAPSHOT_NUMERIC_FIELDS,
  });

  return {
    periode_type,
    periode_label,
    periode_awal,
    periode_akhir,
    tahun,
    renstra_id,
    opd_id,

    ...numericSummary,

    snapshot_json: cloneJson(snapshot_json),
    generated_by,
    generated_at,
    is_locked: false,

    ...extra,
  };
};

const buildDashboardSummaryPayload = ({
  periode_type,
  periode_label,
  tahun = null,
  renstra_id = null,
  opd_id = null,
  summary = {},
  summary_json = {},
  generated_by = null,
  last_sync_at = new Date(),
  sync_status = "success",
  extra = {},
}) => {
  ensurePeriodPayload({
    periode_type,
    periode_label,
  });

  const numericSummary = normalizeNumericSummary({
    payload: summary,
    fields: DEFAULT_DASHBOARD_NUMERIC_FIELDS,
  });

  return {
    periode_type,
    periode_label,
    tahun,
    renstra_id,
    opd_id,

    ...numericSummary,

    summary_json: cloneJson(summary_json),
    last_sync_at,
    sync_status,
    generated_by,

    ...extra,
  };
};

const ensureSnapshotNotLocked = (snapshot) => {
  if (!snapshot) {
    throw createGovernanceError({
      message: "Snapshot tidak ditemukan.",
      status: 404,
      code: "MR_SNAPSHOT_NOT_FOUND",
    });
  }

  const plainSnapshot =
    typeof snapshot.get === "function"
      ? snapshot.get({ plain: true })
      : snapshot;

  if (plainSnapshot.is_locked) {
    throw createGovernanceError({
      message: "Snapshot sudah locked dan tidak boleh diubah.",
      code: "MR_SNAPSHOT_LOCKED",
      auditMode: true,
    });
  }
};

const buildSnapshotApprovalPayload = ({
  userId,
  now = new Date(),
}) => {
  if (!userId) {
    throw createGovernanceError({
      message: "User approver wajib tersedia untuk approve snapshot.",
      code: "MR_SNAPSHOT_APPROVER_REQUIRED",
    });
  }

  return {
    approved_by: userId,
    approved_at: now,
    is_locked: true,
  };
};

const buildSnapshotUnlockPayload = ({
  userId,
  now = new Date(),
  reason = null,
}) => {
  if (!userId) {
    throw createGovernanceError({
      message: "User actor wajib tersedia untuk unlock snapshot.",
      code: "MR_SNAPSHOT_UNLOCK_USER_REQUIRED",
    });
  }

  return {
    approved_by: null,
    approved_at: null,
    is_locked: false,
    snapshot_json: {
      unlocked_by: userId,
      unlocked_at: now,
      unlock_reason: reason,
    },
  };
};

module.exports = {
  MR_PERIOD_TYPE,
  MR_PERIOD_TYPE_LIST,
  DEFAULT_SNAPSHOT_NUMERIC_FIELDS,
  DEFAULT_DASHBOARD_NUMERIC_FIELDS,

  isValidPeriodType,
  ensureValidPeriodType,
  ensurePeriodPayload,
  normalizeNumericSummary,
  buildSnapshotPayload,
  buildDashboardSummaryPayload,
  ensureSnapshotNotLocked,
  buildSnapshotApprovalPayload,
  buildSnapshotUnlockPayload,
};