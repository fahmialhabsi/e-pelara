'use strict';

const { RpjmdSourceMap } = require('../../models');
const { buildRpjmdSourceTree } = require('./rpjmdSourceTreeBuilderService');
const { buildRenstraTargetTree } = require('./rpjmdTargetTreeBuilderService');
const { refreshSourceMapFromTrees } = require('./rpjmdSourceMapService');
const {
  runRpjmdGovernancePreflight,
  safeNumber,
  normalizeText,
  stableStringify,
} = require('./rpjmdSyncPreflightService');

const VALID_TARGET_MODULE = 'RENSTRA';

const CLASSIFICATIONS = [
  'unchanged',
  'mapped_valid',
  'source_updated',
  'missing_target',
  'missing_source_map',
  'orphan_target',
  'chain_mismatch',
  'manual_conflict',
  'indicator_context_invalid',
  'resolver_conflict',
  'source_hash_mismatch',
  'target_hash_mismatch',
  'ready_to_sync',
  'blocked',
  'target_scope_violation',
  'dropdown_scope_violation',
  'parent_missing',
];

const SEVERITIES = ['info', 'warning', 'high', 'critical', 'error', 'fatal'];

const STRUCTURAL_STAGE_ORDER = [
  'tujuan',
  'sasaran',
  'strategi',
  'kebijakan',
  'program',
  'kegiatan',
  'sub_kegiatan',
];

const INDICATOR_STAGE_ORDER = [
  'indikator_tujuan',
  'indikator_sasaran',
  'indikator_strategi',
  'indikator_kebijakan',
  'indikator_program',
  'indikator_kegiatan',
  'indikator_sub_kegiatan',
];

function normalizeStage(stage) {
  return normalizeText(stage);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeJson(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(stableStringify(value));
  } catch {
    return {
      value: String(value),
    };
  }
}

function compareNormalizedPayload(before = {}, after = {}, keys = []) {
  const diff = {};

  keys.forEach((key) => {
    const beforeValue = before?.[key] ?? null;
    const afterValue = after?.[key] ?? null;
    if (stableStringify(beforeValue) === stableStringify(afterValue)) {
      return;
    }
    diff[key] = {
      before: safeJson(beforeValue),
      after: safeJson(afterValue),
    };
  });

  return diff;
}

function comparePayloadHash(current = {}, previous = {}) {
  const currentSourceHash = normalizeText(current?.source_hash);
  const currentTargetHash = normalizeText(current?.target_hash);
  const previousSourceHash = normalizeText(previous?.source_hash);
  const previousTargetHash = normalizeText(previous?.target_hash);

  const sourceChanged =
    Boolean(previousSourceHash) &&
    Boolean(currentSourceHash) &&
    previousSourceHash !== currentSourceHash;
  const targetChanged =
    Boolean(previousTargetHash) &&
    Boolean(currentTargetHash) &&
    previousTargetHash !== currentTargetHash;

  if (!previousSourceHash && !previousTargetHash) {
    return 'missing_previous';
  }

  if (sourceChanged && targetChanged) return 'both_changed';
  if (sourceChanged) return 'source_changed';
  if (targetChanged) return 'target_changed';
  return 'stable';
}

function detectHashStatus(current = {}, previous = {}) {
  const comparison = comparePayloadHash(current, previous);
  return {
    comparison,
    source_changed: comparison === 'source_changed' || comparison === 'both_changed',
    target_changed: comparison === 'target_changed' || comparison === 'both_changed',
    stable: comparison === 'stable',
    missing_previous: comparison === 'missing_previous',
  };
}

function getActionForClassification(classification) {
  const map = {
    unchanged: 'no_action',
    mapped_valid: 'no_action',
    ready_to_sync: 'update_map',
    source_updated: 'update_target',
    source_hash_mismatch: 'refresh_hash',
    target_hash_mismatch: 'review_manual',
    missing_target: 'create_target',
    missing_source_map: 'update_map',
    orphan_target: 'review_manual',
    parent_missing: 'fix_chain',
    chain_mismatch: 'fix_chain',
    manual_conflict: 'review_manual',
    indicator_context_invalid: 'fix_indicator_context',
    resolver_conflict: 'blocked',
    target_scope_violation: 'fix_dropdown_scope',
    dropdown_scope_violation: 'fix_dropdown_scope',
    blocked: 'blocked',
  };

  return map[classification] || 'skip';
}

