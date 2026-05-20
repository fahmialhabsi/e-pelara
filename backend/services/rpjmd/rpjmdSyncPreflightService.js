"use strict";

const {
  buildRpjmdSourceTree,
} = require("./rpjmdSourceTreeBuilderService");
const {
  buildRenstraTargetTree,
} = require("./rpjmdTargetTreeBuilderService");
const {
  refreshSourceMapFromTrees,
} = require("./rpjmdSourceMapService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_MODES = new Set(["scan", "preview", "execute", "resolve_map"]);
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

const STRUCTURAL_STAGE_ORDER = [
  "tujuan",
  "sasaran",
  "strategi",
  "kebijakan",
  "program",
  "kegiatan",
  "sub_kegiatan",
];

const INDICATOR_STAGE_ORDER = [
  "indikator_tujuan",
  "indikator_sasaran",
  "indikator_strategi",
  "indikator_kebijakan",
  "indikator_program",
  "indikator_kegiatan",
  "indikator_sub_kegiatan",
];

function safeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return Boolean(value);
}

function addIssue(
  issues,
  {
    code,
    severity = "warning",
    is_blocking = false,
    stage = null,
    source_stage = null,
    source_ref_id = null,
    target_table = null,
    target_ref_id = null,
    message,
    recommendation = null,
  },
) {
  issues.push({
    code,
    severity,
    is_blocking,
    stage,
    source_stage,
    source_ref_id,
    target_table,
    target_ref_id,
    message,
    recommendation,
  });
}

function addWarning(warnings, warning) {
  warnings.push({
    code: warning.code || "RPJMD_PREFLIGHT_WARNING",
    severity: warning.severity || "warning",
    is_blocking: false,
    stage: warning.stage || null,
    source_stage: warning.source_stage || null,
    source_ref_id: warning.source_ref_id || null,
    target_table: warning.target_table || null,
    target_ref_id: warning.target_ref_id || null,
    message: warning.message || "Peringatan preflight.",
    recommendation: warning.recommendation || null,
  });
}

function isBlockingIssue(issue, mode) {
  if (!issue) return false;
  if (issue.is_blocking) return true;
  if (issue.severity === "critical" || issue.severity === "fatal") return true;
  if (mode === "execute") {
    return ["high", "error"].includes(issue.severity);
  }
  if (mode === "preview") {
    return ["high", "error"].includes(issue.severity) && issue.is_blocking;
  }
  if (mode === "resolve_map") {
    return [
      "high",
      "error",
      "critical",
      "fatal",
    ].includes(issue.severity);
  }
  return false;
}

function normalizeStage(stage) {
  return normalizeText(stage);
}

function getAllowedScopes() {
  return [...VALID_SCOPES];
}

function groupBy(rows, keyGetter) {
  return rows.reduce((acc, row) => {
    const key = keyGetter(row);
    const bucketKey = key === null || key === undefined ? "__null__" : String(key);
    if (!acc[bucketKey]) {
      acc[bucketKey] = [];
    }
    acc[bucketKey].push(row);
    return acc;
  }, {});
}

function validatePreflightPayload({
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
  scope = "all",
  include_indicators = true,
  include_pagu = false,
  mode = "preview",
} = {}) {
  const errors = [];
  const normalized = {
    rpjmd_id: safeNumber(rpjmd_id),
    renstra_id: safeNumber(renstra_id),
    target_module: normalizeText(target_module)?.toUpperCase() || VALID_TARGET_MODULE,
    scope: normalizeStage(scope) || "all",
    include_indicators: normalizeBoolean(include_indicators, true),
    include_pagu: normalizeBoolean(include_pagu, false),
    mode: normalizeStage(mode) || "preview",
  };

  if (!normalized.rpjmd_id || normalized.rpjmd_id <= 0) {
    errors.push({
      field: "rpjmd_id",
      message: "rpjmd_id wajib diisi dan harus angka positif.",
    });
  }

  if (!normalized.renstra_id || normalized.renstra_id <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (normalized.target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: "G8 hanya mendukung target_module RENSTRA.",
    });
  }

  if (!VALID_SCOPES.has(normalized.scope)) {
    errors.push({
      field: "scope",
      message: `Scope tidak valid: ${normalized.scope}`,
    });
  }

  if (!VALID_MODES.has(normalized.mode)) {
    errors.push({
      field: "mode",
      message: `Mode tidak valid: ${normalized.mode}`,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_PREFLIGHT_VALIDATION_ERROR",
      message: "Validasi payload preflight gagal.",
      errors,
    };
  }

  return {
    success: true,
    data: normalized,
  };
}

