"use strict";

const { randomUUID } = require("crypto");
const { writeTenantAudit } = require("../services/tenantAuditService");
const svc = require("../services/rpjmdBackfillMappingService");
const {
  CHANGE_ORIGIN,
  summarizeEntityRow,
  wrapComplianceBase,
} = require("../utils/complianceAuditPayload");

async function preview(req, res) {
  const correlation_id = randomUUID();
  try {
    const { entity_type, entity_id, dataset_key, target_master_id } =
      req.body || {};

    const r = await svc.preview({
      entity_type,
      entity_id,
      dataset_key,
      target_master_id,
    });

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BACKFILL_PREVIEW",
      tenant_id_asal: req.user?.tenant_id ?? null,
      payload: {
        correlation_id,
        entity_type,
        entity_id,
        dataset_key: dataset_key || svc.DEFAULT_DATASET_KEY,
        target_master_id: target_master_id ?? null,
        success: r.ok,
        error: r.ok ? null : r.error,
        safe_to_execute: r.ok ? Boolean(r.data?.safe_to_execute) : null,
        ambiguous: r.ok ? Boolean(r.data?.ambiguous) : null,
      },
    });

    if (!r.ok) {
      return res.status(400).json({
        success: false,
        message: r.error || "Preview backfill gagal.",
        correlation_id,
      });
    }

    return res.json({
      success: true,
      data: { ...r.data, correlation_id },
    });
  } catch (e) {
    console.error("[rpjmdBackfillController.preview]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Preview backfill gagal.",
      correlation_id,
    });
  }
}

async function execute(req, res) {
  const correlation_id = randomUUID();
  try {
    const {
      entity_type,
      entity_id,
      target_master_id,
      reason,
      confirm,
      dataset_key,
    } = req.body || {};

    if (confirm !== true) {
      return res.status(400).json({
        success: false,
        message: "Field confirm wajib bernilai true.",
        correlation_id,
      });
    }

    const reasonStr = String(reason || "").trim();
    if (reasonStr.length < 15) {
      return res.status(400).json({
        success: false,
        message: "reason wajib minimal 15 karakter (jejak audit).",
        correlation_id,
      });
    }

    const ex = await svc.execute({
      entity_type,
      entity_id,
      target_master_id,
      dataset_key,
    });

    const etEx = String(entity_type || "").trim().toUpperCase();
    const eidEx = parseInt(entity_id, 10);

    if (!ex.ok) {
      writeTenantAudit({
        user_id: req.user?.id ?? null,
        aksi: "RPJMD_BACKFILL_EXECUTE_REJECTED",
        tenant_id_asal: req.user?.tenant_id ?? null,
        payload: {
          ...wrapComplianceBase({
            req,
            change_origin: CHANGE_ORIGIN.API_RPJMD_BACKFILL,
            action: "RPJMD_BACKFILL_EXECUTE_REJECTED",
            entity_type: etEx,
            entity_id: Number.isInteger(eidEx) ? eidEx : null,
            affected_ids: [
            Number.isInteger(eidEx) ? eidEx : null,
            parseInt(target_master_id, 10),
          ].filter((n) => Number.isInteger(n) && n >= 1),
            old_state_summary: null,
            new_state_summary: null,
            reason: reasonStr,
            correlation_id,
            batch_id: correlation_id,
          }),
          target_master_id,
          error: ex.error,
        },
      });
      return res.status(400).json({
        success: false,
        message: ex.error || "Eksekusi backfill ditolak.",
        correlation_id,
      });
    }

    writeTenantAudit({
      user_id: req.user?.id ?? null,
      aksi: "RPJMD_BACKFILL_EXECUTE",
      tenant_id_asal: req.user?.tenant_id ?? null,
      payload: {
        ...wrapComplianceBase({
          req,
          change_origin: CHANGE_ORIGIN.API_RPJMD_BACKFILL,
          action: "RPJMD_BACKFILL_EXECUTE",
          entity_type: etEx,
          entity_id: Number.isInteger(eidEx) ? eidEx : null,
          affected_ids: [
            Number.isInteger(eidEx) ? eidEx : null,
            parseInt(target_master_id, 10),
          ].filter((n) => Number.isInteger(n) && n >= 1),
          old_state_summary: summarizeEntityRow(etEx, ex.old_state),
          new_state_summary: summarizeEntityRow(etEx, ex.new_state),
          reason: reasonStr,
          correlation_id,
          batch_id: correlation_id,
        }),
        target_master_id,
        old_state: ex.old_state,
        new_state: ex.new_state,
        noop: Boolean(ex.noop),
      },
    });

    return res.json({
      success: true,
      data: {
        old_state: ex.old_state,
        new_state: ex.new_state,
        correlation_id,
        noop: Boolean(ex.noop),
      },
    });
  } catch (e) {
    console.error("[rpjmdBackfillController.execute]", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "Eksekusi backfill gagal.",
      correlation_id,
    });
  }
}

module.exports = {
  preview,
  execute,
};
