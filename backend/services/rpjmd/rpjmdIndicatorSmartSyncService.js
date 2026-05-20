"use strict";

const {
  sequelize,
  IndikatorRenstra,
} = require("../../models");
const {
  analyzeIndicatorRepair,
  validateSmartQuery,
  safeNumber,
} = require("./rpjmdIndicatorFkDiagnosisService");
const {
  executeIndicatorRepair,
  writeAuditLog,
} = require("./rpjmdIndicatorAutoRepairService");
const { syncRpjmdIndicatorsToRenstra } = require("./rpjmdIndicatorSyncService");

const BLOCKING_DIAGNOSIS_STATUSES = new Set([
  "PARENT_INDICATOR_NOT_FOUND",
  "PARENT_CHAIN_INVALID",
  "UNRESOLVED_HIERARCHY",
  "NEED_SUPER_ADMIN_CONFIRMATION",
]);

function buildVerifyQuery({ renstra_id, source_stage, target_ref_id }) {
  return {
    renstra_id: safeNumber(renstra_id),
    stage: source_stage,
    ref_id: safeNumber(target_ref_id),
  };
}

async function getIndicatorHealth(params = {}) {
  const normalized = validateSmartQuery(params, { requireSuperAdmin: false });
  if (!normalized.success) {
    return normalized;
  }

  const analysis = await analyzeIndicatorRepair({
    ...normalized.data,
    auto_repair: false,
  }, {
    requireSuperAdmin: false,
  });

  if (!analysis.success) {
    return analysis;
  }

  const diagnosis = analysis.data?.diagnosis || null;
  return {
    success: true,
    status: 200,
    code: diagnosis?.status || "SOURCE_OK",
    message:
      diagnosis?.status === "SOURCE_OK"
        ? "Health scan indikator berhasil."
        : "Health scan indikator selesai.",
    data: {
      diagnosis,
      source_map: analysis.data?.source_map || null,
      source_count: Array.isArray(analysis.data?.source_rows) ? analysis.data.source_rows.length : 0,
      candidate_count: Array.isArray(analysis.data?.candidates) ? analysis.data.candidates.length : 0,
      repairable: Boolean(diagnosis?.repairable),
      requires_super_admin_confirmation: Boolean(
        diagnosis?.requires_super_admin_confirmation,
      ),
      source_stage: normalized.data.source_stage,
      source_ref_id: normalized.data.source_ref_id,
      target_ref_id: safeNumber(analysis.data?.target_ref_id),
    },
  };
}

