"use strict";

const { Op } = require("sequelize");
const { detectDuplicateItems } = require("./renjaDuplicateDetectorService");
const { validateHierarchy } = require("../validators/renjaHierarchyValidator");
const crossDocSvc = require("./renjaCrossDocumentValidationService");
const policySvc = require("./renjaPolicyAlignmentService");
const thresholdSvc = require("./renjaThresholdMismatchService");
const { classifyGovernance, enrichRuleRegistry } = require("./renjaGovernanceSeverityService");

const RENJA_ITEM_RULES = [
  { code: "RENSTRA_ITEM_NOT_FOUND", description: "Item RENJA tidak punya padanan RENSTRA", severity: "warning", is_blocking: false, scope: "item", source_type: "RENSTRA" },
  { code: "RKPD_ITEM_NOT_FOUND", description: "Item RENJA tidak punya padanan RKPD", severity: "warning", is_blocking: false, scope: "item", source_type: "RKPD" },
  { code: "INVALID_PARENT_CHILD", description: "Relasi parent-child item tidak valid", severity: "error", is_blocking: true, scope: "item", source_type: "INTERNAL" },
  { code: "DUPLICATE_ITEM", description: "Duplikasi item", severity: "error", is_blocking: true, scope: "item", source_type: "INTERNAL" },
  { code: "CODE_CHANGED", description: "Kode item berubah dari sumber", severity: "warning", is_blocking: false, scope: "item", source_type: "RENSTRA" },
  { code: "NAME_CHANGED", description: "Nama item berubah dari sumber", severity: "warning", is_blocking: false, scope: "item", source_type: "RENSTRA" },
  { code: "MANUAL_OVERRIDE", description: "Item memakai source mode MANUAL", severity: "info", is_blocking: false, scope: "item", source_type: "INTERNAL" },
];

function buildNavigationMeta({ renjaDokumenId, scope = "item", code, relatedItemId = null, sectionKey = null }) {
  if (scope === "item" && relatedItemId) {
    const anchor = `item-${relatedItemId}`;
    return {
      suggested_route: `/dashboard-renja/v2/dokumen/${renjaDokumenId}/rencana-kerja?item=${relatedItemId}&focus=${anchor}`,
      suggested_anchor: anchor,
      section_key: "rencana_kerja",
      row_key: anchor,
      editor_target: "item_row",
    };
  }
  const sectionByCode = {
    MISSING_REQUIRED_SECTION: sectionKey || "pendahuluan",
    BAB4_ITEM_EMPTY: "rencana_kerja",
    DOCUMENT_NOT_READY_FOR_PUBLISH: "penutup",
    DOCUMENT_NOT_READY_FOR_SUBMIT: "pendahuluan",
  };
  const resolvedSection = sectionKey || sectionByCode[code] || "pendahuluan";
  return {
    suggested_route: `/dashboard-renja/v2/dokumen/${renjaDokumenId}/${resolvedSection}`,
    suggested_anchor: resolvedSection,
    section_key: resolvedSection,
    row_key: null,
    editor_target: scope === "section" ? "section_editor" : "document_header",
  };
}

