"use strict";

const { randomUUID } = require("crypto");
const svc = require("../services/rpjmdKegiatanAutoMapService");
const { writeTenantAudit } = require("../services/tenantAuditService");
const {
  CHANGE_ORIGIN,
  wrapComplianceBase,
} = require("../utils/complianceAuditPayload");

const ACTION = {
  PREVIEW: "RPJMD_KEGIATAN_AUTO_MAP_PREVIEW",
  EXECUTE: "RPJMD_KEGIATAN_AUTO_MAP_EXECUTE",
  EXECUTE_REJECTED: "RPJMD_KEGIATAN_AUTO_MAP_EXECUTE_REJECTED",
};

function digestRequest(body) {
  const payload = body && typeof body === "object" ? body : {};
  const ids = Array.isArray(payload.kegiatan_ids) ? payload.kegiatan_ids : [];
  return {
    dataset_key: payload.dataset_key || svc.DEFAULT_DATASET_KEY,
    periode_id: payload.periode_id,
    tahun: payload.tahun,
    jenis_dokumen: payload.jenis_dokumen,
    kegiatan_ids_count: ids.length,
    kegiatan_ids_head: ids.slice(0, 50),
    confirm: payload.confirm === true,
  };
}

function compactPreview(data) {
  if (!data || typeof data !== "object") return data;
  return {
    summary: data.summary || null,
    ready_items_sample: (data.ready_items || []).slice(0, 20),
    ambiguous_items_sample: (data.ambiguous_items || []).slice(0, 20),
    not_found_items_sample: (data.not_found_items || []).slice(0, 20),
    already_mapped_items_sample: (data.already_mapped_items || []).slice(0, 20),
    parent_program_unmapped_items_sample: (
      data.parent_program_unmapped_items || []
    ).slice(0, 20),
    hierarchy_conflict_items_sample: (data.hierarchy_conflict_items || []).slice(
      0,
      20,
    ),
  };
}

function compactExecute(data) {
  if (!data || typeof data !== "object") return data;
  return {
    summary: data.summary || null,
    preview_summary: data.preview_summary || null,
    mapped_kegiatan_ids_head: (data.mapped_kegiatan_ids || []).slice(0, 120),
    details_sample: (data.details || []).slice(0, 40),
  };
}

function baseAuditPayload({ req, correlation_id, action, reason }) {
  return wrapComplianceBase({
    req,
    change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
    action,
    entity_type: "KEGIATAN_AUTO_MAP",
    entity_id: null,
    entity_scope_override: "BULK:RPJMD_KEGIATAN_AUTO_MAP",
    affected_ids: null,
    old_state_summary: null,
    new_state_summary: null,
    reason: reason != null ? String(reason) : null,
    correlation_id,
    batch_id: correlation_id,
  });
}

async function preview(req, res) {
  const correlation_id = randomUUID();
  try {
    const result = await svc.previewKegiatanAutoMap(req.body || {});

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: ACTION.PREVIEW,
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...baseAuditPayload({
          req,
          correlation_id,
          action: ACTION.PREVIEW,
          reason: null,
        }),
        success: result.ok,
        change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
        request_digest: digestRequest(req.body),
        scanned_count: result.data?.summary?.total_kegiatans_scanned ?? 0,
        mapped_count: 0,
        skipped_count:
          (result.data?.summary?.ambiguous ?? 0) +
          (result.data?.summary?.not_found ?? 0) +
          (result.data?.summary?.already_mapped ?? 0) +
          (result.data?.summary?.parent_program_unmapped ?? 0) +
          (result.data?.summary?.hierarchy_conflict ?? 0),
        result_compact: result.ok
          ? compactPreview(result.data)
          : { error: result.error || "Preview auto mapping kegiatan ditolak." },
      },
    });

    if (!result.ok) {
      return res.status(400).json({
        success: false,
        message: result.error || "Preview auto mapping kegiatan ditolak.",
        data: { correlation_id },
      });
    }

    return res.json({
      success: true,
      data: {
        ...result.data,
        correlation_id,
      },
    });
  } catch (err) {
    console.error("[rpjmdKegiatanAutoMapController.preview]", err);

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: ACTION.PREVIEW,
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...baseAuditPayload({
          req,
          correlation_id,
          action: ACTION.PREVIEW,
          reason: null,
        }),
        success: false,
        change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
        request_digest: digestRequest(req.body),
        scanned_count: 0,
        mapped_count: 0,
        skipped_count: 0,
        error: err?.message || String(err),
      },
    });

    return res.status(500).json({
      success: false,
      message: "Gagal menjalankan preview auto mapping kegiatan.",
      data: { correlation_id },
    });
  }
}