function getSeverityForClassification(classification, mode = 'preview') {
  const map = {
    unchanged: 'info',
    mapped_valid: 'info',
    ready_to_sync: 'info',
    source_updated: 'warning',
    source_hash_mismatch: mode === 'execute' ? 'high' : 'warning',
    target_hash_mismatch: mode === 'execute' ? 'high' : 'warning',
    missing_target: 'high',
    missing_source_map: 'high',
    orphan_target: 'high',
    parent_missing: 'high',
    chain_mismatch: 'high',
    manual_conflict: 'high',
    indicator_context_invalid: 'high',
    resolver_conflict: 'critical',
    target_scope_violation: 'critical',
    dropdown_scope_violation: 'critical',
    blocked: 'fatal',
  };

  return map[classification] || 'warning';
}

function isBlockingClassification(classification, mode = 'preview') {
  const alwaysBlocking = new Set([
    'chain_mismatch',
    'manual_conflict',
    'indicator_context_invalid',
    'resolver_conflict',
    'target_scope_violation',
    'dropdown_scope_violation',
    'blocked',
  ]);

  if (alwaysBlocking.has(classification)) return true;

  if (mode === 'execute') {
    return new Set([
      'missing_target',
      'missing_source_map',
      'parent_missing',
      'source_hash_mismatch',
      'target_hash_mismatch',
    ]).has(classification);
  }

  if (mode === 'resolve_map') {
    return new Set([
      'resolver_conflict',
      'chain_mismatch',
      'blocked',
      'target_scope_violation',
      'dropdown_scope_violation',
    ]).has(classification);
  }

  if (mode === 'preview') {
    return new Set([
      'chain_mismatch',
      'manual_conflict',
      'indicator_context_invalid',
      'resolver_conflict',
      'target_scope_violation',
      'dropdown_scope_violation',
      'missing_target',
      'missing_source_map',
      'parent_missing',
    ]).has(classification);
  }

  return false;
}

function normalizeCurrentMapRow(row) {
  if (!row) return null;
  return {
    rpjmd_id: safeNumber(row.rpjmd_id),
    renstra_id: safeNumber(row.renstra_id),
    target_module: normalizeText(row.target_module),
    source_stage: normalizeText(row.source_stage),
    source_table: normalizeText(row.source_table),
    source_ref_id: safeNumber(row.source_ref_id),
    source_code: normalizeText(row.source_code),
    source_name: normalizeText(row.source_name),
    target_table: normalizeText(row.target_table),
    target_ref_id: safeNumber(row.target_ref_id),
    target_code: normalizeText(row.target_code),
    target_name: normalizeText(row.target_name),
    parent_source_stage: normalizeText(row.parent_source_stage),
    parent_source_ref_id: safeNumber(row.parent_source_ref_id),
    parent_target_stage: normalizeText(row.parent_target_stage),
    parent_target_ref_id: safeNumber(row.parent_target_ref_id),
    mapping_status: normalizeText(row.mapping_status),
    chain_status: normalizeText(row.chain_status),
    source_hash: normalizeText(row.source_hash),
    target_hash: normalizeText(row.target_hash),
    last_synced_at: row.last_synced_at || null,
    last_checked_at: row.last_checked_at || null,
    created_by: safeNumber(row.created_by),
    updated_by: safeNumber(row.updated_by),
  };
}

function normalizeSourceMapPayload(row) {
  return normalizeCurrentMapRow(row);
}

function buildSourceMapKey(row) {
  return [
    safeNumber(row?.rpjmd_id),
    normalizeText(row?.target_module)?.toUpperCase() || VALID_TARGET_MODULE,
    safeNumber(row?.renstra_id),
    normalizeText(row?.source_stage),
    safeNumber(row?.source_ref_id),
  ]
    .map((value) => String(value ?? ''))
    .join(':');
}

function buildTargetLookupKey(stage, refId) {
  return `${normalizeText(stage) || ''}:${safeNumber(refId) || ''}`;
}

function getTargetStageForSourceStage(stage) {
  return normalizeStage(stage);
}

function extractPreflightIssues(preflightResult) {
  if (Array.isArray(preflightResult?.data?.issues)) {
    return preflightResult.data.issues;
  }

  if (Array.isArray(preflightResult?.data?.data?.issues)) {
    return preflightResult.data.data.issues;
  }

  return [];
}

