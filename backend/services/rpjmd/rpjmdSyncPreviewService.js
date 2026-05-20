"use strict";

const { randomUUID } = require("crypto");
const {
  sequelize,
  RpjmdSyncJob,
  RpjmdSyncJobItem,
  RpjmdSyncAuditLog,
} = require("../../models");
const { buildRpjmdSourceTree } = require("./rpjmdSourceTreeBuilderService");
const { buildRenstraTargetTree } = require("./rpjmdTargetTreeBuilderService");
const { refreshSourceMapFromTrees } = require("./rpjmdSourceMapService");
const { runRpjmdGovernancePreflight } = require("./rpjmdSyncPreflightService");
const {
  compareSourceAndTarget,
  buildJobItemsFromDiff,
  buildDiffSummary,
} = require("./rpjmdSyncDiffService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_MODE = "preview";
const VALID_SCOPES = new Set([
  "all",
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
  "indikator_tujuan",
  "indikator_sasaran",
  "indikator_strategi",
  "indikator_kebijakan",
  "indikator_program",
  "indikator_kegiatan",
  "indikator_sub_kegiatan",
]);

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function safeJson(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { value: String(value) };
  }
}

function getSafeErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  return fallbackMessage;
}

function generateJobCode() {
  return `RPJMD-GOV-PREVIEW-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function extractRequestMeta(reqMeta) {
  const meta = reqMeta && typeof reqMeta === "object" ? reqMeta : {};
  return {
    ip_address: normalizeText(meta.ip || meta.ip_address || null),
    user_agent: normalizeText(meta.userAgent || meta.user_agent || null),
  };
}

function normalizePreviewPayload(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const renstra_id = safeNumber(source.renstra_id);
  const target_module = normalizeText(source.target_module)?.toUpperCase() || VALID_TARGET_MODULE;
  const scope = normalizeText(source.scope) || "all";
  const include_indicators =
    source.include_indicators === undefined ? true : Boolean(source.include_indicators);
  const include_pagu = source.include_pagu === undefined ? false : Boolean(source.include_pagu);
  const actor_user_id = safeNumber(source.actor_user_id);
  const actor_role = normalizeText(source.actor_role);
  const reason = normalizeText(source.reason) || normalizeText(source.change_reason_text);
  const errors = [];

  if (!rpjmd_id || rpjmd_id <= 0) {
    errors.push({
      field: "rpjmd_id",
      message: "rpjmd_id wajib diisi dan harus angka positif.",
    });
  }

  if (!renstra_id || renstra_id <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: "Preview Governance Hub hanya mendukung target_module RENSTRA.",
    });
  }

  if (!VALID_SCOPES.has(scope)) {
    errors.push({
      field: "scope",
      message: `Scope tidak valid: ${scope}`,
    });
  }

  if (!reason) {
    errors.push({
      field: "reason",
      message: "reason wajib diisi untuk preview Governance Hub.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_VALIDATION_ERROR",
      message: "Validasi payload preview gagal.",
      errors,
    };
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module,
      scope,
      include_indicators,
      include_pagu,
      actor_user_id,
      actor_role,
      reason,
    },
  };
}

function buildPreviewSummary({ preflightResult, diffSummary }) {
  const preflightSummary = preflightResult?.data?.summary || {};
  return {
    ...diffSummary,
    source_tree_ready: Boolean(preflightSummary.source_tree_ready),
    target_tree_ready: Boolean(preflightSummary.target_tree_ready),
    source_map_ready: Boolean(preflightSummary.source_map_ready),
    chain_ready: Boolean(preflightSummary.chain_ready),
    indicator_ready: Boolean(preflightSummary.indicator_ready),
    dropdown_guard_ready: Boolean(preflightSummary.dropdown_guard_ready),
    preflight: {
      is_blocked: Boolean(preflightResult?.data?.is_blocked),
      total_issues: safeNumber(preflightSummary.total_issues) || 0,
      total_blocking_issues: safeNumber(preflightSummary.total_blocking_issues) || 0,
      total_warnings: safeNumber(preflightSummary.total_warnings) || 0,
    },
  };
}

function buildPreviewStatus(preflightResult, summary) {
  if (preflightResult?.data?.is_blocked) {
    return "blocked";
  }

  if ((summary?.total_blocking || 0) > 0) {
    return "blocked";
  }

  return "completed";
}

function buildJobSummaryPayload(payload, preflightResult, summary, status) {
  return {
    payload: {
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      target_module: payload.target_module,
      scope: payload.scope,
      include_indicators: payload.include_indicators,
      include_pagu: payload.include_pagu,
      reason: payload.reason,
    },
    status,
    is_blocked: status === "blocked",
    preflight: {
      is_blocked: Boolean(preflightResult?.data?.is_blocked),
      total_issues: preflightResult?.data?.summary?.total_issues || 0,
      total_blocking_issues: preflightResult?.data?.summary?.total_blocking_issues || 0,
    },
    diff: {
      total_diffs: summary.total_diffs,
      total_job_items: summary.total_job_items,
      total_blocking: summary.total_blocking,
      total_warning: summary.total_warning,
      total_info: summary.total_info,
      classification_counts: {
        unchanged: summary.unchanged,
        mapped_valid: summary.mapped_valid,
        source_updated: summary.source_updated,
        missing_target: summary.missing_target,
        missing_source_map: summary.missing_source_map,
        orphan_target: summary.orphan_target,
        chain_mismatch: summary.chain_mismatch,
        manual_conflict: summary.manual_conflict,
        indicator_context_invalid: summary.indicator_context_invalid,
        resolver_conflict: summary.resolver_conflict,
        source_hash_mismatch: summary.source_hash_mismatch,
        target_hash_mismatch: summary.target_hash_mismatch,
        ready_to_sync: summary.ready_to_sync,
        blocked: summary.blocked,
        target_scope_violation: summary.target_scope_violation,
        dropdown_scope_violation: summary.dropdown_scope_violation,
        parent_missing: summary.parent_missing,
      },
    },
  };
}

function buildPreviewResponse({ job, diffResult }) {
  const jobJson = typeof job?.get === "function" ? job.get({ plain: true }) : job || {};
  const items = Array.isArray(diffResult?.jobItems) ? diffResult.jobItems : [];
  return {
    job: {
      id: jobJson.id,
      job_code: jobJson.job_code,
      status: jobJson.status,
      mode: jobJson.mode,
    },
    summary: diffResult?.summary || safeJson(jobJson.summary_json) || {},
    is_blocked: Boolean(diffResult?.is_blocked),
    items,
  };
}

async function createPreviewJob(params) {
  const payload = params?.payload || {};
  const diffResult = params?.diffResult || {};
  const transaction = params?.transaction || null;
  const actor_user_id = safeNumber(params?.actor_user_id);
  const status = buildPreviewStatus(params?.preflightResult, diffResult.summary);
  const summary_json = buildJobSummaryPayload(
    payload,
    params?.preflightResult,
    diffResult.summary || {},
    status,
  );

  const job = await RpjmdSyncJob.create(
    {
      job_code: generateJobCode(),
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      target_module: payload.target_module,
      scope: payload.scope,
      mode: VALID_MODE,
      status,
      requested_by: actor_user_id,
      confirmed_by: null,
      reason: payload.reason,
      summary_json,
      error_message: null,
      started_at: new Date(),
      finished_at: new Date(),
    },
    { transaction },
  );

  return typeof job.get === "function" ? job.get({ plain: true }) : job;
}

async function createPreviewJobItems(params) {
  const job_id = safeNumber(params?.job_id);
  const jobItems = Array.isArray(params?.jobItems) ? params.jobItems : [];
  const transaction = params?.transaction || null;

  if (!job_id) {
    throw new Error("job_id preview tidak valid.");
  }

  if (jobItems.length === 0) {
    return [];
  }

  const rows = jobItems.map((item) => ({
    job_id,
    stage: item.stage || item.source_stage || null,
    source_table: item.source_table || null,
    source_ref_id: item.source_ref_id ?? null,
    source_code: item.source_code || null,
    source_name: item.source_name || null,
    target_table: item.target_table || null,
    target_ref_id: item.target_ref_id ?? null,
    target_code: item.target_code || null,
    target_name: item.target_name || null,
    action: item.action || "skip",
    classification: item.classification || "blocked",
    severity: item.severity || "warning",
    is_blocking: Boolean(item.is_blocking),
    before_json: safeJson(item.before_json),
    after_json: safeJson(item.after_json),
    diff_json: safeJson(item.diff_json),
    message: item.message || null,
  }));

  const created = await RpjmdSyncJobItem.bulkCreate(rows, {
    transaction,
  });

  return created.map((item) =>
    typeof item.get === "function" ? item.get({ plain: true }) : item,
  );
}

async function writePreviewAuditLog(params) {
  const job = params?.job || {};
  const payload = params?.payload || {};
  const result = params?.result || {};
  const actor = params?.actor || {};
  const reqMeta = params?.reqMeta || {};
  const transaction = params?.transaction || null;

  const audit = await RpjmdSyncAuditLog.create(
    {
      job_id: job.id || null,
      actor_user_id: actor.id || null,
      actor_role: actor.role || null,
      event_type: "preview",
      target_module: payload.target_module,
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      payload_json: {
        payload: {
          rpjmd_id: payload.rpjmd_id,
          renstra_id: payload.renstra_id,
          target_module: payload.target_module,
          scope: payload.scope,
          reason: payload.reason,
          include_indicators: payload.include_indicators,
          include_pagu: payload.include_pagu,
        },
        summary: result.summary || {},
      },
      result_json: {
        job_code: job.job_code || null,
        status: job.status || null,
        is_blocked: Boolean(result.is_blocked),
        total_items: Array.isArray(result.items) ? result.items.length : 0,
      },
      ip_address: reqMeta.ip_address || null,
      user_agent: reqMeta.user_agent || null,
      created_at: new Date(),
    },
    { transaction },
  );

  return typeof audit.get === "function" ? audit.get({ plain: true }) : audit;
}

async function buildPreviewArtifacts(payload, preflightResult) {
  const sourceTree = await buildRpjmdSourceTree({
    rpjmd_id: payload.rpjmd_id,
    scope: payload.scope,
    include_indicators: payload.include_indicators,
  });

  if (!sourceTree.success) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_DIFF_FAILED",
      message: sourceTree.message || "Source tree RPJMD gagal dibangun.",
      errors: sourceTree.errors || [],
    };
  }

  const targetTree = await buildRenstraTargetTree({
    renstra_id: payload.renstra_id,
    scope: payload.scope,
    include_indicators: payload.include_indicators,
    include_pagu: payload.include_pagu,
  });

  if (!targetTree.success) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_DIFF_FAILED",
      message: targetTree.message || "Target tree Renstra gagal dibangun.",
      errors: targetTree.errors || [],
    };
  }

  const sourceMapResult = await refreshSourceMapFromTrees({
    rpjmd_id: payload.rpjmd_id,
    renstra_id: payload.renstra_id,
    scope: payload.scope,
    include_indicators: payload.include_indicators,
    include_pagu: payload.include_pagu,
    target_module: payload.target_module,
    dry_run: true,
    actor_user_id: payload.actor_user_id,
  });

  if (!sourceMapResult.success) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_DIFF_FAILED",
      message: sourceMapResult.message || "Source map dry-run gagal.",
      errors: sourceMapResult.errors || [],
    };
  }

  const compareResult = compareSourceAndTarget({
    sourceTree,
    targetTree,
    sourceMapRows: sourceMapResult.data?.rows || [],
    preflightResult,
    mode: VALID_MODE,
  });

  if (!compareResult.success) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_DIFF_FAILED",
      message: compareResult.message || "Perbandingan preview gagal.",
      errors: compareResult.errors || [],
    };
  }

  const diffs = Array.isArray(compareResult.data?.diffs) ? compareResult.data.diffs : [];
  const jobItemsResult = buildJobItemsFromDiff({
    diffs,
    rpjmd_id: payload.rpjmd_id,
    renstra_id: payload.renstra_id,
    target_module: payload.target_module,
  });

  if (!jobItemsResult.success) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_DIFF_FAILED",
      message: jobItemsResult.message || "Job item preview gagal dibangun.",
      errors: jobItemsResult.errors || [],
    };
  }

  const summary = buildPreviewSummary({
    preflightResult,
    diffSummary: buildDiffSummary({
      diffs,
      jobItems: jobItemsResult.data || [],
    }),
  });

  return {
    success: true,
    data: {
      sourceTree,
      targetTree,
      sourceMapResult,
      diffResult: {
        rows: sourceMapResult.data?.rows || [],
        diffs,
        jobItems: jobItemsResult.data || [],
        summary,
        is_blocked: buildPreviewStatus(preflightResult, summary),
      },
      preflightResult,
    },
  };
}

async function persistPreviewResult({
  payload,
  diffResult,
  preflightResult,
  actor,
  reqMeta,
}) {
  return sequelize.transaction(async (transaction) => {
    const job = await createPreviewJob({
      payload,
      diffResult,
      preflightResult,
      actor_user_id: actor?.id || null,
      transaction,
    });

    const items = await createPreviewJobItems({
      job_id: job.id,
      jobItems: diffResult.jobItems || [],
      transaction,
    });

    await writePreviewAuditLog({
      job,
      payload,
      result: {
        summary: diffResult.summary,
        is_blocked: diffResult.is_blocked,
        items,
      },
      actor,
      reqMeta,
      transaction,
    });

    return {
      job,
      items,
    };
  });
}

async function runRpjmdGovernancePreview(params) {
  const normalizedResult = normalizePreviewPayload(params);
  if (!normalizedResult.success) {
    return normalizedResult;
  }

  const payload = normalizedResult.data;
  const reqMeta = extractRequestMeta(params?.reqMeta);

  try {
    const preflightResult = await runRpjmdGovernancePreflight({
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      target_module: payload.target_module,
      scope: payload.scope,
      include_indicators: payload.include_indicators,
      include_pagu: payload.include_pagu,
      mode: VALID_MODE,
      actor_user_id: payload.actor_user_id,
      require_existing_map: false,
    });

    if (
      !preflightResult.success &&
      preflightResult.code !== "RPJMD_PREFLIGHT_BLOCKED"
    ) {
      return {
        success: false,
        code: "RPJMD_PREVIEW_DIFF_FAILED",
        message: preflightResult.message || "Preflight preview gagal.",
        errors: preflightResult.errors || [],
      };
    }

    const artifactResult = await buildPreviewArtifacts(payload, preflightResult);
    if (!artifactResult.success) {
      return artifactResult;
    }

    const persisted = await persistPreviewResult({
      payload,
      diffResult: artifactResult.data.diffResult,
      preflightResult,
      actor: {
        id: payload.actor_user_id,
        role: payload.actor_role,
      },
      reqMeta,
    });

    return {
      success: true,
      data: buildPreviewResponse({
        job: persisted.job,
        diffResult: artifactResult.data.diffResult,
      }),
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_PREVIEW_FAILED",
      message: getSafeErrorMessage(error, "Preview Governance Hub gagal."),
    };
  }
}

module.exports = {
  runRpjmdGovernancePreview,
  createPreviewJob,
  createPreviewJobItems,
  writePreviewAuditLog,
  buildPreviewResponse,
  normalizePreviewPayload,
  extractRequestMeta,
  safeJson,
  getSafeErrorMessage,
  buildPreviewSummary,
  buildPreviewStatus,
  buildJobSummaryPayload,
};
