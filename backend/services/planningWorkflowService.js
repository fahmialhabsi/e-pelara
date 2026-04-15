"use strict";

const WORKFLOW_STATUS = Object.freeze({
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
});

const DEFAULT_STATUS = WORKFLOW_STATUS.DRAFT;

const WORKFLOW_TRANSITIONS = Object.freeze({
  [WORKFLOW_STATUS.DRAFT]: [WORKFLOW_STATUS.SUBMITTED],
  [WORKFLOW_STATUS.SUBMITTED]: [
    WORKFLOW_STATUS.APPROVED,
    WORKFLOW_STATUS.REJECTED,
    WORKFLOW_STATUS.DRAFT,
  ],
  [WORKFLOW_STATUS.APPROVED]: [WORKFLOW_STATUS.DRAFT],
  [WORKFLOW_STATUS.REJECTED]: [WORKFLOW_STATUS.DRAFT, WORKFLOW_STATUS.SUBMITTED],
});

const ACTION_TO_STATUS = Object.freeze({
  submit: WORKFLOW_STATUS.SUBMITTED,
  approve: WORKFLOW_STATUS.APPROVED,
  reject: WORKFLOW_STATUS.REJECTED,
  revise: WORKFLOW_STATUS.DRAFT,
  reset: WORKFLOW_STATUS.DRAFT,
});

const ADMIN_ONLY_ACTIONS = Object.freeze(["approve", "reject"]);
const ADMIN_ONLY_STATUSES = Object.freeze([
  WORKFLOW_STATUS.APPROVED,
  WORKFLOW_STATUS.REJECTED,
]);
const WORKFLOW_ADMIN_ROLES = Object.freeze(["SUPER_ADMIN", "ADMINISTRATOR"]);

// Samakan normalisasi role dengan middleware allowRoles agar tidak mismatch.
const ROLE_COMPATIBILITY_MAP = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMINISTRATOR",
  KEPALA_DINAS: "ADMINISTRATOR",
  SEKRETARIS: "ADMINISTRATOR",
  KEPALA_BIDANG: "PENGAWAS",
  KEPALA_BIDANG_KETERSEDIAAN: "PENGAWAS",
  KEPALA_BIDANG_DISTRIBUSI: "PENGAWAS",
  KEPALA_BIDANG_KONSUMSI: "PENGAWAS",
  KEPALA_UPTD: "PENGAWAS",
  FUNGSIONAL: "PELAKSANA",
  FUNGSIONAL_PERENCANA: "PELAKSANA",
  FUNGSIONAL_ANALIS: "PELAKSANA",
  PELAKSANA: "PELAKSANA",
  KASUBBAG: "PELAKSANA",
  KASI_UPTD: "PELAKSANA",
  VIEWER: "PELAKSANA",
  GUBERNUR: "PENGAWAS",
});

const SYNC_STATUS = Object.freeze({
  PENDING: "belum_sinkron",
  SYNCED: "sinkron",
  FAILED: "gagal_sinkron",
});

function normalizeStatus(status, fallback = DEFAULT_STATUS) {
  const value = String(status || "").trim().toLowerCase();
  if (Object.values(WORKFLOW_STATUS).includes(value)) return value;
  return fallback;
}

function normalizeSyncStatus(status, fallback = SYNC_STATUS.PENDING) {
  const value = String(status || "").trim().toLowerCase();
  if (Object.values(SYNC_STATUS).includes(value)) return value;
  return fallback;
}

function normalizeAction(action) {
  const key = String(action || "").trim().toLowerCase();
  return ACTION_TO_STATUS[key] ? key : null;
}

function normalizeRole(role) {
  if (typeof role !== "string") return "";
  return role.trim().toUpperCase().replace(/\s+/g, "_");
}

function mapWorkflowRole(role) {
  const normalized = normalizeRole(role);
  return ROLE_COMPATIBILITY_MAP[normalized] || normalized;
}

function isWorkflowAdminRole(role) {
  return WORKFLOW_ADMIN_ROLES.includes(mapWorkflowRole(role));
}