function buildIndicatorContextIssues(preflightIssues = [], row) {
  const matches = preflightIssues.filter((issue) => {
    const issueStage = normalizeStage(issue.stage || issue.source_stage);
    const rowStage = normalizeStage(row?.source_stage);
    const issueRef = safeNumber(issue.source_ref_id);
    const rowRef = safeNumber(row?.source_ref_id);
    if (issueStage && rowStage && issueStage !== rowStage) return false;
    if (issueRef !== null && rowRef !== null && issueRef !== rowRef) return false;
    return true;
  });

  return matches;
}

function resolveDiffClassification({
  current,
  previous,
  hashStatus,
  indicatorIssues,
  isIndicator,
  mode,
}) {
  if (current?.mapping_status === 'resolver_conflict') {
    return 'resolver_conflict';
  }

  if (current?.mapping_status === 'missing_target') {
    return 'missing_target';
  }

  if (current?.chain_status === 'chain_mismatch') {
    return 'chain_mismatch';
  }

  if (current?.chain_status === 'parent_missing') {
    return 'parent_missing';
  }

  if (indicatorIssues.some((issue) => issue.code === 'indicator_context_invalid')) {
    return 'indicator_context_invalid';
  }

  if (
    indicatorIssues.some(
      (issue) =>
        issue.code === 'TARGET_DROPDOWN_SCOPE_VIOLATION' ||
        issue.code === 'INDICATOR_DROPDOWN_SCOPE_VIOLATION',
    )
  ) {
    return isIndicator ? 'dropdown_scope_violation' : 'target_scope_violation';
  }

  if (hashStatus.missing_previous) {
    return current?.mapping_status === 'mapped' && current?.chain_status === 'valid'
      ? 'missing_source_map'
      : 'missing_target';
  }

  if (hashStatus.stable) {
    if (previous?.last_synced_at) {
      return 'unchanged';
    }

    if (current?.mapping_status === 'mapped' && current?.chain_status === 'valid') {
      return 'ready_to_sync';
    }

    return 'mapped_valid';
  }

  if (hashStatus.source_changed && hashStatus.target_changed) {
    return 'source_hash_mismatch';
  }

  if (hashStatus.source_changed) {
    return 'source_updated';
  }

  if (hashStatus.target_changed) {
    return mode === 'execute' ? 'target_hash_mismatch' : 'manual_conflict';
  }

  return current?.mapping_status === 'mapped' ? 'mapped_valid' : 'blocked';
}

function buildDiffMessage(classification) {
  const messages = {
    missing_target: 'Target Renstra belum tersedia untuk source ini.',
    missing_source_map: 'Source map belum tersimpan untuk pasangan source-target ini.',
    orphan_target: 'Target Renstra tidak memiliki pasangan source RPJMD yang valid.',
    chain_mismatch: 'Chain parent-child tidak valid.',
    parent_missing: 'Parent target belum tersedia.',
    manual_conflict: 'Target berubah di luar hash source yang sama.',
    source_updated: 'Source RPJMD berubah dan target perlu diverifikasi ulang.',
    source_hash_mismatch: 'Hash source berubah dari snapshot sebelumnya.',
    target_hash_mismatch: 'Hash target berubah dari snapshot sebelumnya.',
    indicator_context_invalid: 'Konteks indikator Renstra tidak valid.',
    resolver_conflict: 'Resolver menemukan lebih dari satu target untuk source yang sama.',
    target_scope_violation: 'Target berada di luar scope ownership/dropdown yang diizinkan.',
    dropdown_scope_violation: 'Target berada di luar scope ownership/dropdown yang diizinkan.',
    ready_to_sync: 'Mapping siap disinkronkan.',
    mapped_valid: 'Mapping valid.',
    unchanged: 'Mapping tidak berubah.',
  };

  return messages[classification] || 'Perbedaan mapping terdeteksi.';
}