async function runSmartIndicatorSync(params = {}) {
  const normalized = validateSmartQuery(params, { requireSuperAdmin: true });
  if (!normalized.success) {
    return normalized;
  }

  const transaction = params.transaction || (await sequelize.transaction());
  const ownsTransaction = !params.transaction;
  const auditPayload = normalized.data;

  try {
    const analysis = await analyzeIndicatorRepair({
      ...normalized.data,
      transaction,
      auto_repair: normalized.data.auto_repair,
    }, {
      requireSuperAdmin: true,
    });

    if (!analysis.success) {
      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: analysis.data || { code: analysis.code, message: analysis.message },
        reqMeta: params.reqMeta || null,
        transaction,
      });
      if (ownsTransaction) {
        await transaction.rollback();
      }
      return analysis;
    }

    const diagnosis = analysis.data?.diagnosis || null;
    const sourceMap = analysis.data?.source_map || null;
    const resolvedTargetRefId = safeNumber(sourceMap?.target_ref_id);
    const requestedTargetRefId = safeNumber(normalized.data.target_ref_id);

    if (
      requestedTargetRefId &&
      resolvedTargetRefId &&
      requestedTargetRefId !== resolvedTargetRefId
    ) {
      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: {
          code: "TARGET_SCOPE_VIOLATION",
          message: "target_ref_id tidak sesuai dengan source-map aktif.",
          source_map: sourceMap,
        },
        reqMeta: params.reqMeta || null,
        transaction,
      });
      if (ownsTransaction) {
        await transaction.rollback();
      }
      return {
        success: false,
        status: 400,
        code: "TARGET_SCOPE_VIOLATION",
        message: "target_ref_id tidak sesuai dengan source-map aktif.",
        data: {
          diagnosis: {
            status: "TARGET_SCOPE_VIOLATION",
            repairable: false,
            requires_super_admin_confirmation: false,
          },
          source_map: sourceMap,
        },
      };
    }

    if (diagnosis?.status === "AMBIGUOUS_HIERARCHY_MATCH") {
      const response = {
        success: false,
        status: 409,
        code: "INDICATOR_HIERARCHY_AMBIGUOUS",
        message: "Sistem menemukan lebih dari satu kandidat relasi indikator. Perlu konfirmasi Super Admin.",
        data: {
          diagnosis,
          candidates: analysis.data?.candidates || [],
          source_map: sourceMap,
        },
      };

      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: response.data,
        reqMeta: params.reqMeta || null,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return response;
    }

    if (diagnosis?.status === "SOURCE_MAP_INVALID") {
      const response = {
        success: false,
        status: 400,
        code: "SOURCE_MAP_INVALID",
        message: "Mapping source-map Governance Hub belum valid.",
        data: {
          diagnosis,
          source_map: sourceMap,
        },
      };

      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: response.data,
        reqMeta: params.reqMeta || null,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return response;
    }

    if (BLOCKING_DIAGNOSIS_STATUSES.has(diagnosis?.status)) {
      const response = {
        success: false,
        status: 422,
        code: diagnosis?.status || "UNRESOLVED_HIERARCHY",
        message:
          diagnosis?.status === "PARENT_INDICATOR_NOT_FOUND"
            ? "Parent indikator belum ditemukan."
            : diagnosis?.status === "PARENT_CHAIN_INVALID"
              ? "Parent chain indikator belum valid."
              : diagnosis?.status === "NEED_SUPER_ADMIN_CONFIRMATION"
                ? "Sistem menemukan kandidat indikator, tetapi confidence belum cukup untuk auto-repair aman."
                : "Hirarki indikator belum dapat di-resolve secara aman.",
        data: {
          diagnosis,
          candidates: analysis.data?.candidates || [],
          source_map: sourceMap,
        },
      };

      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: response.data,
        reqMeta: params.reqMeta || null,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return response;
    }

    let repairResult = {
      updated_source_rows: 0,
      ambiguous: 0,
      unresolved: 0,
    };

    if (
      diagnosis?.repairable &&
      normalized.data.auto_repair !== false &&
      diagnosis.status !== "SOURCE_OK"
    ) {
      const repairResponse = await executeIndicatorRepair({
        ...normalized.data,
        transaction,
        reqMeta: params.reqMeta || null,
      });

      if (!repairResponse.success) {
        if (ownsTransaction) {
          await transaction.rollback();
        }

        return repairResponse;
      }

      repairResult = repairResponse.data?.repair || repairResult;
    }

    if (diagnosis?.status === "NO_SOURCE_INDICATOR") {
      const response = {
        success: true,
        status: 200,
        code: "NO_SOURCE_INDICATOR",
        message: "Tidak ada indikator RPJMD sumber yang dapat dikenali untuk level ini.",
        data: {
          diagnosis,
          repair: repairResult,
          sync: {
            created: 0,
            updated: 0,
            skipped: 0,
            blocked: 0,
            source_count: 0,
          },
          verify: {
            renstra_id: normalized.data.renstra_id,
            stage: normalized.data.source_stage,
            ref_id: resolvedTargetRefId,
            indicator_count: 0,
            status: "NO_SOURCE_INDICATOR",
          },
        },
      };

      await writeAuditLog({
        event_type: "indicator_smart_sync",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: response.data,
        reqMeta: params.reqMeta || null,
        transaction,
      });

      if (ownsTransaction) {
        await transaction.commit();
      }

      return response;
    }

    const syncResult = await syncRpjmdIndicatorsToRenstra({
      ...normalized.data,
      transaction,
    });

    if (!syncResult.success) {
      await writeAuditLog({
        event_type: "indicator_smart_sync_failed",
        actor_user_id: normalized.data.actor_user_id,
        actor_role: normalized.data.actor_role,
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        payload_json: auditPayload,
        result_json: syncResult.data || { code: syncResult.code, message: syncResult.message },
        reqMeta: params.reqMeta || null,
        transaction,
      });
      if (ownsTransaction) {
        await transaction.rollback();
      }

      return syncResult;
    }

    const verifyTargetRefId = requestedTargetRefId ?? resolvedTargetRefId;
    const verifyQuery = buildVerifyQuery({
      renstra_id: normalized.data.renstra_id,
      source_stage: normalized.data.source_stage,
      target_ref_id: verifyTargetRefId,
    });
    const verifyRows = await IndikatorRenstra.findAll({
      where: {
        renstra_id: verifyQuery.renstra_id,
        stage: verifyQuery.stage,
        ref_id: verifyQuery.ref_id,
      },
      order: [["id", "ASC"]],
      raw: true,
      transaction,
    });

    const verifyStatus = verifyRows.length > 0 ? "SYNCED_VERIFIED" : "SYNC_FAILED";
    const response = {
      success: true,
      status: verifyStatus === "SYNCED_VERIFIED" ? 200 : 202,
      code: verifyStatus,
      message:
        verifyStatus === "SYNCED_VERIFIED"
          ? "Indikator berhasil diperiksa, diperbaiki, disinkronkan, dan diverifikasi."
          : "Indikator berhasil disinkronkan, tetapi verifikasi belum menemukan data.",
      data: {
        diagnosis: {
          ...diagnosis,
          status: verifyStatus,
          repairable: false,
          requires_super_admin_confirmation: false,
        },
        repair: repairResult,
        sync: {
          created: syncResult.data?.created ?? 0,
          updated: syncResult.data?.updated ?? 0,
          skipped: syncResult.data?.skipped ?? 0,
          blocked: syncResult.data?.blocked ?? 0,
          source_count: syncResult.data?.source_count ?? 0,
        },
        verify: {
          renstra_id: verifyQuery.renstra_id,
          stage: verifyQuery.stage,
          ref_id: verifyQuery.ref_id,
          indicator_count: verifyRows.length,
          status: verifyStatus,
        },
        source_map: sourceMap,
        source_rows: analysis.data?.source_rows || [],
        candidates: analysis.data?.candidates || [],
        eligible_candidates: analysis.data?.eligible_candidates || [],
      },
    };

    await writeAuditLog({
      event_type: "indicator_smart_sync",
      actor_user_id: normalized.data.actor_user_id,
      actor_role: normalized.data.actor_role,
      target_module: normalized.data.target_module,
      rpjmd_id: normalized.data.rpjmd_id,
      renstra_id: normalized.data.renstra_id,
      payload_json: auditPayload,
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

    const message = error?.message || "Smart auto-healing indikator gagal.";
    return {
      success: false,
      status: 500,
      code: "RPJMD_INDICATOR_SMART_SYNC_FAILED",
      message,
      errors: [],
    };
  }
}

module.exports = {
  getIndicatorHealth,
  runSmartIndicatorSync,
  buildVerifyQuery,
};
