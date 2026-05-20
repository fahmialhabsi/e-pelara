"use strict";

const { RpjmdSourceMap } = require("../../models");
const { buildRpjmdSourceTree } = require("./rpjmdSourceTreeBuilderService");
const { buildRenstraTargetTree } = require("./rpjmdTargetTreeBuilderService");
const { refreshSourceMapFromTrees } = require("./rpjmdSourceMapService");

const VALID_TARGET_MODULE = "RENSTRA";
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
const ALLOWED_MAPPING_STATUSES = new Set([
  "mapped",
  "mapped_valid",
  "ready_to_sync",
]);
const BLOCKED_STATUSES = new Set([
  "dropdown_scope_violation",
  "target_scope_violation",
  "indicator_context_invalid",
  "chain_mismatch",
  "parent_missing",
  "resolver_conflict",
  "missing_target",
  "blocked",
]);
const INDICATOR_STAGES = new Set([
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

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  return defaultValue;
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

function normalizeScope(scope) {
  return normalizeText(scope)?.toLowerCase() || "all";
}

function normalizeMappingStatusFilter(value) {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }

  return text
    .split(",")
    .map((item) => normalizeText(item)?.toLowerCase())
    .filter(Boolean);
}

function normalizeChainStatusFilter(value) {
  const text = normalizeText(value);
  if (!text) {
    return [];
  }

  return text
    .split(",")
    .map((item) => normalizeText(item)?.toLowerCase())
    .filter(Boolean);
}

function isAllowedMappingStatus(mappingStatus) {
  return ALLOWED_MAPPING_STATUSES.has(normalizeText(mappingStatus)?.toLowerCase() || "");
}

function isAllowedChainStatus(chainStatus) {
  return normalizeText(chainStatus)?.toLowerCase() === "valid";
}

function isDropdownSafe(row) {
  return (
    Boolean(row?.target_ref_id) &&
    isAllowedMappingStatus(row?.mapping_status) &&
    isAllowedChainStatus(row?.chain_status) &&
    !BLOCKED_STATUSES.has(normalizeText(row?.mapping_status)?.toLowerCase() || "")
  );
}

function buildDropdownBlockReason(row) {
  const mappingStatus = normalizeText(row?.mapping_status)?.toLowerCase() || "";
  const chainStatus = normalizeText(row?.chain_status)?.toLowerCase() || "";

  if (mappingStatus === "missing_target") {
    return "missing_target";
  }

  if (mappingStatus === "resolver_conflict") {
    return "resolver_conflict";
  }

  if (mappingStatus === "blocked") {
    return "blocked";
  }

  if (mappingStatus === "dropdown_scope_violation" || mappingStatus === "target_scope_violation") {
    return mappingStatus;
  }

  if (mappingStatus === "indicator_context_invalid") {
    return "indicator_context_invalid";
  }

  if (chainStatus === "chain_mismatch") {
    return "chain_mismatch";
  }

  if (chainStatus === "parent_missing") {
    return "parent_missing";
  }

  if (!row?.target_ref_id) {
    return "missing_target";
  }

  if (!isAllowedMappingStatus(mappingStatus)) {
    return "missing_source_map";
  }

  if (!isAllowedChainStatus(chainStatus)) {
    return "chain_mismatch";
  }

  return null;
}

function buildRecommendation(row, dropdownSafe, blockReason) {
  if (dropdownSafe) {
    return "Aman digunakan untuk dropdown.";
  }

  const recommendations = {
    missing_target: "Lengkapi target Renstra atau refresh source map.",
    missing_source_map: "Bangun source map dari source-target tree.",
    chain_mismatch: "Perbaiki chain parent-child sebelum menggunakan row ini.",
    parent_missing: "Lengkapi parent target terlebih dahulu.",
    resolver_conflict: "Normalisasi source map agar resolver tunggal.",
    indicator_context_invalid: "Perbaiki konteks indikator agar sesuai structural parent.",
    target_scope_violation: "Gunakan target_ref_id dari scope Renstra yang benar.",
    dropdown_scope_violation: "Gunakan target_ref_id dari scope Renstra yang benar.",
    blocked: "Perbaiki blocker Governance Hub terlebih dahulu.",
  };

  return recommendations[blockReason] || "Review row ini sebelum digunakan.";
}

function normalizePreparedRow(row) {
  const sourceStage = normalizeText(row?.source_stage)?.toLowerCase() || null;
  const targetRefId = safeNumber(row?.target_ref_id);
  const mappingStatus = normalizeText(row?.mapping_status)?.toLowerCase() || null;
  const chainStatus = normalizeText(row?.chain_status)?.toLowerCase() || null;
  const blockReason = buildDropdownBlockReason(row);
  const dropdownSafe = isDropdownSafe(row);
  const isIndicator = Boolean(sourceStage && INDICATOR_STAGES.has(sourceStage));
  const canUseForIndicator =
    dropdownSafe && isIndicator && Boolean(row?.parent_target_stage) && Boolean(row?.parent_target_ref_id);

  return {
    source_stage: sourceStage,
    source_table: normalizeText(row?.source_table) || null,
    source_ref_id: safeNumber(row?.source_ref_id),
    source_code: normalizeText(row?.source_code) || null,
    source_name: normalizeText(row?.source_name) || null,
    target_table: normalizeText(row?.target_table) || null,
    target_ref_id: targetRefId,
    target_code: normalizeText(row?.target_code) || null,
    target_name: normalizeText(row?.target_name) || null,
    parent_source_stage: normalizeText(row?.parent_source_stage) || null,
    parent_source_ref_id: safeNumber(row?.parent_source_ref_id),
    parent_target_stage: normalizeText(row?.parent_target_stage) || null,
    parent_target_ref_id: safeNumber(row?.parent_target_ref_id),
    mapping_status: mappingStatus,
    chain_status: chainStatus,
    dropdown_safe: dropdownSafe,
    dropdown_block_reason: blockReason,
    can_use_for_dropdown: dropdownSafe,
    can_use_for_indicator: canUseForIndicator,
    recommendation: buildRecommendation(row, dropdownSafe, blockReason),
    raw: row && row.raw ? row.raw : row || null,
    normalized_payload: row && row.normalized_payload ? row.normalized_payload : row || null,
  };
}

function validatePreparedSourceQuery(query) {
  const source = query && typeof query === "object" ? query : {};
  const target_module = normalizeText(source.target_module)?.toUpperCase() || null;
  const renstra_id = safeNumber(source.renstra_id);
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const scope = normalizeScope(source.scope);
  const include_indicators = normalizeBoolean(source.include_indicators, true);
  const include_pagu = normalizeBoolean(source.include_pagu, false);
  const include_unmapped = normalizeBoolean(source.include_unmapped, true);
  const include_blocked = normalizeBoolean(source.include_blocked, true);
  const mapping_status = normalizeMappingStatusFilter(source.mapping_status);
  const chain_status = normalizeChainStatusFilter(source.chain_status);
  const source_stage = normalizeText(source.source_stage)?.toLowerCase() || null;
  const errors = [];

  if (target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: "Prepared source hanya mendukung target_module RENSTRA.",
    });
  }

  if (!renstra_id || renstra_id <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (scope !== "all" && !VALID_SCOPES.has(scope)) {
    errors.push({
      field: "scope",
      message: `Scope prepared source tidak valid: ${scope}`,
    });
  }

  if (source_stage && !VALID_SCOPES.has(source_stage)) {
    errors.push({
      field: "source_stage",
      message: `source_stage tidak valid: ${source_stage}`,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_PREPARED_SOURCE_VALIDATION_ERROR",
      message: "Validasi prepared source gagal.",
      errors,
    };
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module: VALID_TARGET_MODULE,
      scope,
      include_indicators,
      include_pagu,
      include_unmapped,
      include_blocked,
      mapping_status,
      chain_status,
      source_stage,
    },
  };
}