function buildDiffRecommendation(classification, mode) {
  const recommendations = {
    missing_target: 'Lengkapi target Renstra atau sesuaikan source map.',
    missing_source_map: 'Refresh source map dari source dan target tree.',
    orphan_target: 'Periksa apakah target ini masih relevan atau perlu dihapus dari scope.',
    chain_mismatch: 'Perbaiki parent chain sebelum execute.',
    parent_missing: 'Lengkapi parent target sebelum melanjutkan.',
    manual_conflict: 'Review manual perubahan target sebelum sinkronisasi.',
    source_updated: 'Refresh target atau tandai perubahan source untuk review.',
    source_hash_mismatch: 'Refresh hash source dan evaluasi kembali mapping.',
    target_hash_mismatch: 'Review perubahan target dan pastikan masih sesuai source.',
    indicator_context_invalid:
      'Perbaiki konteks indikator agar tetap berada pada ref target yang benar.',
    resolver_conflict: 'Normalisasi data agar resolver hanya menghasilkan satu target.',
    target_scope_violation: 'Gunakan parent target_ref_id yang valid dari resolver.',
    dropdown_scope_violation: 'Gunakan parent target_ref_id yang valid dari resolver.',
    ready_to_sync: 'Lanjutkan ke preview atau execute.',
    mapped_valid: 'Tidak ada aksi diperlukan.',
    unchanged: 'Tidak ada aksi diperlukan.',
    blocked: 'Review perbedaan sebelum melanjutkan.',
  };

  if (classification === 'orphan_target' && mode === 'execute') {
    return 'Perbaiki sumber target atau hilangkan target orphan sebelum execute.';
  }

  return recommendations[classification] || 'Review perbedaan sebelum melanjutkan.';
}

function buildBeforePayload(previous, current) {
  if (!previous) return null;
  return {
    map: previous,
    hash_status: detectHashStatus(current, previous),
  };
}

function buildAfterPayload(current, targetRow) {
  return {
    map: current,
    target: safeJson(targetRow),
  };
}

function buildDiffJson(previous, current, targetRow) {
  const diffJson = compareNormalizedPayload(previous || {}, current || {}, [
    'mapping_status',
    'chain_status',
    'source_hash',
    'target_hash',
    'source_code',
    'source_name',
    'target_code',
    'target_name',
    'parent_source_stage',
    'parent_source_ref_id',
    'parent_target_stage',
    'parent_target_ref_id',
  ]);

  if (targetRow && current?.target_ref_id !== safeNumber(targetRow.target_ref_id)) {
    diffJson.target_ref_id = {
      before: safeJson(previous?.target_ref_id ?? null),
      after: safeJson(targetRow.target_ref_id),
    };
  }

  return diffJson;
}

function buildDiffFromCurrentRow({
  currentMapRow,
  previousMapRow,
  targetRow,
  preflightResult,
  mode,
}) {
  const current = normalizeSourceMapPayload(currentMapRow);
  const previous = normalizeSourceMapPayload(previousMapRow);
  const sourceStage = normalizeStage(current?.source_stage);
  const isIndicator = Boolean(sourceStage?.startsWith('indikator_'));
  const preflightIssues = extractPreflightIssues(preflightResult);

  const indicatorIssues = isIndicator ? buildIndicatorContextIssues(preflightIssues, current) : [];

  const hashStatus = detectHashStatus(current, previous);
  const classification = resolveDiffClassification({
    current,
    previous,
    hashStatus,
    indicatorIssues,
    isIndicator,
    mode,
  });

  const severity = getSeverityForClassification(classification, mode);
  const isBlocking = isBlockingClassification(classification, mode);
  const beforePayload = buildBeforePayload(previous, current);
  const afterPayload = buildAfterPayload(current, targetRow);
  const diffJson = buildDiffJson(previous, current, targetRow);
  const message = buildDiffMessage(classification);
  const recommendation = buildDiffRecommendation(classification, mode);

  return {
    stage: sourceStage,
    source_stage: sourceStage,
    source_table: current?.source_table || null,
    source_ref_id: safeNumber(current?.source_ref_id),
    source_code: current?.source_code || null,
    source_name: current?.source_name || null,
    target_table: current?.target_table || targetRow?.target_table || null,
    target_ref_id: safeNumber(current?.target_ref_id ?? targetRow?.target_ref_id),
    target_code: current?.target_code || targetRow?.target_code || null,
    target_name: current?.target_name || targetRow?.target_name || null,
    parent_source_stage: current?.parent_source_stage || null,
    parent_source_ref_id: safeNumber(current?.parent_source_ref_id),
    parent_target_stage: current?.parent_target_stage || null,
    parent_target_ref_id: safeNumber(current?.parent_target_ref_id),
    mapping_status: current?.mapping_status || null,
    chain_status: current?.chain_status || null,
    source_hash: current?.source_hash || null,
    target_hash: current?.target_hash || null,
    previous_source_hash: previous?.source_hash || null,
    previous_target_hash: previous?.target_hash || null,
    classification,
    severity,
    is_blocking: isBlocking,
    action: getActionForClassification(classification),
    before_json: beforePayload,
    after_json: afterPayload,
    diff_json: diffJson,
    message,
    recommendation,
  };
}

