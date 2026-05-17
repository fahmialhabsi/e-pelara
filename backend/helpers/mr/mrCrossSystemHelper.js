"use strict";

/**
 * MR Cross-System Helper
 * ---------------------------------------------------------------------------
 * Helper untuk linkage e-Pelara ↔ e-SIGAP/SPIP/LAKIP/LK.
 *
 * Prinsip:
 * - e-Pelara tidak membuat ulang SPIP/RTP/evidence.
 * - Semua linkage lintas sistem lewat mr_cross_system_link.
 * - Kode sistem harus backend-safe:
 *   e_pelara, e_sigap, spip, lakip, lk.
 *
 * Catatan:
 * mrAssociations.js sebelumnya memakai scope source_system: "e-Pelara".
 * Helper ini mengunci standar baru di service/controller berikutnya.
 */

const { createGovernanceError } = require("./mrApprovalHelper");
const {
  MR_SYSTEM_CODE,
  MR_SYSTEM_CODE_LIST,
  normalizeSystemCode,
  validateCrossSystemPayload,
} = require("./mrValidationHelper");

const MR_LINK_TYPE = Object.freeze({
  RISK_MAPPING: "risk_mapping",
  RTP_MAPPING: "rtp_mapping",
  MONITORING_MAPPING: "monitoring_mapping",
  EVIDENCE_MAPPING: "evidence_mapping",
  APPROVAL_MAPPING: "approval_mapping",
  SNAPSHOT_MAPPING: "snapshot_mapping",
  DASHBOARD_MAPPING: "dashboard_mapping",
});

const MR_LINK_STATUS = Object.freeze({
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
  BROKEN: "broken",
});

const MR_LINK_TYPE_LIST = Object.freeze(Object.values(MR_LINK_TYPE));
const MR_LINK_STATUS_LIST = Object.freeze(Object.values(MR_LINK_STATUS));

const SPIP_TARGET_TABLE = Object.freeze({
  RISK_REGISTER: "spip_risk_register",
  RTP: "spip_rtp",
  MONITORING: "spip_monitoring",
  EVIDENCE_LINK: "spip_evidence_link",
});

const isValidLinkType = (linkType) => {
  return MR_LINK_TYPE_LIST.includes(linkType);
};

const isValidLinkStatus = (linkStatus) => {
  return MR_LINK_STATUS_LIST.includes(linkStatus);
};

const ensureValidLinkType = (linkType) => {
  if (!isValidLinkType(linkType)) {
    throw createGovernanceError({
      message: `link_type tidak valid: ${linkType}`,
      code: "MR_INVALID_LINK_TYPE",
      details: {
        allowed_link_types: MR_LINK_TYPE_LIST,
      },
    });
  }
};

const ensureValidLinkStatus = (linkStatus) => {
  if (!isValidLinkStatus(linkStatus)) {
    throw createGovernanceError({
      message: `link_status tidak valid: ${linkStatus}`,
      code: "MR_INVALID_LINK_STATUS",
      details: {
        allowed_link_statuses: MR_LINK_STATUS_LIST,
      },
    });
  }
};

const inferLinkedSpipFields = ({
  target_table,
  target_id,
  link_type,
}) => {
  const payload = {};

  if (target_table === SPIP_TARGET_TABLE.RISK_REGISTER || link_type === MR_LINK_TYPE.RISK_MAPPING) {
    payload.linked_spip_risk_id = target_id;
  }

  if (target_table === SPIP_TARGET_TABLE.RTP || link_type === MR_LINK_TYPE.RTP_MAPPING) {
    payload.linked_spip_rtp_id = target_id;
  }

  if (target_table === SPIP_TARGET_TABLE.MONITORING || link_type === MR_LINK_TYPE.MONITORING_MAPPING) {
    payload.linked_spip_monitoring_id = target_id;
  }

  if (target_table === SPIP_TARGET_TABLE.EVIDENCE_LINK || link_type === MR_LINK_TYPE.EVIDENCE_MAPPING) {
    payload.linked_spip_evidence_id = target_id;
  }

  return payload;
};

const buildCrossSystemLinkPayload = ({
  source_system = MR_SYSTEM_CODE.E_PELARA,
  source_module = "manajemen_risiko",
  source_table = "mr_planning_risk",
  source_id,

  target_system,
  target_module,
  target_table,
  target_id,

  link_type,
  link_status = MR_LINK_STATUS.DRAFT,
  link_note = null,

  is_verified = false,
  verified_by = null,
  verified_at = null,
  created_by = null,

  extra = {},
}) => {
  ensureValidLinkType(link_type);
  ensureValidLinkStatus(link_status);

  const normalizedSystems = validateCrossSystemPayload({
    source_system,
    source_module,
    source_table,
    source_id,
    target_system,
    target_module,
    target_table,
    target_id,
  });

  const normalizedSourceSystem = normalizedSystems.source_system;
  const normalizedTargetSystem = normalizedSystems.target_system;

  const linkedSpipFields = inferLinkedSpipFields({
    target_table,
    target_id,
    link_type,
  });

  return {
    source_system: normalizedSourceSystem,
    source_module,
    source_table,
    source_id,

    target_system: normalizedTargetSystem,
    target_module,
    target_table,
    target_id,

    ...linkedSpipFields,

    link_type,
    link_status,
    link_note,

    is_verified,
    verified_by,
    verified_at,
    created_by,

    ...extra,
  };
};