function validateScope(scope) {
  const normalized = normalizeStage(scope) || "all";
  if (!VALID_SCOPES.has(normalized)) {
    return {
      success: false,
      code: "RPJMD_PREFLIGHT_VALIDATION_ERROR",
      message: `Scope tidak valid: ${normalized}`,
      errors: [
        {
          field: "scope",
          message: "Scope tidak didukung oleh preflight.",
        },
      ],
    };
  }

  return {
    success: true,
    data: normalized,
  };
}

function validateSourceTargetTrees({ sourceTree, targetTree }) {
  const issues = [];
  const warnings = [];

  if (!sourceTree || sourceTree.success === false) {
    addIssue(issues, {
      code: "source_tree_failed",
      severity: "fatal",
      is_blocking: true,
      stage: null,
      message:
        sourceTree?.message || "Source tree RPJMD gagal dibangun.",
      recommendation: "Periksa builder source tree dan validitas RPJMD source.",
    });
    return { issues, warnings };
  }

  if (!targetTree || targetTree.success === false) {
    addIssue(issues, {
      code: "target_tree_failed",
      severity: "fatal",
      is_blocking: true,
      stage: null,
      message:
        targetTree?.message || "Target tree Renstra gagal dibangun.",
      recommendation: "Periksa builder target tree dan validitas Renstra target.",
    });
    return { issues, warnings };
  }

  const sourceSummaryWarnings = sourceTree.data?.summary?.warnings || [];
  const targetSummaryWarnings = targetTree.data?.summary?.warnings || [];
  sourceSummaryWarnings.forEach((warning) => addWarning(warnings, warning));
  targetSummaryWarnings.forEach((warning) => addWarning(warnings, warning));

  return { issues, warnings };
}

function validateSourceMaps({ rows, rpjmd_id, renstra_id, target_module }) {
  const issues = [];
  const warnings = [];
  const mapRows = Array.isArray(rows) ? rows : [];
  const sourceMapByKey = new Map();

  for (const row of mapRows) {
    const key = [
      safeNumber(rpjmd_id),
      target_module,
      safeNumber(renstra_id),
      normalizeStage(row.source_stage),
      safeNumber(row.source_ref_id),
    ].join(":");

    if (sourceMapByKey.has(key)) {
      addIssue(issues, {
        code: "resolver_conflict",
        severity: "high",
        is_blocking: true,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Ditemukan lebih dari satu source map untuk source yang sama.",
        recommendation: "Normalisasi mapping agar unique key tidak bentrok.",
      });
      continue;
    }

    sourceMapByKey.set(key, row);

    if (row.mapping_status === "missing_target") {
      addIssue(issues, {
        code: "missing_target",
        severity: "high",
        is_blocking: false,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Target belum tersedia untuk source ini.",
        recommendation: "Lengkapi target Renstra atau refresh source map.",
      });
      continue;
    }

    if (row.mapping_status === "resolver_conflict") {
      addIssue(issues, {
        code: "resolver_conflict",
        severity: "high",
        is_blocking: true,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Source map resolver menemukan konflik.",
        recommendation: "Periksa duplikasi target untuk source yang sama.",
      });
    }

    if (row.chain_status === "chain_mismatch") {
      addIssue(issues, {
        code: "chain_mismatch",
        severity: "high",
        is_blocking: true,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Chain parent-child source map tidak valid.",
        recommendation: "Sinkronkan parent target agar chain valid.",
      });
    }

    if (row.chain_status === "parent_missing") {
      addIssue(issues, {
        code: "parent_missing",
        severity: "high",
        is_blocking: false,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Parent target belum ter-resolve untuk source ini.",
        recommendation: "Lengkapi source map parent sebelum execute.",
      });
    }
  }

  return { issues, warnings, mapRows };
}

