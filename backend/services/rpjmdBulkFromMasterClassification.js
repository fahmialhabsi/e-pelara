"use strict";

/**
 * Klasifikasi konflik bulk import master → RPJMD (preview & commit konsisten).
 * Nilai category selaras dengan kontrak API / audit.
 */

const CATEGORY = {
  DUPLICATE_MAPPED: "duplicate_mapped",
  DUPLICATE_BY_CODE: "duplicate_by_code",
  DUPLICATE_BY_NAME: "duplicate_by_name",
  LEGACY_PARENT_CONFLICT: "legacy_parent_conflict",
  LEGACY_CHILD_CONFLICT: "legacy_child_conflict",
  LEGACY_PROGRAM_UNMAPPED: "legacy_program_unmapped",
  HIERARCHY_CONFLICT: "hierarchy_conflict",
  OWNERSHIP_CONFLICT: "ownership_conflict",
  FATAL_VALIDATION_ERROR: "fatal_validation_error",
  READY: "ready",
  MISSING_KEGIATAN_CONTEXT: "missing_kegiatan_context",
};

const SEVERITY = {
  FATAL: "fatal",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

const ACTION = {
  INSERT: "insert",
  SKIP: "skip",
  FAIL: "fail",
};

/**
 * @param {object} p
 * @param {string} p.category
 * @param {string} p.severity
 * @param {string} p.action
 * @param {string} p.reason
 * @param {boolean} [p.requires_backfill]
 * @param {string} [p.code] — alias stabil untuk mesin; default = category
 */
function buildClassification(p) {
  const {
    category,
    severity,
    action,
    reason,
    requires_backfill: rb = false,
    code,
  } = p;
  return {
    code: code || category,
    category,
    severity,
    action,
    reason: reason || "",
    requires_backfill: Boolean(rb),
  };
}

/**
 * @param {string} dupType duplicate_master_sub | duplicate_kode_per_periode | duplicate_nama_per_periode
 * @param {object|null} existingRow sub_kegiatan row (partial)
 * @param {number} targetMasterSubId
 */
function classifyDuplicate(dupType, existingRow, targetMasterSubId) {
  const exMaster = existingRow?.master_sub_kegiatan_id;
  const mapped =
    exMaster != null && Number(exMaster) === Number(targetMasterSubId);

  if (dupType === "duplicate_master_sub") {
    return buildClassification({
      category: CATEGORY.DUPLICATE_MAPPED,
      severity: SEVERITY.WARNING,
      action: ACTION.SKIP,
      reason:
        "Sub kegiatan transaksi sudah terhubung ke master_sub_kegiatan_id yang sama.",
      requires_backfill: false,
    });
  }

  if (dupType === "duplicate_kode_per_periode") {
    if (mapped) {
      return buildClassification({
        category: CATEGORY.DUPLICATE_MAPPED,
        severity: SEVERITY.WARNING,
        action: ACTION.SKIP,
        reason:
          "Kode sub sama per periode dan sudah termapping ke master ini.",
        requires_backfill: false,
      });
    }
    const hasMaster = exMaster != null;
    return buildClassification({
      category: hasMaster
        ? CATEGORY.DUPLICATE_BY_CODE
        : CATEGORY.LEGACY_CHILD_CONFLICT,
      severity: SEVERITY.WARNING,
      action: ACTION.SKIP,
      reason: hasMaster
        ? "Kode sub sama per periode tetapi master_sub_kegiatan_id berbeda — butuh penyesuaian/backfill."
        : "Kode sub sama per periode pada data legacy (belum termapping master) — butuh backfill mapping.",
      requires_backfill: true,
      code: hasMaster ? "dup_code_remap_conflict" : "dup_code_legacy_unmapped",
    });
  }

  if (dupType === "duplicate_nama_per_periode") {
    if (mapped) {
      return buildClassification({
        category: CATEGORY.DUPLICATE_MAPPED,
        severity: SEVERITY.WARNING,
        action: ACTION.SKIP,
        reason:
          "Nama sub sama per periode dan sudah termapping ke master ini.",
        requires_backfill: false,
      });
    }
    const hasMaster = exMaster != null;
    return buildClassification({
      category: CATEGORY.DUPLICATE_BY_NAME,
      severity: SEVERITY.WARNING,
      action: ACTION.SKIP,
      reason: hasMaster
        ? "Nama sub sama per periode tetapi master_sub_kegiatan_id berbeda."
        : "Nama sub sama per periode pada data legacy — butuh backfill mapping.",
      requires_backfill: true,
      code: hasMaster ? "dup_name_remap_conflict" : "dup_name_legacy_unmapped",
    });
  }

  return buildClassification({
    category: CATEGORY.DUPLICATE_BY_CODE,
    severity: SEVERITY.WARNING,
    action: ACTION.SKIP,
    reason: `Duplikat: ${dupType}`,
    requires_backfill: false,
  });
}

function fatal(reason) {
  return buildClassification({
    category: CATEGORY.FATAL_VALIDATION_ERROR,
    severity: SEVERITY.FATAL,
    action: ACTION.FAIL,
    reason,
    requires_backfill: false,
  });
}

function ready() {
  return buildClassification({
    category: CATEGORY.READY,
    severity: SEVERITY.INFO,
    action: ACTION.INSERT,
    reason: "Siap diimpor.",
    requires_backfill: false,
  });
}

module.exports = {
  CATEGORY,
  SEVERITY,
  ACTION,
  buildClassification,
  classifyDuplicate,
  fatal,
  ready,
};