function mk({
  renjaDokumenId,
  severity = "warning",
  scope = "item",
  sourceType = "INTERNAL",
  code,
  message,
  recommendation = null,
  renjaItem = null,
  sourceRefType = null,
  sourceRefId = null,
  fieldName = null,
  expected = null,
  actual = null,
  blocking = false,
  sectionKey = null,
  hierarchyTrace = null,
  expectedSourceTrace = null,
  thresholdContext = null,
  hierarchyLevel = null,
  documentPair = null,
}) {
  const nav = buildNavigationMeta({
    renjaDokumenId,
    scope,
    code,
    relatedItemId: renjaItem?.id || null,
    sectionKey,
  });
  const governed = classifyGovernance({
    mismatch_code: code,
    severity,
    is_blocking: blocking,
  });
  return {
    severity,
    severity_final: governed.severity_final,
    governance_level: governed.governance_level,
    mismatch_scope: scope,
    source_type: sourceType,
    mismatch_code: code,
    mismatch_label: code,
    message,
    recommendation: recommendation || "Tinjau data sumber dan lakukan sinkronisasi.",
    related_item_id: renjaItem?.id || null,
    related_source_id: sourceRefId,
    field_name: fieldName,
    old_value: expected == null ? null : String(expected),
    new_value: actual == null ? null : String(actual),
    source_reference_type: sourceRefType,
    source_reference_id: sourceRefId,
    expected_value: expected == null ? null : String(expected),
    actual_value: actual == null ? null : String(actual),
    is_blocking: governed.is_blocking,
    computed_at: new Date(),
    hierarchy_trace: hierarchyTrace,
    expected_source_trace: expectedSourceTrace,
    threshold_context: thresholdContext,
    hierarchy_level: hierarchyLevel || (scope === "document" ? "document" : "sub_kegiatan"),
    document_pair: documentPair || `${sourceType}-RENJA`,
    ...nav,
  };
}