function buildOrphanTargetDiff({ targetRow, previousMapRow, mode }) {
  const normalizedTarget = safeJson(targetRow?.normalized_payload || targetRow || null);
  const previous = normalizeSourceMapPayload(previousMapRow);
  const classification = 'orphan_target';
  return {
    stage: normalizeStage(targetRow?.target_stage),
    source_stage: normalizeStage(targetRow?.target_stage),
    source_table: null,
    source_ref_id: null,
    source_code: null,
    source_name: null,
    target_table: targetRow?.target_table || null,
    target_ref_id: safeNumber(targetRow?.target_ref_id),
    target_code: targetRow?.target_code || null,
    target_name: targetRow?.target_name || null,
    parent_source_stage: null,
    parent_source_ref_id: null,
    parent_target_stage: targetRow?.parent_target_stage || null,
    parent_target_ref_id: safeNumber(targetRow?.parent_target_ref_id),
    mapping_status: 'orphan_target',
    chain_status: 'unchecked',
    source_hash: null,
    target_hash: targetRow?.target_hash || null,
    previous_source_hash: previous?.source_hash || null,
    previous_target_hash: previous?.target_hash || null,
    classification,
    severity: getSeverityForClassification(classification, mode),
    is_blocking: isBlockingClassification(classification, mode),
    action: getActionForClassification(classification),
    before_json: previous ? { map: previous } : null,
    after_json: {
      target: normalizedTarget,
    },
    diff_json: {
      orphan_target: true,
      target_ref_id: {
        before: safeJson(previous?.target_ref_id ?? null),
        after: safeJson(targetRow?.target_ref_id ?? null),
      },
    },
    message: 'Target Renstra tidak memiliki pasangan source RPJMD yang valid.',
    recommendation:
      mode === 'execute'
        ? 'Perbaiki sumber target atau hilangkan target orphan sebelum execute.'
        : 'Review target orphan ini sebelum preview atau execute.',
  };
}

function buildRemovedSourceDiff({ previousMapRow, mode }) {
  const previous = normalizeSourceMapPayload(previousMapRow);
  const classification = 'missing_source_map';
  return {
    stage: normalizeStage(previous?.source_stage),
    source_stage: normalizeStage(previous?.source_stage),
    source_table: previous?.source_table || null,
    source_ref_id: safeNumber(previous?.source_ref_id),
    source_code: previous?.source_code || null,
    source_name: previous?.source_name || null,
    target_table: previous?.target_table || null,
    target_ref_id: safeNumber(previous?.target_ref_id),
    target_code: previous?.target_code || null,
    target_name: previous?.target_name || null,
    parent_source_stage: previous?.parent_source_stage || null,
    parent_source_ref_id: safeNumber(previous?.parent_source_ref_id),
    parent_target_stage: previous?.parent_target_stage || null,
    parent_target_ref_id: safeNumber(previous?.parent_target_ref_id),
    mapping_status: 'missing_source_map',
    chain_status: previous?.chain_status || 'unchecked',
    source_hash: null,
    target_hash: previous?.target_hash || null,
    previous_source_hash: previous?.source_hash || null,
    previous_target_hash: previous?.target_hash || null,
    classification,
    severity: getSeverityForClassification(classification, mode),
    is_blocking: isBlockingClassification(classification, mode),
    action: getActionForClassification(classification),
    before_json: { map: previous },
    after_json: null,
    diff_json: {
      missing_source_map: true,
      source_ref_id: safeJson(previous?.source_ref_id ?? null),
    },
    message: 'Source map belum tersimpan untuk pasangan source-target ini.',
    recommendation: 'Refresh source map dari source dan target tree.',
  };
}

async function loadExistingSourceMaps({ rpjmd_id, renstra_id, target_module }) {
  const rows = await RpjmdSourceMap.findAll({
    where: {
      rpjmd_id: safeNumber(rpjmd_id),
      renstra_id: safeNumber(renstra_id),
      target_module: normalizeText(target_module)?.toUpperCase() || VALID_TARGET_MODULE,
    },
    raw: true,
  });

  return rows.map((row) => normalizeSourceMapPayload(row));
}

function buildTargetLookupByStages(targetTree) {
  const targetLookup = new Map();

  [...STRUCTURAL_STAGE_ORDER, ...INDICATOR_STAGE_ORDER].forEach((stage) => {
    const rows = Array.isArray(targetTree?.data?.stages?.[stage])
      ? targetTree.data.stages[stage]
      : [];
    rows.forEach((row) => {
      targetLookup.set(buildTargetLookupKey(stage, row.target_ref_id), row);
    });
  });

  return targetLookup;
}