async function loadExistingSourceMaps({ rpjmd_id, renstra_id, target_module }) {
  const where = {
    renstra_id,
    target_module,
  };

  if (rpjmd_id) {
    where.rpjmd_id = rpjmd_id;
  }

  const rows = await RpjmdSourceMap.findAll({
    where,
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
    raw: true,
  });

  return rows;
}

function buildSourceMapKey(row) {
  return [
    row?.rpjmd_id,
    normalizeText(row?.target_module)?.toUpperCase() || VALID_TARGET_MODULE,
    row?.renstra_id,
    normalizeText(row?.source_stage)?.toLowerCase() || "",
    row?.source_ref_id,
  ]
    .map((value) => String(value ?? ""))
    .join(":");
}

async function buildPreparedSourceRows({
  rpjmd_id,
  renstra_id,
  target_module,
  scope,
  include_indicators,
  include_pagu,
}) {
  const mergedRows = [];
  const existingRows = await loadExistingSourceMaps({
    rpjmd_id,
    renstra_id,
    target_module,
  });

  if (existingRows.length > 0) {
    mergedRows.push(...existingRows);
  }

  if (rpjmd_id && existingRows.length === 0) {
    const sourceTree = await buildRpjmdSourceTree({
      rpjmd_id,
      scope,
      include_indicators,
    });

    if (!sourceTree.success) {
      return {
        success: false,
        code: "RPJMD_PREPARED_SOURCE_BUILD_FAILED",
        message: sourceTree.message || "Source tree RPJMD gagal dibangun.",
        errors: sourceTree.errors || [],
      };
    }

    const targetTree = await buildRenstraTargetTree({
      renstra_id,
      scope,
      include_indicators,
      include_pagu,
    });

    if (!targetTree.success) {
      return {
        success: false,
        code: "RPJMD_PREPARED_SOURCE_BUILD_FAILED",
        message: targetTree.message || "Target tree Renstra gagal dibangun.",
        errors: targetTree.errors || [],
      };
    }

    const dryRunResult = await refreshSourceMapFromTrees({
      rpjmd_id,
      renstra_id,
      scope,
      include_indicators,
      include_pagu,
      target_module,
      dry_run: true,
    });

    if (!dryRunResult.success) {
      return {
        success: false,
        code: "RPJMD_PREPARED_SOURCE_BUILD_FAILED",
        message: dryRunResult.message || "Prepared source dry-run gagal.",
        errors: dryRunResult.errors || [],
      };
    }

    const dryRows = Array.isArray(dryRunResult.data?.rows)
      ? dryRunResult.data.rows
      : [];

    dryRows.forEach((row) => {
      const key = buildSourceMapKey(row);
      if (!mergedRows.some((item) => buildSourceMapKey(item) === key)) {
        mergedRows.push(row);
      }
    });
  }

  const deduped = [];
  const seen = new Set();
  mergedRows.forEach((row) => {
    const key = buildSourceMapKey(row);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(row);
  });

  return {
    success: true,
    data: deduped.map(normalizePreparedRow),
  };
}