function normalizeText(x) {
  return String(x || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function groupMismatchResults(rows = []) {
  const countBy = (key) => {
    const map = new Map();
    for (const r of rows) {
      const k = String(r?.[key] || "UNKNOWN");
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  };
  return {
    grouped_by_source: countBy("source_type"),
    grouped_by_hierarchy_level: countBy("hierarchy_level"),
    grouped_by_document_pair: countBy("document_pair"),
    grouped_by_severity: countBy("severity"),
    grouped_by_governance: countBy("severity_final"),
  };
}

async function computeMismatchForDokumen(db, renjaDokumenId, opts = {}) {
  const {
    RenjaDokumen,
    RenjaItem,
    RenjaDokumenSection,
    RenstraSubkegiatan,
    RkpdItem,
    IndikatorRenstra,
  } = db;

  const tx = opts.transaction || null;
  const qtx = tx ? { transaction: tx } : {};

  const doc = await RenjaDokumen.findByPk(renjaDokumenId, qtx);
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  const [items, sections, matrix] = await Promise.all([
    RenjaItem.findAll({
      where: { renja_dokumen_id: renjaDokumenId },
      order: [["urutan", "ASC"]],
      ...qtx,
    }),
    RenjaDokumenSection.findAll({ where: { renja_dokumen_id: renjaDokumenId }, ...qtx }),
    crossDocSvc.getCrossDocumentComparisonMatrix(db, renjaDokumenId, { transaction: tx }),
  ]);
  const chainEntries = await Promise.all(
    items.map(async (it) => {
      const bySql = await policySvc.getPolicyChainByRenjaItem(db, it.id, { transaction: tx }).catch(() => null);
      const chain =
        bySql || (await policySvc.getPolicyChainByRenjaItemSequelize(db, it.id, { transaction: tx }).catch(() => null));
      return [Number(it.id), chain];
    }),
  );
  const chainByItemId = new Map(chainEntries);
  const indicatorKeyCount = new Map();
  for (const item of items) {
    const key = [
      Number(item.program_id || 0),
      Number(item.kegiatan_id || 0),
      Number(item.sub_kegiatan_id || 0),
      normalizeText(item.indikator),
    ].join("|");
    indicatorKeyCount.set(key, (indicatorKeyCount.get(key) || 0) + 1);
  }
  const cfg = thresholdSvc.resolveThresholdConfig(opts.thresholds || {});
  const results = [];

  if (!doc.renstra_pd_dokumen_id) {
    results.push(
      mk({
        renjaDokumenId,
        scope: "document",
        sourceType: "INTERNAL",
        code: "DOCUMENT_MISSING_RENSTRA",
        message: "Dokumen RENJA belum memilih sumber RENSTRA.",
        blocking: true,
        severity: "error",
        hierarchyLevel: "document",
        documentPair: "RENSTRA-RENJA",
      }),
    );
  }
  if (!doc.rkpd_dokumen_id) {
    results.push(
      mk({
        renjaDokumenId,
        scope: "document",
        sourceType: "INTERNAL",
        code: "DOCUMENT_MISSING_RKPD",
        message: "Dokumen RENJA belum memilih sumber RKPD.",
        blocking: true,
        severity: "error",
        hierarchyLevel: "document",
        documentPair: "RKPD-RENJA",
      }),
    );
  }
  if (sections.length < 5) {
    results.push(
      mk({
        renjaDokumenId,
        scope: "section",
        sourceType: "INTERNAL",
        code: "MISSING_REQUIRED_SECTION",
        message: "BAB wajib RENJA belum lengkap.",
        blocking: true,
        severity: "error",
        sectionKey: "pendahuluan",
        hierarchyLevel: "document",
        documentPair: "INTERNAL",
      }),
    );
  }

  const crossDocResults = crossDocSvc.evaluateCrossDocumentRules(matrix, cfg);
  for (const x of crossDocResults) {
    const item = x.related_item_id ? items.find((it) => Number(it.id) === Number(x.related_item_id)) : null;
    const chain = item ? chainByItemId.get(Number(item.id)) || null : null;
    results.push(
      mk({
        renjaDokumenId,
        severity: x.severity,
        scope: x.mismatch_scope,
        sourceType: x.source_type,
        code: x.mismatch_code,
        message: x.message,
        recommendation: x.recommendation,
        renjaItem: item,
        sourceRefId: x.related_source_id || null,
        fieldName: x.field_name || null,
        expected: x.expected_value || null,
        actual: x.actual_value || null,
        blocking: !!x.is_blocking,
        thresholdContext: x.threshold_context || null,
        hierarchyTrace: chain?.actual || null,
        expectedSourceTrace: chain?.expected || null,
        hierarchyLevel: x.hierarchy_level || null,
        documentPair: x.document_pair || null,
      }),
    );
  }

  const rkpdById = new Map((matrix.rkpd_items || []).map((x) => [Number(x.id), x]));
  const renstraTargetByProgram = matrix.renstra_target_by_program_id || new Map();

  for (const item of items) {
    const mode = String(item.source_mode || "MANUAL").toUpperCase();
    const chain = chainByItemId.get(Number(item.id)) || null;
    const hierarchyIndicators = chain ? await policySvc.getIndicatorsAcrossHierarchy(db, chain).catch(() => null) : null;
    const indicatorText = String(item.indikator || "").trim();
    const hasTarget =
      item.target_numerik != null ||
      item.target != null ||
      (item.target_teks != null && String(item.target_teks).trim() !== "");

    const hierarchyErrors = await validateHierarchy(db, { dokumen: doc, item });
    for (const e of hierarchyErrors) {
      results.push(
        mk({
          renjaDokumenId,
          renjaItem: item,
          severity: e.severity || "error",
          scope: e.mismatch_scope || "item",
          sourceType: e.source_type || "INTERNAL",
          code: e.mismatch_code || "INVALID_PARENT_CHILD",
          message: e.message || "Hierarki item tidak valid.",
          recommendation: e.recommendation || "Perbaiki parent-child item.",
          blocking: !!e.is_blocking,
          fieldName: e.field_name || null,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "INTERNAL",
        }),
      );
    }

    if (item.source_renstra_subkegiatan_id) {
      const renstraSub = await RenstraSubkegiatan.findByPk(item.source_renstra_subkegiatan_id, qtx);
      if (renstraSub) {
        if (item.kode_sub_kegiatan && renstraSub.kode_sub_kegiatan && String(item.kode_sub_kegiatan) !== String(renstraSub.kode_sub_kegiatan)) {
          results.push(
            mk({
              renjaDokumenId,
              sourceType: "RENSTRA",
              code: "CODE_CHANGED",
              message: "Kode sub kegiatan berbeda dengan sumber RENSTRA.",
              renjaItem: item,
              sourceRefType: "RENSTRA_SUBKEGIATAN",
              sourceRefId: renstraSub.id,
              fieldName: "kode_sub_kegiatan",
              expected: renstraSub.kode_sub_kegiatan,
              actual: item.kode_sub_kegiatan,
              hierarchyTrace: chain?.actual || null,
              expectedSourceTrace: chain?.expected || null,
              hierarchyLevel: "sub_kegiatan",
              documentPair: "RENSTRA-RENJA",
            }),
          );
        }
        if (
          item.sub_kegiatan &&
          renstraSub.nama_sub_kegiatan &&
          normalizeText(item.sub_kegiatan) !== normalizeText(renstraSub.nama_sub_kegiatan)
        ) {
          results.push(
            mk({
              renjaDokumenId,
              sourceType: "RENSTRA",
              code: "NAME_CHANGED",
              message: "Nama sub kegiatan berbeda dengan sumber RENSTRA.",
              renjaItem: item,
              sourceRefType: "RENSTRA_SUBKEGIATAN",
              sourceRefId: renstraSub.id,
              fieldName: "sub_kegiatan",
              expected: renstraSub.nama_sub_kegiatan,
              actual: item.sub_kegiatan,
              hierarchyTrace: chain?.actual || null,
              expectedSourceTrace: chain?.expected || null,
              hierarchyLevel: "sub_kegiatan",
              documentPair: "RENSTRA-RENJA",
            }),
          );
        }
      }
    }

    const policyIssues = policySvc.evaluatePolicyAlignment(chain || {});
    for (const p of policyIssues) {
      results.push(
        mk({
          renjaDokumenId,
          severity: p.severity,
          scope: p.mismatch_scope || "item",
          sourceType: p.source_type || "RENSTRA",
          code: p.mismatch_code,
          message: p.message,
          recommendation: p.recommendation,
          renjaItem: item,
          fieldName: p.field_name || null,
          expected: p.expected_value || null,
          actual: p.actual_value || null,
          blocking: !!p.is_blocking,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: p.hierarchy_level || null,
          documentPair: p.document_pair || "RENSTRA-RENJA",
        }),
      );
    }

    const rkpdItem = item.source_rkpd_item_id ? rkpdById.get(Number(item.source_rkpd_item_id)) : null;
    const renstraTargetRef = item.source_renstra_program_id
      ? renstraTargetByProgram.get(Number(item.source_renstra_program_id))
      : null;
    let renstraIndicator = null;
    if (item.source_indikator_renstra_id) {
      const ir = await IndikatorRenstra.findByPk(item.source_indikator_renstra_id, qtx);
      renstraIndicator = ir ? { id: ir.id, nama: ir.nama_indikator } : { id: item.source_indikator_renstra_id, nama: null };
    }
    if (!renstraIndicator && hierarchyIndicators?.expected) {
      const expectedIndicators = Object.values(hierarchyIndicators.expected).flat().filter(Boolean);
      if (expectedIndicators.length) renstraIndicator = { id: null, nama: expectedIndicators[0] };
    }
    const thresholdIssues = thresholdSvc.evaluateThresholdForItem({
      item,
      rkpdItem,
      renstraTarget: renstraTargetRef?.target || null,
      renstraPagu: renstraTargetRef?.pagu || null,
      renstraIndicator,
      cfg,
    });
    for (const t of thresholdIssues) {
      results.push(
        mk({
          renjaDokumenId,
          severity: t.severity,
          scope: "item",
          sourceType: t.source_type,
          code: t.mismatch_code,
          message: t.message,
          recommendation: t.recommendation,
          renjaItem: item,
          fieldName: t.field_name || null,
          expected: t.expected_value || null,
          actual: t.actual_value || null,
          blocking: !!t.is_blocking,
          thresholdContext: t.threshold_context || null,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: t.hierarchy_level || "sub_kegiatan",
          documentPair: t.document_pair || `${t.source_type}-RENJA`,
        }),
      );
    }

    if (!indicatorText) {
      results.push(
        mk({
          renjaDokumenId,
          severity: "error",
          scope: "item",
          sourceType: "INTERNAL",
          code: "INDIKATOR_MISSING",
          message: "Indikator wajib pada item RENJA belum diisi.",
          recommendation: "Isi indikator pada level program/kegiatan/sub kegiatan.",
          renjaItem: item,
          fieldName: "indikator",
          blocking: true,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "INTERNAL",
        }),
      );
    } else if (!hasTarget) {
      results.push(
        mk({
          renjaDokumenId,
          severity: "error",
          scope: "item",
          sourceType: "INTERNAL",
          code: "INDIKATOR_TARGET_MISSING",
          message: "Target indikator item RENJA belum diisi.",
          recommendation: "Isi minimal salah satu target_numerik / target / target_teks.",
          renjaItem: item,
          fieldName: "target_numerik",
          blocking: true,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "INTERNAL",
        }),
      );
    }

    const indicatorDupKey = [
      Number(item.program_id || 0),
      Number(item.kegiatan_id || 0),
      Number(item.sub_kegiatan_id || 0),
      normalizeText(item.indikator),
    ].join("|");
    if (indicatorText && (indicatorKeyCount.get(indicatorDupKey) || 0) > 1) {
      results.push(
        mk({
          renjaDokumenId,
          severity: "warning",
          scope: "item",
          sourceType: "INTERNAL",
          code: "INDIKATOR_DUPLICATE",
          message: "Indikator duplikat pada item dengan hierarki yang sama.",
          recommendation: "Gabungkan item serupa atau bedakan indikator secara eksplisit.",
          renjaItem: item,
          fieldName: "indikator",
          blocking: false,
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "INTERNAL",
        }),
      );
    }

    const expectedIndicators = hierarchyIndicators?.expected
      ? Object.values(hierarchyIndicators.expected).flat().filter((x) => String(x || "").trim() !== "")
      : [];
    if ((mode === "RENSTRA" || mode === "IRISAN") && indicatorText) {
      if (!expectedIndicators.length) {
        results.push(
          mk({
            renjaDokumenId,
            severity: "warning",
            scope: "item",
            sourceType: "RENSTRA",
            code: "INDIKATOR_NOT_TRACEABLE",
            message: "Indikator item tidak dapat ditelusuri ke indikator sumber RENSTRA.",
            recommendation: "Lengkapi referensi indikator RENSTRA atau sinkronisasi ulang.",
            renjaItem: item,
            fieldName: "indikator",
            blocking: false,
            hierarchyTrace: chain?.actual || null,
            expectedSourceTrace: chain?.expected || null,
            hierarchyLevel: "sub_kegiatan",
            documentPair: "RENSTRA-RENJA",
          }),
        );
      } else {
        const normActual = normalizeText(indicatorText);
        const hasExact = expectedIndicators.some((x) => normalizeText(x) === normActual);
        if (!hasExact) {
          let bestSim = 0;
          for (const exp of expectedIndicators) {
            bestSim = Math.max(bestSim, thresholdSvc.diceSimilarity(exp, indicatorText));
          }
          if (bestSim < cfg.indicator_similarity_warning_threshold) {
            results.push(
              mk({
                renjaDokumenId,
                severity: bestSim < cfg.indicator_similarity_error_threshold ? "error" : "warning",
                scope: "item",
                sourceType: "RENSTRA",
                code: "INDIKATOR_INCONSISTENT",
                message: "Indikator item tidak konsisten dengan indikator sumber RENSTRA.",
                recommendation: "Samakan indikator dengan referensi sumber atau beri justifikasi manual override.",
                renjaItem: item,
                fieldName: "indikator",
                expected: expectedIndicators[0],
                actual: indicatorText,
                blocking: bestSim < cfg.indicator_similarity_error_threshold,
                thresholdContext: {
                  metric: "indikator",
                  method: "dice_similarity",
                  best_similarity: Number(bestSim.toFixed(4)),
                  warning_threshold: Number(cfg.indicator_similarity_warning_threshold.toFixed(4)),
                  error_threshold: Number(cfg.indicator_similarity_error_threshold.toFixed(4)),
                },
                hierarchyTrace: chain?.actual || null,
                expectedSourceTrace: chain?.expected || null,
                hierarchyLevel: "sub_kegiatan",
                documentPair: "RENSTRA-RENJA",
              }),
            );
          }
        }
      }
    }

    if (mode === "MANUAL") {
      results.push(
        mk({
          renjaDokumenId,
          sourceType: "INTERNAL",
          code: "MANUAL_OVERRIDE",
          message: "Item menggunakan mode manual override.",
          renjaItem: item,
          blocking: false,
          severity: "info",
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "INTERNAL",
        }),
      );
    }
    if ((mode === "RENSTRA" || mode === "IRISAN") && !item.source_renstra_subkegiatan_id) {
      results.push(
        mk({
          renjaDokumenId,
          sourceType: "RENSTRA",
          code: "RENSTRA_ITEM_NOT_FOUND",
          message: "Item RENJA tidak memiliki padanan valid di RENSTRA.",
          renjaItem: item,
          severity: mode === "IRISAN" ? "error" : "warning",
          blocking: mode === "IRISAN",
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "RENSTRA-RENJA",
        }),
      );
    }
    if ((mode === "RKPD" || mode === "IRISAN") && !item.source_rkpd_item_id) {
      results.push(
        mk({
          renjaDokumenId,
          sourceType: "RKPD",
          code: "RKPD_ITEM_NOT_FOUND",
          message: "Item RENJA tidak memiliki padanan valid di RKPD.",
          renjaItem: item,
          severity: mode === "IRISAN" ? "error" : "warning",
          blocking: mode === "IRISAN",
          hierarchyTrace: chain?.actual || null,
          expectedSourceTrace: chain?.expected || null,
          hierarchyLevel: "sub_kegiatan",
          documentPair: "RKPD-RENJA",
        }),
      );
    }
  }

  const duplicates = detectDuplicateItems(items.map((x) => x.get({ plain: true })));
  for (const dup of duplicates) {
    results.push(
      mk({
        renjaDokumenId,
        sourceType: "INTERNAL",
        code: "DUPLICATE_ITEM",
        message: `Terdeteksi duplikasi business key item (${dup.count} baris).`,
        renjaItem: dup.item,
        blocking: true,
        severity: "error",
        hierarchyLevel: "sub_kegiatan",
        documentPair: "INTERNAL",
      }),
    );
  }

  return {
    rule_sets: {
      RENJA_ITEM_RULES: enrichRuleRegistry(RENJA_ITEM_RULES),
      RENJA_CROSS_DOCUMENT_RULES: crossDocSvc.RENJA_CROSS_DOCUMENT_RULES,
      RENJA_THRESHOLD_RULES: thresholdSvc.RENJA_THRESHOLD_RULES,
      RENJA_POLICY_ALIGNMENT_RULES: policySvc.RENJA_POLICY_ALIGNMENT_RULES,
    },
    threshold_config: cfg,
    results,
    ...groupMismatchResults(results),
  };
}

function hydrateMismatchNavigation(rows = [], renjaDokumenId) {
  return rows.map((r) => {
    const row = r?.get ? r.get({ plain: true }) : r;
    if (row.suggested_route && row.suggested_anchor) return classifyGovernance(row);
    const nav = buildNavigationMeta({
      renjaDokumenId: Number(row.renja_dokumen_id || renjaDokumenId),
      scope: row.mismatch_scope || "document",
      code: row.mismatch_code,
      relatedItemId: row.related_item_id || row.renja_item_id || null,
      sectionKey: row.section_key || null,
    });
    const hydrated = {
      ...row,
      ...nav,
      related_item_id: row.related_item_id || row.renja_item_id || null,
    };
    return classifyGovernance(hydrated);
  });
}

async function persistMismatchResults(db, renjaDokumenId, engineOutput, runType = "full", actorId = null) {
  const { RenjaValidationRun, RenjaMismatchResult, sequelize } = db;
  const t = await sequelize.transaction();
  try {
    const rows = engineOutput.results || [];
    const governedRows = rows.map((r) => classifyGovernance(r));
    const blocker = governedRows.filter((r) => r.severity_final === "BLOCKER").length;
    const warning = governedRows.filter((r) => r.severity_final === "WARNING").length;
    const info = governedRows.filter((r) => r.severity_final === "INFO").length;

    const run = await RenjaValidationRun.create(
      {
        renja_dokumen_id: renjaDokumenId,
        run_type: runType,
        blocking_count: blocker,
        warning_count: warning,
        info_count: info,
        summary_json: {
          total: governedRows.length,
          blocker_count: blocker,
          warning_count: warning,
          info_count: info,
          grouped_scope: {
            document: governedRows.filter((r) => r.mismatch_scope === "document").length,
            section: governedRows.filter((r) => r.mismatch_scope === "section").length,
            item: governedRows.filter((r) => r.mismatch_scope === "item").length,
          },
          grouped_source: groupMismatchResults(governedRows).grouped_by_source,
          grouped_hierarchy_level: groupMismatchResults(governedRows).grouped_by_hierarchy_level,
          grouped_document_pair: groupMismatchResults(governedRows).grouped_by_document_pair,
          grouped_governance: groupMismatchResults(governedRows).grouped_by_governance,
        },
        computed_at: new Date(),
        created_by: actorId,
        created_at: new Date(),
      },
      { transaction: t },
    );

    await RenjaMismatchResult.update(
      { is_resolved: true, resolved_at: new Date(), resolved_by: actorId },
      { where: { renja_dokumen_id: renjaDokumenId, is_resolved: false }, transaction: t },
    );

    if (governedRows.length) {
      await RenjaMismatchResult.bulkCreate(
        governedRows.map((r) => ({
          renja_validation_run_id: run.id,
          renja_dokumen_id: renjaDokumenId,
          renja_item_id: r.related_item_id || null,
          mismatch_scope: r.mismatch_scope,
          source_type: r.source_type || "INTERNAL",
          mismatch_code: r.mismatch_code,
          mismatch_label: r.mismatch_label || r.mismatch_code,
          severity: r.severity,
          message: r.message,
          recommendation: r.recommendation || null,
          field_name: r.field_name || null,
          source_reference_type: r.source_reference_type || null,
          source_reference_id: r.source_reference_id || null,
          expected_value: r.expected_value || r.old_value || null,
          actual_value: r.actual_value || r.new_value || null,
          is_blocking: !!r.is_blocking,
          is_resolved: false,
          resolved_by: null,
          resolved_at: null,
          computed_at: r.computed_at || new Date(),
          suggested_route: r.suggested_route || null,
          suggested_anchor: r.suggested_anchor || null,
          section_key: r.section_key || null,
          row_key: r.row_key || null,
          editor_target: r.editor_target || null,
          hierarchy_trace: r.hierarchy_trace || null,
          expected_source_trace: r.expected_source_trace || null,
          threshold_context: r.threshold_context || null,
          hierarchy_level: r.hierarchy_level || null,
          document_pair: r.document_pair || null,
          created_at: new Date(),
          updated_at: new Date(),
        })),
        { transaction: t },
      );
    }

    await t.commit();
    return run;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  RENJA_ITEM_RULES: enrichRuleRegistry(RENJA_ITEM_RULES),
  RENJA_CROSS_DOCUMENT_RULES: crossDocSvc.RENJA_CROSS_DOCUMENT_RULES,
  RENJA_THRESHOLD_RULES: thresholdSvc.RENJA_THRESHOLD_RULES,
  RENJA_POLICY_ALIGNMENT_RULES: policySvc.RENJA_POLICY_ALIGNMENT_RULES,
  groupMismatchResults,
  computeMismatchForDokumen,
  persistMismatchResults,
  hydrateMismatchNavigation,
};
