const { PlanningAuditEvent, PlanningDocumentVersion } = require("../models");
const { resolveMaterialKeys } = require("../constants/planningAuditMaterialFields");

function safeJson(obj) {
  if (obj == null) return null;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return null;
  }
}

function captureRow(row) {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return safeJson(plain);
}

function captureBeforeAfter(oldRow, newRow) {
  return { before: captureRow(oldRow), after: captureRow(newRow) };
}

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Daftar field yang berubah (subset material bila `keys` diisi).
 */
function computeChangedFields(before, after, keys) {
  if (before == null && after == null) return [];
  const b = before && typeof before === "object" ? before : {};
  const a = after && typeof after === "object" ? after : {};
  const useKeys =
    keys && keys.length
      ? keys
      : Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).filter(
          (k) => !k.startsWith("_"),
        );
  const out = [];
  for (const field of useKeys) {
    if (!valuesEqual(b[field], a[field])) {
      out.push({ field, from: b[field], to: a[field] });
    }
  }
  return out;
}

function buildSummary(changed_fields, action_type) {
  if (!changed_fields || !changed_fields.length) {
    return action_type ? `Tidak ada field material berubah (${action_type})` : "Tidak ada perubahan field material";
  }
  const names = changed_fields.map((c) => c.field).slice(0, 12);
  const more = changed_fields.length > 12 ? ` (+${changed_fields.length - 12} lainnya)` : "";
  return `${action_type || "MUTASI"}: ${names.join(", ")}${more}`;
}

function attachCanonicalPaguView(row) {
  if (!row || typeof row !== "object") return row;
  const o = { ...row };
  const years = [];
  for (let i = 1; i <= 5; i += 1) {
    const y = o[`pagu_year_${i}`] ?? o[`pagu_tahun_${i}`];
    years.push(y != null ? y : null);
  }
  o._canonical_pagu = {
    year_1: years[0],
    year_2: years[1],
    year_3: years[2],
    year_4: years[3],
    year_5: years[4],
    total:
      o.pagu_total != null
        ? o.pagu_total
        : o.total_pagu != null
          ? o.total_pagu
          : o.pagu_anggaran != null
            ? o.pagu_anggaran
            : o.anggaran != null
              ? o.anggaran
              : null,
  };
  return o;
}

/**
 * Envelope standar untuk kolom snapshot + konsumsi UI.
 */
function buildStandardSnapshotEnvelope(before, after, table_name, action_type) {
  const keys = resolveMaterialKeys(table_name);
  const b0 = before != null ? attachCanonicalPaguView(safeJson(before)) : null;
  const a0 = after != null ? attachCanonicalPaguView(safeJson(after)) : null;
  const changed_fields = computeChangedFields(b0, a0, keys.length ? keys : null);
  return {
    before: b0,
    after: a0,
    changed_fields,
    summary: buildSummary(changed_fields, action_type),
  };
}

function resolveEnvelopeFromStoredRow(plain) {
  if (plain.snapshot && typeof plain.snapshot === "object" && plain.snapshot.summary != null) {
    return plain.snapshot;
  }
  return buildStandardSnapshotEnvelope(
    plain.old_value,
    plain.new_value,
    plain.table_name,
    plain.action_type,
  );
}

/**
 * Normalisasi baris audit untuk response API (backward compatible).
 */
function enrichPlanningAuditRow(row) {
  const plain = row && typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  const normalized = resolveEnvelopeFromStoredRow(plain);
  return {
    ...plain,
    normalized,
  };
}

function enrichPlanningAuditRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => enrichPlanningAuditRow(r));
}

async function recordGlobalDocumentVersion({
  document_type,
  document_id,
  version_number,
  action,
  actor_id,
  reason_text,
  reason_file,
  snapshot,
  transaction,
}) {
  if (!PlanningDocumentVersion) return null;
  const type = String(document_type || "").trim();
  const did = Number(document_id);
  if (!type || !Number.isFinite(did)) return null;

  const prev = await PlanningDocumentVersion.findOne({
    where: { document_type: type, document_id: did },
    order: [["id", "DESC"]],
    transaction,
  });

  return PlanningDocumentVersion.create(
    {
      document_type: type,
      document_id: did,
      version_number: Number(version_number) || 1,
      previous_version_id: prev ? prev.id : null,
      action: String(action || "UPDATE").slice(0, 40),
      actor_id: actor_id != null ? Number(actor_id) : null,
      reason_text: reason_text || null,
      reason_file: reason_file || null,
      snapshot: safeJson(snapshot),
      created_at: new Date(),
    },
    { transaction },
  );
}

/**
 * Simpan audit + envelope snapshot + entri versioning global (opsional).
 */
async function writePlanningAudit({
  module_name,
  table_name,
  record_id,
  action_type,
  old_value,
  new_value,
  change_reason_text,
  change_reason_file,
  changed_by,
  version_before,
  version_after,
  skip_global_version = false,
  transaction,
}) {
  const snap = buildStandardSnapshotEnvelope(
    old_value,
    new_value,
    table_name,
    action_type,
  );

  await PlanningAuditEvent.create(
    {
      module_name,
      table_name,
      record_id: Number(record_id),
      action_type,
      old_value: safeJson(old_value),
      new_value: safeJson(new_value),
      snapshot: safeJson(snap),
      change_reason_text: change_reason_text || null,
      change_reason_file: change_reason_file || null,
      changed_by: changed_by != null ? Number(changed_by) : null,
      changed_at: new Date(),
      version_before: version_before != null ? Number(version_before) : null,
      version_after: version_after != null ? Number(version_after) : null,
    },
    { transaction },
  );

  if (skip_global_version) return;

  const docType = String(table_name || "").toLowerCase();
  const vnum =
    version_after != null
      ? Number(version_after)
      : version_before != null
        ? Number(version_before)
        : 1;

  try {
    await recordGlobalDocumentVersion({
      document_type: docType,
      document_id: record_id,
      version_number: vnum,
      action: action_type,
      actor_id: changed_by,
      reason_text: change_reason_text,
      reason_file: change_reason_file,
      snapshot: snap.after || snap.before || safeJson(new_value || old_value),
      transaction,
    });
  } catch (e) {
    console.warn("[writePlanningAudit] planning_document_versions skip:", e.message);
  }
}

/**
 * Pasangan snapshot standar untuk writePlanningAudit (CREATE/UPDATE/DELETE/workflow/RESTORE).
 * Ini jalur resmi yang dipakai verifikasi otomatis; secara internal memanggil captureBeforeAfter.
 */
function auditValuesFromRows(oldRow, newRow) {
  const { before, after } = captureBeforeAfter(oldRow, newRow);
  return { old_value: before, new_value: after };
}

module.exports = {
  writePlanningAudit,
  captureRow,
  safeJson,
  captureBeforeAfter,
  auditValuesFromRows,
  computeChangedFields,
  buildStandardSnapshotEnvelope,
  enrichPlanningAuditRow,
  enrichPlanningAuditRows,
  recordGlobalDocumentVersion,
  attachCanonicalPaguView,
};
