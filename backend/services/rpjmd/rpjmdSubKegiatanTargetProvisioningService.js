"use strict";

const {
  sequelize,
  SubKegiatan,
  RenstraKegiatan,
  RenstraSubkegiatan,
} = require("../../models");
const {
  resolveTargetRefId,
  upsertSourceMapRows,
  safeNumber,
  normalizeText,
  normalizeStructureCode,
} = require("./rpjmdSourceMapService");
const { runSmartIndicatorSync } = require("./rpjmdIndicatorSmartSyncService");
const { writeAuditLog } = require("./rpjmdIndicatorAutoRepairService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_SOURCE_STAGE = "sub_kegiatan";

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeRole(value) {
  const text = normalizeText(value)?.toUpperCase() || null;
  if (!text) return null;
  if (text === "SUPERADMIN") return "SUPER_ADMIN";
  return text.replace(/[^A-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function pickModelAttributes(model, values = {}) {
  const attributes = model?.rawAttributes || {};
  const result = {};

  Object.entries(values).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(attributes, key) && value !== undefined) {
      result[key] = value;
    }
  });

  return result;
}

function buildAuditResult({
  provision,
  sourceMap,
  smartSync,
  source,
  parentTarget,
  existingTarget,
}) {
  return {
    provision,
    source_map: sourceMap,
    smart_sync: smartSync || null,
    source: source
      ? {
          id: source.id,
          kegiatan_id: source.kegiatan_id,
          kode_sub_kegiatan: source.kode_sub_kegiatan,
          nama_sub_kegiatan: source.nama_sub_kegiatan,
        }
      : null,
    parent_target: parentTarget
      ? {
          id: parentTarget.id,
          renstra_id: parentTarget.renstra_id ?? null,
          program_id: parentTarget.program_id ?? null,
          kode_kegiatan: parentTarget.kode_kegiatan ?? null,
          nama_kegiatan: parentTarget.nama_kegiatan ?? null,
        }
      : null,
    existing_target: existingTarget
      ? {
          id: existingTarget.id,
          kegiatan_id: existingTarget.kegiatan_id ?? null,
          sub_kegiatan_id: existingTarget.sub_kegiatan_id ?? null,
          kode_sub_kegiatan: existingTarget.kode_sub_kegiatan ?? null,
          nama_sub_kegiatan: existingTarget.nama_sub_kegiatan ?? null,
        }
      : null,
  };
}

async function loadSourceSubKegiatan(sourceRefId, transaction) {
  const row = await SubKegiatan.findByPk(sourceRefId, {
    include: [
      { association: "kegiatan" },
      { association: "periode" },
    ],
    transaction,
  });

  if (!row) {
    return null;
  }

  return typeof row.get === "function" ? row.get({ plain: true }) : { ...row };
}

async function loadParentTargetKegiatan(parentTargetRefId, transaction) {
  const row = await RenstraKegiatan.findByPk(parentTargetRefId, {
    transaction,
  });

  if (!row) {
    return null;
  }

  return typeof row.get === "function" ? row.get({ plain: true }) : { ...row };
}

async function findExistingTargetSubKegiatan({
  parentTargetRefId,
  sourceCode,
  transaction,
}) {
  const normalizedCode = normalizeStructureCode(sourceCode);
  if (!normalizedCode) {
    return [];
  }

  const rows = await RenstraSubkegiatan.findAll({
    where: {
      kegiatan_id: safeNumber(parentTargetRefId),
      kode_sub_kegiatan: normalizedCode,
    },
    order: [["id", "ASC"]],
    transaction,
  });

  return rows.map((row) => (typeof row.get === "function" ? row.get({ plain: true }) : { ...row }))
    .filter((row) => safeNumber(row?.kegiatan_id) === safeNumber(parentTargetRefId));
}

function buildTargetPayload({
  source,
  parentTargetKegiatan,
}) {
  return pickModelAttributes(RenstraSubkegiatan, {
    renstra_program_id: safeNumber(parentTargetKegiatan?.program_id),
    kegiatan_id: safeNumber(parentTargetKegiatan?.id),
    sub_kegiatan_id: safeNumber(source?.id),
    kode_sub_kegiatan: normalizeStructureCode(source?.kode_sub_kegiatan),
    nama_sub_kegiatan: normalizeText(source?.nama_sub_kegiatan),
    sub_bidang_opd: normalizeText(source?.sub_bidang_opd),
    nama_opd: normalizeText(source?.nama_opd),
    nama_bidang_opd: normalizeText(source?.nama_bidang_opd),
  });
}

async function provisionSubKegiatanTarget(params = {}) {
  const sourceRefId = safeNumber(params.source_ref_id);
  const renstraId = safeNumber(params.renstra_id);
  const rpjmdId = safeNumber(params.rpjmd_id);
  const parentSourceRefId = safeNumber(params.parent_source_ref_id);
  const parentTargetRefId = safeNumber(params.parent_target_ref_id);
  const targetModule = normalizeText(params.target_module)?.toUpperCase() || VALID_TARGET_MODULE;
  const sourceStage = normalizeText(params.source_stage)?.toLowerCase() || null;
  const runSmartSync = normalizeBoolean(params.run_smart_sync);
  const reason = normalizeText(params.reason) || "Provision target Renstra Sub Kegiatan dari RPJMD source melalui alur resmi.";
  const actorUserId = safeNumber(params.actor_user_id);
  const actorRole = normalizeRole(params.actor_role);
  const reqMeta = params.reqMeta || null;

  if (!rpjmdId || rpjmdId <= 0) {
    return {
      success: false,
      status: 400,
      code: "RPJMD_ID_INVALID",
      message: "rpjmd_id wajib diisi dan harus angka positif.",
    };
  }

  if (!renstraId || renstraId <= 0) {
    return {
      success: false,
      status: 400,
      code: "RENSTRA_ID_INVALID",
      message: "renstra_id wajib diisi dan harus angka positif.",
    };
  }

  if (targetModule !== VALID_TARGET_MODULE) {
    return {
      success: false,
      status: 400,
      code: "TARGET_MODULE_INVALID",
      message: "target_module wajib RENSTRA.",
    };
  }

  if (sourceStage !== VALID_SOURCE_STAGE) {
    return {
      success: false,
      status: 400,
      code: "SOURCE_STAGE_INVALID",
      message: "source_stage wajib sub_kegiatan.",
    };
  }

  if (!sourceRefId || sourceRefId <= 0) {
    return {
      success: false,
      status: 400,
      code: "SOURCE_REF_ID_INVALID",
      message: "source_ref_id wajib diisi dan harus angka positif.",
    };
  }

  if (!parentSourceRefId || parentSourceRefId <= 0) {
    return {
      success: false,
      status: 400,
      code: "PARENT_SOURCE_REF_ID_INVALID",
      message: "parent_source_ref_id wajib diisi dan harus angka positif.",
    };
  }

  if (!parentTargetRefId || parentTargetRefId <= 0) {
    return {
      success: false,
      status: 400,
      code: "PARENT_KEGIATAN_MAPPING_INVALID",
      message: "Target parent Kegiatan Renstra belum valid. Sinkronkan Kegiatan terlebih dahulu.",
      data: {
        source_stage: VALID_SOURCE_STAGE,
        source_ref_id: sourceRefId,
        parent_source_stage: "kegiatan",
        parent_source_ref_id: parentSourceRefId,
      },
    };
  }

  if (!actorUserId || actorUserId <= 0) {
    return {
      success: false,
      status: 400,
      code: "ACTOR_USER_ID_INVALID",
      message: "actor_user_id wajib tersedia dari user login.",
    };
  }

  if (actorRole !== "SUPER_ADMIN") {
    return {
      success: false,
      status: 403,
      code: "MR_ROLE_FORBIDDEN",
      message: "Aksi provisioning target hanya dapat dijalankan oleh Super Admin.",
    };
  }

  const transaction = params.transaction || (await sequelize.transaction());
  const ownsTransaction = !params.transaction;

  try {
    const source = await loadSourceSubKegiatan(sourceRefId, transaction);
    if (!source) {
      const response = {
        success: false,
        status: 404,
        code: "SOURCE_SUB_KEGIATAN_NOT_FOUND",
        message: "Source Sub Kegiatan RPJMD tidak ditemukan.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
        },
      };

      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });

      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    if (!safeNumber(source?.kegiatan_id)) {
      const response = {
        success: false,
        status: 400,
        code: "SOURCE_SUB_KEGIATAN_NOT_FOUND",
        message: "Source Sub Kegiatan RPJMD tidak valid.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
        },
      };
      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });
      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    if (normalizeText(source?.jenis_dokumen)?.toUpperCase() !== "RPJMD") {
      const response = {
        success: false,
        status: 400,
        code: "SOURCE_SUB_KEGIATAN_NOT_FOUND",
        message: "Source Sub Kegiatan RPJMD tidak valid.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
        },
      };
      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });
      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    if (safeNumber(source.kegiatan_id) !== parentSourceRefId) {
      const response = {
        success: false,
        status: 400,
        code: "PARENT_KEGIATAN_MAPPING_INVALID",
        message: "Target parent Kegiatan Renstra belum valid. Sinkronkan Kegiatan terlebih dahulu.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
          parent_source_stage: "kegiatan",
          parent_source_ref_id: parentSourceRefId,
        },
      };
      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });
      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const parentSourceMap = await resolveTargetRefId({
      rpjmd_id: rpjmdId,
      renstra_id: renstraId,
      target_module: targetModule,
      source_stage: "kegiatan",
      source_ref_id: parentSourceRefId,
      include_parent: true,
      include_chain: true,
    });

    if (!parentSourceMap.success || safeNumber(parentSourceMap.data?.target_ref_id) !== parentTargetRefId) {
      const response = {
        success: false,
        status: 400,
        code: "PARENT_KEGIATAN_MAPPING_INVALID",
        message: "Target parent Kegiatan Renstra belum valid. Sinkronkan Kegiatan terlebih dahulu.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
          parent_source_stage: "kegiatan",
          parent_source_ref_id: parentSourceRefId,
        },
      };

      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });

      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const parentTarget = await loadParentTargetKegiatan(parentTargetRefId, transaction);
    if (!parentTarget || safeNumber(parentTarget.renstra_id) !== renstraId) {
      const response = {
        success: false,
        status: 400,
        code: "PARENT_KEGIATAN_MAPPING_INVALID",
        message: "Target parent Kegiatan Renstra belum valid. Sinkronkan Kegiatan terlebih dahulu.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
          parent_source_stage: "kegiatan",
          parent_source_ref_id: parentSourceRefId,
        },
      };

      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });

      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const normalizedSourceCode = normalizeStructureCode(source.kode_sub_kegiatan);
    if (!normalizedSourceCode) {
      const response = {
        success: false,
        status: 400,
        code: "SOURCE_SUB_KEGIATAN_NOT_FOUND",
        message: "Source Sub Kegiatan RPJMD tidak memiliki kode yang valid.",
        data: {
          source_stage: VALID_SOURCE_STAGE,
          source_ref_id: sourceRefId,
        },
      };
      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const existingTargets = await findExistingTargetSubKegiatan({
      parentTargetRefId,
      sourceCode: normalizedSourceCode,
      transaction,
    });

    if (existingTargets.length > 1) {
      const response = {
        success: false,
        status: 409,
        code: "TARGET_SUB_KEGIATAN_DUPLICATE",
        message: "Ditemukan lebih dari satu target Sub Kegiatan Renstra dengan kode yang sama. Perlu pemeriksaan Super Admin.",
        data: {
          provision: {
            status: "TARGET_SUB_KEGIATAN_DUPLICATE",
            created: false,
            reused_existing: false,
            source_ref_id: sourceRefId,
            source_code: normalizedSourceCode,
            parent_target_ref_id: parentTargetRefId,
          },
        },
      };

      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response.data || response,
        reqMeta,
        transaction,
      });

      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const existingTarget = existingTargets[0] || null;
    const targetPayload = buildTargetPayload({
      source,
      parentTargetKegiatan: parentTarget,
    });

    let targetRow = existingTarget;
    const beforeTarget = existingTarget
      ? {
          kegiatan_id: existingTarget.kegiatan_id ?? null,
          sub_kegiatan_id: existingTarget.sub_kegiatan_id ?? null,
          renstra_program_id: existingTarget.renstra_program_id ?? null,
          kode_sub_kegiatan: existingTarget.kode_sub_kegiatan ?? null,
          nama_sub_kegiatan: existingTarget.nama_sub_kegiatan ?? null,
        }
      : null;

    if (existingTarget) {
      const needsUpdate = Object.entries(targetPayload).some(
        ([field, value]) => String(existingTarget[field] ?? "") !== String(value ?? ""),
      );
      if (needsUpdate) {
        await RenstraSubkegiatan.update(targetPayload, {
          where: { id: existingTarget.id },
          transaction,
        });
        targetRow = {
          ...existingTarget,
          ...targetPayload,
        };
      }
    } else {
      const created = await RenstraSubkegiatan.create(targetPayload, { transaction });
      targetRow = typeof created.get === "function" ? created.get({ plain: true }) : { ...created };
    }

    const sourceMapPayload = {
      rpjmd_id: rpjmdId,
      renstra_id: renstraId,
      target_module: targetModule,
      source_stage: VALID_SOURCE_STAGE,
      source_table: "sub_kegiatan",
      source_ref_id: safeNumber(source.id),
      source_code: normalizedSourceCode,
      source_name: normalizeText(source.nama_sub_kegiatan),
      target_table: "renstra_subkegiatan",
      target_ref_id: safeNumber(targetRow.id),
      target_code: normalizeStructureCode(targetRow.kode_sub_kegiatan || normalizedSourceCode),
      target_name: normalizeText(targetRow.nama_sub_kegiatan || source.nama_sub_kegiatan),
      parent_source_stage: "kegiatan",
      parent_source_ref_id: safeNumber(source.kegiatan_id),
      parent_target_stage: "kegiatan",
      parent_target_ref_id: safeNumber(parentTargetRefId),
      mapping_status: "mapped",
      chain_status: "valid",
      last_checked_at: new Date(),
      last_synced_at: new Date(),
      created_by: actorUserId,
      updated_by: actorUserId,
    };

    const sourceMapResult = await upsertSourceMapRows({
      rows: [sourceMapPayload],
      transaction,
      actor_user_id: actorUserId,
    });

    if (!sourceMapResult.success) {
      const response = {
        success: false,
        status: 500,
        code: sourceMapResult.code || "RPJMD_SOURCE_MAP_UPSERT_FAILED",
        message: sourceMapResult.message || "Gagal menyimpan source map Sub Kegiatan.",
      };
      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: response,
        reqMeta,
        transaction,
      });
      if (ownsTransaction) await transaction.rollback();
      return response;
    }

    const provisionStatus = existingTarget
      ? "TARGET_SUB_KEGIATAN_REUSED"
      : "TARGET_SUB_KEGIATAN_CREATED";
    const provisionTargetRefId = safeNumber(targetRow.id);

    let smartSyncResult = null;
    if (runSmartSync) {
      smartSyncResult = await runSmartIndicatorSync({
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        target_module: targetModule,
        source_stage: VALID_SOURCE_STAGE,
        source_ref_id: safeNumber(source.id),
        target_ref_id: provisionTargetRefId,
        auto_repair: true,
        repair_mode: "safe_only",
        reason,
        actor_user_id: actorUserId,
        actor_role: actorRole,
        reqMeta,
        transaction,
      });
    }

    const smartSyncStatus = String(
      smartSyncResult?.data?.verify?.status ||
        smartSyncResult?.data?.diagnosis?.status ||
        smartSyncResult?.code ||
        "",
    )
      .trim()
      .toUpperCase();
    const smartSyncVerified =
      Boolean(smartSyncResult?.success) && smartSyncStatus === "SYNCED_VERIFIED";
    const smartSyncRequiresResolverRefresh = Boolean(
      runSmartSync &&
        smartSyncResult &&
        (smartSyncResult.success === false ||
          smartSyncStatus === "SOURCE_MAP_INVALID" ||
          smartSyncStatus === "SYNC_FAILED"),
    );

    const response = {
      success: true,
      status: 200,
      code: provisionStatus,
      message: existingTarget
        ? "Target Renstra Sub Kegiatan sudah tersedia, source-map diperbarui."
        : "Target Renstra Sub Kegiatan berhasil disediakan, source-map diperbarui.",
      data: buildAuditResult({
        provision: {
          status: provisionStatus,
          created: !existingTarget,
          reused_existing: Boolean(existingTarget),
          source_ref_id: safeNumber(source.id),
          source_code: normalizedSourceCode,
          target_ref_id: safeNumber(targetRow.id),
          target_code: normalizeStructureCode(targetRow.kode_sub_kegiatan || normalizedSourceCode),
          parent_target_ref_id: safeNumber(parentTargetRefId),
        },
        sourceMap: {
          mapping_status: "mapped",
          chain_status: "valid",
          target_ref_id: provisionTargetRefId,
        },
        smartSync: smartSyncResult ? smartSyncResult.data || smartSyncResult : null,
        source,
        parentTarget,
        existingTarget,
        target_ref_id: provisionTargetRefId,
        provision_success: true,
        smart_sync_success: smartSyncVerified,
        smart_sync_verified: smartSyncVerified,
        ui_requires_resolver_refresh: smartSyncRequiresResolverRefresh,
        next_action: smartSyncRequiresResolverRefresh
          ? "REFRESH_SOURCE_MAP_AND_RUN_SMART_SYNC"
          : null,
        canonical_indicator_query: {
          renstra_id: renstraId,
          stage: VALID_SOURCE_STAGE,
          ref_id: provisionTargetRefId,
        },
      }),
    };

    await writeAuditLog({
      event_type: "sub_kegiatan_target_provision_preview",
      actor_user_id: actorUserId,
      actor_role: actorRole,
      target_module: targetModule,
      rpjmd_id: rpjmdId,
      renstra_id: renstraId,
      payload_json: params,
      result_json: {
        source: response.data.source,
        parent_target: response.data.parent_target,
        existing_target: response.data.existing_target,
        provision: response.data.provision,
        source_map: response.data.source_map,
      },
      reqMeta,
      transaction,
    });

    await writeAuditLog({
      event_type: "sub_kegiatan_target_provision_execute",
      actor_user_id: actorUserId,
      actor_role: actorRole,
      target_module: targetModule,
      rpjmd_id: rpjmdId,
      renstra_id: renstraId,
      payload_json: {
        ...params,
        reason,
      },
      result_json: response.data,
      reqMeta,
      transaction,
    });

    if (ownsTransaction) {
      await transaction.commit();
    }

    if (runSmartSync && smartSyncResult) {
      response.data.smart_sync = smartSyncResult;
      const smartSyncStatus = String(
        smartSyncResult?.data?.verify?.status ||
          smartSyncResult?.data?.diagnosis?.status ||
          smartSyncResult?.code ||
          "",
      )
        .trim()
        .toUpperCase();

      if (smartSyncStatus === "SYNCED_VERIFIED") {
        response.message = existingTarget
          ? "Target Renstra Sub Kegiatan sudah tersedia, source-map diperbarui, dan indikator disinkronkan."
          : "Target Renstra Sub Kegiatan berhasil disediakan, source-map diperbarui, dan indikator disinkronkan.";
      } else if (smartSyncStatus === "NO_SOURCE_INDICATOR") {
        response.message = existingTarget
          ? "Target Renstra Sub Kegiatan sudah tersedia, source-map diperbarui, tetapi belum ada indikator RPJMD sumber untuk disinkronkan."
          : "Target Renstra Sub Kegiatan berhasil disediakan, source-map diperbarui, tetapi belum ada indikator RPJMD sumber untuk disinkronkan.";
      } else if (smartSyncRequiresResolverRefresh) {
        response.message = existingTarget
          ? "Target Renstra Sub Kegiatan sudah tersedia, source-map diperbarui, tetapi smart-sync belum selesai."
          : "Target Renstra Sub Kegiatan berhasil disediakan, source-map diperbarui, tetapi smart-sync belum selesai.";
      }
    }

    return response;
  } catch (error) {
    if (ownsTransaction) {
      await transaction.rollback();
    }

    try {
      await writeAuditLog({
        event_type: "sub_kegiatan_target_provision_failed",
        actor_user_id: actorUserId,
        actor_role: actorRole,
        target_module: targetModule,
        rpjmd_id: rpjmdId,
        renstra_id: renstraId,
        payload_json: params,
        result_json: {
          code: "SUB_KEGIATAN_TARGET_PROVISION_FAILED",
          message: error?.message || "Provision target Sub Kegiatan gagal.",
        },
        reqMeta,
        transaction: params.transaction || null,
      });
    } catch (auditError) {
      // audit failure should not override the primary error
    }

    return {
      success: false,
      status: 500,
      code: "SUB_KEGIATAN_TARGET_PROVISION_FAILED",
      message: error?.message || "Provision target Sub Kegiatan gagal.",
      errors: [],
    };
  }
}

module.exports = {
  provisionSubKegiatanTarget,
};