function filterPreparedRows({ rows, filters }) {
  const items = Array.isArray(rows) ? rows : [];
  const source = filters && typeof filters === "object" ? filters : {};
  const scope = normalizeScope(source.scope);
  const sourceStage = normalizeText(source.source_stage)?.toLowerCase() || null;
  const mappingStatusFilter = Array.isArray(source.mapping_status)
    ? source.mapping_status
    : [];
  const chainStatusFilter = Array.isArray(source.chain_status)
    ? source.chain_status
    : [];

  return items.filter((row) => {
    if (scope !== "all" && normalizeText(row.source_stage)?.toLowerCase() !== scope) {
      return false;
    }

    if (sourceStage && normalizeText(row.source_stage)?.toLowerCase() !== sourceStage) {
      return false;
    }

    if (
      mappingStatusFilter.length > 0 &&
      !mappingStatusFilter.includes(normalizeText(row.mapping_status)?.toLowerCase() || "")
    ) {
      return false;
    }

    if (
      chainStatusFilter.length > 0 &&
      !chainStatusFilter.includes(normalizeText(row.chain_status)?.toLowerCase() || "")
    ) {
      return false;
    }

    if (!source.include_unmapped) {
      const unmappedStatuses = new Set([
        "missing_target",
        "missing_source_map",
        "orphan_target",
      ]);
      if (unmappedStatuses.has(normalizeText(row.mapping_status)?.toLowerCase() || "")) {
        return false;
      }
    }

    if (!source.include_blocked && normalizeText(row.mapping_status)?.toLowerCase() === "blocked") {
      return false;
    }

    const rowStage = normalizeText(row.source_stage)?.toLowerCase() || "";

    if (!source.include_indicators && rowStage.startsWith("indikator_")) {
      return false;
    }

    return true;
  });
}

function buildPreparedSourceSummary(rows) {
  const items = Array.isArray(rows) ? rows : [];
  let totalSafeDropdown = 0;
  let totalBlocked = 0;
  let totalMissingTarget = 0;
  let totalChainMismatch = 0;

  items.forEach((row) => {
    if (row.dropdown_safe) {
      totalSafeDropdown += 1;
    }

    if (!row.dropdown_safe) {
      totalBlocked += 1;
    }

    if (row.dropdown_block_reason === "missing_target") {
      totalMissingTarget += 1;
    }

    if (
      row.dropdown_block_reason === "chain_mismatch" ||
      row.dropdown_block_reason === "parent_missing"
    ) {
      totalChainMismatch += 1;
    }
  });

  return {
    total_rows: items.length,
    total_safe_dropdown: totalSafeDropdown,
    total_blocked: totalBlocked,
    total_missing_target: totalMissingTarget,
    total_chain_mismatch: totalChainMismatch,
  };
}

async function getPreparedSourceList(params) {
  const normalized = validatePreparedSourceQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  try {
    const rowsResult = await buildPreparedSourceRows(normalized.data);
    if (!rowsResult.success) {
      return rowsResult;
    }

    const rows = filterPreparedRows({
      rows: rowsResult.data,
      filters: normalized.data,
    });

    return {
      success: true,
      data: {
        target_module: normalized.data.target_module,
        rpjmd_id: normalized.data.rpjmd_id,
        renstra_id: normalized.data.renstra_id,
        scope: normalized.data.scope,
        generated_at: new Date().toISOString(),
        summary: buildPreparedSourceSummary(rows),
        rows,
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_PREPARED_SOURCE_FAILED",
      message: getSafeErrorMessage(error, "Prepared source gagal diambil."),
    };
  }
}

module.exports = {
  getPreparedSourceList,
  validatePreparedSourceQuery,
  buildPreparedSourceRows,
  filterPreparedRows,
  buildPreparedSourceSummary,
  getSafeErrorMessage,
};
