"use strict";

const { resolveMaterialKeys } = require("../constants/planningAuditMaterialFields");
const { captureRow, safeJson } = require("./planningDocumentAuditService");

/** Kontrak restore: hanya baris dokumen induk + subset kolom material; bukan rollback pohon anak. */
const RESTORE_SCOPE_PRIMARY_DOCUMENT_MATERIAL_FIELDS_ONLY =
  "document_primary_row_material_fields_only";

/**
 * Metadata eksplisit untuk API / UAT (batas cakupan restore).
 * @param {string} documentType
 */
function getRestoreOperationMeta(documentType) {
  const keys = resolveMaterialKeys(documentType);
  return {
    scope: RESTORE_SCOPE_PRIMARY_DOCUMENT_MATERIAL_FIELDS_ONLY,
    material_field_count: keys.length,
    material_fields: keys,
    does_not_restore_child_rows: true,
    note_id:
      "Hanya kolom material pada baris dokumen induk yang ditimpa dari snapshot versi. Baris anak (item, mapping, dsb.) tidak dihapus/dibuat ulang oleh endpoint restore ini.",
  };
}

const TYPE_TO_MODEL = {
  rpjmd: "RPJMD",
  renstra: "Renstra",
  renja: "Renja",
  rkpd: "Rkpd",
  rka: "Rka",
  dpa: "Dpa",
  renja_dokumen: "RenjaDokumen",
  rkpd_dokumen: "RkpdDokumen",
};

/** Snapshot baris dokumen di `planning_document_versions` bisa berupa row utuh atau nested envelope. */
function extractRowSnapshot(snap) {
  if (!snap || typeof snap !== "object") return {};
  const s = safeJson(snap);
  if (s && typeof s === "object" && s.after != null && typeof s.after === "object") {
    return { ...s.after };
  }
  return { ...s };
}

function versionFieldForModel(Model) {
  if (Model.rawAttributes?.versi) return "versi";
  if (Model.rawAttributes?.version) return "version";
  return null;
}

async function validatePatch(db, documentType, patch, transaction) {
  const t = String(documentType || "").toLowerCase();
  const errs = [];

  if (t === "renstra" && patch.rpjmd_id != null) {
    const r = await db.RPJMD.findByPk(Number(patch.rpjmd_id), { transaction });
    if (!r) errs.push("rpjmd_id pada snapshot tidak ditemukan.");
  }
  if (t === "renja" && patch.renstra_id != null) {
    const r = await db.Renstra.findByPk(Number(patch.renstra_id), { transaction });
    if (!r) errs.push("renstra_id pada snapshot tidak ditemukan.");
  }
  if (t === "renja" && patch.rpjmd_id != null) {
    const r = await db.RPJMD.findByPk(Number(patch.rpjmd_id), { transaction });
    if (!r) errs.push("rpjmd_id pada snapshot tidak ditemukan.");
  }
  if (t === "rkpd" && patch.renja_id != null) {
    const r = await db.Renja.findByPk(Number(patch.renja_id), { transaction });
    if (!r) errs.push("renja_id pada snapshot tidak ditemukan.");
  }
  if (t === "rka" && patch.renja_id != null) {
    const r = await db.Renja.findByPk(Number(patch.renja_id), { transaction });
    if (!r) errs.push("renja_id pada snapshot tidak ditemukan.");
  }
  if (t === "dpa" && patch.rka_id != null) {
    const r = await db.Rka.findByPk(Number(patch.rka_id), { transaction });
    if (!r) errs.push("rka_id pada snapshot tidak ditemukan.");
  }
  if (t === "renja_dokumen") {
    if (patch.renstra_pd_dokumen_id != null) {
      const r = await db.RenstraPdDokumen.findByPk(Number(patch.renstra_pd_dokumen_id), {
        transaction,
      });
      if (!r) errs.push("renstra_pd_dokumen_id pada snapshot tidak ditemukan.");
    }
    if (patch.rkpd_dokumen_id != null) {
      const r = await db.RkpdDokumen.findByPk(Number(patch.rkpd_dokumen_id), { transaction });
      if (!r) errs.push("rkpd_dokumen_id pada snapshot tidak ditemukan.");
    }
    if (patch.periode_id != null) {
      const r = await db.PeriodeRpjmd.findByPk(Number(patch.periode_id), { transaction });
      if (!r) errs.push("periode_id pada snapshot tidak ditemukan.");
    }
  }
  if (t === "rkpd_dokumen" && patch.periode_id != null) {
    const r = await db.PeriodeRpjmd.findByPk(Number(patch.periode_id), { transaction });
    if (!r) errs.push("periode_id pada snapshot tidak ditemukan.");
  }

  return errs;
}

