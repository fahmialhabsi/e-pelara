"use strict";

/**
 * MR Approval Helper
 * ---------------------------------------------------------------------------
 * Reusable helper untuk workflow approval MR e-Pelara.
 *
 * Prinsip:
 * - Tidak memakai field generic history seperti version, approved_by, approved_at.
 * - Active record MR memakai:
 *   status_revisi, versi, last_revised_at, last_revised_by.
 * - History MR memakai:
 *   dibuat_oleh, diverifikasi_oleh, disetujui_oleh, ditolak_oleh,
 *   dibuat_pada, diverifikasi_pada, disetujui_pada, ditolak_pada.
 */

const MR_STATUS = Object.freeze({
  DRAFT: "draft",
  VERIFIKASI: "verifikasi",
  APPROVED: "approved",
  DITOLAK: "ditolak",
});

const MR_ACTION = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  REVISI: "revisi",
  SUBMIT: "submit",
  VERIFIKASI: "verifikasi",
  APPROVE: "approve",
  TOLAK: "tolak",
  REBUILD: "rebuild",
  DELETE: "delete",
});

const MR_STATUS_LIST = Object.freeze(Object.values(MR_STATUS));
const MR_ACTION_LIST = Object.freeze(Object.values(MR_ACTION));

const createGovernanceError = ({
  message,
  status = 400,
  blocked = true,
  auditMode = false,
  code = "MR_APPROVAL_GOVERNANCE_ERROR",
  details = null,
}) => {
  const error = new Error(message);
  error.status = status;
  error.blocked = blocked;
  error.audit_mode = auditMode;
  error.code = code;
  if (details) error.details = details;
  return error;
};

const isValidStatus = (status) => MR_STATUS_LIST.includes(status);

const isValidAction = (action) => MR_ACTION_LIST.includes(action);

const ensureValidStatus = (status) => {
  if (!isValidStatus(status)) {
    throw createGovernanceError({
      message: `Status revisi tidak valid: ${status}`,
      code: "MR_INVALID_STATUS_REVISI",
      details: {
        allowed_statuses: MR_STATUS_LIST,
      },
    });
  }
};

const ensureValidAction = (action) => {
  if (!isValidAction(action)) {
    throw createGovernanceError({
      message: `Aksi approval tidak valid: ${action}`,
      code: "MR_INVALID_APPROVAL_ACTION",
      details: {
        allowed_actions: MR_ACTION_LIST,
      },
    });
  }
};

const ensureRecordExists = (record, message = "Data MR tidak ditemukan.") => {
  if (!record) {
    throw createGovernanceError({
      message,
      status: 404,
      code: "MR_RECORD_NOT_FOUND",
    });
  }
};

const getPlainRecord = (record) => {
  if (!record) return null;
  if (typeof record.get === "function") {
    return record.get({ plain: true });
  }
  return JSON.parse(JSON.stringify(record));
};

const getRecordStatus = (record) => {
  const plain = getPlainRecord(record);
  return plain?.status_revisi || null;
};

const isApproved = (recordOrStatus) => {
  const status =
    typeof recordOrStatus === "string"
      ? recordOrStatus
      : getRecordStatus(recordOrStatus);

  return status === MR_STATUS.APPROVED;
};

const ensureNotApprovedForDirectUpdate = (record) => {
  ensureRecordExists(record);

  if (isApproved(record)) {
    throw createGovernanceError({
      message: "Data sudah approved. Gunakan endpoint revisi.",
      status: 400,
      blocked: true,
      auditMode: true,
      code: "MR_APPROVED_DIRECT_UPDATE_BLOCKED",
    });
  }
};

const ensureStatusAllowed = ({
  currentStatus,
  allowedStatuses = [],
  action = null,
}) => {
  ensureValidStatus(currentStatus);

  allowedStatuses.forEach(ensureValidStatus);

  if (!allowedStatuses.includes(currentStatus)) {
    throw createGovernanceError({
      message: action
        ? `Status ${currentStatus} tidak diperbolehkan untuk aksi ${action}.`
        : `Status ${currentStatus} tidak diperbolehkan untuk aksi ini.`,
      status: 400,
      blocked: true,
      auditMode: true,
      code: "MR_STATUS_NOT_ALLOWED",
      details: {
        current_status: currentStatus,
        allowed_statuses: allowedStatuses,
        action,
      },
    });
  }
};

const getAllowedStatusesByAction = (action) => {
  ensureValidAction(action);

  switch (action) {
    case MR_ACTION.CREATE:
      return [];

    case MR_ACTION.UPDATE:
      return [MR_STATUS.DRAFT, MR_STATUS.DITOLAK];

    case MR_ACTION.REVISI:
      return [MR_STATUS.APPROVED];

    case MR_ACTION.SUBMIT:
      return [MR_STATUS.DRAFT, MR_STATUS.DITOLAK];

    case MR_ACTION.VERIFIKASI:
      return [MR_STATUS.DRAFT];

    case MR_ACTION.APPROVE:
      return [MR_STATUS.VERIFIKASI];

    case MR_ACTION.TOLAK:
      return [MR_STATUS.VERIFIKASI];

    case MR_ACTION.REBUILD:
      return [MR_STATUS.DITOLAK, MR_STATUS.DRAFT, MR_STATUS.APPROVED];

    case MR_ACTION.DELETE:
      return [MR_STATUS.DRAFT, MR_STATUS.DITOLAK];

    default:
      return [];
  }
};