function validateChainIntegrity({ rows = [], mode = "preview" }) {
  const issues = [];
  const warnings = [];
  const blockingOnParentMissing = mode === "execute";

  rows.forEach((row) => {
    if (row.chain_status === "chain_mismatch") {
      addIssue(issues, {
        code: "chain_mismatch",
        severity: "high",
        is_blocking: true,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Chain parent-child tidak valid.",
        recommendation: "Perbaiki parent mapping sebelum melanjutkan.",
      });
    } else if (row.chain_status === "parent_missing") {
      addIssue(issues, {
        code: "parent_missing",
        severity: "high",
        is_blocking: blockingOnParentMissing,
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Parent target belum tersedia.",
        recommendation: "Lanjutkan hanya jika parent target sudah ter-resolve.",
      });
    } else if (row.chain_status === "unchecked") {
      addWarning(warnings, {
        code: "CHAIN_UNCHECKED",
        stage: row.source_stage,
        source_stage: row.source_stage,
        source_ref_id: safeNumber(row.source_ref_id),
        target_table: row.target_table || null,
        target_ref_id: safeNumber(row.target_ref_id),
        message: "Chain belum dapat dinilai penuh.",
        recommendation: "Pastikan parent target tersedia agar chain dapat divalidasi.",
      });
    }
  });

  return { issues, warnings };
}

function validateIndicatorContext({ targetTree }) {
  const issues = [];
  const warnings = [];
  const data = targetTree?.data?.stages || {};

  INDICATOR_STAGE_ORDER.forEach((stage) => {
    const rows = Array.isArray(data[stage]) ? data[stage] : [];
    rows.forEach((row) => {
      const normalizedStage = normalizeStage(row.normalized_payload?.stage || row.target_stage);
      const renstraId = safeNumber(row.normalized_payload?.renstra_id);
      const refId = safeNumber(row.normalized_payload?.ref_id ?? row.parent_target_ref_id);
      if (!renstraId) {
        addIssue(issues, {
          code: "indicator_context_invalid",
          severity: "high",
          is_blocking: true,
          stage,
          source_stage: stage,
          source_ref_id: safeNumber(row.source_ref_id),
          target_table: row.target_table || "indikator_renstra",
          target_ref_id: safeNumber(row.target_ref_id),
          message: "Indikator Renstra tidak memiliki renstra_id yang valid.",
          recommendation: "Perbaiki target indikator agar tetap berada dalam scope Renstra.",
        });
      }

      if (normalizedStage !== row.target_stage && normalizedStage !== row.normalized_payload?.stage) {
        addIssue(issues, {
          code: "indicator_context_invalid",
          severity: "high",
          is_blocking: true,
          stage,
          source_stage: stage,
          source_ref_id: safeNumber(row.source_ref_id),
          target_table: row.target_table || "indikator_renstra",
          target_ref_id: safeNumber(row.target_ref_id),
          message: "Stage indikator target tidak konsisten.",
          recommendation: "Pastikan indikator_renstra.stage konsisten dengan stage target.",
        });
      }

      if (!refId) {
        addIssue(issues, {
          code: "indicator_context_invalid",
          severity: "high",
          is_blocking: true,
          stage,
          source_stage: stage,
          source_ref_id: safeNumber(row.source_ref_id),
          target_table: row.target_table || "indikator_renstra",
          target_ref_id: safeNumber(row.target_ref_id),
          message: "Indikator target tidak memiliki ref_id structural yang valid.",
          recommendation: "Pastikan ref_id mengarah ke target structural Renstra yang tepat.",
        });
      }
    });
  });

  return { issues, warnings };
}