/**
 * Pulihkan baris dokumen utama dari snapshot versi (transaksi wajib di luar).
 * @returns {{ before: object, after: object, version_before: number|null, version_after: number|null }}
 */
async function applyPlanningDocumentVersion({ db, versionRow, transaction }) {
  const documentType = String(versionRow.document_type || "").toLowerCase();
  const documentId = Number(versionRow.document_id);
  if (!documentType || !Number.isFinite(documentId)) {
    const e = new Error("document_type atau document_id pada versi tidak valid.");
    e.statusCode = 400;
    throw e;
  }

  const modelName = TYPE_TO_MODEL[documentType];
  if (!modelName || !db[modelName]) {
    const e = new Error(`Tipe dokumen "${documentType}" tidak didukung untuk restore.`);
    e.statusCode = 400;
    throw e;
  }

  const Model = db[modelName];
  const instance = await Model.findByPk(documentId, { transaction });
  if (!instance) {
    const e = new Error("Baris dokumen utama tidak ditemukan.");
    e.statusCode = 404;
    throw e;
  }

  const before = captureRow(instance);
  const src = extractRowSnapshot(versionRow.snapshot);
  const keys = resolveMaterialKeys(documentType);
  if (!keys.length) {
    const e = new Error(`Tidak ada field material terdaftar untuk "${documentType}".`);
    e.statusCode = 400;
    throw e;
  }

  const patch = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(src, k)) {
      patch[k] = src[k];
    }
  }

  const vf = versionFieldForModel(Model);
  if (vf) {
    const cur = Number(instance[vf]) || 1;
    patch[vf] = cur + 1;
  }

  const valErrs = await validatePatch(db, documentType, patch, transaction);
  if (valErrs.length) {
    const e = new Error(valErrs.join(" "));
    e.statusCode = 422;
    throw e;
  }

  if (documentType === "renja_dokumen") {
    const planningDomain = require("./planningDomainService");
    const merged = { ...instance.get({ plain: true }), ...patch };
    const rkpdDokumen = merged.rkpd_dokumen_id
      ? await db.RkpdDokumen.findByPk(merged.rkpd_dokumen_id, { transaction })
      : null;
    const renstraPd = merged.renstra_pd_dokumen_id
      ? await db.RenstraPdDokumen.findByPk(merged.renstra_pd_dokumen_id, { transaction })
      : null;
    const consErr = await planningDomain.assertRenjaDokumenConsistency(db, merged, {
      rkpdDokumen,
      renstraPd,
    });
    if (consErr.length) {
      const e = new Error(consErr.join(" "));
      e.statusCode = 422;
      throw e;
    }
  }

  await instance.update(patch, { transaction });
  await instance.reload({ transaction });
  const after = captureRow(instance);

  const version_before =
    vf != null ? (before[vf] != null ? Number(before[vf]) : null) : Number(before.version) || null;
  const version_after =
    vf != null ? (after[vf] != null ? Number(after[vf]) : null) : Number(after.version) || null;

  return {
    instance,
    before,
    after,
    version_before: version_before != null && Number.isFinite(version_before) ? version_before : null,
    version_after: version_after != null && Number.isFinite(version_after) ? version_after : null,
    table_name: documentType,
    record_id: documentId,
  };
}

module.exports = {
  applyPlanningDocumentVersion,
  extractRowSnapshot,
  TYPE_TO_MODEL,
  RESTORE_SCOPE_PRIMARY_DOCUMENT_MATERIAL_FIELDS_ONLY,
  getRestoreOperationMeta,
};