function getAllowedActions() {
  return Object.keys(ACTION_TO_STATUS);
}

function resolveNextStatus(currentStatus, { action, status } = {}) {
  const normalizedAction = normalizeAction(action);
  if (normalizedAction) return ACTION_TO_STATUS[normalizedAction];

  if (status !== undefined && status !== null && String(status).trim() !== "") {
    return normalizeStatus(status, null);
  }

  return null;
}

function canTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus, null);
  if (!to) return false;
  return (WORKFLOW_TRANSITIONS[from] || []).includes(to);
}

function assertTransition(fromStatus, toStatus) {
  if (canTransition(fromStatus, toStatus)) {
    return { ok: true, message: null };
  }

  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus, null);
  const allowed = (WORKFLOW_TRANSITIONS[from] || []).join(", ");

  if (!to) {
    return {
      ok: false,
      message: `Status tujuan tidak valid. Gunakan salah satu: ${Object.values(
        WORKFLOW_STATUS,
      ).join(", ")}`,
    };
  }

  return {
    ok: false,
    message: `Transisi status tidak diizinkan: ${from} -> ${to}. Transisi valid dari ${from}: ${allowed || "-"}`,
  };
}

function toApprovalStatus(status) {
  return normalizeStatus(status).toUpperCase();
}

function isApprovedStatus(status) {
  return normalizeStatus(status, null) === WORKFLOW_STATUS.APPROVED;
}

function isAdminOnlyAction(action) {
  const normalized = normalizeAction(action);
  return normalized ? ADMIN_ONLY_ACTIONS.includes(normalized) : false;
}

function isAdminOnlyStatus(status) {
  const normalized = normalizeStatus(status, null);
  return normalized ? ADMIN_ONLY_STATUSES.includes(normalized) : false;
}

function buildStatusFields(nextStatus, userId = null, previous = null) {
  const status = normalizeStatus(nextStatus);
  const approved = isApprovedStatus(status);
  const wasApproved =
    normalizeStatus(previous?.status, null) === WORKFLOW_STATUS.APPROVED;

  return {
    status,
    approval_status: toApprovalStatus(status),
    disetujui_oleh: approved
      ? wasApproved
        ? previous?.disetujui_oleh ?? userId ?? null
        : userId ?? previous?.disetujui_oleh ?? null
      : null,
    disetujui_at: approved
      ? wasApproved
        ? previous?.disetujui_at ?? new Date()
        : new Date()
      : null,
  };
}

function parseYear(value, { fieldName = "tahun", required = true } = {}) {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`${fieldName} wajib diisi (integer)`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} harus berupa angka`);
  }
  const year = Math.trunc(parsed);
  if (year < 1900 || year > 2200) {
    throw new Error(`${fieldName} di luar rentang yang diizinkan`);
  }
  return year;
}

function assertNonNegative(value, fieldName) {
  if (value === null || value === undefined || value === "") return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} harus berupa angka`);
  }
  if (parsed < 0) {
    throw new Error(`${fieldName} tidak boleh negatif`);
  }
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["1", "true", "yes", "ya", "y"].includes(v)) return true;
    if (["0", "false", "no", "tidak", "n"].includes(v)) return false;
  }
  return fallback;
}

module.exports = {
  WORKFLOW_STATUS,
  WORKFLOW_TRANSITIONS,
  ACTION_TO_STATUS,
  ADMIN_ONLY_ACTIONS,
  ADMIN_ONLY_STATUSES,
  WORKFLOW_ADMIN_ROLES,
  SYNC_STATUS,
  normalizeStatus,
  normalizeSyncStatus,
  normalizeAction,
  normalizeRole,
  mapWorkflowRole,
  isWorkflowAdminRole,
  getAllowedActions,
  resolveNextStatus,
  canTransition,
  assertTransition,
  toApprovalStatus,
  isApprovedStatus,
  isAdminOnlyAction,
  isAdminOnlyStatus,
  buildStatusFields,
  parseYear,
  assertNonNegative,
  parseBoolean,
};