const ensureActionAllowedForRecord = ({ record, action }) => {
  ensureRecordExists(record);
  ensureValidAction(action);

  const currentStatus = getRecordStatus(record);
  const allowedStatuses = getAllowedStatusesByAction(action);

  if (allowedStatuses.length === 0) return;

  ensureStatusAllowed({
    currentStatus,
    allowedStatuses,
    action,
  });
};

const getNextStatusByAction = (action) => {
  ensureValidAction(action);

  switch (action) {
    case MR_ACTION.CREATE:
    case MR_ACTION.UPDATE:
    case MR_ACTION.REVISI:
      return MR_STATUS.DRAFT;

    case MR_ACTION.SUBMIT:
    case MR_ACTION.VERIFIKASI:
      return MR_STATUS.VERIFIKASI;

    case MR_ACTION.APPROVE:
      return MR_STATUS.APPROVED;

    case MR_ACTION.TOLAK:
      return MR_STATUS.DITOLAK;

    case MR_ACTION.REBUILD:
      return MR_STATUS.APPROVED;

    case MR_ACTION.DELETE:
      return null;

    default:
      return null;
  }
};

const buildActiveRevisionPayload = ({
  action,
  userId,
  now = new Date(),
  extra = {},
}) => {
  ensureValidAction(action);

  if (!userId) {
    throw createGovernanceError({
      message: "User actor wajib tersedia.",
      code: "MR_ACTOR_REQUIRED",
    });
  }

  const nextStatus = getNextStatusByAction(action);

  const payload = {
    ...extra,
    last_revised_at: now,
    last_revised_by: userId,
  };

  if (nextStatus) {
    payload.status_revisi = nextStatus;
  }

  return payload;
};

const buildHistoryActorPayload = ({
  action,
  userId,
  now = new Date(),
}) => {
  ensureValidAction(action);

  if (!userId) {
    throw createGovernanceError({
      message: "User actor history wajib tersedia.",
      code: "MR_HISTORY_ACTOR_REQUIRED",
    });
  }

  switch (action) {
    case MR_ACTION.CREATE:
    case MR_ACTION.UPDATE:
    case MR_ACTION.REVISI:
    case MR_ACTION.SUBMIT:
    case MR_ACTION.REBUILD:
      return {
        dibuat_oleh: userId,
        dibuat_pada: now,
      };

    case MR_ACTION.VERIFIKASI:
      return {
        diverifikasi_oleh: userId,
        diverifikasi_pada: now,
      };

    case MR_ACTION.APPROVE:
      return {
        disetujui_oleh: userId,
        disetujui_pada: now,
      };

    case MR_ACTION.TOLAK:
      return {
        ditolak_oleh: userId,
        ditolak_pada: now,
      };

    case MR_ACTION.DELETE:
      return {
        dibuat_oleh: userId,
        dibuat_pada: now,
      };

    default:
      return {
        dibuat_oleh: userId,
        dibuat_pada: now,
      };
  }
};

const buildApprovalMonitoringPayload = ({
  action,
  entityType,
  entityId,
  riskId,
  userId,
  note = null,
  now = new Date(),
}) => {
  ensureValidAction(action);

  if (!riskId || !entityType || !entityId || !userId) {
    throw createGovernanceError({
      message: "Payload approval monitoring tidak lengkap.",
      code: "MR_APPROVAL_MONITORING_PAYLOAD_INVALID",
      details: {
        required_fields: [
          "riskId",
          "entityType",
          "entityId",
          "userId",
        ],
      },
    });
  }

  const status_revisi = getNextStatusByAction(action);

  const payload = {
    mr_planning_risk_id: riskId,
    entity_type: entityType,
    entity_id: entityId,
    status_revisi,
    approval_note: note,
    current_step: action,
  };

  /**
   * Catatan:
   * Tabel mr_planning_approval_monitoring memang memakai field Inggris
   * submitted_by, verified_by, approved_by, rejected_by.
   * Field ini hanya dipakai untuk tabel approval monitoring, bukan history risk.
   */
  if ([MR_ACTION.CREATE, MR_ACTION.UPDATE, MR_ACTION.REVISI, MR_ACTION.SUBMIT].includes(action)) {
    payload.submitted_by = userId;
    payload.submitted_at = now;
  }

  if (action === MR_ACTION.VERIFIKASI) {
    payload.verified_by = userId;
    payload.verified_at = now;
  }

  if (action === MR_ACTION.APPROVE) {
    payload.approved_by = userId;
    payload.approved_at = now;
    payload.is_locked = true;
  }

  if (action === MR_ACTION.TOLAK) {
    payload.rejected_by = userId;
    payload.rejected_at = now;
    payload.is_locked = false;
  }

  return payload;
};

module.exports = {
  MR_STATUS,
  MR_ACTION,
  MR_STATUS_LIST,
  MR_ACTION_LIST,

  createGovernanceError,
  isValidStatus,
  isValidAction,
  ensureValidStatus,
  ensureValidAction,
  ensureRecordExists,
  getPlainRecord,
  getRecordStatus,
  isApproved,
  ensureNotApprovedForDirectUpdate,
  ensureStatusAllowed,
  getAllowedStatusesByAction,
  ensureActionAllowedForRecord,
  getNextStatusByAction,
  buildActiveRevisionPayload,
  buildHistoryActorPayload,
  buildApprovalMonitoringPayload,
};