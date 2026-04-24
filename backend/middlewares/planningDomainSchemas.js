"use strict";

const Joi = require("joi");

const statusDokumen = Joi.string().valid("draft", "review", "final");
const workflowStatus = Joi.string().valid(
  "draft",
  "submitted",
  "reviewed",
  "approved",
  "rejected",
  "published",
  "archived",
);
const documentPhase = Joi.string().valid(
  "rancangan_awal",
  "rancangan",
  "forum_perangkat_daerah",
  "pasca_musrenbang",
  "final",
);
const documentKind = Joi.string().valid("renja_awal", "renja_perubahan");
const sourceMode = Joi.string().valid("RENSTRA", "RKPD", "IRISAN", "MANUAL");

/** Tetap di req.body setelah stripUnknown agar audit & requireChangeReason jalan. */
const auditMetaFields = {
  change_reason_text: Joi.string().allow("", null).optional(),
  change_reason_file: Joi.string().max(255).allow("", null).optional(),
  rpjmd_id: Joi.number().integer().positive().allow(null).optional(),
};

exports.rkpdDokumenCreate = Joi.object({
  periode_id: Joi.number().integer().positive().required(),
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  judul: Joi.string().max(512).required(),
  versi: Joi.number().integer().min(1).optional(),
  status: statusDokumen.optional(),
  tanggal_pengesahan: Joi.date().allow(null).optional(),
  ...auditMetaFields,
});

exports.rkpdDokumenUpdate = Joi.object({
  periode_id: Joi.number().integer().positive().optional(),
  tahun: Joi.number().integer().min(2000).max(2100).optional(),
  judul: Joi.string().max(512).optional(),
  versi: Joi.number().integer().min(1).optional(),
  status: statusDokumen.optional(),
  is_final_active: Joi.boolean().optional(),
  tanggal_pengesahan: Joi.date().allow(null).optional(),
  ...auditMetaFields,
}).min(1);

exports.rkpdItemCreate = Joi.object({
  rkpd_dokumen_id: Joi.number().integer().positive().required(),
  urutan: Joi.number().integer().min(0).optional(),
  prioritas_daerah: Joi.string().max(512).allow(null, "").optional(),
  program: Joi.string().max(512).allow(null, "").optional(),
  kegiatan: Joi.string().max(512).allow(null, "").optional(),
  sub_kegiatan: Joi.string().max(512).allow(null, "").optional(),
  indikator: Joi.string().allow(null, "").optional(),
  target: Joi.number().optional(),
  satuan: Joi.string().max(64).allow(null, "").optional(),
  pagu: Joi.number().min(0).allow(null).optional(),
  perangkat_daerah_id: Joi.number().integer().positive().allow(null).optional(),
  status_baris: Joi.string().valid("draft", "siap", "terkunci").optional(),
  ...auditMetaFields,
});

exports.rkpdItemUpdate = Joi.object({
  urutan: Joi.number().integer().min(0).optional(),
  prioritas_daerah: Joi.string().max(512).allow(null, "").optional(),
  program: Joi.string().max(512).allow(null, "").optional(),
  kegiatan: Joi.string().max(512).allow(null, "").optional(),
  sub_kegiatan: Joi.string().max(512).allow(null, "").optional(),
  indikator: Joi.string().allow(null, "").optional(),
  target: Joi.number().optional(),
  satuan: Joi.string().max(64).allow(null, "").optional(),
  pagu: Joi.number().min(0).allow(null).optional(),
  perangkat_daerah_id: Joi.number().integer().positive().allow(null).optional(),
  status_baris: Joi.string().valid("draft", "siap", "terkunci").optional(),
  ...auditMetaFields,
}).min(1);

