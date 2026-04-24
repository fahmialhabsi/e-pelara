"use strict";

const { randomUUID } = require("crypto");
const { writeTenantAudit } = require("../services/tenantAuditService");
const svc = require("../services/rpjmdRkpdSyncService");
const {
  CHANGE_ORIGIN,
  wrapComplianceBase,
} = require("../utils/complianceAuditPayload");

function syncDisabled() {
  return process.env.RPJMD_RKPD_SYNC_ENABLED === "0";
}

function digestSyncBody(body) {
  if (!body || typeof body !== "object") return {};
  return {
    source: body.source,
    target: body.target,
    filters: body.filters,
    options: body.options,
    opd_penanggung_jawab_id:
      body.opd_penanggung_jawab_id ?? body.validate_opd_id ?? null,
  };
}

async function preview(req, res) {
  const correlation_id = randomUUID();
  if (syncDisabled()) {
    return res.status(503).json({
      success: false,
      message:
        "Fitur sync RPJMDâ†’RKPD dinonaktifkan (RPJMD_RKPD_SYNC_ENABLED=0).",
      correlation_id,
    });
  }
  try {
    const result = await svc.runPreview(req.body);
    const admin_message = result.ok
      ? result.data?.summary?.commit_blocked
        ? "Pratinjau sinkronisasi menunjukkan konflik yang harus diselesaikan. Commit belum dapat dilakukan."
        : `Pratinjau sinkronisasi selesai: rencana sub RKPD ${result.data?.summary?.would_create_sub_kegiatans ?? 0}, program baru ${result.data?.summary?.would_create_programs ?? 0}, kegiatan baru ${result.data?.summary?.would_create_kegiatans ?? 0}.`
      : "Pratinjau sinkronisasi gagal validasi.";

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_RKPD_SYNC_PREVIEW",
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
          action: "RPJMD_RKPD_SYNC_PREVIEW",
          entity_type: "SYNC_RPJM_RKPD_BATCH",
          entity_id: null,
          entity_scope_override: "SYNC:RPJMD_TO_RKPD",
          affected_ids: null,
          old_state_summary: null,
          new_state_summary: null,
          reason: null,
          correlation_id,
          batch_id: correlation_id,
        }),
        dry_run: true,
        success: result.ok,
        admin_message,
        source_context: req.body?.source ?? null,
        target_context: req.body?.target ?? null,
        request_digest: digestSyncBody(req.body),
        result_compact: result.ok
          ? {
              summary: result.data.summary,
              classification_counts: result.data.classification_counts,
              programs_matched: result.data.programs_matched,
            }
          : { error: result.error },
      },
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.error,
        correlation_id,
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
  } catch (e) {
    console.error("[rpjmdRkpdSyncController.preview]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Preview sync gagal.",
      correlation_id,
    });
  }
}

