"use strict";

const { randomUUID } = require("crypto");
const {
  runPreview,
  runCommit,
} = require("../services/rpjmdBulkFromMasterService");
const { writeTenantAudit } = require("../services/tenantAuditService");
const {
  CHANGE_ORIGIN,
  wrapComplianceBase,
} = require("../utils/complianceAuditPayload");

const AUDIT_SAMPLE_LIMIT = 12;

function digestRequest(body) {
  if (!body || typeof body !== "object") return {};
  const f = body.filters || {};
  return {
    dataset_key: body.dataset_key,
    periode_id: body.periode_id,
    tahun: body.tahun,
    jenis_dokumen: body.jenis_dokumen,
    anchor_program_id: body.anchor_program_id,
    opd_penanggung_jawab_id:
      body.opd_penanggung_jawab_id ?? body.validate_opd_id ?? null,
    options: body.options,
    filters_used: {
      master_program_ids: Array.isArray(f.master_program_ids)
        ? f.master_program_ids
        : [],
      master_kegiatan_ids: Array.isArray(f.master_kegiatan_ids)
        ? f.master_kegiatan_ids
        : [],
      master_sub_kegiatan_ids: Array.isArray(f.master_sub_kegiatan_ids)
        ? f.master_sub_kegiatan_ids
        : [],
    },
    filter_counts: {
      master_program_ids: Array.isArray(f.master_program_ids)
        ? f.master_program_ids.length
        : 0,
      master_kegiatan_ids: Array.isArray(f.master_kegiatan_ids)
        ? f.master_kegiatan_ids.length
        : 0,
      master_sub_kegiatan_ids: Array.isArray(f.master_sub_kegiatan_ids)
        ? f.master_sub_kegiatan_ids.length
        : 0,
    },
  };
}

function compactForAudit(data) {
  if (!data || typeof data !== "object") return data;
  const summary = data.summary || null;
  const classification_counts = data.classification_counts || null;
  const inserted_ids = data.inserted_ids
    ? {
        kegiatan_ids: (data.inserted_ids.kegiatan_ids || []).slice(0, 80),
        sub_kegiatan_ids: (data.inserted_ids.sub_kegiatan_ids || []).slice(
          0,
          80,
        ),
        kegiatan_count: (data.inserted_ids.kegiatan_ids || []).length,
        sub_kegiatan_count: (data.inserted_ids.sub_kegiatan_ids || []).length,
      }
    : null;

  const pickSamples = (arr) =>
    Array.isArray(arr) ? arr.slice(0, AUDIT_SAMPLE_LIMIT) : [];

  return {
    summary,
    classification_counts,
    inserted_ids,
    skipped_details_sample: pickSamples(data.skipped_details_sample),
    failed_details_sample: pickSamples(data.failed_details_sample),
    backfill_candidates_sample: pickSamples(data.backfill_candidates),
    warnings_sample: pickSamples(data.warnings),
    errors_sample: pickSamples(data.errors),
    preview_or_commit: data.preview_or_commit,
  };
}

exports.preview = async (req, res) => {
  const correlation_id = randomUUID();
  try {
    const result = await runPreview(req.body);

    const admin_message = result.ok
      ? result.data?.summary?.commit_blocked
        ? "Preview: ada baris fatal/error — commit diblokir sampai diperbaiki."
        : `Preview: ${result.data?.summary?.would_create_sub_kegiatans ?? 0} sub siap impor, ${result.data?.summary?.skipped ?? 0} dilewati.`
      : "Preview gagal validasi konteks.";

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BULK_MASTER_PREVIEW",
      tenant_id_asal: req.tenantId ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_BULK_MASTER,
          action: "RPJMD_BULK_MASTER_PREVIEW",
          entity_type: "BULK_RPJMD_MASTER_SUB",
          entity_id: null,
          entity_scope_override: "BULK:RPJMD_MASTER_SUB_IMPORT",
          affected_ids: null,
          old_state_summary: null,
          new_state_summary: null,
          reason: null,
          correlation_id,
          batch_id: correlation_id,
        }),
        scope: "RPJMD_MASTER_IMPORT",
        phase: "PREVIEW",
        preview_or_commit: "PREVIEW",
        dry_run: true,
        success: result.ok,
        admin_message,
        request_digest: digestRequest(req.body),
        result_compact: result.ok
          ? compactForAudit({ ...result.data, preview_or_commit: "PREVIEW" })
          : { error: result.error },
      },
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.error,
        data: { correlation_id },
      });
    }

    return res.json({
      success: true,
      data: {
        ...result.data,
        correlation_id,
        admin_message,
      },
    });
  } catch (err) {
    console.error("[rpjmdBulkFromMaster] preview:", err);
    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BULK_MASTER_PREVIEW",
      tenant_id_asal: req.tenantId ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_BULK_MASTER,
          action: "RPJMD_BULK_MASTER_PREVIEW",
          entity_type: "BULK_RPJMD_MASTER_SUB",
          entity_id: null,
          entity_scope_override: "BULK:RPJMD_MASTER_SUB_IMPORT",
          affected_ids: null,
          old_state_summary: null,
          new_state_summary: null,
          reason: null,
          correlation_id,
          batch_id: correlation_id,
        }),
        scope: "RPJMD_MASTER_IMPORT",
        phase: "PREVIEW",
        preview_or_commit: "PREVIEW",
        dry_run: true,
        success: false,
        admin_message: err?.message || String(err),
        error: err?.message || String(err),
      },
    });
    return res.status(500).json({
      success: false,
      message: "Gagal menjalankan preview bulk import.",
      data: { correlation_id },
    });
  }
};

