"use strict";

const { PlanningDocumentVersion } = require("../models");
const db = require("../models");
const {
  buildStandardSnapshotEnvelope,
  writePlanningAudit,
  captureRow,
  auditValuesFromRows,
} = require("../services/planningDocumentAuditService");
const { getPlanningDocumentTrace } = require("../services/planningDocumentTraceService");
const {
  applyPlanningDocumentVersion,
  getRestoreOperationMeta,
} = require("../services/planningDocumentRestoreService");

exports.listVersions = async (req, res) => {
  try {
    const document_type = String(req.params.documentType || "").toLowerCase();
    const document_id = Number(req.params.documentId);
    if (!Number.isFinite(document_id)) {
      return res.status(400).json({ success: false, message: "documentId tidak valid" });
    }
    const rows = await PlanningDocumentVersion.findAll({
      where: { document_type, document_id },
      order: [["id", "DESC"]],
      limit: 200,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getVersionDetail = async (req, res) => {
  try {
    const row = await PlanningDocumentVersion.findByPk(req.params.versionId);
    if (!row) return res.status(404).json({ success: false, message: "Versi tidak ditemukan" });
    return res.json({ success: true, data: row });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.compareVersions = async (req, res) => {
  try {
    const leftId = Number(req.query.leftId);
    const rightId = Number(req.query.rightId);
    if (!Number.isFinite(leftId) || !Number.isFinite(rightId)) {
      return res.status(400).json({
        success: false,
        message: "Query leftId dan rightId (id baris planning_document_versions) wajib angka valid",
      });
    }
    const [left, right] = await Promise.all([
      PlanningDocumentVersion.findByPk(leftId),
      PlanningDocumentVersion.findByPk(rightId),
    ]);
    if (!left || !right) {
      return res.status(404).json({ success: false, message: "Salah satu versi tidak ditemukan" });
    }
    const tableHint = String(left.document_type || right.document_type || "generic");
    const diff = buildStandardSnapshotEnvelope(
      left.snapshot,
      right.snapshot,
      tableHint,
      "COMPARE",
    );
    return res.json({
      success: true,
      data: {
        left,
        right,
        diff,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTrace = async (req, res) => {
  try {
    const data = await getPlanningDocumentTrace(req.params.documentType, req.params.documentId);
    return res.json({ success: true, data });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({ success: false, message: err.message });
  }
};

/**
 * Restore: tulis ulang field material dokumen utama dari snapshot versi + audit + versi global baru (satu transaksi).
 */
exports.restoreFromVersion = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const versionRow = await PlanningDocumentVersion.findByPk(req.params.versionId, {
      transaction: t,
    });
    if (!versionRow) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Versi sumber tidak ditemukan" });
    }

    const uid = req.user?.id ?? req.user?.userId ?? null;
    const { change_reason_text, change_reason_file } = req.body || {};
    const text = String(change_reason_text || "").trim();
    const file = String(change_reason_file || "").trim();
    if (!text && !file) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: "CHANGE_REASON_REQUIRED",
        message: "Alasan restore wajib (change_reason_text atau change_reason_file).",
      });
    }

    const applied = await applyPlanningDocumentVersion({
      db,
      versionRow,
      transaction: t,
    });

    const { old_value, new_value } = auditValuesFromRows(applied.before, applied.after);
    await writePlanningAudit({
      module_name: applied.table_name,
      table_name: applied.table_name,
      record_id: applied.record_id,
      action_type: "RESTORE_VERSION",
      old_value,
      new_value,
      change_reason_text: text || null,
      change_reason_file: file || null,
      changed_by: uid,
      version_before: applied.version_before,
      version_after: applied.version_after,
      transaction: t,
    });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "State dokumen utama dipulihkan dari snapshot versi; audit dan riwayat versi global telah diperbarui.",
      data: {
        document: captureRow(applied.instance),
        restored_from_version_id: versionRow.id,
        restore_meta: getRestoreOperationMeta(applied.table_name),
      },
    });
  } catch (err) {
    await t.rollback();
    const code = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    return res.status(code).json({ success: false, message: err.message });
  }
};