async function commit(req, res) {
  const correlation_id = randomUUID();
  if (syncDisabled()) {
    return res.status(503).json({
      success: false,
      message:
        "Fitur sync RPJMDâ†’RKPD dinonaktifkan (RPJMD_RKPD_SYNC_ENABLED=0).",
      correlation_id,
    });
  }
  if (req.body?.confirm !== true) {
    return res.status(400).json({
      success: false,
      message:
        "Commit sync ditolak: sertakan confirm: true setelah preview. Tidak ada perubahan database.",
      correlation_id,
    });
  }

  try {
    const pre = await svc.runPreview(req.body);
    if (!pre.ok) {
      writeTenantAudit({
        user_id: req.user?.id ?? null,
        aksi: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
        tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
        payload: {
          ...wrapComplianceBase({
            req,
            change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
            action: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
            entity_type: "SYNC_RPJM_RKPD_BATCH",
            entity_id: null,
            entity_scope_override: "SYNC:RPJMD_TO_RKPD",
            affected_ids: null,
            old_state_summary: null,
            new_state_summary: null,
            reason: req.body?.reason
              ? String(req.body.reason).trim()
              : null,
            correlation_id,
            batch_id: correlation_id,
          }),
          error: pre.error,
          phase: "PREFLIGHT_PREVIEW_FAILED",
        },
      });
      return res.status(400).json({
        success: false,
        message: pre.error,
        correlation_id,
      });
    }
    if (pre.data.summary.commit_blocked) {
      writeTenantAudit({
        user_id: req.user?.id ?? null,
        aksi: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
        tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
        payload: {
          ...wrapComplianceBase({
            req,
            change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
            action: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
            entity_type: "SYNC_RPJM_RKPD_BATCH",
            entity_id: null,
            entity_scope_override: "SYNC:RPJMD_TO_RKPD",
            affected_ids: null,
            old_state_summary: null,
            new_state_summary: {
              preflight_summary: pre.data.summary,
              classification_counts: pre.data.classification_counts,
            },
            reason: req.body?.reason
              ? String(req.body.reason).trim()
              : null,
            correlation_id,
            batch_id: correlation_id,
          }),
          phase: "COMMIT_BLOCKED",
          commit_blocked_reasons: svc.summarizeCommitBlockedReasons(pre.data),
        },
      });
      return res.status(400).json({
        success: false,
        message:
          "Commit sinkronisasi ditolak karena hasil pratinjau masih memuat konflik atau validasi yang belum aman. Tidak ada perubahan pada database.",
        data: {
          correlation_id,
          commit_blocked: true,
          summary: pre.data.summary,
          classification_counts: pre.data.classification_counts,
          commit_blocked_reasons: svc.summarizeCommitBlockedReasons(pre.data),
        },
      });
    }

    const result = await svc.runCommit(req.body, req.user?.id ?? null);

    if (!result.ok) {
      writeTenantAudit({
        user_id: req.user?.id ?? null,
        aksi: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
        tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
        payload: {
          ...wrapComplianceBase({
            req,
            change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
            action: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
            entity_type: "SYNC_RPJM_RKPD_BATCH",
            entity_id: null,
            entity_scope_override: "SYNC:RPJMD_TO_RKPD",
            correlation_id,
            batch_id: correlation_id,
          }),
          phase: "TRANSACTION_FAILED",
          error: result.error,
          data: result.data,
        },
      });
      return res.status(400).json({
        success: false,
        message: result.error || "Commit sync gagal (rollback).",
        correlation_id,
        data: result.data,
      });
    }

    const admin_message = `Commit sync: program +${result.data.summary.inserted_programs}, kegiatan +${result.data.summary.inserted_kegiatans}, sub +${result.data.summary.inserted_sub_kegiatans}, skipped ${result.data.summary.skipped}.`;

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_RKPD_SYNC_COMMIT",
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
          action: "RPJMD_RKPD_SYNC_COMMIT",
          entity_type: "SYNC_RPJM_RKPD_BATCH",
          entity_id: null,
          entity_scope_override: "SYNC:RPJMD_TO_RKPD",
          affected_ids: [
            ...(result.data.inserted_ids?.program_ids || []),
            ...(result.data.inserted_ids?.kegiatan_ids || []),
            ...(result.data.inserted_ids?.sub_kegiatan_ids || []),
          ].slice(0, 200),
          old_state_summary: null,
          new_state_summary: {
            inserted_summary: result.data.summary,
            inserted_ids_head: {
              program_ids: (result.data.inserted_ids?.program_ids || []).slice(
                0,
                40,
              ),
              kegiatan_ids: (result.data.inserted_ids?.kegiatan_ids || []).slice(
                0,
                40,
              ),
              sub_kegiatan_ids: (
                result.data.inserted_ids?.sub_kegiatan_ids || []
              ).slice(0, 40),
            },
          },
          reason: req.body?.reason ? String(req.body.reason).trim() : null,
          correlation_id,
          batch_id: correlation_id,
        }),
        dry_run: false,
        success: true,
        admin_message,
        source_context: req.body?.source ?? null,
        target_context: req.body?.target ?? null,
        request_digest: digestSyncBody(req.body),
        result_compact: {
          summary: result.data.summary,
          classification_counts: result.data.classification_counts,
          inserted_ids: result.data.inserted_ids,
        },
      },
    });

    return res.json({
      success: true,
      data: {
        ...result.data,
        correlation_id,
        admin_message,
        classification_counts: result.data.classification_counts,
      },
    });
  } catch (e) {
    console.error("[rpjmdRkpdSyncController.commit]", e);
    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_RKPD_SYNC,
          action: "RPJMD_RKPD_SYNC_COMMIT_REJECTED",
          entity_type: "SYNC_RPJM_RKPD_BATCH",
          entity_id: null,
          entity_scope_override: "SYNC:RPJMD_TO_RKPD",
          correlation_id,
          batch_id: correlation_id,
        }),
        phase: "EXCEPTION",
        error: e?.message || String(e),
      },
    });
    return res.status(500).json({
      success: false,
      message: e?.message || "Commit sync gagal.",
      correlation_id,
    });
  }
}

module.exports = {
  preview,
  commit,
};