function collectCurrentRowDiffs({
  currentRows,
  previousRows,
  targetLookup,
  preflightResult,
  mode,
  matchedTargetKeys,
}) {
  return currentRows.map((row) => {
    const targetStage = getTargetStageForSourceStage(row.source_stage);
    const targetKey = buildTargetLookupKey(targetStage, row.target_ref_id);
    const targetRow = targetLookup.get(targetKey) || null;
    if (targetRow) {
      matchedTargetKeys.add(targetKey);
    }

    const previousMapRow =
      previousRows.find((item) => buildSourceMapKey(item) === buildSourceMapKey(row)) || null;

    return buildDiffFromCurrentRow({
      currentMapRow: row,
      previousMapRow,
      targetRow,
      preflightResult,
      mode,
    });
  });
}

function collectRemovedSourceDiffs({ previousRows, sourceMapLookup, mode }) {
  return previousRows.reduce((acc, previousRow) => {
    const key = buildSourceMapKey(previousRow);
    if (sourceMapLookup.has(key)) {
      return acc;
    }

    acc.push(buildRemovedSourceDiff({ previousMapRow: previousRow, mode }));
    return acc;
  }, []);
}

function collectOrphanTargetDiffs({ targetTree, matchedTargetKeys, previousRows, mode }) {
  const diffs = [];
  const targetStages = targetTree?.data?.stages || {};

  Object.keys(targetStages).forEach((stage) => {
    const rows = Array.isArray(targetStages[stage]) ? targetStages[stage] : [];
    rows.forEach((targetRow) => {
      const targetKey = buildTargetLookupKey(stage, targetRow.target_ref_id);
      if (matchedTargetKeys.has(targetKey)) return;

      const previousMapRow =
        previousRows.find(
          (item) =>
            normalizeStage(item.source_stage) === normalizeStage(stage) &&
            safeNumber(item.target_ref_id) === safeNumber(targetRow.target_ref_id),
        ) || null;

      diffs.push(buildOrphanTargetDiff({ targetRow, previousMapRow, mode }));
    });
  });

  return diffs;
}

function compareSourceAndTarget({
  sourceTree,
  targetTree,
  sourceMapRows,
  preflightResult,
  mode = 'preview',
} = {}) {
  if (!sourceTree || sourceTree.success === false) {
    return {
      success: false,
      code: 'RPJMD_DIFF_VALIDATION_ERROR',
      message: 'Source tree tidak valid untuk dibandingkan.',
    };
  }

  if (!targetTree || targetTree.success === false) {
    return {
      success: false,
      code: 'RPJMD_DIFF_VALIDATION_ERROR',
      message: 'Target tree tidak valid untuk dibandingkan.',
    };
  }

  const diffs = [];
  const currentRows = Array.isArray(sourceMapRows) ? sourceMapRows : [];
  const sourceMapLookup = new Map();
  const targetLookup = buildTargetLookupByStages(targetTree);
  const previousRows = Array.isArray(preflightResult?.data?.existing_source_maps)
    ? preflightResult.data.existing_source_maps
    : [];

  currentRows.forEach((row) => {
    sourceMapLookup.set(buildSourceMapKey(row), row);
  });

  const matchedTargetKeys = new Set();
  diffs.push(
    ...collectCurrentRowDiffs({
      currentRows,
      previousRows,
      targetLookup,
      preflightResult,
      mode,
      matchedTargetKeys,
    }),
  );
  diffs.push(
    ...collectRemovedSourceDiffs({
      previousRows,
      sourceMapLookup,
      mode,
    }),
  );
  diffs.push(
    ...collectOrphanTargetDiffs({
      targetTree,
      matchedTargetKeys,
      previousRows,
      mode,
    }),
  );

  return {
    success: true,
    data: {
      diffs,
    },
  };
}

function classifyDiff(diff) {
  if (!diff || !isPlainObject(diff)) {
    return {
      classification: 'blocked',
      severity: 'fatal',
      is_blocking: true,
      action: 'blocked',
    };
  }

  return {
    classification: diff.classification || 'blocked',
    severity: diff.severity || 'warning',
    is_blocking: Boolean(diff.is_blocking),
    action: diff.action || getActionForClassification(diff.classification || 'blocked'),
  };
}

