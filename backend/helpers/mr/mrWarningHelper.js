"use strict";

/**
 * MR Warning Helper
 * ---------------------------------------------------------------------------
 * Helper untuk warning governance MR.
 *
 * Mengikuti model mr_planning_warning:
 * - warning_type
 * - warning_level
 * - warning_message
 * - source_table
 * - source_id
 * - is_read
 * - read_by
 * - read_at
 */

const { createGovernanceError } = require("./mrApprovalHelper");

const MR_WARNING_TYPE = Object.freeze({
  RISK_LEVEL: "risk_level",
  DEVIATION: "deviation",
  OVERDUE: "overdue",
  APPROVAL_PENDING: "approval_pending",
  MITIGATION_PENDING: "mitigation_pending",
  MONITORING_PENDING: "monitoring_pending",
  BROKEN_CHAIN: "broken_chain",
  DUPLICATE_DATA: "duplicate_data",
  CROSS_SYSTEM: "cross_system",
});

const MR_WARNING_LEVEL = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
});

const MR_WARNING_TYPE_LIST = Object.freeze(Object.values(MR_WARNING_TYPE));
const MR_WARNING_LEVEL_LIST = Object.freeze(Object.values(MR_WARNING_LEVEL));

const isValidWarningType = (warningType) => {
  return MR_WARNING_TYPE_LIST.includes(warningType);
};

const isValidWarningLevel = (warningLevel) => {
  return MR_WARNING_LEVEL_LIST.includes(warningLevel);
};

const ensureValidWarningType = (warningType) => {
  if (!isValidWarningType(warningType)) {
    throw createGovernanceError({
      message: `warning_type tidak valid: ${warningType}`,
      code: "MR_INVALID_WARNING_TYPE",
      details: {
        allowed_warning_types: MR_WARNING_TYPE_LIST,
      },
    });
  }
};

const ensureValidWarningLevel = (warningLevel) => {
  if (!isValidWarningLevel(warningLevel)) {
    throw createGovernanceError({
      message: `warning_level tidak valid: ${warningLevel}`,
      code: "MR_INVALID_WARNING_LEVEL",
      details: {
        allowed_warning_levels: MR_WARNING_LEVEL_LIST,
      },
    });
  }
};

const buildWarningPayload = ({
  riskId,
  warningType,
  warningLevel = MR_WARNING_LEVEL.LOW,
  warningMessage,
  sourceTable = null,
  sourceId = null,
  extra = {},
}) => {
  if (!riskId) {
    throw createGovernanceError({
      message: "mr_planning_risk_id wajib tersedia untuk warning.",
      code: "MR_WARNING_RISK_ID_REQUIRED",
    });
  }

  ensureValidWarningType(warningType);
  ensureValidWarningLevel(warningLevel);

  if (!warningMessage) {
    throw createGovernanceError({
      message: "warning_message wajib diisi.",
      code: "MR_WARNING_MESSAGE_REQUIRED",
    });
  }

  return {
    mr_planning_risk_id: riskId,
    warning_type: warningType,
    warning_level: warningLevel,
    warning_message: warningMessage,
    source_table: sourceTable,
    source_id: sourceId,
    is_read: false,
    ...extra,
  };
};

const buildRiskLevelWarning = ({
  riskId,
  levelRisiko,
  skorRisiko = null,
  sourceTable = "mr_planning_risk",
  sourceId = null,
}) => {
  const normalizedLevel = String(levelRisiko || "").toLowerCase();

  let warningLevel = MR_WARNING_LEVEL.LOW;

  if (["sedang", "medium"].includes(normalizedLevel)) {
    warningLevel = MR_WARNING_LEVEL.MEDIUM;
  }

  if (["tinggi", "high"].includes(normalizedLevel)) {
    warningLevel = MR_WARNING_LEVEL.HIGH;
  }

  if (["sangat tinggi", "critical", "ekstrem", "extreme"].includes(normalizedLevel)) {
    warningLevel = MR_WARNING_LEVEL.CRITICAL;
  }

  return buildWarningPayload({
    riskId,
    warningType: MR_WARNING_TYPE.RISK_LEVEL,
    warningLevel,
    warningMessage: `Level risiko ${levelRisiko || "-"} dengan skor ${skorRisiko ?? "-"}.`,
    sourceTable,
    sourceId: sourceId || riskId,
  });
};

const buildDeviationWarning = ({
  riskId,
  deviationLevel = MR_WARNING_LEVEL.MEDIUM,
  message,
  sourceTable = "mr_planning_deviation",
  sourceId = null,
}) => {
  ensureValidWarningLevel(deviationLevel);

  return buildWarningPayload({
    riskId,
    warningType: MR_WARNING_TYPE.DEVIATION,
    warningLevel: deviationLevel,
    warningMessage: message || "Terdapat deviasi target/pagu/realisasi yang perlu ditindaklanjuti.",
    sourceTable,
    sourceId,
  });
};

const buildApprovalPendingWarning = ({
  riskId,
  message = "Approval MR masih pending dan perlu ditindaklanjuti.",
  sourceTable = "mr_planning_approval_monitoring",
  sourceId = null,
}) => {
  return buildWarningPayload({
    riskId,
    warningType: MR_WARNING_TYPE.APPROVAL_PENDING,
    warningLevel: MR_WARNING_LEVEL.MEDIUM,
    warningMessage: message,
    sourceTable,
    sourceId,
  });
};

const buildCrossSystemWarning = ({
  riskId,
  message = "Cross-system linkage perlu divalidasi.",
  sourceTable = "mr_cross_system_link",
  sourceId = null,
  warningLevel = MR_WARNING_LEVEL.MEDIUM,
}) => {
  return buildWarningPayload({
    riskId,
    warningType: MR_WARNING_TYPE.CROSS_SYSTEM,
    warningLevel,
    warningMessage: message,
    sourceTable,
    sourceId,
  });
};

const hasCriticalWarnings = (warnings = []) => {
  return warnings.some((warning) => {
    const level = warning.warning_level || warning.level;
    return level === MR_WARNING_LEVEL.CRITICAL;
  });
};

const throwIfCriticalWarnings = ({
  warnings = [],
  message = "Terdapat warning critical yang memblokir proses governance.",
}) => {
  if (hasCriticalWarnings(warnings)) {
    throw createGovernanceError({
      message,
      code: "MR_CRITICAL_WARNING_BLOCKED",
      details: {
        warnings,
      },
    });
  }
};

const buildReadWarningPayload = ({
  userId,
  now = new Date(),
}) => {
  if (!userId) {
    throw createGovernanceError({
      message: "User reader wajib tersedia untuk menandai warning.",
      code: "MR_WARNING_READER_REQUIRED",
    });
  }

  return {
    is_read: true,
    read_by: userId,
    read_at: now,
  };
};

module.exports = {
  MR_WARNING_TYPE,
  MR_WARNING_LEVEL,
  MR_WARNING_TYPE_LIST,
  MR_WARNING_LEVEL_LIST,

  isValidWarningType,
  isValidWarningLevel,
  ensureValidWarningType,
  ensureValidWarningLevel,
  buildWarningPayload,
  buildRiskLevelWarning,
  buildDeviationWarning,
  buildApprovalPendingWarning,
  buildCrossSystemWarning,
  hasCriticalWarnings,
  throwIfCriticalWarnings,
  buildReadWarningPayload,
};