exports.commit = async (req, res) => {
  const correlation_id = randomUUID();
  if (!req.body?.confirm) {
    return res.status(400).json({
      success: false,
      message:
        "Commit ditolak: sertakan confirm: true setelah preview. Tidak ada perubahan database.",
      data: { correlation_id },
    });
  }

  try {
    const result = await runCommit(req.body, req.user?.id ?? null);

    const admin_message = result.ok
      ? `Commit: ${result.data?.summary?.inserted_sub_kegiatans ?? 0} sub masuk, ${result.data?.summary?.skipped ?? 0} dilewati, ${result.data?.summary?.failed ?? 0} gagal.`
      : result.data?.commit_blocked
        ? `Commit ditolak server (preflight): ${(result.data.commit_blocked_reasons?.messages || []).join("; ") || result.error}`
        : result.error || "Commit ditolak validasi.";

    const insertedSubs = result.ok
      ? (result.data?.inserted_ids?.sub_kegiatan_ids || []).slice(0, 120)
      : null;
    const insertedKegs = result.ok
      ? (result.data?.inserted_ids?.kegiatan_ids || []).slice(0, 120)
      : null;

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BULK_MASTER_COMMIT",
      tenant_id_asal: req.tenantId ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_BULK_MASTER,
          action: "RPJMD_BULK_MASTER_COMMIT",
          entity_type: "BULK_RPJMD_MASTER_SUB",
          entity_id: null,
          entity_scope_override: "BULK:RPJMD_MASTER_SUB_IMPORT",
          affected_ids: insertedSubs,
          old_state_summary: null,
          new_state_summary: result.ok
            ? {
                inserted_sub_kegiatan_count:
                  result.data?.summary?.inserted_sub_kegiatans ?? null,
                inserted_kegiatan_count:
                  result.data?.summary?.inserted_kegiatans ?? null,
                inserted_sub_kegiatan_ids_head: insertedSubs,
                inserted_kegiatan_ids_head: insertedKegs,
              }
            : null,
          reason: req.body?.reason
            ? String(req.body.reason).trim() || null
            : null,
          correlation_id,
          batch_id: correlation_id,
        }),
        scope: "RPJMD_MASTER_IMPORT",
        phase: "COMMIT",
        preview_or_commit: "COMMIT",
        dry_run: false,
        success: result.ok,
        admin_message,
        request_digest: digestRequest(req.body),
        result_compact: result.ok
          ? compactForAudit({ ...result.data, preview_or_commit: "COMMIT" })
          : {
              error: result.error,
              commit_blocked: result.data?.commit_blocked,
              commit_preflight: result.data?.commit_preflight,
              summary: result.data?.summary,
              classification_counts: result.data?.classification_counts,
              commit_blocked_reasons: result.data?.commit_blocked_reasons,
            },
      },
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.error,
        data: {
          correlation_id,
          ...(result.data && typeof result.data === "object" ? result.data : {}),
        },
      });
    }

    return res.json({
      success: true,
      data: {
        ...result.data,
        correlation_id,
        admin_message,
      },
    });
  } catch (err) {
    console.error("[rpjmdBulkFromMaster] commit:", err);
    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BULK_MASTER_COMMIT",
      tenant_id_asal: req.tenantId ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_BULK_MASTER,
          action: "RPJMD_BULK_MASTER_COMMIT",
          entity_type: "BULK_RPJMD_MASTER_SUB",
          entity_id: null,
          entity_scope_override: "BULK:RPJMD_MASTER_SUB_IMPORT",
          affected_ids: null,
          old_state_summary: null,
          new_state_summary: null,
          reason: req.body?.reason
            ? String(req.body.reason).trim() || null
            : null,
          correlation_id,
          batch_id: correlation_id,
        }),
        scope: "RPJMD_MASTER_IMPORT",
        phase: "COMMIT",
        preview_or_commit: "COMMIT",
        dry_run: false,
        success: false,
        admin_message: err?.message || String(err),
        error: err?.message || String(err),
        request_digest: digestRequest(req.body),
      },
    });
    return res.status(500).json({
      success: false,
      message: "Gagal commit bulk import (rollback jika transaksi DB gagal).",
      data: { correlation_id },
    });
  }
};