function buildJobItemsFromDiff({ rpjmd_id, renstra_id, target_module, diffs } = {}) {
  const normalizedTargetModule = normalizeText(target_module)?.toUpperCase() || VALID_TARGET_MODULE;
  const scopeContext = {
    rpjmd_id: safeNumber(rpjmd_id),
    renstra_id: safeNumber(renstra_id),
    target_module: normalizedTargetModule,
  };
  if (!scopeContext.rpjmd_id || !scopeContext.renstra_id || !scopeContext.target_module) {
    return {
      success: false,
      code: 'RPJMD_DIFF_VALIDATION_ERROR',
      message: 'Konteks job item tidak valid.',
    };
  }

  const jobItems = (Array.isArray(diffs) ? diffs : []).map((diff) => ({
    job_id: null,
    stage: diff.stage || diff.source_stage || null,
    source_table: diff.source_table || null,
    source_ref_id: safeNumber(diff.source_ref_id),
    source_code: diff.source_code || null,
    source_name: diff.source_name || null,
    target_table: diff.target_table || null,
    target_ref_id: safeNumber(diff.target_ref_id),
    target_code: diff.target_code || null,
    target_name: diff.target_name || null,
    action: diff.action || 'skip',
    classification: diff.classification || 'blocked',
    severity: diff.severity || 'warning',
    is_blocking: Boolean(diff.is_blocking),
    before_json: safeJson(diff.before_json),
    after_json: safeJson(diff.after_json),
    diff_json: safeJson(diff.diff_json),
    message: diff.message || null,
  }));

  return {
    success: true,
    data: jobItems,
  };
}

function buildDiffSummary({ diffs = [], jobItems = [] } = {}) {
  const classifications = CLASSIFICATIONS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  const severities = SEVERITIES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  let totalBlocking = 0;
  let totalWarning = 0;
  let totalInfo = 0;

  diffs.forEach((diff) => {
    const classification = diff.classification || 'blocked';
    if (Object.hasOwn(classifications, classification)) {
      classifications[classification] += 1;
    }

    const severity = diff.severity || 'warning';
    if (Object.hasOwn(severities, severity)) {
      severities[severity] += 1;
    }

    if (diff.is_blocking) totalBlocking += 1;
    if (severity === 'warning') totalWarning += 1;
    if (severity === 'info') totalInfo += 1;
  });

  return {
    total_diffs: diffs.length,
    total_job_items: jobItems.length,
    ...classifications,
    total_blocking: totalBlocking,
    total_warning: totalWarning,
    total_info: totalInfo,
    severity_counts: severities,
  };
}