function validateDropdownOwnershipGuard({ targetTree, rows = [] }) {
  const issues = [];
  const warnings = [];
  const targetStages = targetTree?.data?.stages || {};

  STRUCTURAL_STAGE_ORDER.forEach((stage) => {
    const stageRows = Array.isArray(targetStages[stage]) ? targetStages[stage] : [];
    stageRows.forEach((row) => {
      if (!safeNumber(row.target_ref_id)) {
        addIssue(issues, {
          code: "TARGET_DROPDOWN_SCOPE_VIOLATION",
          severity: "high",
          is_blocking: true,
          stage,
          source_stage: stage,
          source_ref_id: safeNumber(row.source_ref_id),
          target_table: row.target_table,
          target_ref_id: safeNumber(row.target_ref_id),
          message: "Target row tidak memiliki target_ref_id yang valid.",
          recommendation: "Pastikan dropdown target memakai ID target Renstra, bukan ID RPJMD.",
        });
      }
    });
  });

  rows.forEach((row) => {
    if (row.source_stage?.startsWith("indikator_")) {
      if (!safeNumber(row.parent_target_ref_id)) {
        addIssue(issues, {
          code: "INDICATOR_DROPDOWN_SCOPE_VIOLATION",
          severity: "high",
          is_blocking: true,
          stage: row.source_stage,
          source_stage: row.source_stage,
          source_ref_id: safeNumber(row.source_ref_id),
          target_table: row.target_table,
          target_ref_id: safeNumber(row.target_ref_id),
          message: "Indikator tidak memiliki konteks parent target yang lengkap.",
          recommendation: "Gunakan source map yang sudah memiliki parent structural target.",
        });
      }
    }
  });

  return { issues, warnings };
}

function buildPreflightSummary({ issues = [], warnings = [], sourceTree, targetTree, sourceMap }) {
  const totalIssues = issues.length;
  const totalBlockingIssues = issues.filter((issue) => issue.is_blocking).length;
  const totalWarnings = warnings.length;

  return {
    total_source_rows: sourceTree?.data?.summary?.total_rows || 0,
    total_target_rows: targetTree?.data?.summary?.total_rows || 0,
    total_map_rows: Array.isArray(sourceMap?.data?.rows) ? sourceMap.data.rows.length : 0,
    total_issues: totalIssues,
    total_blocking_issues: totalBlockingIssues,
    total_warnings: totalWarnings,
    source_tree_ready: Boolean(sourceTree?.success),
    target_tree_ready: Boolean(targetTree?.success),
    source_map_ready: Boolean(sourceMap?.success),
    chain_ready: !issues.some((issue) => ["chain_mismatch", "parent_missing", "resolver_conflict"].includes(issue.code) && issue.is_blocking),
    indicator_ready: !issues.some((issue) => issue.code === "indicator_context_invalid" || issue.code === "INDICATOR_DROPDOWN_SCOPE_VIOLATION"),
    dropdown_guard_ready: !issues.some((issue) => issue.code === "TARGET_DROPDOWN_SCOPE_VIOLATION" || issue.code === "INDICATOR_DROPDOWN_SCOPE_VIOLATION"),
  };
}