const buildPlanningRiskToSpipRiskPayload = ({
  riskId,
  spipRiskId,
  createdBy,
  note = null,
}) => {
  return buildCrossSystemLinkPayload({
    source_system: MR_SYSTEM_CODE.E_PELARA,
    source_module: "mr_planning",
    source_table: "mr_planning_risk",
    source_id: riskId,

    target_system: MR_SYSTEM_CODE.SPIP,
    target_module: "spip",
    target_table: SPIP_TARGET_TABLE.RISK_REGISTER,
    target_id: spipRiskId,

    link_type: MR_LINK_TYPE.RISK_MAPPING,
    link_status: MR_LINK_STATUS.DRAFT,
    link_note: note,
    created_by: createdBy,
  });
};

const buildPlanningRiskToSpipRtpPayload = ({
  riskId,
  spipRtpId,
  createdBy,
  note = null,
}) => {
  return buildCrossSystemLinkPayload({
    source_system: MR_SYSTEM_CODE.E_PELARA,
    source_module: "mr_planning",
    source_table: "mr_planning_risk",
    source_id: riskId,

    target_system: MR_SYSTEM_CODE.SPIP,
    target_module: "spip",
    target_table: SPIP_TARGET_TABLE.RTP,
    target_id: spipRtpId,

    link_type: MR_LINK_TYPE.RTP_MAPPING,
    link_status: MR_LINK_STATUS.DRAFT,
    link_note: note,
    created_by: createdBy,
  });
};

const buildPlanningRiskToSpipMonitoringPayload = ({
  riskId,
  spipMonitoringId,
  createdBy,
  note = null,
}) => {
  return buildCrossSystemLinkPayload({
    source_system: MR_SYSTEM_CODE.E_PELARA,
    source_module: "mr_planning",
    source_table: "mr_planning_risk",
    source_id: riskId,

    target_system: MR_SYSTEM_CODE.SPIP,
    target_module: "spip",
    target_table: SPIP_TARGET_TABLE.MONITORING,
    target_id: spipMonitoringId,

    link_type: MR_LINK_TYPE.MONITORING_MAPPING,
    link_status: MR_LINK_STATUS.DRAFT,
    link_note: note,
    created_by: createdBy,
  });
};

const buildPlanningRiskToSpipEvidencePayload = ({
  riskId,
  spipEvidenceId,
  createdBy,
  note = null,
}) => {
  return buildCrossSystemLinkPayload({
    source_system: MR_SYSTEM_CODE.E_PELARA,
    source_module: "mr_planning",
    source_table: "mr_planning_risk",
    source_id: riskId,

    target_system: MR_SYSTEM_CODE.SPIP,
    target_module: "spip",
    target_table: SPIP_TARGET_TABLE.EVIDENCE_LINK,
    target_id: spipEvidenceId,

    link_type: MR_LINK_TYPE.EVIDENCE_MAPPING,
    link_status: MR_LINK_STATUS.DRAFT,
    link_note: note,
    created_by: createdBy,
  });
};

const buildVerifyCrossSystemLinkPayload = ({
  userId,
  now = new Date(),
}) => {
  if (!userId) {
    throw createGovernanceError({
      message: "User verifier wajib tersedia untuk verifikasi cross-system link.",
      code: "MR_CROSS_SYSTEM_VERIFIER_REQUIRED",
    });
  }

  return {
    link_status: MR_LINK_STATUS.ACTIVE,
    is_verified: true,
    verified_by: userId,
    verified_at: now,
  };
};

const buildMarkBrokenCrossSystemLinkPayload = ({
  note = "Cross-system link terdeteksi broken.",
}) => {
  return {
    link_status: MR_LINK_STATUS.BROKEN,
    is_verified: false,
    link_note: note,
  };
};

const ensureNoDuplicateCrossSystemPayload = async ({
  LinkModel,
  source_system,
  source_table,
  source_id,
  target_system,
  target_table,
  target_id,
  link_type,
  transaction = null,
}) => {
  if (!LinkModel) {
    throw createGovernanceError({
      message: "LinkModel wajib tersedia untuk cek duplicate linkage.",
      code: "MR_CROSS_SYSTEM_LINK_MODEL_REQUIRED",
    });
  }

  const normalizedSourceSystem = normalizeSystemCode(source_system);
  const normalizedTargetSystem = normalizeSystemCode(target_system);

  const existing = await LinkModel.findOne({
    where: {
      source_system: normalizedSourceSystem,
      source_table,
      source_id,
      target_system: normalizedTargetSystem,
      target_table,
      target_id,
      link_type,
    },
    transaction,
  });

  if (existing) {
    throw createGovernanceError({
      message: "Cross-system linkage sudah ada.",
      code: "MR_CROSS_SYSTEM_DUPLICATE_LINK",
      details: {
        source_system: normalizedSourceSystem,
        source_table,
        source_id,
        target_system: normalizedTargetSystem,
        target_table,
        target_id,
        link_type,
      },
    });
  }

  return true;
};

module.exports = {
  MR_SYSTEM_CODE,
  MR_SYSTEM_CODE_LIST,
  MR_LINK_TYPE,
  MR_LINK_STATUS,
  MR_LINK_TYPE_LIST,
  MR_LINK_STATUS_LIST,
  SPIP_TARGET_TABLE,

  isValidLinkType,
  isValidLinkStatus,
  ensureValidLinkType,
  ensureValidLinkStatus,
  inferLinkedSpipFields,
  buildCrossSystemLinkPayload,
  buildPlanningRiskToSpipRiskPayload,
  buildPlanningRiskToSpipRtpPayload,
  buildPlanningRiskToSpipMonitoringPayload,
  buildPlanningRiskToSpipEvidencePayload,
  buildVerifyCrossSystemLinkPayload,
  buildMarkBrokenCrossSystemLinkPayload,
  ensureNoDuplicateCrossSystemPayload,
};