"use strict";

const { sequelize, RpjmdSyncAuditLog } = require("../../models");
const {
  analyzeIndicatorRepair,
  validateSmartQuery,
  safeNumber,
  getSafeErrorMessage,
  getStageConfig,
} = require("./rpjmdIndicatorFkDiagnosisService");

function normalizeRole(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) {
    return null;
  }

  if (text === "SUPERADMIN") {
    return "SUPER_ADMIN";
  }

  return text.replace(/[^A-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function buildAuditPayload({
  event_type,
  actor_user_id,
  actor_role,
  target_module,
  rpjmd_id,
  renstra_id,
  payload_json,
  result_json,
  reqMeta,
}) {
  return {
    actor_user_id: safeNumber(actor_user_id),
    actor_role: normalizeRole(actor_role),
    event_type,
    target_module,
    rpjmd_id: safeNumber(rpjmd_id),
    renstra_id: safeNumber(renstra_id),
    payload_json: payload_json || null,
    result_json: result_json || null,
    ip_address: reqMeta?.ip || null,
    user_agent: reqMeta?.userAgent || null,
    created_at: new Date(),
  };
}

async function writeAuditLog({
  event_type,
  actor_user_id,
  actor_role,
  target_module,
  rpjmd_id,
  renstra_id,
  payload_json,
  result_json,
  reqMeta,
  transaction,
}) {
  return RpjmdSyncAuditLog.create(
    buildAuditPayload({
      event_type,
      actor_user_id,
      actor_role,
      target_module,
      rpjmd_id,
      renstra_id,
      payload_json,
      result_json,
      reqMeta,
    }),
    transaction ? { transaction } : {},
  );
}

async function previewIndicatorRepair(params = {}) {
  const normalized = validateSmartQuery(params, { requireSuperAdmin: false });
  if (!normalized.success) {
    return normalized;
  }

  const analysis = await analyzeIndicatorRepair({
    ...normalized.data,
    actor_user_id: normalized.data.actor_user_id,
    auto_repair: false,
  }, {
    requireSuperAdmin: false,
  });

  if (!analysis.success) {
    return analysis;
  }

  await writeAuditLog({
    event_type: "indicator_repair_preview",
    actor_user_id: normalized.data.actor_user_id,
    actor_role: normalized.data.actor_role,
    target_module: normalized.data.target_module,
    rpjmd_id: normalized.data.rpjmd_id,
    renstra_id: normalized.data.renstra_id,
    payload_json: normalized.data,
    result_json: analysis.data || null,
    reqMeta: params.reqMeta || null,
  });

  return analysis;
}

async function executeIndicatorRepair(params = {}) {
  const normalized = validateSmartQuery(params, { requireSuperAdmin: true });
  if (!normalized.success) {
    return normalized;
  }

  const transaction = params.transaction || (await sequelize.transaction());
  const ownsTransaction = !params.transaction;

  try {
    const analysis = await analyzeIndicatorRepair({
      ...normalized.data,
      actor_user_id: normalized.data.actor_user_id,
      transaction,
      auto_repair: true,
    }, {
      requireSuperAdmin: true,
    });

    if (!analysis.success) {
      if (ownsTransaction) {
        await transaction.rollback();
      }
      return analysis;
    }

    const diagnosis = analysis.data?.diagnosis || null;
    const eligibleCandidates = Array.isArray(analysis.data?.eligible_candidates)
      ? analysis.data.eligible_candidates
      : [];
    const candidate =
      eligibleCandidates[0] ||
      analysis.data?.diagnosis?.selected_candidate ||
      analysis.data?.selected_candidate ||
      null;

    if (!diagnosis?.repairable || !candidate?.row) {
      const hasCandidates = Array.isArray(analysis.data?.candidates) && analysis.data.candidates.length > 0;
      const hasEligibleCandidates = eligibleCandidates.length > 0;
      const response = {
        success: true,
        status: 200,
        code: diagnosis?.status || "NO_SOURCE_INDICATOR",
        message:
          diagnosis?.status === "NO_SOURCE_INDICATOR"
            ? "Tidak ada indikator RPJMD sumber yang dapat dikenali untuk level ini."
            : "Tidak ada repair yang dilakukan.",
        data: {
          diagnosis,
          repair: {
            updated_source_rows: 0,
            ambiguous: Number(hasEligibleCandidates && eligibleCandidates.length > 1 ? 1 : 0),
            unresolved: Number(hasCandidates && !hasEligibleCandidates ? 1 : 0),
          },
          source_map: analysis.data?.source_map || null,
          eligible_candidates: eligibleCandidates,
        },
      };

      await writeAuditLog({
        event_type: "indicator_repair_execute",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: normalized.data,
        result_json: response.data,
        reqMeta: params.reqMeta || null,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return response;
    }

    const sourceStage = normalized.data.source_stage;
    const cfg = getStageConfig(sourceStage);
    const repairValues =
      sourceStage === "sub_kegiatan"
        ? {
            sub_kegiatan_id: normalized.data.source_ref_id,
            kegiatan_id: safeNumber(analysis.data?.parent_context?.indicator_row?.kegiatan_id) || null,
            indikator_kegiatan_id: safeNumber(analysis.data?.parent_context?.indicator_row?.id) || null,
          }
        : {
          kegiatan_id: normalized.data.source_ref_id,
        };

    let updatedSourceRows = 0;
    if (cfg?.source_model && candidate.row?.id) {
      const before = {
        kegiatan_id: candidate.row.kegiatan_id ?? null,
        sub_kegiatan_id: candidate.row.sub_kegiatan_id ?? null,
        indikator_kegiatan_id: candidate.row.indikator_kegiatan_id ?? null,
      };
      const needsUpdate = Object.entries(repairValues).some(
        ([field, value]) => String(before[field] ?? "") !== String(value ?? ""),
      );

      if (needsUpdate) {
        await cfg.source_model.update(repairValues, {
          where: { id: candidate.row.id },
          transaction,
        });
        updatedSourceRows = 1;
      }
    }

    const response = {
      success: true,
      status: 200,
      code: "AUTO_REPAIRED",
      message: "FK sumber indikator berhasil diperbaiki secara aman.",
      data: {
        diagnosis: {
          ...diagnosis,
          status: "AUTO_REPAIRED",
          repairable: false,
          requires_super_admin_confirmation: false,
        },
        repair: {
          updated_source_rows: updatedSourceRows,
          ambiguous: 0,
          unresolved: 0,
        },
        source_map: analysis.data?.source_map || null,
        selected_candidate: candidate,
        eligible_candidates: eligibleCandidates,
      },
    };

    await writeAuditLog({
      event_type: "indicator_repair_execute",
      actor_user_id: normalized.data.actor_user_id,
      actor_role: normalized.data.actor_role,
      target_module: normalized.data.target_module,
      rpjmd_id: normalized.data.rpjmd_id,
      renstra_id: normalized.data.renstra_id,
      payload_json: normalized.data,
      result_json: response.data,
      reqMeta: params.reqMeta || null,
      transaction,
    });

    if (ownsTransaction) {
      await transaction.commit();
    }

    return response;
  } catch (error) {
    if (ownsTransaction) {
      await transaction.rollback();
    }

    return {
      success: false,
      status: 500,
      code: "RPJMD_INDICATOR_REPAIR_FAILED",
      message: getSafeErrorMessage(error, "Repair indikator gagal."),
      errors: [],
    };
  }
}

module.exports = {
  previewIndicatorRepair,
  executeIndicatorRepair,
  writeAuditLog,
};