async function runRpjmdGovernancePreflight({
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
  scope = "all",
  include_indicators = true,
  include_pagu = false,
  mode = "preview",
  actor_user_id,
  require_existing_map = false,
} = {}) {
  const payloadValidation = validatePreflightPayload({
    rpjmd_id,
    renstra_id,
    target_module,
    scope,
    include_indicators,
    include_pagu,
    mode,
  });

  if (!payloadValidation.success) {
    return payloadValidation;
  }

  const normalized = payloadValidation.data;
  const scopeValidation = validateScope(normalized.scope);
  if (!scopeValidation.success) {
    return scopeValidation;
  }

  try {
    const sourceTree = await buildRpjmdSourceTree({
      rpjmd_id: normalized.rpjmd_id,
      scope: normalized.scope,
      include_indicators: normalized.include_indicators,
    });

    if (!sourceTree.success) {
      return {
        success: false,
        code: "RPJMD_PREFLIGHT_SOURCE_TREE_FAILED",
        message: sourceTree.message || "Source tree RPJMD gagal dibangun.",
        errors: sourceTree.errors || [],
      };
    }

    const targetTree = await buildRenstraTargetTree({
      renstra_id: normalized.renstra_id,
      scope: normalized.scope,
      include_indicators: normalized.include_indicators,
      include_pagu: normalized.include_pagu,
    });

    if (!targetTree.success) {
      return {
        success: false,
        code: "RPJMD_PREFLIGHT_TARGET_TREE_FAILED",
        message: targetTree.message || "Target tree Renstra gagal dibangun.",
        errors: targetTree.errors || [],
      };
    }

    const sourceMapResult = await refreshSourceMapFromTrees({
      rpjmd_id: normalized.rpjmd_id,
      renstra_id: normalized.renstra_id,
      scope: normalized.scope,
      include_indicators: normalized.include_indicators,
      include_pagu: normalized.include_pagu,
      target_module: normalized.target_module,
      actor_user_id,
      dry_run: true,
    });

    if (!sourceMapResult.success) {
      return {
        success: false,
        code: "RPJMD_PREFLIGHT_SOURCE_MAP_FAILED",
        message: sourceMapResult.message || "Source map dry-run gagal.",
        errors: sourceMapResult.errors || [],
      };
    }

    const issues = [];
    const warnings = [];

    const treeIssues = validateSourceTargetTrees({ sourceTree, targetTree });
    treeIssues.issues.forEach((issue) => issues.push(issue));
    treeIssues.warnings.forEach((warning) => warnings.push(warning));

    const mapValidation = validateSourceMaps({
      rows: sourceMapResult.data?.rows || [],
      rpjmd_id: normalized.rpjmd_id,
      renstra_id: normalized.renstra_id,
      target_module: normalized.target_module,
    });
    mapValidation.issues.forEach((issue) => issues.push(issue));
    mapValidation.warnings.forEach((warning) => warnings.push(warning));

    const chainValidation = validateChainIntegrity({
      rows: sourceMapResult.data?.rows || [],
      mode: normalized.mode,
    });
    chainValidation.issues.forEach((issue) => issues.push(issue));
    chainValidation.warnings.forEach((warning) => warnings.push(warning));

    const indicatorValidation = validateIndicatorContext({ targetTree });
    indicatorValidation.issues.forEach((issue) => issues.push(issue));
    indicatorValidation.warnings.forEach((warning) => warnings.push(warning));

    const ownershipValidation = validateDropdownOwnershipGuard({
      targetTree,
      rows: sourceMapResult.data?.rows || [],
    });
    ownershipValidation.issues.forEach((issue) => issues.push(issue));
    ownershipValidation.warnings.forEach((warning) => warnings.push(warning));

    if (require_existing_map && (!sourceMapResult.data?.rows || sourceMapResult.data.rows.length === 0)) {
      addIssue(issues, {
        code: "missing_source_map",
        severity: "warning",
        is_blocking: false,
        stage: null,
        message: "Source map existing belum tersedia untuk scope ini.",
        recommendation: "Refresh source map sebelum preview atau execute.",
      });
    }

    const isBlocked = issues.some((issue) => {
      if (normalized.mode === "scan") {
        return issue.severity === "fatal";
      }
      if (normalized.mode === "preview") {
        return issue.is_blocking || issue.severity === "critical" || issue.severity === "fatal";
      }
      if (normalized.mode === "execute") {
        return issue.is_blocking || ["high", "critical", "fatal", "error"].includes(issue.severity);
      }
      if (normalized.mode === "resolve_map") {
        return issue.is_blocking || issue.code === "resolver_conflict" || issue.code === "chain_mismatch";
      }
      return issue.is_blocking;
    });

    const summary = buildPreflightSummary({
      issues,
      warnings,
      sourceTree,
      targetTree,
      sourceMap: sourceMapResult,
    });

    if (isBlocked) {
      return {
        success: false,
        code: "RPJMD_PREFLIGHT_BLOCKED",
        message: "Preflight diblokir karena masih ada isu blocking.",
        data: {
          is_blocked: true,
          issues,
          warnings,
          summary,
        },
      };
    }

    return {
      success: true,
      data: {
        rpjmd_id: normalized.rpjmd_id,
        renstra_id: normalized.renstra_id,
        target_module: normalized.target_module,
        scope: normalized.scope,
        mode: normalized.mode,
        generated_at: new Date().toISOString(),
        is_blocked: false,
        issues,
        warnings,
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_PREFLIGHT_FAILED",
      message: error?.message || "Preflight gagal.",
    };
  }
}

module.exports = {
  runRpjmdGovernancePreflight,
  validatePreflightPayload,
  validateScope,
  validateSourceTargetTrees,
  validateSourceMaps,
  validateChainIntegrity,
  validateIndicatorContext,
  validateDropdownOwnershipGuard,
  buildPreflightSummary,
  addIssue,
  addWarning,
  isBlockingIssue,
  safeNumber,
  normalizeText,
  stableStringify,
  normalizeStage,
  getAllowedScopes,
  groupBy,
};
