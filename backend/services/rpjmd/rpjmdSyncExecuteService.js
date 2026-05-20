"use strict";

const { randomUUID } = require("crypto");
const {
  sequelize,
  RpjmdSyncJob,
  RpjmdSyncJobItem,
  RpjmdSyncAuditLog,
} = require("../../models");
const { runRpjmdGovernancePreflight } = require("./rpjmdSyncPreflightService");
const { buildRpjmdGovernanceDiff } = require("./rpjmdSyncDiffService");
const { refreshSourceMapFromTrees } = require("./rpjmdSourceMapService");
const {
  getActionForClassification,
  getSeverityForClassification,
  isBlockingClassification,
} = require("./rpjmdSyncDiffService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_MODE = "execute";
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
const ALLOWED_EXECUTE_ACTIONS = new Set(["update_map", "refresh_hash"]);

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
  if (value === null || value === undefined) {
    return null;
  }

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

function wrapExecuteError(code, error, fallbackMessage) {
  const wrapped = new Error(getSafeErrorMessage(error, fallbackMessage));
  wrapped.code = code;
  return wrapped;
}

function generateJobCode() {
  return `RPJMD-GOV-EXEC-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function extractRequestMeta(reqMeta) {
  const meta = reqMeta && typeof reqMeta === "object" ? reqMeta : {};

  return {
    ip_address: normalizeText(meta.ip || meta.ip_address || null),
    user_agent: normalizeText(meta.userAgent || meta.user_agent || null),
  };
}

function buildValidationFailure(code, errors, fallbackMessage) {
  const selectedCode = code || "RPJMD_EXECUTE_VALIDATION_ERROR";
  return {
    success: false,
    code: selectedCode,
    message: fallbackMessage || "Validasi execute Governance Hub gagal.",
    errors: Array.isArray(errors) ? errors : [],
  };
}

function validateScope(scope) {
  const normalizedScope = normalizeText(scope) || "all";
  return VALID_SCOPES.has(normalizedScope)
    ? {
        success: true,
        data: normalizedScope,
      }
    : {
        success: false,
        code: "RPJMD_EXECUTE_VALIDATION_ERROR",
        message: `Scope execute tidak valid: ${normalizedScope}`,
        errors: [
          {
            field: "scope",
            message: "Scope execute tidak valid.",
          },
        ],
      };
}

function normalizeExecutePayload(params) {
  const source = params && typeof params === "object" ? params : {};
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const renstra_id = safeNumber(source.renstra_id);
  const target_module = normalizeText(source.target_module)?.toUpperCase() || VALID_TARGET_MODULE;
  const scope = normalizeText(source.scope) || "all";
  const include_indicators =
    source.include_indicators === undefined ? true : Boolean(source.include_indicators);
  const include_pagu = source.include_pagu === undefined ? false : Boolean(source.include_pagu);
  const confirm = source.confirm === true;
  const reason = normalizeText(source.reason) || normalizeText(source.change_reason_text);
  const actor_user_id = safeNumber(source.actor_user_id);
  const actor_role = normalizeText(source.actor_role)?.toUpperCase() || null;
  const preview_job_id = safeNumber(source.preview_job_id);
  const errors = [];
  let failureCode = "RPJMD_EXECUTE_VALIDATION_ERROR";

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
      message: "Execute Governance Hub hanya mendukung target_module RENSTRA.",
    });
  }

  const scopeResult = validateScope(scope);
  if (!scopeResult.success) {
    errors.push(...scopeResult.errors);
  }

  if (!confirm) {
    failureCode = "RPJMD_EXECUTE_CONFIRM_REQUIRED";
    errors.push({
      field: "confirm",
      message: "Execute wajib menggunakan confirm=true.",
    });
  }

  if (!reason) {
    if (failureCode === "RPJMD_EXECUTE_VALIDATION_ERROR") {
      failureCode = "RPJMD_EXECUTE_REASON_REQUIRED";
    }
    errors.push({
      field: "reason",
      message: "Alasan execute wajib diisi.",
    });
  }

  if (!actor_user_id || actor_user_id <= 0) {
    errors.push({
      field: "actor_user_id",
      message: "actor_user_id wajib tersedia dari user login.",
    });
  }

  if (!actor_role) {
    errors.push({
      field: "actor_role",
      message: "actor_role wajib tersedia dari user login.",
    });
  } else if (actor_role !== "SUPER_ADMIN") {
    errors.push({
      field: "actor_role",
      message: "Execute Governance Hub hanya dapat dijalankan oleh SUPER_ADMIN.",
    });
  }

  if (preview_job_id !== null && preview_job_id <= 0) {
    errors.push({
      field: "preview_job_id",
      message: "preview_job_id harus angka positif bila disediakan.",
    });
  }

  if (errors.length > 0) {
    if (errors.some((item) => item.field === "confirm")) {
      failureCode = "RPJMD_EXECUTE_CONFIRM_REQUIRED";
    } else if (errors.some((item) => item.field === "reason")) {
      failureCode = "RPJMD_EXECUTE_REASON_REQUIRED";
    } else if (errors.some((item) => item.field === "preview_job_id")) {
      failureCode = "RPJMD_EXECUTE_PREVIEW_REQUIRED";
    }

    return buildValidationFailure(
      failureCode,
      errors,
      "Validasi execute Governance Hub gagal.",
    );
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module,
      scope: scopeResult.data,
      include_indicators,
      include_pagu,
      confirm,
      reason,
      actor_user_id,
      actor_role,
      preview_job_id,
    },
  };
}

function classifyIssue(issue) {
  const code = normalizeText(issue?.code)?.toUpperCase();
  if (normalizeText(issue?.classification)) {
    return normalizeText(issue.classification);
  }

  const map = {
    RPJMD_PREFLIGHT_VALIDATION_ERROR: "blocked",
    RPJMD_PREFLIGHT_SOURCE_TREE_FAILED: "blocked",
    RPJMD_PREFLIGHT_TARGET_TREE_FAILED: "blocked",
    RPJMD_PREFLIGHT_SOURCE_MAP_FAILED: "blocked",
    RPJMD_PREFLIGHT_CHAIN_INVALID: "chain_mismatch",
    RPJMD_PREFLIGHT_INDICATOR_INVALID: "indicator_context_invalid",
    RPJMD_PREFLIGHT_DROPDOWN_SCOPE_INVALID: "dropdown_scope_violation",
    RPJMD_PREFLIGHT_BLOCKED: "blocked",
    RPJMD_DIFF_BLOCKED: "blocked",
    TARGET_DROPDOWN_SCOPE_VIOLATION: "target_scope_violation",
    INDICATOR_DROPDOWN_SCOPE_VIOLATION: "dropdown_scope_violation",
    RPJMD_SOURCE_MAP_RESOLVER_CONFLICT: "resolver_conflict",
    RPJMD_SOURCE_MAP_CHAIN_MISMATCH: "chain_mismatch",
    RPJMD_SOURCE_MAP_MISSING_TARGET: "missing_target",
  };

  return map[code] || "blocked";
}

function buildBlockedJobItemFromIssue(issue, payload) {
  const classification = classifyIssue(issue);
  const severity =
    normalizeText(issue?.severity) ||
    getSeverityForClassification(classification, VALID_MODE);
  const targetRef = safeNumber(issue?.target_ref_id);

  return {
    job_id: null,
    stage: normalizeText(issue?.stage || issue?.source_stage) || normalizeText(payload.scope),
    source_table: normalizeText(issue?.source_table) || null,
    source_ref_id: safeNumber(issue?.source_ref_id),
    source_code: normalizeText(issue?.source_code) || null,
    source_name: normalizeText(issue?.source_name) || null,
    target_table: normalizeText(issue?.target_table) || null,
    target_ref_id: targetRef,
    target_code: normalizeText(issue?.target_code) || null,
    target_name: normalizeText(issue?.target_name) || null,
    action: getActionForClassification(classification),
    classification,
    severity,
    is_blocking: Boolean(issue?.is_blocking) || isBlockingClassification(classification, VALID_MODE),
    before_json: safeJson(issue?.before_json),
    after_json: safeJson(issue?.after_json),
    diff_json: safeJson(issue?.diff_json || {
      code: issue?.code || null,
      message: issue?.message || null,
    }),
    message: normalizeText(issue?.message) || "Execute diblokir oleh preflight/diff.",
  };
}

function buildExecuteSummary({ preflightResult, diffResult, applyResult, jobItems }) {
  const preflightSummary = preflightResult?.data?.summary || {};
  const diffSummary = diffResult?.data?.summary || {};
  const applySummary = applyResult?.summary || {};

  return {
    total_diffs: diffSummary.total_diffs || 0,
    total_job_items: Array.isArray(jobItems) ? jobItems.length : 0,
    total_blocking: diffSummary.total_blocking || 0,
    total_warning: diffSummary.total_warning || 0,
    total_info: diffSummary.total_info || 0,
    unchanged: diffSummary.unchanged || 0,
    mapped_valid: diffSummary.mapped_valid || 0,
    source_updated: diffSummary.source_updated || 0,
    missing_target: diffSummary.missing_target || 0,
    missing_source_map: diffSummary.missing_source_map || 0,
    orphan_target: diffSummary.orphan_target || 0,
    chain_mismatch: diffSummary.chain_mismatch || 0,
    manual_conflict: diffSummary.manual_conflict || 0,
    indicator_context_invalid: diffSummary.indicator_context_invalid || 0,
    resolver_conflict: diffSummary.resolver_conflict || 0,
    source_hash_mismatch: diffSummary.source_hash_mismatch || 0,
    target_hash_mismatch: diffSummary.target_hash_mismatch || 0,
    ready_to_sync: diffSummary.ready_to_sync || 0,
    blocked: diffSummary.blocked || 0,
    target_scope_violation: diffSummary.target_scope_violation || 0,
    dropdown_scope_violation: diffSummary.dropdown_scope_violation || 0,
    parent_missing: diffSummary.parent_missing || 0,
    source_tree_ready: Boolean(preflightSummary.source_tree_ready),
    target_tree_ready: Boolean(preflightSummary.target_tree_ready),
    source_map_ready: Boolean(preflightSummary.source_map_ready),
    chain_ready: Boolean(preflightSummary.chain_ready),
    indicator_ready: Boolean(preflightSummary.indicator_ready),
    dropdown_guard_ready: Boolean(preflightSummary.dropdown_guard_ready),
    preflight: {
      is_blocked: Boolean(preflightResult?.data?.is_blocked),
      total_issues: preflightSummary.total_issues || 0,
      total_blocking_issues: preflightSummary.total_blocking_issues || 0,
    },
    apply: {
      executed: Boolean(applySummary.executed),
      deferred: applySummary.deferred || 0,
      refreshed_source_map: applySummary.refreshed_source_map || 0,
      refreshed_hash: applySummary.refreshed_hash || 0,
    },
  };
}

function buildExecuteStatus({ blocked, applyResult }) {
  if (blocked) {
    return "blocked";
  }

  if (applyResult?.success === false) {
    return "failed";
  }

  return "completed";
}

function buildExecuteResponse({ job, diffResult, applyResult }) {
  const jobJson = typeof job?.get === "function" ? job.get({ plain: true }) : job || {};
  const summary = diffResult?.summary || safeJson(jobJson.summary_json) || {};
  const isBlocked = Boolean(diffResult?.is_blocked);
  const response = {
    job: {
      id: jobJson.id,
      job_code: jobJson.job_code,
      status: jobJson.status,
      mode: jobJson.mode,
    },
    summary,
    apply_result: applyResult || {},
    is_blocked: isBlocked,
  };

  if (isBlocked && Array.isArray(diffResult?.issues)) {
    response.issues = diffResult.issues;
  }

  return response;
}

async function createExecuteJob({
  payload,
  summary,
  is_blocked,
  applyResult,
  actor_user_id,
  transaction,
}) {
  const job = await RpjmdSyncJob.create(
    {
      job_code: generateJobCode(),
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      target_module: payload.target_module,
      scope: payload.scope,
      mode: VALID_MODE,
      status: buildExecuteStatus({
        blocked: Boolean(is_blocked),
        applyResult,
      }),
      requested_by: actor_user_id,
      confirmed_by: actor_user_id,
      reason: payload.reason,
      summary_json: summary || {},
      error_message: null,
      started_at: new Date(),
      finished_at: new Date(),
    },
    { transaction },
  );

  return typeof job.get === "function" ? job.get({ plain: true }) : job;
}

async function createExecuteJobItems({ job_id, jobItems, transaction }) {
  const safeJobId = safeNumber(job_id);
  const items = Array.isArray(jobItems) ? jobItems : [];

  if (!safeJobId) {
    throw new Error("job_id execute tidak valid.");
  }

  if (items.length === 0) {
    return [];
  }

  const rows = items.map((item) => ({
    job_id: safeJobId,
    stage: normalizeText(item.stage || item.source_stage) || null,
    source_table: normalizeText(item.source_table) || null,
    source_ref_id: safeNumber(item.source_ref_id),
    source_code: normalizeText(item.source_code) || null,
    source_name: normalizeText(item.source_name) || null,
    target_table: normalizeText(item.target_table) || null,
    target_ref_id: safeNumber(item.target_ref_id),
    target_code: normalizeText(item.target_code) || null,
    target_name: normalizeText(item.target_name) || null,
    action: normalizeText(item.action) || "skip",
    classification: normalizeText(item.classification) || "blocked",
    severity: normalizeText(item.severity) || "warning",
    is_blocking: Boolean(item.is_blocking),
    before_json: safeJson(item.before_json),
    after_json: safeJson(item.after_json),
    diff_json: safeJson(item.diff_json),
    message: normalizeText(item.message) || null,
    created_at: new Date(),
    updated_at: new Date(),
  }));

  const created = await RpjmdSyncJobItem.bulkCreate(rows, { transaction });
  return created.map((item) => (typeof item.get === "function" ? item.get({ plain: true }) : item));
}

async function writeExecuteAuditLog({
  job,
  payload,
  result,
  actor,
  reqMeta,
  transaction,
  event_type = "execute",
}) {
  const audit = await RpjmdSyncAuditLog.create(
    {
      job_id: job?.id || null,
      actor_user_id: actor?.id || null,
      actor_role: actor?.role || null,
      event_type,
      target_module: payload.target_module,
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      payload_json: {
        payload: {
          rpjmd_id: payload.rpjmd_id,
          renstra_id: payload.renstra_id,
          target_module: payload.target_module,
          scope: payload.scope,
          include_indicators: payload.include_indicators,
          include_pagu: payload.include_pagu,
          confirm: payload.confirm,
          reason: payload.reason,
          preview_job_id: payload.preview_job_id,
        },
        result: safeJson(result),
      },
      result_json: {
        status: job?.status || null,
        is_blocked: Boolean(result?.is_blocked),
        total_items: Array.isArray(result?.items) ? result.items.length : 0,
        apply_result: safeJson(result?.apply_result),
      },
      ip_address: reqMeta?.ip_address || null,
      user_agent: reqMeta?.user_agent || null,
      created_at: new Date(),
    },
    { transaction },
  );

  return typeof audit.get === "function" ? audit.get({ plain: true }) : audit;
}

function isAllowedExecuteAction(action) {
  return ALLOWED_EXECUTE_ACTIONS.has(normalizeText(action) || "");
}

function filterExecutableDiffs(diffs) {
  const items = Array.isArray(diffs) ? diffs : [];
  return items.filter((diff) => !diff.is_blocking && isAllowedExecuteAction(diff.action));
}

async function updateSourceMapsFromDiff({ diffs, payload, transaction, actor_user_id }) {
  const executableDiffs = filterExecutableDiffs(diffs);

  if (executableDiffs.length === 0) {
    return {
      success: true,
      data: {
        executed: false,
        summary: {
          refreshed_source_map: 0,
          refreshed_hash: 0,
          deferred: Array.isArray(diffs) ? diffs.length : 0,
        },
      },
    };
  }

  const refreshResult = await refreshSourceMapFromTrees({
    rpjmd_id: payload.rpjmd_id,
    renstra_id: payload.renstra_id,
    scope: payload.scope,
    include_indicators: payload.include_indicators,
    include_pagu: payload.include_pagu,
    target_module: payload.target_module,
    dry_run: false,
    actor_user_id,
    transaction,
  });

  if (!refreshResult.success) {
    return {
      success: false,
      code: "RPJMD_EXECUTE_SOURCE_MAP_FAILED",
      message: refreshResult.message || "Refresh source map execute gagal.",
      errors: refreshResult.errors || [],
    };
  }

  return {
    success: true,
    data: {
      executed: true,
      summary: {
        refreshed_source_map: refreshResult.data?.summary?.mapped_rows || executableDiffs.length,
        refreshed_hash: executableDiffs.length,
        deferred: Math.max((Array.isArray(diffs) ? diffs.length : 0) - executableDiffs.length, 0),
      },
      refresh_result: refreshResult.data,
    },
  };
}

function normalizeBlockedIssues(sourceResult, diffResult) {
  const blockedIssues = [];

  if (Array.isArray(sourceResult?.data?.issues)) {
    blockedIssues.push(...sourceResult.data.issues);
  }

  if (Array.isArray(diffResult?.data?.issues)) {
    blockedIssues.push(...diffResult.data.issues);
  }

  return blockedIssues;
}

function buildExecuteBlockedResponse({ job, summary, issues, applyResult }) {
  const jobJson = typeof job?.get === "function" ? job.get({ plain: true }) : job || {};
  return {
    job: {
      id: jobJson.id,
      job_code: jobJson.job_code,
      status: jobJson.status,
      mode: jobJson.mode,
    },
    summary,
    apply_result: applyResult || {},
    is_blocked: true,
    issues,
  };
}

async function persistExecuteArtifacts({
  payload,
  preflightResult,
  diffResult,
  previewJobState,
  actor,
  reqMeta,
}) {
  return sequelize.transaction(async (transaction) => {
    const blockedIssues = normalizeBlockedIssues(preflightResult, diffResult);
    const jobItems =
      diffResult?.success && Array.isArray(diffResult.data?.jobItems)
        ? diffResult.data.jobItems
        : buildBlockedJobItemsFromIssueList(blockedIssues, payload);
    const blocked =
      Boolean(preflightResult?.data?.is_blocked) ||
      Boolean(diffResult?.is_blocked) ||
      Boolean(previewJobState?.is_blocked) ||
      blockedIssues.some((issue) => Boolean(issue?.is_blocking));

    let applyResult = {
      success: true,
      data: {
        executed: false,
        summary: {
          refreshed_source_map: 0,
          refreshed_hash: 0,
          deferred: Array.isArray(jobItems) ? jobItems.length : 0,
        },
      },
    };

    if (!blocked) {
      applyResult = await updateSourceMapsFromDiff({
        diffs: diffResult?.success ? diffResult.data?.diffs || [] : [],
        payload,
        transaction,
        actor_user_id: actor?.id || null,
      });

      if (!applyResult.success) {
        throw wrapExecuteError(
          "RPJMD_EXECUTE_SOURCE_MAP_FAILED",
          applyResult.message || "Refresh source map execute gagal.",
          "Refresh source map execute gagal.",
        );
      }
    }

    const summary = buildExecuteSummary({
      preflightResult,
      diffResult: diffResult?.success ? diffResult : null,
      applyResult: applyResult.data,
      jobItems,
    });

    let job;
    try {
      job = await createExecuteJob({
        payload,
        summary,
        is_blocked: blocked,
        applyResult: applyResult.data,
        actor_user_id: actor?.id || null,
        transaction,
      });
    } catch (error) {
      throw wrapExecuteError(
        "RPJMD_EXECUTE_JOB_CREATE_FAILED",
        error,
        "Pembuatan job execute gagal.",
      );
    }

    let persistedItems;
    try {
      persistedItems = await createExecuteJobItems({
        job_id: job.id,
        jobItems,
        transaction,
      });
    } catch (error) {
      throw wrapExecuteError(
        "RPJMD_EXECUTE_JOB_ITEMS_FAILED",
        error,
        "Pembuatan job items execute gagal.",
      );
    }

    try {
      await writeExecuteAuditLog({
        job,
        payload,
        result: {
          summary,
          is_blocked: blocked,
          apply_result: applyResult.data,
          items: persistedItems,
        },
        actor,
        reqMeta,
        transaction,
        event_type: blocked ? "blocked" : "execute",
      });
    } catch (error) {
      throw wrapExecuteError(
        "RPJMD_EXECUTE_AUDIT_FAILED",
        error,
        "Penulisan audit execute gagal.",
      );
    }

    return {
      job,
      jobItems: persistedItems,
      summary,
      apply_result: applyResult.data,
      is_blocked: blocked,
      issues: blockedIssues,
    };
  });
}

function buildBlockedJobItemsFromIssueList(issues, payload) {
  const items = Array.isArray(issues) ? issues : [];
  if (items.length === 0) {
    return [];
  }

  return items.map((issue) => buildBlockedJobItemFromIssue(issue, payload));
}

async function loadPreviewJobState(preview_job_id, payload) {
  if (!preview_job_id) {
    return {
      success: true,
      data: {
        preview_job: null,
        is_blocked: false,
      },
    };
  }

  const job = await RpjmdSyncJob.findByPk(preview_job_id, {
    raw: true,
  });

  if (!job) {
    return {
      success: false,
      code: "RPJMD_EXECUTE_PREVIEW_REQUIRED",
      message: "Preview job tidak ditemukan.",
      errors: [
        {
          field: "preview_job_id",
          message: "Preview job tidak ditemukan.",
        },
      ],
    };
  }

  if (
    safeNumber(job.rpjmd_id) !== safeNumber(payload.rpjmd_id) ||
    safeNumber(job.renstra_id) !== safeNumber(payload.renstra_id) ||
    normalizeText(job.target_module)?.toUpperCase() !== payload.target_module
  ) {
    return {
      success: false,
      code: "RPJMD_EXECUTE_PREVIEW_REQUIRED",
      message: "Preview job tidak sesuai scope execute.",
      errors: [
        {
          field: "preview_job_id",
          message: "Preview job harus sesuai rpjmd_id, renstra_id, dan target_module.",
        },
      ],
    };
  }

  const summaryJson = safeJson(job.summary_json) || {};
  const isBlocked =
    job.status === "blocked" ||
    Boolean(summaryJson.is_blocked) ||
    Boolean(summaryJson.preflight?.is_blocked);

  return {
    success: true,
    data: {
      preview_job: job,
      is_blocked: isBlocked,
    },
  };
}

async function runRpjmdGovernanceExecute(params) {
  const normalized = normalizeExecutePayload(params);
  if (!normalized.success) {
    return normalized;
  }

  const payload = normalized.data;
  const reqMeta = extractRequestMeta(params?.reqMeta);

  try {
    const previewJobState = await loadPreviewJobState(payload.preview_job_id, payload);
    if (!previewJobState.success) {
      return previewJobState;
    }

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

    if (!preflightResult.success && preflightResult.code !== "RPJMD_PREFLIGHT_BLOCKED") {
      return {
        success: false,
        code: "RPJMD_EXECUTE_PREFLIGHT_FAILED",
        message: preflightResult.message || "Preflight execute gagal.",
        errors: preflightResult.errors || [],
      };
    }

    const diffResult = await buildRpjmdGovernanceDiff({
      rpjmd_id: payload.rpjmd_id,
      renstra_id: payload.renstra_id,
      target_module: payload.target_module,
      scope: payload.scope,
      include_indicators: payload.include_indicators,
      include_pagu: payload.include_pagu,
      mode: VALID_MODE,
      actor_user_id: payload.actor_user_id,
      preflightResult,
    });

    if (!diffResult.success && diffResult.code !== "RPJMD_DIFF_BLOCKED") {
      return {
        success: false,
        code: "RPJMD_EXECUTE_DIFF_FAILED",
        message: diffResult.message || "Diff execute gagal.",
        errors: diffResult.errors || [],
      };
    }

    const persisted = await persistExecuteArtifacts({
      payload,
      preflightResult,
      diffResult,
      previewJobState: previewJobState.data,
      actor: {
        id: payload.actor_user_id,
        role: payload.actor_role,
      },
      reqMeta,
    });

    const responseData = buildExecuteResponse({
      job: persisted.job,
      diffResult: {
        summary: persisted.summary,
        is_blocked: persisted.is_blocked,
        issues: persisted.issues,
      },
      applyResult: persisted.apply_result,
    });

    if (persisted.is_blocked) {
      return {
        success: true,
        data: buildExecuteBlockedResponse({
          job: persisted.job,
          summary: persisted.summary,
          issues: persisted.issues,
          applyResult: persisted.apply_result,
        }),
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    try {
      await writeExecuteAuditLog({
        job: null,
        payload: normalized.data || params || {},
        result: {
          error: getSafeErrorMessage(error, "Execute Governance Hub gagal."),
        },
        actor: {
          id: normalized.data?.actor_user_id || null,
          role: normalized.data?.actor_role || null,
        },
        reqMeta,
        transaction: null,
        event_type: "failed",
      });
    } catch (auditError) {
      console.error("[rpjmdSyncExecuteService.auditFailed]", auditError?.message);
    }

    return {
      success: false,
      code: error?.code || "RPJMD_EXECUTE_FAILED",
      message: getSafeErrorMessage(error, "Execute Governance Hub gagal."),
    };
  }
}

module.exports = {
  runRpjmdGovernanceExecute,
  validateExecutePayload: normalizeExecutePayload,
  createExecuteJob,
  createExecuteJobItems,
  applyAllowedActions: updateSourceMapsFromDiff,
  updateSourceMapsFromDiff,
  writeExecuteAuditLog,
  buildExecuteResponse,
  getSafeErrorMessage,
};