exports.renjaDokumenCreate = Joi.object({
  periode_id: Joi.number().integer().positive().required(),
  tahun: Joi.number().integer().min(2000).max(2100).required(),
  perangkat_daerah_id: Joi.number().integer().positive().required(),
  renstra_pd_dokumen_id: Joi.number().integer().positive().required(),
  rkpd_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  judul: Joi.string().max(512).required(),
  versi: Joi.number().integer().min(1).optional(),
  status: statusDokumen.optional(),
  workflow_status: workflowStatus.optional(),
  document_phase: documentPhase.optional(),
  document_kind: documentKind.optional(),
  nomor_dokumen: Joi.string().max(100).allow(null, "").optional(),
  nama_dokumen: Joi.string().max(255).allow(null, "").optional(),
  parent_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  base_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  is_perubahan: Joi.boolean().optional(),
  perubahan_ke: Joi.number().integer().min(1).allow(null).optional(),
  tanggal_pengesahan: Joi.date().allow(null).optional(),
  tanggal_mulai_berlaku: Joi.date().allow(null).optional(),
  tanggal_akhir_berlaku: Joi.date().allow(null).optional(),
  keterangan: Joi.string().allow(null, "").optional(),
  is_test: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDokumenUpdate = Joi.object({
  periode_id: Joi.number().integer().positive().optional(),
  tahun: Joi.number().integer().min(2000).max(2100).optional(),
  perangkat_daerah_id: Joi.number().integer().positive().optional(),
  renstra_pd_dokumen_id: Joi.number().integer().positive().optional(),
  rkpd_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  judul: Joi.string().max(512).optional(),
  versi: Joi.number().integer().min(1).optional(),
  status: statusDokumen.optional(),
  workflow_status: workflowStatus.optional(),
  document_phase: documentPhase.optional(),
  document_kind: documentKind.optional(),
  nomor_dokumen: Joi.string().max(100).allow(null, "").optional(),
  nama_dokumen: Joi.string().max(255).allow(null, "").optional(),
  parent_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  base_dokumen_id: Joi.number().integer().positive().allow(null).optional(),
  is_perubahan: Joi.boolean().optional(),
  perubahan_ke: Joi.number().integer().min(1).allow(null).optional(),
  is_final_active: Joi.boolean().optional(),
  tanggal_pengesahan: Joi.date().allow(null).optional(),
  tanggal_mulai_berlaku: Joi.date().allow(null).optional(),
  tanggal_akhir_berlaku: Joi.date().allow(null).optional(),
  keterangan: Joi.string().allow(null, "").optional(),
  /** Narasi bab dokumen resmi (opsional) */
  text_bab1: Joi.string().allow(null, "").optional(),
  text_bab2: Joi.string().allow(null, "").optional(),
  text_bab5: Joi.string().allow(null, "").optional(),
  is_test: Joi.boolean().optional(),
  ...auditMetaFields,
}).min(1);

exports.renjaItemCreate = Joi.object({
  renja_dokumen_id: Joi.number().integer().positive().required(),
  source_mode: sourceMode.optional(),
  source_renstra_program_id: Joi.number().integer().positive().allow(null).optional(),
  source_renstra_kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  source_renstra_subkegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  source_indikator_renstra_id: Joi.number().integer().positive().allow(null).optional(),
  source_rkpd_item_id: Joi.number().integer().positive().allow(null).optional(),
  program_id: Joi.number().integer().positive().allow(null).optional(),
  kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  sub_kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  urutan: Joi.number().integer().min(0).optional(),
  kode_program: Joi.string().max(50).allow(null, "").optional(),
  kode_kegiatan: Joi.string().max(50).allow(null, "").optional(),
  kode_sub_kegiatan: Joi.string().max(50).allow(null, "").optional(),
  program: Joi.string().max(512).allow(null, "").optional(),
  kegiatan: Joi.string().max(512).allow(null, "").optional(),
  sub_kegiatan: Joi.string().max(512).allow(null, "").optional(),
  indikator: Joi.string().allow(null, "").optional(),
  target: Joi.number().optional(),
  target_numerik: Joi.number().min(0).allow(null).optional(),
  target_teks: Joi.string().max(255).allow(null, "").optional(),
  satuan: Joi.string().max(64).allow(null, "").optional(),
  lokasi: Joi.string().max(255).allow(null, "").optional(),
  kelompok_sasaran: Joi.string().max(255).allow(null, "").optional(),
  pagu: Joi.number().min(0).allow(null).optional(),
  pagu_indikatif: Joi.number().min(0).allow(null).optional(),
  catatan: Joi.string().allow(null, "").optional(),
  mismatch_status: Joi.string()
    .valid("matched", "renstra_only", "rkpd_only", "code_name_changed", "manual_override")
    .optional(),
  status_baris: Joi.string().valid("draft", "siap", "terkunci").optional(),
  ...auditMetaFields,
}).custom((value, helpers) => {
  const mode = String(value.source_mode || "MANUAL").toUpperCase();
  if (value.kegiatan_id && !value.program_id) {
    return helpers.message("kegiatan_id tidak boleh diisi tanpa program_id.");
  }
  if (value.sub_kegiatan_id && !value.kegiatan_id) {
    return helpers.message("sub_kegiatan_id tidak boleh diisi tanpa kegiatan_id.");
  }
  if (mode === "RENSTRA") {
    if (!value.source_renstra_program_id || !value.source_renstra_kegiatan_id || !value.source_renstra_subkegiatan_id) {
      return helpers.message("source_mode=RENSTRA mewajibkan source_renstra_program_id, source_renstra_kegiatan_id, source_renstra_subkegiatan_id.");
    }
  }
  if (mode === "RKPD" && !value.source_rkpd_item_id) {
    return helpers.message("source_mode=RKPD mewajibkan source_rkpd_item_id.");
  }
  if (mode === "IRISAN") {
    if (!value.source_rkpd_item_id || !value.source_renstra_program_id || !value.source_renstra_kegiatan_id || !value.source_renstra_subkegiatan_id) {
      return helpers.message("source_mode=IRISAN mewajibkan referensi RENSTRA minimum dan source_rkpd_item_id.");
    }
  }
  return value;
}, "renja item hard business schema");

exports.renjaItemUpdate = Joi.object({
  source_mode: sourceMode.optional(),
  source_renstra_program_id: Joi.number().integer().positive().allow(null).optional(),
  source_renstra_kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  source_renstra_subkegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  source_indikator_renstra_id: Joi.number().integer().positive().allow(null).optional(),
  source_rkpd_item_id: Joi.number().integer().positive().allow(null).optional(),
  program_id: Joi.number().integer().positive().allow(null).optional(),
  kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  sub_kegiatan_id: Joi.number().integer().positive().allow(null).optional(),
  urutan: Joi.number().integer().min(0).optional(),
  kode_program: Joi.string().max(50).allow(null, "").optional(),
  kode_kegiatan: Joi.string().max(50).allow(null, "").optional(),
  kode_sub_kegiatan: Joi.string().max(50).allow(null, "").optional(),
  program: Joi.string().max(512).allow(null, "").optional(),
  kegiatan: Joi.string().max(512).allow(null, "").optional(),
  sub_kegiatan: Joi.string().max(512).allow(null, "").optional(),
  indikator: Joi.string().allow(null, "").optional(),
  target: Joi.number().optional(),
  target_numerik: Joi.number().min(0).allow(null).optional(),
  target_teks: Joi.string().max(255).allow(null, "").optional(),
  satuan: Joi.string().max(64).allow(null, "").optional(),
  lokasi: Joi.string().max(255).allow(null, "").optional(),
  kelompok_sasaran: Joi.string().max(255).allow(null, "").optional(),
  pagu: Joi.number().min(0).allow(null).optional(),
  pagu_indikatif: Joi.number().min(0).allow(null).optional(),
  catatan: Joi.string().allow(null, "").optional(),
  mismatch_status: Joi.string()
    .valid("matched", "renstra_only", "rkpd_only", "code_name_changed", "manual_override")
    .optional(),
  status_baris: Joi.string().valid("draft", "siap", "terkunci").optional(),
  ...auditMetaFields,
})
  .min(1)
  .custom((value, helpers) => {
    const mode = value.source_mode ? String(value.source_mode).toUpperCase() : null;
    if (value.kegiatan_id && !value.program_id) {
      return helpers.message("kegiatan_id tidak boleh diisi tanpa program_id.");
    }
    if (value.sub_kegiatan_id && !value.kegiatan_id) {
      return helpers.message("sub_kegiatan_id tidak boleh diisi tanpa kegiatan_id.");
    }
    if (mode === "RENSTRA") {
      if (!value.source_renstra_program_id || !value.source_renstra_kegiatan_id || !value.source_renstra_subkegiatan_id) {
        return helpers.message("source_mode=RENSTRA mewajibkan referensi RENSTRA minimum.");
      }
    }
    if (mode === "RKPD" && !value.source_rkpd_item_id) {
      return helpers.message("source_mode=RKPD mewajibkan source_rkpd_item_id.");
    }
    if (mode === "IRISAN") {
      if (!value.source_rkpd_item_id || !value.source_renstra_program_id || !value.source_renstra_kegiatan_id || !value.source_renstra_subkegiatan_id) {
        return helpers.message("source_mode=IRISAN mewajibkan referensi RENSTRA minimum dan source_rkpd_item_id.");
      }
    }
    return value;
  }, "renja item update hard business schema");

exports.linkRkpdBody = Joi.object({
  rkpd_item_id: Joi.number().integer().positive().required(),
  ...auditMetaFields,
});

exports.renjaSectionUpdate = Joi.object({
  section_title: Joi.string().max(255).allow(null, "").optional(),
  content: Joi.string().allow(null, "").optional(),
  completion_pct: Joi.number().min(0).max(100).optional(),
  is_locked: Joi.boolean().optional(),
  source_mode: Joi.string().valid("RENSTRA", "RKPD", "IRISAN", "MANUAL").optional(),
  ...auditMetaFields,
}).min(1);

exports.renjaCreateRevision = Joi.object({
  change_reason: Joi.string().min(3).required(),
  revision_type: Joi.string().valid("perubahan", "minor_fix", "rollback").default("perubahan"),
  ...auditMetaFields,
});

exports.renjaDataFixGenerateMapping = Joi.object({
  include_mapped: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixGenerateIndicator = Joi.object({
  include_mapped: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixApply = Joi.object({
  suggestion_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  apply_high_confidence_only: Joi.boolean().optional(),
  overwrite_target: Joi.boolean().optional(),
  expect_item_stamps: Joi.object().pattern(/^\d+$/, Joi.string().allow("", null)).optional(),
  require_data_fix_lock_owner: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixPreviewMapping = Joi.object({
  suggestion_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  apply_high_confidence_only: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixPreviewImpact = Joi.object({
  suggestion_type: Joi.string()
    .valid("mapping_program", "indicator_mapping", "target_autofill", "policy_conflict")
    .required(),
  suggestion_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
  apply_high_confidence_only: Joi.boolean().optional(),
  overwrite_target: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixRollbackMapping = Joi.object({
  batch_id: Joi.number().integer().positive().required(),
  force_partial_rollback: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixLockAcquire = Joi.object({
  ttl_minutes: Joi.number().integer().min(5).max(120).optional(),
  ...auditMetaFields,
});

exports.renjaDataFixAutofillTargets = Joi.object({
  auto_apply: Joi.boolean().optional(),
  overwrite_target: Joi.boolean().optional(),
  expect_item_stamps: Joi.object().pattern(/^\d+$/, Joi.string().allow("", null)).optional(),
  require_data_fix_lock_owner: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixResolvePolicy = Joi.object({
  auto_apply: Joi.boolean().optional(),
  expect_item_stamps: Joi.object().pattern(/^\d+$/, Joi.string().allow("", null)).optional(),
  require_data_fix_lock_owner: Joi.boolean().optional(),
  ...auditMetaFields,
});

exports.renjaDataFixApplyAllHigh = Joi.object({
  overwrite_target: Joi.boolean().optional(),
  expect_item_stamps: Joi.object().pattern(/^\d+$/, Joi.string().allow("", null)).optional(),
  require_data_fix_lock_owner: Joi.boolean().optional(),
  ...auditMetaFields,
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join("; "),
      });
    }
    req.body = value;
    next();
  };
}

exports.validate = validate;
