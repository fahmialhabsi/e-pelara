"use strict";

const { Op } = require("sequelize");
const autoMapSvc = require("./renjaAutoMappingService");
const indicatorSvc = require("./renjaIndicatorMappingService");
const targetSvc = require("./renjaTargetAutofillService");
const policyConflictSvc = require("./renjaPolicyConflictResolverService");

const SUGGESTION_TYPES = Object.freeze({
  MAPPING: "mapping_program",
  INDICATOR: "indicator_mapping",
  TARGET: "target_autofill",
  POLICY: "policy_conflict",
});

/** Normalized change_type untuk batch & audit (sesuai kontrak hardening). */
const CHANGE_TYPE = Object.freeze({
  MAPPING: "mapping_program",
  INDIKATOR: "indikator",
  TARGET: "target",
  POLICY: "policy",
});

const POLICY_ALIGNMENT_CODES = new Set([
  "POLICY_CHAIN_EXISTS",
  "POLICY_CHAIN_INCOMPLETE",
  "POLICY_CHAIN_BROKEN",
  "STRATEGY_NOT_ALIGNED",
  "ARAH_KEBIJAKAN_NOT_ALIGNED",
  "SASARAN_NOT_ALIGNED",
  "TUJUAN_NOT_ALIGNED",
  "MISI_NOT_ALIGNED",
  "PROGRAM_WITHOUT_ARAH_KEBIJAKAN",
  "ARAH_KEBIJAKAN_WITHOUT_STRATEGI",
]);

function changeTypeFromSuggestionType(suggestionType) {
  switch (String(suggestionType || "")) {
    case SUGGESTION_TYPES.MAPPING:
      return CHANGE_TYPE.MAPPING;
    case SUGGESTION_TYPES.INDICATOR:
      return CHANGE_TYPE.INDIKATOR;
    case SUGGESTION_TYPES.TARGET:
      return CHANGE_TYPE.TARGET;
    case SUGGESTION_TYPES.POLICY:
      return CHANGE_TYPE.POLICY;
    default:
      return CHANGE_TYPE.MAPPING;
  }
}

function affectedFieldsForSuggestionType(suggestionType) {
  switch (String(suggestionType || "")) {
    case SUGGESTION_TYPES.MAPPING:
      return ["program_id", "source_renstra_program_id", "source_renstra_kegiatan_id", "source_renstra_subkegiatan_id"];
    case SUGGESTION_TYPES.INDICATOR:
      return ["source_indikator_renstra_id", "satuan"];
    case SUGGESTION_TYPES.TARGET:
      return ["target_numerik", "target_teks", "satuan"];
    case SUGGESTION_TYPES.POLICY:
      return [];
    default:
      return [];
  }
}

function mapRunTypeFromSuggestionType(suggestionType) {
  switch (String(suggestionType || "")) {
    case SUGGESTION_TYPES.MAPPING:
      return "mapping";
    case SUGGESTION_TYPES.INDICATOR:
      return "indicator";
    case SUGGESTION_TYPES.TARGET:
      return "target";
    case SUGGESTION_TYPES.POLICY:
      return "policy_conflict";
    default:
      return "mapping";
  }
}

function normalizeSuggestionRow(row = {}, renjaDokumenId, runId, suggestionType) {
  return {
    renja_mapping_suggestion_run_id: runId || null,
    renja_dokumen_id: Number(renjaDokumenId),
    renja_item_id: row.renja_item_id ? Number(row.renja_item_id) : null,
    suggestion_type: suggestionType,
    suggested_entity_type: row.suggested_entity_type || null,
    suggested_entity_id: row.suggested_entity_id ? Number(row.suggested_entity_id) : null,
    suggested_program_id: row.suggested_program_id ? Number(row.suggested_program_id) : null,
    suggested_source_renstra_program_id: row.suggested_source_renstra_program_id
      ? Number(row.suggested_source_renstra_program_id)
      : null,
    suggested_source_renstra_kegiatan_id: row.suggested_source_renstra_kegiatan_id
      ? Number(row.suggested_source_renstra_kegiatan_id)
      : null,
    suggested_source_renstra_subkegiatan_id: row.suggested_source_renstra_subkegiatan_id
      ? Number(row.suggested_source_renstra_subkegiatan_id)
      : null,
    suggested_source_indikator_renstra_id: row.suggested_source_indikator_renstra_id
      ? Number(row.suggested_source_indikator_renstra_id)
      : null,
    suggested_target_numerik:
      row.suggested_target_numerik === null || row.suggested_target_numerik === undefined
        ? null
        : Number(row.suggested_target_numerik),
    suggested_target_teks: row.suggested_target_teks || null,
    suggested_satuan: row.suggested_satuan || null,
    suggested_target_source: row.suggested_target_source || null,
    suggested_match_type: row.suggested_match_type || null,
    suggestion_score:
      row.suggestion_score === null || row.suggestion_score === undefined ? null : Number(row.suggestion_score),
    suggestion_confidence: row.suggestion_confidence || null,
    suggestion_reason: row.suggestion_reason || null,
    source_context_json: row.source_context_json || null,
    suggestion_payload_json: row.suggestion_payload_json || null,
    suggested_policy_chain_trace: row.suggested_policy_chain_trace || null,
    is_conflict: Boolean(row.is_conflict),
    conflict_reason: row.conflict_reason || null,
    resolution_mode: row.resolution_mode || null,
    is_auto_applied: false,
    is_accepted: null,
    accepted_by: null,
    accepted_at: null,
    rejected_by: null,
    rejected_at: null,
    applied_by: null,
    applied_at: null,
  };
}

async function createSuggestionRun(db, renjaDokumenId, runType, actorId, summary = null, transaction = null) {
  const { RenjaMappingSuggestionRun } = db;
  return RenjaMappingSuggestionRun.create(
    {
      renja_dokumen_id: Number(renjaDokumenId),
      run_type: runType,
      summary_json: summary || null,
      generated_by: actorId || null,
      generated_at: new Date(),
    },
    { transaction },
  );
}