async function buildRpjmdGovernanceDiff({
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
  scope = 'all',
  include_indicators = true,
  include_pagu = false,
  mode = 'preview',
  actor_user_id,
  preflightResult = null,
} = {}) {
  const normalizedTargetModule = normalizeText(target_module)?.toUpperCase() || VALID_TARGET_MODULE;

  const effectivePreflight =
    preflightResult ||
    (await runRpjmdGovernancePreflight({
      rpjmd_id,
      renstra_id,
      target_module: normalizedTargetModule,
      scope,
      include_indicators,
      include_pagu,
      mode,
      actor_user_id,
      require_existing_map: false,
    }));

  if (!effectivePreflight?.success && effectivePreflight?.code !== 'RPJMD_PREFLIGHT_BLOCKED') {
    return {
      success: false,
      code: 'RPJMD_DIFF_PREFLIGHT_FAILED',
      message: effectivePreflight?.message || 'Preflight gagal sebelum diff dapat dibangun.',
      errors: effectivePreflight?.errors || [],
    };
  }

  const preflightData = effectivePreflight?.data || {};
  const preflightIssues = Array.isArray(preflightData.issues) ? preflightData.issues : [];
  const preflightWarnings = Array.isArray(preflightData.warnings) ? preflightData.warnings : [];
  const preflightBlocked = Boolean(
    effectivePreflight?.code === 'RPJMD_PREFLIGHT_BLOCKED' ||
    preflightData.is_blocked ||
    preflightIssues.some((issue) => issue.is_blocking),
  );

  if (preflightBlocked && mode !== 'scan') {
    return {
      success: false,
      code: 'RPJMD_DIFF_BLOCKED',
      message: 'Diff diblokir karena preflight memiliki isu blocking.',
      data: {
        preflight: {
          is_blocked: true,
          total_issues: preflightData.summary?.total_issues || preflightIssues.length,
          total_blocking_issues:
            preflightData.summary?.total_blocking_issues ||
            preflightIssues.filter((issue) => issue.is_blocking).length,
        },
        issues: preflightIssues,
      },
    };
  }

  try {
    const sourceTree = await buildRpjmdSourceTree({
      rpjmd_id,
      scope,
      include_indicators,
    });

    if (!sourceTree.success) {
      return {
        success: false,
        code: 'RPJMD_DIFF_SOURCE_TREE_FAILED',
        message: sourceTree.message || 'Source tree RPJMD gagal dibangun untuk diff.',
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
        code: 'RPJMD_DIFF_TARGET_TREE_FAILED',
        message: targetTree.message || 'Target tree Renstra gagal dibangun untuk diff.',
        errors: targetTree.errors || [],
      };
    }

    const sourceMapResult = await refreshSourceMapFromTrees({
      rpjmd_id,
      renstra_id,
      scope,
      include_indicators,
      include_pagu,
      target_module: normalizedTargetModule,
      dry_run: true,
      actor_user_id,
    });

    if (!sourceMapResult.success) {
      return {
        success: false,
        code: 'RPJMD_DIFF_SOURCE_MAP_FAILED',
        message: sourceMapResult.message || 'Source map dry-run gagal untuk diff.',
        errors: sourceMapResult.errors || [],
      };
    }

    const existingSourceMaps = await loadExistingSourceMaps({
      rpjmd_id,
      renstra_id,
      target_module: normalizedTargetModule,
    });

    const sourceMapRows = Array.isArray(sourceMapResult.data?.rows)
      ? sourceMapResult.data.rows
      : [];

    const compareResult = compareSourceAndTarget({
      sourceTree,
      targetTree,
      sourceMapRows,
      preflightResult: {
        ...effectivePreflight,
        data: {
          ...preflightData,
          issues: preflightIssues,
          warnings: preflightWarnings,
          existing_source_maps: existingSourceMaps,
        },
      },
      mode,
    });

    if (!compareResult.success) {
      return {
        success: false,
        code: 'RPJMD_DIFF_BUILD_FAILED',
        message: 'Perbandingan source-target gagal.',
      };
    }

    const diffs = compareResult.data?.diffs || [];
    const jobItemsResult = buildJobItemsFromDiff({
      diffs,
      rpjmd_id,
      renstra_id,
      target_module: normalizedTargetModule,
    });

    if (!jobItemsResult.success) {
      return {
        success: false,
        code: 'RPJMD_DIFF_BUILD_FAILED',
        message: 'Pembuatan job item payload gagal.',
      };
    }

    const jobItems = jobItemsResult.data || [];
    const summary = buildDiffSummary({ diffs, jobItems });

    const isBlocked = Boolean(
      preflightBlocked ||
      diffs.some((diff) => diff.is_blocking) ||
      (mode === 'execute' &&
        diffs.some((diff) =>
          [
            'missing_target',
            'missing_source_map',
            'parent_missing',
            'source_hash_mismatch',
            'target_hash_mismatch',
          ].includes(diff.classification),
        )),
    );

    return {
      success: true,
      data: {
        rpjmd_id: safeNumber(rpjmd_id),
        renstra_id: safeNumber(renstra_id),
        target_module: normalizedTargetModule,
        scope: normalizeStage(scope) || 'all',
        mode: normalizeStage(mode) || 'preview',
        generated_at: new Date().toISOString(),
        is_blocked: isBlocked,
        diffs,
        job_items: jobItems,
        summary,
        warnings: preflightWarnings,
        preflight: {
          is_blocked: preflightBlocked,
          total_issues: preflightData.summary?.total_issues || preflightIssues.length,
          total_blocking_issues:
            preflightData.summary?.total_blocking_issues ||
            preflightIssues.filter((issue) => issue.is_blocking).length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      code: 'RPJMD_DIFF_BUILD_FAILED',
      message: error?.message || 'Diff gagal dibangun.',
    };
  }
}

module.exports = {
  buildRpjmdGovernanceDiff,
  compareSourceAndTarget,
  classifyDiff,
  buildJobItemsFromDiff,
  buildDiffSummary,
  comparePayloadHash,
  compareNormalizedPayload,
  detectHashStatus,
  getActionForClassification,
  getSeverityForClassification,
  isBlockingClassification,
  safeJson,
  normalizeSourceMapPayload,
  buildSourceMapKey,
};