async function execute(req, res) {
  const correlation_id = randomUUID();
  const confirm = req.body?.confirm === true;

  if (!confirm) {
    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: ACTION.EXECUTE_REJECTED,
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...baseAuditPayload({
          req,
          correlation_id,
          action: ACTION.EXECUTE_REJECTED,
          reason: "confirm harus true",
        }),
        success: false,
        change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
        request_digest: digestRequest(req.body),
        scanned_count: 0,
        mapped_count: 0,
        skipped_count: 0,
        error: "confirm wajib bernilai true.",
      },
    });

    return res.status(400).json({
      success: false,
      message: "Execute ditolak: confirm wajib bernilai true.",
      data: { correlation_id },
    });
  }

  try {
    const result = await svc.executeKegiatanAutoMap(req.body || {});

    if (!result.ok) {
      writeTenantAudit({
        user_id: req.user?.id ?? null,
        aksi: ACTION.EXECUTE_REJECTED,
        tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
        payload: {
          ...baseAuditPayload({
            req,
            correlation_id,
            action: ACTION.EXECUTE_REJECTED,
            reason: result.error || null,
          }),
          success: false,
          change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
          request_digest: digestRequest(req.body),
          scanned_count: result.data?.preview_summary?.total_kegiatans_scanned ?? 0,
          mapped_count: 0,
          skipped_count: 0,
          error: result.error || "Execute auto mapping kegiatan ditolak.",
        },
      });

      return res.status(400).json({
        success: false,
        message: result.error || "Execute auto mapping kegiatan ditolak.",
        data: { correlation_id },
      });
    }

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: ACTION.EXECUTE,
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...baseAuditPayload({
          req,
          correlation_id,
          action: ACTION.EXECUTE,
          reason: req.body?.reason ? String(req.body.reason) : null,
        }),
        success: true,
        change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
        request_digest: digestRequest(req.body),
        scanned_count: result.data?.preview_summary?.total_kegiatans_scanned ?? 0,
        mapped_count: result.data?.summary?.mapped ?? 0,
        skipped_count:
          result.data?.summary?.noop_count ??
          result.data?.summary?.skipped ??
          0,
        failed_count: result.data?.summary?.failed ?? 0,
        affected_ids: (result.data?.mapped_kegiatan_ids || []).slice(0, 200),
        old_state_summary: result.data?.old_state_summary ?? null,
        new_state_summary: result.data?.new_state_summary ?? null,
        result_compact: compactExecute(result.data),
      },
    });

    return res.json({
      success: true,
      data: {
        ...result.data,
        correlation_id,
      },
    });
  } catch (err) {
    console.error("[rpjmdKegiatanAutoMapController.execute]", err);

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: ACTION.EXECUTE_REJECTED,
      tenant_id_asal: req.tenantId ?? req.user?.tenant_id ?? null,
      payload: {
        ...baseAuditPayload({
          req,
          correlation_id,
          action: ACTION.EXECUTE_REJECTED,
          reason: err?.message || String(err),
        }),
        success: false,
        change_origin: CHANGE_ORIGIN.API_RPJMD_KEGIATAN_AUTO_MAP,
        request_digest: digestRequest(req.body),
        scanned_count: 0,
        mapped_count: 0,
        skipped_count: 0,
        error: err?.message || String(err),
      },
    });

    return res.status(500).json({
      success: false,
      message: "Gagal menjalankan execute auto mapping kegiatan.",
      data: { correlation_id },
    });
  }
}

module.exports = {
  preview,
  execute,
};