async function persistSuggestionRows(db, renjaDokumenId, suggestionType, rows = [], actorId = null) {
  const { sequelize, RenjaMappingSuggestionResult } = db;
  const runType = mapRunTypeFromSuggestionType(suggestionType);
  const t = await sequelize.transaction();
  try {
    const run = await createSuggestionRun(
      db,
      renjaDokumenId,
      runType,
      actorId,
      {
        total: rows.length,
        high_confidence: rows.filter((x) => x.suggestion_confidence === "HIGH").length,
        medium_confidence: rows.filter((x) => x.suggestion_confidence === "MEDIUM").length,
        low_confidence: rows.filter((x) => x.suggestion_confidence === "LOW").length,
        conflict_count: rows.filter((x) => x.is_conflict).length,
      },
      t,
    );

    const normalized = rows.map((r) => normalizeSuggestionRow(r, renjaDokumenId, run.id, suggestionType));
    if (normalized.length) {
      await RenjaMappingSuggestionResult.bulkCreate(normalized, { transaction: t });
    }
    await t.commit();
    return {
      run,
      rows: normalized,
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function getLatestRunByType(db, renjaDokumenId, runType) {
  const { RenjaMappingSuggestionRun } = db;
  return RenjaMappingSuggestionRun.findOne({
    where: { renja_dokumen_id: Number(renjaDokumenId), run_type: runType },
    order: [["generated_at", "DESC"]],
  });
}

async function getSuggestionsByType(db, renjaDokumenId, suggestionType) {
  const { RenjaMappingSuggestionResult, RenjaItem } = db;
  const runType = mapRunTypeFromSuggestionType(suggestionType);
  const latestRun = await getLatestRunByType(db, renjaDokumenId, runType);
  if (!latestRun) return [];
  return RenjaMappingSuggestionResult.findAll({
    where: {
      renja_mapping_suggestion_run_id: Number(latestRun.id),
      renja_dokumen_id: Number(renjaDokumenId),
      suggestion_type: suggestionType,
    },
    include: [
      {
        model: RenjaItem,
        as: "renjaItem",
        required: false,
      },
    ],
    order: [["suggestion_score", "DESC"], ["id", "ASC"]],
  });
}

async function getDataFixSummary(db, renjaDokumenId, opts = {}) {
  const { RenjaItem, RenjaMappingSuggestionResult, RenjaMappingSuggestionRun, sequelize, Sequelize } = db;
  const docId = Number(renjaDokumenId);
  const qtx = opts.transaction ? { transaction: opts.transaction } : {};

  const [unmappedProgramItems, unmappedIndicators, emptyTargets] = await Promise.all([
    RenjaItem.count({
      where: {
        renja_dokumen_id: docId,
        [Op.or]: [{ program_id: null }, { source_renstra_program_id: null }],
      },
      ...qtx,
    }),
    RenjaItem.count({
      where: {
        renja_dokumen_id: docId,
        source_indikator_renstra_id: null,
      },
      ...qtx,
    }),
    RenjaItem.count({
      where: {
        renja_dokumen_id: docId,
        [Op.and]: [
          { [Op.or]: [{ target_numerik: null }] },
          sequelize.where(sequelize.fn("COALESCE", sequelize.col("target_teks"), ""), ""),
        ],
      },
      ...qtx,
    }),
  ]);

  const latestRuns = await RenjaMappingSuggestionRun.findAll({
    where: { renja_dokumen_id: docId },
    attributes: ["id", "run_type", "generated_at"],
    order: [["generated_at", "DESC"]],
    raw: true,
    ...qtx,
  });

  const latestByType = new Map();
  for (const run of latestRuns) {
    if (latestByType.has(run.run_type)) continue;
    latestByType.set(run.run_type, run);
  }
  const runIds = Array.from(latestByType.values()).map((x) => Number(x.id));
  const latestRows = runIds.length
    ? await RenjaMappingSuggestionResult.findAll({
        where: {
          renja_mapping_suggestion_run_id: { [Op.in]: runIds },
          renja_dokumen_id: docId,
        },
        raw: true,
        ...qtx,
      })
    : [];

  const policyConflicts = latestRows.filter(
    (x) => x.suggestion_type === SUGGESTION_TYPES.POLICY && x.is_conflict,
  ).length;
  const highConfidenceSuggestions = latestRows.filter(
    (x) => x.suggestion_confidence === "HIGH" && !x.is_conflict,
  ).length;
  const manualReviewNeeded = latestRows.filter(
    (x) => x.suggestion_confidence !== "HIGH" || x.is_conflict,
  ).length;

  const appliedSummary =
    (await sequelize.query(
      `
    SELECT
      SUM(CASE WHEN is_auto_applied = 1 THEN 1 ELSE 0 END) AS auto_applied_count,
      SUM(CASE WHEN is_accepted = 1 THEN 1 ELSE 0 END) AS accepted_count,
      SUM(CASE WHEN is_accepted = 0 THEN 1 ELSE 0 END) AS rejected_count
    FROM renja_mapping_suggestion_result
    WHERE renja_dokumen_id = :docId
    `,
      { replacements: { docId }, type: Sequelize.QueryTypes.SELECT, plain: true, ...qtx },
    )) || {};

  return {
    unmapped_program_items: unmappedProgramItems,
    unmapped_indicators: unmappedIndicators,
    empty_targets: emptyTargets,
    policy_conflicts: policyConflicts,
    high_confidence_suggestions: highConfidenceSuggestions,
    manual_review_needed: manualReviewNeeded,
    auto_applied_count: Number(appliedSummary?.auto_applied_count || 0),
    accepted_count: Number(appliedSummary?.accepted_count || 0),
    rejected_count: Number(appliedSummary?.rejected_count || 0),
    latest_runs: Object.fromEntries(Array.from(latestByType.entries()).map(([k, v]) => [k, v])),
  };
}

async function generateMappingSuggestions(db, renjaDokumenId, actorId, opts = {}) {
  const rows = await autoMapSvc.generateProgramMappingSuggestions(db, renjaDokumenId, opts);
  return persistSuggestionRows(db, renjaDokumenId, SUGGESTION_TYPES.MAPPING, rows, actorId);
}

async function generateIndicatorSuggestions(db, renjaDokumenId, actorId, opts = {}) {
  const rows = await indicatorSvc.generateIndicatorSuggestions(db, renjaDokumenId, opts);
  return persistSuggestionRows(db, renjaDokumenId, SUGGESTION_TYPES.INDICATOR, rows, actorId);
}

async function generateTargetSuggestions(db, renjaDokumenId, actorId, opts = {}) {
  const rows = await targetSvc.generateTargetAutofillSuggestions(db, renjaDokumenId, opts);
  return persistSuggestionRows(db, renjaDokumenId, SUGGESTION_TYPES.TARGET, rows, actorId);
}

async function generatePolicyConflictSuggestions(db, renjaDokumenId, actorId) {
  const rows = await policyConflictSvc.generatePolicyConflictSuggestions(db, renjaDokumenId);
  return persistSuggestionRows(db, renjaDokumenId, SUGGESTION_TYPES.POLICY, rows, actorId);
}

async function markSuggestionAccepted(model, row, actorId, transaction) {
  await row.update(
    {
      is_accepted: true,
      accepted_by: actorId || null,
      accepted_at: new Date(),
      is_auto_applied: true,
      applied_by: actorId || null,
      applied_at: new Date(),
    },
    { transaction },
  );
}

function mappingSnapshotFromItem(item) {
  const plain = item && typeof item.get === "function" ? item.get({ plain: true }) : item || {};
  return {
    program_id: plain.program_id ?? null,
    source_renstra_program_id: plain.source_renstra_program_id ?? null,
    source_renstra_kegiatan_id: plain.source_renstra_kegiatan_id ?? null,
    source_renstra_subkegiatan_id: plain.source_renstra_subkegiatan_id ?? null,
  };
}

function mappingProposedSnapshot(item, row) {
  const cur = mappingSnapshotFromItem(item);
  return {
    program_id: row.suggested_program_id || cur.program_id,
    source_renstra_program_id: row.suggested_source_renstra_program_id || cur.source_renstra_program_id,
    source_renstra_kegiatan_id: row.suggested_source_renstra_kegiatan_id || cur.source_renstra_kegiatan_id,
    source_renstra_subkegiatan_id: row.suggested_source_renstra_subkegiatan_id || cur.source_renstra_subkegiatan_id,
  };
}

function fullItemSnapshotForRollback(item) {
  const plain = item && typeof item.get === "function" ? item.get({ plain: true }) : item || {};
  return {
    program_id: plain.program_id ?? null,
    source_renstra_program_id: plain.source_renstra_program_id ?? null,
    source_renstra_kegiatan_id: plain.source_renstra_kegiatan_id ?? null,
    source_renstra_subkegiatan_id: plain.source_renstra_subkegiatan_id ?? null,
    source_indikator_renstra_id: plain.source_indikator_renstra_id ?? null,
    target_numerik:
      plain.target_numerik !== undefined && plain.target_numerik !== null ? Number(plain.target_numerik) : null,
    target_teks: plain.target_teks ?? null,
    satuan: plain.satuan ?? null,
    arah_kebijakan_id: plain.arah_kebijakan_id ?? null,
    strategi_id: plain.strategi_id ?? null,
  };
}

function itemUpdatedAtIso(item) {
  const plain = item && typeof item.get === "function" ? item.get({ plain: true }) : item || {};
  return plain.updated_at ? new Date(plain.updated_at).toISOString() : null;
}

function indicatorProposedSnapshot(item, row) {
  const cur = fullItemSnapshotForRollback(item);
  return {
    ...cur,
    source_indikator_renstra_id: row.suggested_source_indikator_renstra_id || cur.source_indikator_renstra_id,
    satuan: cur.satuan || row.suggested_satuan || cur.satuan,
  };
}

function targetProposedSnapshot(item, row, overwrite) {
  const cur = fullItemSnapshotForRollback(item);
  const hasTarget =
    cur.target_numerik !== null &&
    cur.target_numerik !== undefined &&
    String(cur.target_numerik).trim() !== "";
  if (hasTarget && !overwrite) return { ...cur };
  return {
    ...cur,
    target_numerik:
      row.suggested_target_numerik !== null && row.suggested_target_numerik !== undefined
        ? Number(row.suggested_target_numerik)
        : cur.target_numerik,
    target_teks: row.suggested_target_teks || cur.target_teks,
    satuan: cur.satuan || row.suggested_satuan || cur.satuan,
  };
}

function proposedSnapshotForRow(item, row, opts = {}) {
  if (row.suggestion_type === SUGGESTION_TYPES.MAPPING) {
    return { ...fullItemSnapshotForRollback(item), ...mappingProposedSnapshot(item, row) };
  }
  if (row.suggestion_type === SUGGESTION_TYPES.INDICATOR) return indicatorProposedSnapshot(item, row);
  if (row.suggestion_type === SUGGESTION_TYPES.TARGET) return targetProposedSnapshot(item, row, Boolean(opts.overwrite_target));
  return fullItemSnapshotForRollback(item);
}

function countMismatchBuckets(engineOut) {
  const { classifyGovernance } = require("./renjaGovernanceSeverityService");
  const rows = (engineOut?.results || []).map((r) => classifyGovernance(r));
  const blocker = rows.filter((x) => x.severity_final === "BLOCKER").length;
  const warning = rows.filter((x) => x.severity_final === "WARNING").length;
  const policyBroken = rows.filter(
    (x) => x.mismatch_scope === "item" && POLICY_ALIGNMENT_CODES.has(String(x.mismatch_code || "")),
  ).length;
  return { blocker, warning, policyBroken, total: rows.length };
}

function readinessChangeLabel(beforeReady, afterReady) {
  const b = Boolean(beforeReady?.readiness?.ready_for_publish);
  const a = Boolean(afterReady?.readiness?.ready_for_publish);
  if (!b && a) return "BLOCKED_TO_READY";
  if (b && !a) return "READY_TO_BLOCKED";
  return "NO_CHANGE";
}

async function writeDataFixAudit(db, payload, transaction = null) {
  const { RenjaDataFixAuditLog } = db;
  if (!RenjaDataFixAuditLog) return null;
  return RenjaDataFixAuditLog.create(
    {
      renja_dokumen_id: Number(payload.renja_dokumen_id),
      batch_id: payload.batch_id || null,
      user_id: payload.user_id || null,
      action_type: payload.action_type,
      change_reason_text: payload.change_reason_text || null,
      suggestion_type: payload.suggestion_type || null,
      before_snapshot_json: payload.before_snapshot_json || null,
      after_snapshot_json: payload.after_snapshot_json || null,
      meta_json: payload.meta_json || null,
    },
    { transaction },
  );
}

async function resolveSuggestionRowsForApply(db, renjaDokumenId, opts = {}) {
  const { RenjaMappingSuggestionResult } = db;
  const suggestionType = opts.suggestion_type ?? null;
  const ids = Array.isArray(opts.suggestion_ids) ? opts.suggestion_ids.map(Number).filter(Boolean) : [];
  const applyHighOnly = Boolean(opts.apply_high_confidence_only);

  const where = {
    renja_dokumen_id: Number(renjaDokumenId),
    is_accepted: { [Op.is]: null },
    ...(suggestionType ? { suggestion_type: suggestionType } : {}),
  };
  if (ids.length) where.id = { [Op.in]: ids };

  const rows = await RenjaMappingSuggestionResult.findAll({
    where,
    order: [
      ["suggestion_score", "DESC"],
      ["id", "ASC"],
    ],
    transaction: opts.transaction || null,
  });
  const selected = applyHighOnly ? selectAutoApplicableSuggestions(rows) : rows;
  return { rows, selected };
}

async function computeDataQualityScore(db, renjaDokumenId, opts = {}) {
  const { RenjaItem } = db;
  const docId = Number(renjaDokumenId);
  const summary = await getDataFixSummary(db, docId, opts);
  const total_items = await RenjaItem.count({
    where: { renja_dokumen_id: docId },
    ...(opts.transaction ? { transaction: opts.transaction } : {}),
  });
  const t = Math.max(1, total_items);
  const unmappedProg = Number(summary.unmapped_program_items || 0);
  const unmappedInd = Number(summary.unmapped_indicators || 0);
  const emptyTgt = Number(summary.empty_targets || 0);
  const pol = Number(summary.policy_conflicts || 0);
  const manual = Number(summary.manual_review_needed || 0);
  const denomSug = Math.max(1, Number(summary.high_confidence_suggestions || 0) + manual);

  const penalties = {
    unmapped_program_pct: Math.min(40, (unmappedProg / t) * 50),
    unmapped_indicator_pct: Math.min(25, (unmappedInd / t) * 35),
    empty_target_pct: Math.min(20, (emptyTgt / t) * 25),
    policy_conflict_pts: Math.min(15, pol * 3),
    manual_review_pts: Math.min(10, (manual / denomSug) * 10),
  };
  const totalPenalty = Math.min(
    100,
    penalties.unmapped_program_pct +
      penalties.unmapped_indicator_pct +
      penalties.empty_target_pct +
      penalties.policy_conflict_pts +
      penalties.manual_review_pts,
  );
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  const mapping_score = Math.max(0, Math.min(100, Math.round(100 - penalties.unmapped_program_pct * 2)));
  const indicator_score = Math.max(0, Math.min(100, Math.round(100 - penalties.unmapped_indicator_pct * 2)));
  const target_score = Math.max(0, Math.min(100, Math.round(100 - penalties.empty_target_pct * 2)));
  const policy_chain_score = Math.max(0, Math.min(100, Math.round(100 - penalties.policy_conflict_pts * 3)));

  let category = "CRITICAL";
  if (score >= 90) category = "EXCELLENT";
  else if (score >= 75) category = "GOOD";
  else if (score >= 50) category = "NEEDS_IMPROVEMENT";

  return {
    score,
    category,
    dimension_scores: {
      mapping: mapping_score,
      indicator: indicator_score,
      target: target_score,
      policy_chain: policy_chain_score,
    },
    total_items,
    summary_inputs: {
      unmapped_program_items: unmappedProg,
      unmapped_indicators: unmappedInd,
      empty_targets: emptyTgt,
      policy_conflicts: pol,
      manual_review_needed: manual,
      high_confidence_suggestions: Number(summary.high_confidence_suggestions || 0),
    },
    breakdown: { penalties, total_penalty_raw: Number(totalPenalty.toFixed(4)) },
  };
}

async function buildDataFixPreviewRows(db, renjaDokumenId, opts = {}) {
  const { RenjaItem } = db;
  const { selected } = await resolveSuggestionRowsForApply(db, renjaDokumenId, opts);
  const previews = [];
  const item_stamps = {};
  let skipped_count = 0;
  for (const row of selected) {
    if (!row.renja_item_id) {
      skipped_count += 1;
      previews.push({ suggestion_result_id: row.id, skipped: true, reason: "no_renja_item_id" });
      continue;
    }
    const item = await RenjaItem.findByPk(row.renja_item_id);
    if (!item) {
      skipped_count += 1;
      previews.push({ suggestion_result_id: row.id, renja_item_id: row.renja_item_id, skipped: true, reason: "item_not_found" });
      continue;
    }
    const stamp = itemUpdatedAtIso(item);
    item_stamps[String(row.renja_item_id)] = stamp;
    const before = fullItemSnapshotForRollback(item);
    const after = proposedSnapshotForRow(item, row, opts);
    const would_change = JSON.stringify(before) !== JSON.stringify(after);
    previews.push({
      suggestion_result_id: row.id,
      renja_item_id: item.id,
      suggestion_type: row.suggestion_type,
      suggestion_confidence: row.suggestion_confidence,
      is_conflict: Boolean(row.is_conflict),
      before,
      after,
      would_change,
    });
  }
  return { previews, item_stamps, skipped_count, selected_count: selected.length };
}

async function previewMappingApply(db, renjaDokumenId, opts = {}) {
  const dry = await buildDataFixPreviewRows(db, renjaDokumenId, {
    ...opts,
    suggestion_type: SUGGESTION_TYPES.MAPPING,
  });
  const would_change_count = dry.previews.filter((x) => x.would_change).length;
  const data_quality = await computeDataQualityScore(db, renjaDokumenId);

  return {
    renja_dokumen_id: Number(renjaDokumenId),
    suggestion_type: SUGGESTION_TYPES.MAPPING,
    preview_count: dry.previews.length,
    would_change_count,
    skipped_count: dry.skipped_count,
    unchanged_count: dry.previews.length - would_change_count - dry.skipped_count,
    previews: dry.previews,
    item_stamps: dry.item_stamps,
    data_quality,
  };
}

async function previewDataFixImpact(db, renjaDokumenId, opts = {}) {
  const suggestionType = opts.suggestion_type;
  if (!suggestionType) {
    const err = new Error("suggestion_type wajib untuk preview dampak.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const mismatchSvc = require("./renjaMismatchEngineService");
  const readinessSvc = require("./renjaDocumentReadinessService");
  const { sequelize } = db;

  const dry = await buildDataFixPreviewRows(db, renjaDokumenId, { ...opts, suggestion_type: suggestionType });
  const qualityBefore = await computeDataQualityScore(db, renjaDokumenId);

  const trx = await sequelize.transaction();
  try {
    const mmBefore = await mismatchSvc.computeMismatchForDokumen(db, renjaDokumenId, { transaction: trx });
    const readyBefore = await readinessSvc.evaluateReadiness(db, renjaDokumenId, "publish", { transaction: trx });
    const qualityBeforeTx = await computeDataQualityScore(db, renjaDokumenId, { transaction: trx });
    const bkt = countMismatchBuckets(mmBefore);

    const { selected } = await resolveSuggestionRowsForApply(db, renjaDokumenId, {
      ...opts,
      suggestion_type: suggestionType,
      transaction: trx,
    });

    for (const row of selected) {
      if (row.is_conflict && opts.apply_high_confidence_only) continue;
      await applySuggestionToItem(db, row, opts, trx);
    }

    const mmAfter = await mismatchSvc.computeMismatchForDokumen(db, renjaDokumenId, { transaction: trx });
    const readyAfter = await readinessSvc.evaluateReadiness(db, renjaDokumenId, "publish", { transaction: trx });
    const qualityAfterTx = await computeDataQualityScore(db, renjaDokumenId, { transaction: trx });
    const akt = countMismatchBuckets(mmAfter);

    const impact = {
      blocker_reduction: Math.max(0, bkt.blocker - akt.blocker),
      warning_reduction: Math.max(0, bkt.warning - akt.warning),
      policy_chain_fixed: Math.max(0, bkt.policyBroken - akt.policyBroken),
      readiness_change: readinessChangeLabel(readyBefore, readyAfter),
      quality_score_before: qualityBeforeTx.score,
      quality_score_after: qualityAfterTx.score,
    };

    await trx.rollback();

    const would_change_count = dry.previews.filter((x) => x.would_change).length;
    return {
      renja_dokumen_id: Number(renjaDokumenId),
      suggestion_type: suggestionType,
      preview_count: dry.previews.length,
      would_change_count,
      skipped_count: dry.skipped_count,
      unchanged_count: dry.previews.length - would_change_count - dry.skipped_count,
      impact,
      aggregate: impact,
      previews: dry.previews,
      item_stamps: dry.item_stamps,
      data_quality: qualityBefore,
    };
  } catch (e) {
    await trx.rollback();
    throw e;
  }
}

async function listDataFixBatchHistory(db, renjaDokumenId, opts = {}) {
  const { RenjaMappingApplyBatch } = db;
  if (!RenjaMappingApplyBatch) return [];
  const where = { renja_dokumen_id: Number(renjaDokumenId) };
  if (opts.active_only) where.rolled_back_at = { [Op.is]: null };
  if (opts.change_type) where.change_type = String(opts.change_type);
  if (opts.rollback_status) where.rollback_status = String(opts.rollback_status);
  if (opts.applied_by) where.applied_by = Number(opts.applied_by);
  const appliedAt = {};
  if (opts.date_from) appliedAt[Op.gte] = new Date(opts.date_from);
  if (opts.date_to) appliedAt[Op.lte] = new Date(opts.date_to);
  if (Object.keys(appliedAt).length) where.applied_at = appliedAt;
  const lim = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const rows = await RenjaMappingApplyBatch.findAll({
    where,
    order: [["applied_at", "DESC"]],
    limit: lim,
  });
  return rows.map((r) => {
    const plain = r.get({ plain: true });
    const items = Array.isArray(plain.items_json) ? plain.items_json : [];
    return {
      id: plain.id,
      change_type: plain.change_type || changeTypeFromSuggestionType(plain.suggestion_type),
      suggestion_type: plain.suggestion_type,
      apply_scope: plain.apply_scope || null,
      rollback_status: plain.rollback_status || (plain.rolled_back_at ? "rolled_back" : "pending"),
      applied_at: plain.applied_at,
      applied_by: plain.applied_by,
      items_count: items.length,
      rolled_back_at: plain.rolled_back_at,
      rolled_back_by: plain.rolled_back_by,
      change_reason_text: plain.change_reason_text,
      rollback_reason_text: plain.rollback_reason_text,
      version_before: plain.version_before ?? null,
      version_after: plain.version_after ?? null,
    };
  });
}

async function listMappingApplyBatches(db, renjaDokumenId, opts = {}) {
  return listDataFixBatchHistory(db, renjaDokumenId, opts);
}

async function getDataFixBatchDetail(db, renjaDokumenId, batchId) {
  const { RenjaMappingApplyBatch } = db;
  if (!RenjaMappingApplyBatch) return null;
  const row = await RenjaMappingApplyBatch.findOne({
    where: { id: Number(batchId), renja_dokumen_id: Number(renjaDokumenId) },
  });
  if (!row) return null;
  return row.get({ plain: true });
}

async function acquireDataFixDocLock(db, renjaDokumenId, userId, opts = {}) {
  const { RenjaDataFixDocLock, sequelize } = db;
  if (!RenjaDataFixDocLock) {
    return { acquired: true, noop: true, message: "Lock table not migrated." };
  }
  const ttlMin = Math.min(Math.max(Number(opts.ttl_minutes) || 15, 5), 120);
  const docId = Number(renjaDokumenId);
  const uid = Number(userId);
  const exp = new Date(Date.now() + ttlMin * 60 * 1000);
  return sequelize.transaction(async (t) => {
    const cur = await RenjaDataFixDocLock.findByPk(docId, { transaction: t, lock: t.LOCK.UPDATE });
    if (cur && new Date(cur.lock_expires_at) > new Date() && Number(cur.user_id) !== uid) {
      const err = new Error("DATA_FIX_DOC_LOCKED");
      err.code = "DATA_FIX_DOC_LOCKED";
      err.httpStatus = 423;
      err.meta = { locked_by_user_id: cur.user_id, lock_expires_at: cur.lock_expires_at };
      throw err;
    }
    await RenjaDataFixDocLock.upsert(
      { renja_dokumen_id: docId, user_id: uid, lock_expires_at: exp, updated_at: new Date() },
      { transaction: t },
    );
    return { acquired: true, lock_expires_at: exp };
  });
}

async function releaseDataFixDocLock(db, renjaDokumenId, userId) {
  const { RenjaDataFixDocLock } = db;
  if (!RenjaDataFixDocLock) return { released: true, noop: true };
  const docId = Number(renjaDokumenId);
  const uid = Number(userId);
  const cur = await RenjaDataFixDocLock.findByPk(docId);
  if (!cur) return { released: true };
  if (Number(cur.user_id) !== uid) {
    const err = new Error("DATA_FIX_LOCK_NOT_OWNER");
    err.code = "DATA_FIX_LOCK_NOT_OWNER";
    err.httpStatus = 403;
    throw err;
  }
  await RenjaDataFixDocLock.destroy({ where: { renja_dokumen_id: docId } });
  return { released: true };
}

async function getDataFixDocLock(db, renjaDokumenId) {
  const { RenjaDataFixDocLock } = db;
  if (!RenjaDataFixDocLock) return null;
  const cur = await RenjaDataFixDocLock.findByPk(Number(renjaDokumenId));
  if (!cur) return null;
  const plain = cur.get({ plain: true });
  if (new Date(plain.lock_expires_at) <= new Date()) return { ...plain, expired: true };
  return plain;
}

function assertItemStampForApply(itemPre, expectMap, itemId) {
  if (!expectMap || itemId == null) return;
  const ex = expectMap[String(itemId)];
  if (!ex) return;
  const cur = itemUpdatedAtIso(itemPre);
  if (cur !== ex) {
    const err = new Error("DATA_CHANGED_SINCE_PREVIEW");
    err.code = "DATA_CHANGED_SINCE_PREVIEW";
    err.httpStatus = 409;
    throw err;
  }
}

async function rollbackMappingBatch(db, renjaDokumenId, batchId, actorId, opts = {}) {
  const { RenjaMappingApplyBatch, RenjaItem, RenjaMappingSuggestionResult, sequelize } = db;
  if (!RenjaMappingApplyBatch) {
    throw new Error("ROLLBACK_UNSUPPORTED: tabel renja_mapping_apply_batch belum dimigrasi.");
  }
  const docId = Number(renjaDokumenId);
  const bid = Number(batchId);
  const batch = await RenjaMappingApplyBatch.findOne({ where: { id: bid, renja_dokumen_id: docId } });
  if (!batch) throw new Error("ROLLBACK_BATCH_NOT_FOUND");
  if (batch.rolled_back_at) throw new Error("ROLLBACK_BATCH_ALREADY_ROLLED_BACK");
  const itemsJson = Array.isArray(batch.items_json) ? batch.items_json : [];
  if (!itemsJson.length) throw new Error("ROLLBACK_BATCH_EMPTY");

  const reason = String(opts.change_reason_text || opts.rollback_reason_text || "").trim().slice(0, 4000) || null;

  const dirty = [];
  const t = await sequelize.transaction();
  try {
    for (const entry of itemsJson) {
      const itemId = Number(entry.renja_item_id);
      const curItem = await RenjaItem.findByPk(itemId, { transaction: t });
      if (!curItem) continue;
      const expectedAfter = entry.item_updated_at_after || null;
      if (expectedAfter && itemUpdatedAtIso(curItem) !== expectedAfter) {
        dirty.push(itemId);
      }
    }
    if (dirty.length && !opts.force_partial_rollback) {
      const err = new Error("ROLLBACK_ITEM_CHANGED");
      err.code = "ROLLBACK_ITEM_CHANGED";
      err.httpStatus = 409;
      err.meta = { dirty_item_ids: dirty };
      await t.rollback();
      throw err;
    }

    let restored = 0;
    for (const entry of itemsJson) {
      const itemId = Number(entry.renja_item_id);
      const before = entry.before || {};
      const curItem = await RenjaItem.findByPk(itemId, { transaction: t });
      if (!curItem) continue;
      const expectedAfter = entry.item_updated_at_after || null;
      if (expectedAfter && itemUpdatedAtIso(curItem) !== expectedAfter) {
        continue;
      }
      await RenjaItem.update(
        {
          program_id: before.program_id ?? null,
          source_renstra_program_id: before.source_renstra_program_id ?? null,
          source_renstra_kegiatan_id: before.source_renstra_kegiatan_id ?? null,
          source_renstra_subkegiatan_id: before.source_renstra_subkegiatan_id ?? null,
          source_indikator_renstra_id: before.source_indikator_renstra_id ?? null,
          target_numerik: before.target_numerik ?? null,
          target_teks: before.target_teks ?? null,
          satuan: before.satuan ?? null,
        },
        { where: { id: itemId, renja_dokumen_id: docId }, transaction: t },
      );
      restored += 1;
      if (entry.suggestion_result_id) {
        await RenjaMappingSuggestionResult.update(
          {
            is_accepted: null,
            accepted_by: null,
            accepted_at: null,
            is_auto_applied: false,
            applied_by: null,
            applied_at: null,
          },
          { where: { id: Number(entry.suggestion_result_id), renja_dokumen_id: docId }, transaction: t },
        );
      }
    }

    const rollbackStatus =
      dirty.length && opts.force_partial_rollback ? "partial" : "rolled_back";

    await batch.update(
      {
        rolled_back_at: new Date(),
        rolled_back_by: actorId || null,
        rollback_reason_text: reason,
        rollback_status: rollbackStatus,
      },
      { transaction: t },
    );

    await writeDataFixAudit(
      db,
      {
        renja_dokumen_id: docId,
        batch_id: bid,
        user_id: actorId,
        action_type: "rollback",
        change_reason_text: reason,
        suggestion_type: batch.suggestion_type,
        before_snapshot_json: { items: itemsJson.length, dirty },
        after_snapshot_json: { restored_count: restored, rollback_status: rollbackStatus },
      },
      t,
    );

    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }

  const recompute = await recomputeAfterApply(db, renjaDokumenId, actorId);
  return {
    batch_id: bid,
    restored_items: itemsJson.length,
    recompute,
    rollback_status: dirty.length && opts.force_partial_rollback ? "partial" : "rolled_back",
    skipped_due_to_concurrent_edit: dirty,
  };
}

async function applySuggestionToItem(db, row, opts = {}, transaction = null) {
  const { RenjaItem } = db;
  const overwrite = Boolean(opts.overwrite_target);
  if (!row.renja_item_id) return { applied: false, reason: "No renja_item_id" };
  const item = await RenjaItem.findByPk(row.renja_item_id, { transaction });
  if (!item) return { applied: false, reason: "Renja item not found" };

  if (row.suggestion_type === SUGGESTION_TYPES.MAPPING) {
    await item.update(
      {
        program_id: row.suggested_program_id || item.program_id,
        source_renstra_program_id: row.suggested_source_renstra_program_id || item.source_renstra_program_id,
        source_renstra_kegiatan_id: row.suggested_source_renstra_kegiatan_id || item.source_renstra_kegiatan_id,
        source_renstra_subkegiatan_id:
          row.suggested_source_renstra_subkegiatan_id || item.source_renstra_subkegiatan_id,
      },
      { transaction },
    );
    return { applied: true };
  }

  if (row.suggestion_type === SUGGESTION_TYPES.INDICATOR) {
    await item.update(
      {
        source_indikator_renstra_id:
          row.suggested_source_indikator_renstra_id || item.source_indikator_renstra_id,
        satuan: item.satuan || row.suggested_satuan || item.satuan,
      },
      { transaction },
    );
    return { applied: true };
  }

  if (row.suggestion_type === SUGGESTION_TYPES.TARGET) {
    const hasTarget =
      item.target_numerik !== null && item.target_numerik !== undefined && String(item.target_numerik).trim() !== "";
    if (hasTarget && !overwrite) {
      return { applied: false, reason: "Target already exists; overwrite false." };
    }
    await item.update(
      {
        target_numerik:
          row.suggested_target_numerik !== null && row.suggested_target_numerik !== undefined
            ? row.suggested_target_numerik
            : item.target_numerik,
        target_teks: row.suggested_target_teks || item.target_teks,
        satuan: item.satuan || row.suggested_satuan || item.satuan,
      },
      { transaction },
    );
    return { applied: true };
  }

  if (row.suggestion_type === SUGGESTION_TYPES.POLICY) {
    return { applied: true };
  }

  return { applied: false, reason: "Unknown suggestion type." };
}

function selectAutoApplicableSuggestions(rows = []) {
  return rows.filter(
    (x) =>
      String(x.suggestion_confidence || "").toUpperCase() === "HIGH" &&
      !x.is_conflict &&
      x.is_accepted === null,
  );
}

async function recomputeAfterApply(db, renjaDokumenId, actorId) {
  const mismatchSvc = require("./renjaMismatchEngineService");
  const readinessSvc = require("./renjaDocumentReadinessService");
  const output = await mismatchSvc.computeMismatchForDokumen(db, renjaDokumenId);
  const run = await mismatchSvc.persistMismatchResults(db, renjaDokumenId, output, "data_fix_apply", actorId || null);
  const readiness = await readinessSvc.evaluateReadiness(db, renjaDokumenId, "publish");
  return {
    mismatch_run_id: run.id,
    mismatch_summary: run.summary_json || null,
    readiness_summary: readiness.summary,
    readiness: readiness.readiness,
  };
}

async function applySuggestions(db, renjaDokumenId, actorId, opts = {}) {
  const { sequelize, RenjaMappingSuggestionResult, RenjaItem, RenjaMappingApplyBatch, RenjaDokumen } = db;
  const suggestionType = opts.suggestion_type || null;
  const applyHighOnly = Boolean(opts.apply_high_confidence_only);
  const expectStamps = opts.expect_item_stamps || null;

  const t = await sequelize.transaction();
  try {
    const docRow = await RenjaDokumen.findByPk(Number(renjaDokumenId), { transaction: t });
    const version_before = docRow?.updated_at ? new Date(docRow.updated_at).getTime() : null;

    const { selected } = await resolveSuggestionRowsForApply(db, renjaDokumenId, {
      ...opts,
      suggestion_type: suggestionType,
      transaction: t,
    });

    let appliedCount = 0;
    let skippedCount = 0;
    const logs = [];
    const batchItems = [];

    if (opts.require_data_fix_lock_owner && db.RenjaDataFixDocLock) {
      const lk = await db.RenjaDataFixDocLock.findByPk(Number(renjaDokumenId), { transaction: t });
      if (lk && new Date(lk.lock_expires_at) > new Date() && Number(lk.user_id) !== Number(actorId)) {
        const err = new Error("DATA_FIX_DOC_LOCKED");
        err.code = "DATA_FIX_DOC_LOCKED";
        err.httpStatus = 423;
        throw err;
      }
    }

    for (const row of selected) {
      if (row.is_conflict && applyHighOnly) {
        skippedCount += 1;
        logs.push({ id: row.id, applied: false, reason: "conflict" });
        continue;
      }
      if (!row.renja_item_id) {
        skippedCount += 1;
        logs.push({ id: row.id, applied: false, reason: "no_renja_item_id" });
        continue;
      }
      const itemPre = await RenjaItem.findByPk(row.renja_item_id, { transaction: t });
      if (!itemPre) {
        skippedCount += 1;
        logs.push({ id: row.id, applied: false, reason: "Renja item not found" });
        continue;
      }
      assertItemStampForApply(itemPre, expectStamps, row.renja_item_id);
      const beforeSnap = fullItemSnapshotForRollback(itemPre);
      const item_updated_at_before = itemUpdatedAtIso(itemPre);

      const result = await applySuggestionToItem(db, row, opts, t);
      if (result.applied) {
        appliedCount += 1;
        const itemPost = await RenjaItem.findByPk(row.renja_item_id, { transaction: t });
        const afterSnap = fullItemSnapshotForRollback(itemPost);
        const item_updated_at_after = itemUpdatedAtIso(itemPost);
        batchItems.push({
          renja_item_id: row.renja_item_id,
          suggestion_result_id: row.id,
          before: beforeSnap,
          after: afterSnap,
          item_updated_at_before,
          item_updated_at_after,
        });
        await markSuggestionAccepted(RenjaMappingSuggestionResult, row, actorId, t);
      } else {
        skippedCount += 1;
      }
      logs.push({ id: row.id, ...result });
    }

    let rollback_batch_id = null;
    if (RenjaMappingApplyBatch && suggestionType && batchItems.length > 0) {
      const docAfter = await RenjaDokumen.findByPk(Number(renjaDokumenId), { transaction: t });
      const version_after = docAfter?.updated_at ? new Date(docAfter.updated_at).getTime() : Date.now();
      const batch = await RenjaMappingApplyBatch.create(
        {
          renja_dokumen_id: Number(renjaDokumenId),
          suggestion_type: suggestionType,
          change_type: changeTypeFromSuggestionType(suggestionType),
          items_json: batchItems,
          items_before_json: batchItems.map((x) => ({
            renja_item_id: x.renja_item_id,
            suggestion_result_id: x.suggestion_result_id,
            snapshot: x.before,
          })),
          items_after_json: batchItems.map((x) => ({
            renja_item_id: x.renja_item_id,
            suggestion_result_id: x.suggestion_result_id,
            snapshot: x.after,
          })),
          apply_scope: selected.length === 1 ? "single" : "bulk",
          affected_fields_json: affectedFieldsForSuggestionType(suggestionType),
          rollback_status: "pending",
          version_before,
          version_after,
          change_reason_text: String(opts.change_reason_text || "").trim().slice(0, 4000) || null,
          applied_by: actorId || null,
          applied_at: new Date(),
        },
        { transaction: t },
      );
      rollback_batch_id = batch.id;
      await writeDataFixAudit(
        db,
        {
          renja_dokumen_id: Number(renjaDokumenId),
          batch_id: batch.id,
          user_id: actorId,
          action_type: "apply",
          change_reason_text: opts.change_reason_text || null,
          suggestion_type: suggestionType,
          before_snapshot_json: { version_before, items: batchItems.length },
          after_snapshot_json: { version_after, rollback_batch_id: batch.id },
        },
        t,
      );
    }

    await t.commit();

    const recompute = await recomputeAfterApply(db, renjaDokumenId, actorId);
    return {
      selected_count: selected.length,
      applied_count: appliedCount,
      skipped_count: skippedCount,
      logs,
      recompute,
      rollback_batch_id,
    };
  } catch (e) {
    await t.rollback();
    await writeDataFixAudit(db, {
      renja_dokumen_id: Number(renjaDokumenId),
      user_id: actorId,
      action_type: "apply_failed",
      change_reason_text: opts.change_reason_text || null,
      suggestion_type: suggestionType,
      meta_json: { error: String(e.message || e), code: e.code || null },
    }).catch(() => {});
    throw e;
  }
}

async function applyAllHighConfidence(db, renjaDokumenId, actorId, opts = {}) {
  const types = [
    SUGGESTION_TYPES.MAPPING,
    SUGGESTION_TYPES.INDICATOR,
    SUGGESTION_TYPES.TARGET,
    SUGGESTION_TYPES.POLICY,
  ];
  const output = [];
  for (const t of types) {
    const result = await applySuggestions(db, renjaDokumenId, actorId, {
      suggestion_type: t,
      apply_high_confidence_only: true,
      overwrite_target: Boolean(opts.overwrite_target),
      change_reason_text: opts.change_reason_text || null,
      expect_item_stamps: opts.expect_item_stamps || null,
      require_data_fix_lock_owner: Boolean(opts.require_data_fix_lock_owner),
    });
    output.push({ suggestion_type: t, ...result });
  }
  return {
    per_type: output,
    total_applied: output.reduce((a, x) => a + Number(x.applied_count || 0), 0),
    total_skipped: output.reduce((a, x) => a + Number(x.skipped_count || 0), 0),
    recompute: output.length ? output[output.length - 1].recompute : null,
  };
}

module.exports = {
  SUGGESTION_TYPES,
  CHANGE_TYPE,
  changeTypeFromSuggestionType,
  affectedFieldsForSuggestionType,
  mapRunTypeFromSuggestionType,
  selectAutoApplicableSuggestions,
  getDataFixSummary,
  getSuggestionsByType,
  generateMappingSuggestions,
  generateIndicatorSuggestions,
  generateTargetSuggestions,
  generatePolicyConflictSuggestions,
  applySuggestions,
  applyAllHighConfidence,
  mappingSnapshotFromItem,
  mappingProposedSnapshot,
  fullItemSnapshotForRollback,
  proposedSnapshotForRow,
  computeDataQualityScore,
  previewMappingApply,
  previewDataFixImpact,
  buildDataFixPreviewRows,
  listMappingApplyBatches,
  listDataFixBatchHistory,
  getDataFixBatchDetail,
  rollbackMappingBatch,
  acquireDataFixDocLock,
  releaseDataFixDocLock,
  getDataFixDocLock,
};
