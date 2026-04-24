"use strict";

/**
 * Konvensi payload audit compliance (disimpan di tenant_audit_logs.payload, JSON).
 * Tidak mengubah skema DB â€” hanya struktur isi payload.
 */

const CHANGE_ORIGIN = Object.freeze({
  API_RPJMD_BACKFILL: "api:rpjmd:backfill",
  API_RPJMD_BULK_MASTER: "api:rpjmd:bulk-from-master",
  API_RPJMD_PROGRAM_AUTO_MAP: "api:rpjmd:program-auto-map",
  API_RPJMD_KEGIATAN_AUTO_MAP: "api:rpjmd:kegiatan-auto-map",
  API_RPJMD_SUB_AUTO_MAP: "api:rpjmd:sub-auto-map",
  /** Sync RPJMD â†’ RKPD (preview atau commit) */
  API_RPJMD_RKPD_SYNC: "api:rpjmd-rkpd:sync",
  /** alias rencana lama */
  API_RKPD_SYNC: "api:rkpd:sync",
});

const AUDIT_SCHEMA_VERSION = 1;

function pickActor(req) {
  const u = req?.user;
  if (!u) return null;
  return {
    user_id: u.id ?? null,
    username: u.username ?? null,
    role: u.role ?? null,
    tenant_id: u.tenant_id ?? null,
  };
}

function entityScope(entityType, entityId) {
  const t = String(entityType || "").trim().toUpperCase();
  const id = entityId != null ? Number(entityId) : NaN;
  if (!t || !Number.isInteger(id) || id < 1) return null;
  return `${t}:${id}`;
}

/**
 * Ringkas baris mapping untuk audit (bukan dump penuh).
 */
function summarizeEntityRow(entityType, row) {
  if (!row || typeof row !== "object") return null;
  const et = String(entityType || "").trim().toUpperCase();
  if (et === "SUB_KEGIATAN") {
    return {
      entity_type: et,
      entity_id: row.id ?? null,
      kegiatan_id: row.kegiatan_id ?? null,
      master_sub_kegiatan_id: row.master_sub_kegiatan_id ?? null,
      kode: row.kode_sub_kegiatan ?? null,
      nama_short:
        row.nama_sub_kegiatan != null
          ? String(row.nama_sub_kegiatan).slice(0, 120)
          : null,
      input_mode: row.input_mode ?? null,
      regulasi_versi_id: row.regulasi_versi_id ?? null,
    };
  }
  if (et === "KEGIATAN") {
    return {
      entity_type: et,
      entity_id: row.id ?? null,
      program_id: row.program_id ?? null,
      master_kegiatan_id: row.master_kegiatan_id ?? null,
      kode: row.kode_kegiatan ?? null,
      nama_short:
        row.nama_kegiatan != null
          ? String(row.nama_kegiatan).slice(0, 120)
          : null,
      input_mode: row.input_mode ?? null,
      regulasi_versi_id: row.regulasi_versi_id ?? null,
    };
  }
  if (et === "PROGRAM") {
    return {
      entity_type: et,
      entity_id: row.id ?? null,
      master_program_id: row.master_program_id ?? null,
      kode: row.kode_program ?? null,
      nama_short:
        row.nama_program != null
          ? String(row.nama_program).slice(0, 120)
          : null,
      input_mode: row.input_mode ?? null,
      regulasi_versi_id: row.regulasi_versi_id ?? null,
    };
  }
  return { entity_type: et || null, entity_id: row.id ?? null };
}

function wrapComplianceBase({
  req,
  change_origin,
  action,
  entity_type,
  entity_id,
  entity_scope_override,
  affected_ids,
  old_state_summary,
  new_state_summary,
  reason,
  correlation_id,
  batch_id,
  extra,
}) {
  const eid = entity_id != null ? Number(entity_id) : null;
  const scope =
    entity_scope_override != null && String(entity_scope_override).trim() !== ""
      ? String(entity_scope_override).trim()
      : entityScope(entity_type, Number.isInteger(eid) ? eid : null);
  return {
    audit_schema_version: AUDIT_SCHEMA_VERSION,
    change_origin,
    action: action || null,
    actor: pickActor(req),
    entity_type: entity_type ?? null,
    entity_id: Number.isInteger(eid) && eid >= 1 ? eid : null,
    entity_scope: scope,
    affected_ids: Array.isArray(affected_ids) ? affected_ids : null,
    old_state_summary: old_state_summary ?? null,
    new_state_summary: new_state_summary ?? null,
    reason: reason != null ? String(reason) : null,
    correlation_id: correlation_id || null,
    batch_id: batch_id != null ? batch_id : null,
    ...(extra && typeof extra === "object" ? extra : {}),
  };
}

module.exports = {
  CHANGE_ORIGIN,
  AUDIT_SCHEMA_VERSION,
  pickActor,
  entityScope,
  summarizeEntityRow,
  wrapComplianceBase,
};
