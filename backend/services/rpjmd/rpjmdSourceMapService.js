"use strict";

const { RpjmdSourceMap } = require("../../models");
const {
  buildRpjmdSourceTree,
} = require("./rpjmdSourceTreeBuilderService");
const {
  buildRenstraTargetTree,
} = require("./rpjmdTargetTreeBuilderService");

const VALID_TARGET_MODULE = "RENSTRA";
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

const ALL_STAGE_ORDER = [...STRUCTURAL_STAGE_ORDER, ...INDICATOR_STAGE_ORDER];

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function normalizeStructureCode(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/[\s\u00A0]+/g, "").trim();
  return text.length > 0 ? text.toUpperCase() : null;
}

function normalizeTargetModule(value) {
  const moduleValue = normalizeText(value) || VALID_TARGET_MODULE;
  return moduleValue.toUpperCase();
}

function isSupportedStage(stage) {
  return Boolean(getStructuralStageConfig(stage) || getIndicatorStageConfig(stage));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value) {
  const seen = new WeakSet();

  const normalize = (input) => {
    if (input === null || input === undefined) return null;
    if (typeof input === "number" || typeof input === "boolean") return input;
    if (typeof input === "string") return input;
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(normalize);
    if (isPlainObject(input)) {
      if (seen.has(input)) return "[Circular]";
      seen.add(input);

      const out = {};
      Object.keys(input)
        .sort()
        .forEach((key) => {
          const current = input[key];
          if (current === undefined) return;
          out[key] = normalize(current);
        });
      return out;
    }
    return String(input);
  };

  return JSON.stringify(normalize(value));
}

function buildSourceMapKey(row) {
  return [
    row?.rpjmd_id,
    row?.target_module,
    row?.renstra_id,
    row?.source_stage,
    row?.source_ref_id,
  ]
    .map((value) => String(value ?? ""))
    .join(":");
}

function normalizeTreeResponse(treeResult, label) {
  if (!treeResult) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: `${label} tidak tersedia.`,
    };
  }

  if (treeResult.success === false) {
    return treeResult;
  }

  const data = treeResult.data || treeResult;
  if (!data || !data.stages) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: `${label} tidak memiliki data stages yang valid.`,
    };
  }

  return { success: true, data };
}

function getStructuralStageConfig(stage) {
  const configs = {
    tujuan: {
      source_stage: "tujuan",
      target_stage: "tujuan",
      source_table: "tujuan",
      target_table: "renstra_tujuan",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "rpjmd",
      parent_target_stage: "renstra",
    },
    sasaran: {
      source_stage: "sasaran",
      target_stage: "sasaran",
      source_table: "sasaran",
      target_table: "renstra_sasaran",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "tujuan",
      parent_target_stage: "tujuan",
    },
    strategi: {
      source_stage: "strategi",
      target_stage: "strategi",
      source_table: "strategi",
      target_table: "renstra_strategi",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "sasaran",
      parent_target_stage: "sasaran",
    },
    kebijakan: {
      source_stage: "kebijakan",
      target_stage: "kebijakan",
      source_table: "arah_kebijakan",
      target_table: "renstra_kebijakan",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "strategi",
      parent_target_stage: "strategi",
    },
    program: {
      source_stage: "program",
      target_stage: "program",
      source_table: "program",
      target_table: "renstra_program",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "sasaran",
      parent_target_stage: "renstra",
    },
    kegiatan: {
      source_stage: "kegiatan",
      target_stage: "kegiatan",
      source_table: "kegiatan",
      target_table: "renstra_kegiatan",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "program",
      parent_target_stage: "program",
    },
    sub_kegiatan: {
      source_stage: "sub_kegiatan",
      target_stage: "sub_kegiatan",
      source_table: "sub_kegiatan",
      target_table: "renstra_subkegiatan",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "kegiatan",
      parent_target_stage: "kegiatan",
    },
  };

  return configs[stage] || null;
}

function getIndicatorStageConfig(stage) {
  const configs = {
    indikator_tujuan: {
      source_stage: "indikator_tujuan",
      target_stage: "indikator_tujuan",
      structural_stage: "tujuan",
      source_table: "indikator_tujuan",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "tujuan",
      parent_target_stage: "tujuan",
    },
    indikator_sasaran: {
      source_stage: "indikator_sasaran",
      target_stage: "indikator_sasaran",
      structural_stage: "sasaran",
      source_table: "indikator_sasaran",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "sasaran",
      parent_target_stage: "sasaran",
    },
    indikator_strategi: {
      source_stage: "indikator_strategi",
      target_stage: "indikator_strategi",
      structural_stage: "strategi",
      source_table: "indikator_strategi",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "strategi",
      parent_target_stage: "strategi",
    },
    indikator_kebijakan: {
      source_stage: "indikator_kebijakan",
      target_stage: "indikator_kebijakan",
      structural_stage: "kebijakan",
      source_table: "indikator_arah_kebijakan",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "kebijakan",
      parent_target_stage: "kebijakan",
    },
    indikator_program: {
      source_stage: "indikator_program",
      target_stage: "indikator_program",
      structural_stage: "program",
      source_table: "indikator_program",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "program",
      parent_target_stage: "program",
    },
    indikator_kegiatan: {
      source_stage: "indikator_kegiatan",
      target_stage: "indikator_kegiatan",
      structural_stage: "kegiatan",
      source_table: "indikator_kegiatan",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "kegiatan",
      parent_target_stage: "kegiatan",
    },
    indikator_sub_kegiatan: {
      source_stage: "indikator_sub_kegiatan",
      target_stage: "indikator_sub_kegiatan",
      structural_stage: "sub_kegiatan",
      source_table: "indikator_sub_kegiatan",
      target_table: "indikator_renstra",
      source_ref_field: "source_ref_id",
      target_ref_field: "source_ref_id",
      parent_source_stage: "sub_kegiatan",
      parent_target_stage: "sub_kegiatan",
    },
  };

  return configs[stage] || null;
}

function indexRowsByStage(stages) {
  const index = {};
  ALL_STAGE_ORDER.forEach((stage) => {
    const rows = Array.isArray(stages?.[stage]) ? stages[stage] : [];
    index[stage] = rows;
  });
  return index;
}

function filterRowsBySourceRef(rows, sourceRefId) {
  const targetRef = safeNumber(sourceRefId);
  if (!targetRef) return [];
  return rows.filter((row) => safeNumber(row.source_ref_id) === targetRef);
}

function filterRowsByStructureCode(rows, sourceCode, parentTargetRefId) {
  const normalizedSourceCode = normalizeStructureCode(sourceCode);
  const parentRef = safeNumber(parentTargetRefId);
  if (!normalizedSourceCode) return [];

  return rows.filter((row) => {
    const targetCode = normalizeStructureCode(row.target_code);
    if (!targetCode || targetCode !== normalizedSourceCode) {
      return false;
    }

    if (parentRef === null) {
      return true;
    }

    return safeNumber(row.parent_target_ref_id) === parentRef;
  });
}

function filterIndicatorRows(rows, sourceRefId, parentTargetRefId) {
  const targetRef = safeNumber(sourceRefId);
  const parentRef = safeNumber(parentTargetRefId);
  if (!targetRef) return [];

  return rows.filter((row) => {
    const rowSourceRef = safeNumber(row.source_ref_id);
    const rowParentRef = safeNumber(row.parent_target_ref_id);
    if (rowSourceRef !== targetRef) return false;
    if (parentRef === null) return true;
    return rowParentRef === parentRef;
  });
}

function getRootTargetContext(renstraId) {
  return {
    target_stage: "renstra",
    target_ref_id: safeNumber(renstraId),
  };
}

function buildChainStatus({
  sourceRow,
  targetRow,
  parentTargetRow,
  rootTargetContext,
}) {
  if (!targetRow) {
    if (
      sourceRow.parent_source_stage &&
      sourceRow.parent_source_stage !== "rpjmd" &&
      !parentTargetRow
    ) {
      return "parent_missing";
    }
    return "unchecked";
  }

  if (
    sourceRow.parent_source_stage === "rpjmd" ||
    sourceRow.parent_source_stage === null
  ) {
    const expectedRootRef = safeNumber(rootTargetContext?.target_ref_id);
    const actualRootRef = safeNumber(targetRow.parent_target_ref_id);
    if (expectedRootRef !== actualRootRef) {
      return "chain_mismatch";
    }
    return "valid";
  }

  if (!parentTargetRow) {
    return "parent_missing";
  }

  const expectedParentRef = safeNumber(parentTargetRow.target_ref_id);
  const actualParentRef = safeNumber(targetRow.parent_target_ref_id);
  if (expectedParentRef !== actualParentRef) {
    return "chain_mismatch";
  }

  return "valid";
}

function normalizeSourceMapPayload(row) {
  return {
    rpjmd_id: safeNumber(row.rpjmd_id),
    renstra_id: safeNumber(row.renstra_id),
    target_module: normalizeTargetModule(row.target_module),
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

function buildStructuralSourceMapRow({
  sourceRow,
  targetRow,
  sourceStage,
  rpjmdId,
  renstraId,
  targetModule,
  parentTargetRow,
  rootTargetContext,
}) {
  const cfg = getStructuralStageConfig(sourceStage);
  const mappingStatus = targetRow ? "mapped" : "missing_target";
  const chainStatus = buildChainStatus({
    sourceRow,
    targetRow,
    parentTargetRow,
    rootTargetContext,
  });

  return normalizeSourceMapPayload({
    rpjmd_id: rpjmdId,
    renstra_id: renstraId,
    target_module: targetModule,
    source_stage: sourceStage,
    source_table: sourceRow.source_table,
    source_ref_id: sourceRow.source_ref_id,
    source_code: sourceRow.source_code,
    source_name: sourceRow.source_name,
    target_table: cfg?.target_table || targetRow?.target_table || null,
    target_ref_id: targetRow?.target_ref_id ?? null,
    target_code: targetRow?.target_code ?? null,
    target_name: targetRow?.target_name ?? null,
    parent_source_stage: sourceRow.parent_source_stage,
    parent_source_ref_id: sourceRow.parent_source_ref_id,
    parent_target_stage: cfg?.parent_target_stage || targetRow?.parent_target_stage || null,
    parent_target_ref_id: targetRow?.parent_target_ref_id ?? null,
    mapping_status: mappingStatus,
    chain_status: chainStatus,
    source_hash: sourceRow.source_hash,
    target_hash: targetRow?.target_hash ?? null,
  });
}

function buildIndicatorSourceMapRow({
  sourceRow,
  targetRow,
  sourceStage,
  rpjmdId,
  renstraId,
  targetModule,
  parentTargetRow,
  structuralStage,
  rootTargetContext,
}) {
  const cfg = getIndicatorStageConfig(sourceStage);
  const mappingStatus = targetRow ? "mapped" : "missing_target";
  const chainStatus = buildChainStatus({
    sourceRow,
    targetRow,
    parentTargetRow,
    rootTargetContext,
  });

  return normalizeSourceMapPayload({
    rpjmd_id: rpjmdId,
    renstra_id: renstraId,
    target_module: targetModule,
    source_stage: sourceStage,
    source_table: sourceRow.source_table,
    source_ref_id: sourceRow.source_ref_id,
    source_code: sourceRow.source_code,
    source_name: sourceRow.source_name,
    target_table: cfg?.target_table || "indikator_renstra",
    target_ref_id: targetRow?.target_ref_id ?? null,
    target_code: targetRow?.target_code ?? null,
    target_name: targetRow?.target_name ?? null,
    parent_source_stage: sourceRow.parent_source_stage,
    parent_source_ref_id: sourceRow.parent_source_ref_id,
    parent_target_stage: structuralStage,
    parent_target_ref_id: parentTargetRow?.target_ref_id ?? null,
    mapping_status: mappingStatus,
    chain_status: chainStatus,
    source_hash: sourceRow.source_hash,
    target_hash: targetRow?.target_hash ?? null,
  });
}

function buildSourceMapRows({
  sourceTree,
  targetTree,
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
} = {}) {
  const errors = [];
  const warnings = [];
  const rpjmdIdNum = safeNumber(rpjmd_id);
  const renstraIdNum = safeNumber(renstra_id);
  const targetModuleValue = normalizeTargetModule(target_module);

  if (!rpjmdIdNum || rpjmdIdNum <= 0) {
    errors.push({
      field: "rpjmd_id",
      message: "rpjmd_id wajib diisi dan harus angka positif.",
    });
  }

  if (!renstraIdNum || renstraIdNum <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (targetModuleValue !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: `target_module tidak didukung: ${targetModuleValue}`,
    });
  }

  const normalizedSource = normalizeTreeResponse(sourceTree, "sourceTree");
  if (!normalizedSource.success) {
    return {
      success: false,
      code: normalizedSource.code || "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: normalizedSource.message || "sourceTree tidak valid.",
      errors: normalizedSource.errors || [],
    };
  }

  const normalizedTarget = normalizeTreeResponse(targetTree, "targetTree");
  if (!normalizedTarget.success) {
    return {
      success: false,
      code: normalizedTarget.code || "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: normalizedTarget.message || "targetTree tidak valid.",
      errors: normalizedTarget.errors || [],
    };
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: "Validasi input source map gagal.",
      errors,
    };
  }

  const sourceStages = indexRowsByStage(normalizedSource.data.stages);
  const targetStages = indexRowsByStage(normalizedTarget.data.stages);
  const rootTargetContext = getRootTargetContext(renstraIdNum);

  const rows = [];
  const resolvedSourceTargetMap = new Map();
  const summary = {
    total_source_rows: 0,
    mapped_rows: 0,
    missing_target_rows: 0,
    chain_mismatch_rows: 0,
    indicator_rows: 0,
    structural_rows: 0,
    resolver_conflict_rows: 0,
    parent_missing_rows: 0,
  };

  for (const stage of STRUCTURAL_STAGE_ORDER) {
    const stageSourceRows = sourceStages[stage] || [];
    const stageTargetRows = targetStages[stage] || [];
    summary.structural_rows += stageSourceRows.length;
    summary.total_source_rows += stageSourceRows.length;

    if (!getStructuralStageConfig(stage)) continue;

    for (const sourceRow of stageSourceRows) {
      const parentKey =
        sourceRow.parent_source_stage && sourceRow.parent_source_ref_id !== null
          ? buildSourceMapKey({
              rpjmd_id: rpjmdIdNum,
              target_module: targetModuleValue,
              renstra_id: renstraIdNum,
              source_stage: sourceRow.parent_source_stage,
              source_ref_id: sourceRow.parent_source_ref_id,
            })
          : null;
      const parentTargetRow =
        stage === "program"
          ? rootTargetContext
          : parentKey
            ? resolvedSourceTargetMap.get(parentKey)
            : rootTargetContext;
      const parentTargetRefId = safeNumber(parentTargetRow?.target_ref_id);
      const exactCandidates = filterRowsByStructureCode(
        stageTargetRows,
        sourceRow.source_code,
        parentTargetRefId,
      );
      const sameParentCandidates = parentTargetRefId === null
        ? []
        : stageTargetRows.filter(
            (row) => safeNumber(row.parent_target_ref_id) === parentTargetRefId,
          );

      let targetRow = null;
      let mappingStatus = "missing_target";
      let chainStatus = "unchecked";
      let diagnosisStatus = null;

      if (exactCandidates.length === 1) {
        targetRow = exactCandidates[0];
        mappingStatus = "mapped";
        diagnosisStatus =
          stage === "sub_kegiatan"
            ? "TARGET_SUB_KEGIATAN_FOUND"
            : "TARGET_STRUCTURE_RESOLVER_VALID";
      } else if (exactCandidates.length > 1) {
        mappingStatus = "resolver_conflict";
        summary.resolver_conflict_rows += 1;
        diagnosisStatus =
          stage === "sub_kegiatan"
            ? "TARGET_SUB_KEGIATAN_DUPLICATE"
            : "TARGET_STRUCTURE_DUPLICATE";
        warnings.push({
          stage,
          code: "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT",
          message: `Resolver menemukan lebih dari satu target untuk source ${stage}:${sourceRow.source_ref_id}.`,
        });
      } else if (stage === "sub_kegiatan") {
        if (sameParentCandidates.length > 0) {
          diagnosisStatus = "TARGET_SUB_KEGIATAN_CODE_MISMATCH";
        } else if (sourceRow.parent_source_stage && sourceRow.parent_source_stage !== "rpjmd") {
          diagnosisStatus = "TARGET_SUB_KEGIATAN_PARENT_MISMATCH";
        } else {
          diagnosisStatus = "TARGET_SUB_KEGIATAN_NOT_FOUND";
        }
      }

      chainStatus = buildChainStatus({
        sourceRow,
        targetRow,
        parentTargetRow,
        rootTargetContext,
      });

      if (chainStatus === "chain_mismatch") {
        summary.chain_mismatch_rows += 1;
      } else if (chainStatus === "parent_missing") {
        summary.parent_missing_rows += 1;
      }

      if (mappingStatus === "missing_target") {
        summary.missing_target_rows += 1;
      }

      if (!targetRow && stage === "sub_kegiatan") {
        if (diagnosisStatus === "TARGET_SUB_KEGIATAN_CODE_MISMATCH") {
          chainStatus = "parent_valid_target_missing";
        } else if (diagnosisStatus === "TARGET_SUB_KEGIATAN_PARENT_MISMATCH") {
          chainStatus = "parent_mismatch";
        } else {
          chainStatus = "parent_valid_target_missing";
        }
      }

      const row = buildStructuralSourceMapRow({
        sourceRow,
        targetRow,
        sourceStage: stage,
        rpjmdId: rpjmdIdNum,
        renstraId: renstraIdNum,
        targetModule: targetModuleValue,
        parentTargetRow,
        rootTargetContext,
      });
      row.mapping_status = mappingStatus;
      row.chain_status = chainStatus;
      row.diagnosis_status = diagnosisStatus || (
        mappingStatus === "mapped" && chainStatus === "valid"
          ? (stage === "sub_kegiatan"
              ? "TARGET_SUB_KEGIATAN_FOUND"
              : "TARGET_STRUCTURE_RESOLVER_VALID")
          : null
      );

      rows.push(row);
      if (mappingStatus === "mapped" && chainStatus === "valid") {
        summary.mapped_rows += 1;
      }

      if (mappingStatus === "mapped") {
        resolvedSourceTargetMap.set(buildSourceMapKey({
          rpjmd_id: rpjmdIdNum,
          target_module: targetModuleValue,
          renstra_id: renstraIdNum,
          source_stage: stage,
          source_ref_id: sourceRow.source_ref_id,
        }), targetRow);
      }
    }
  }

  for (const indicatorStage of INDICATOR_STAGE_ORDER) {
    const stageSourceRows = sourceStages[indicatorStage] || [];
    const stageTargetRows = targetStages[indicatorStage] || [];
    summary.indicator_rows += stageSourceRows.length;
    summary.total_source_rows += stageSourceRows.length;

    const cfg = getIndicatorStageConfig(indicatorStage);
    if (!cfg) continue;

    for (const sourceRow of stageSourceRows) {
      const structuralStage = cfg.structural_stage;
      const parentSourceKey = buildSourceMapKey({
        rpjmd_id: rpjmdIdNum,
        target_module: targetModuleValue,
        renstra_id: renstraIdNum,
        source_stage: sourceRow.parent_source_stage,
        source_ref_id: sourceRow.parent_source_ref_id,
      });
      const parentTargetRow = resolvedSourceTargetMap.get(parentSourceKey) || null;

      let targetRow = null;
      let mappingStatus = "missing_target";
      let chainStatus = "unchecked";
      const sameSourceCandidates = stageTargetRows.filter(
        (row) => safeNumber(row.source_ref_id) === safeNumber(sourceRow.source_ref_id),
      );
      const exactCandidates = parentTargetRow
        ? filterIndicatorRows(
            stageTargetRows,
            sourceRow.source_ref_id,
            parentTargetRow.target_ref_id,
          )
        : [];

      if (exactCandidates.length === 1) {
        targetRow = exactCandidates[0];
        mappingStatus = "mapped";
      } else if (exactCandidates.length > 1) {
        mappingStatus = "resolver_conflict";
        summary.resolver_conflict_rows += 1;
        warnings.push({
          stage: indicatorStage,
          code: "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT",
          message: `Resolver menemukan lebih dari satu target indikator untuk source ${indicatorStage}:${sourceRow.source_ref_id}.`,
        });
      } else if (sameSourceCandidates.length > 0) {
        chainStatus = parentTargetRow ? "chain_mismatch" : "parent_missing";
      }

      chainStatus = buildChainStatus({
        sourceRow,
        targetRow,
        parentTargetRow,
        rootTargetContext,
      });

      if (!targetRow && sameSourceCandidates.length > 0) {
        chainStatus = parentTargetRow ? "chain_mismatch" : "parent_missing";
      }

      if (mappingStatus === "missing_target") {
        summary.missing_target_rows += 1;
      }
      if (chainStatus === "chain_mismatch") {
        summary.chain_mismatch_rows += 1;
      } else if (chainStatus === "parent_missing") {
        summary.parent_missing_rows += 1;
      }

      const row = buildIndicatorSourceMapRow({
        sourceRow,
        targetRow,
        sourceStage: indicatorStage,
        rpjmdId: rpjmdIdNum,
        renstraId: renstraIdNum,
        targetModule: targetModuleValue,
        parentTargetRow,
        structuralStage,
        rootTargetContext,
      });
      row.mapping_status = mappingStatus;
      row.chain_status = chainStatus;

      rows.push(row);
      if (mappingStatus === "mapped" && chainStatus === "valid") {
        summary.mapped_rows += 1;
      }
    }
  }

  return {
    success: true,
    data: {
      rows,
      summary,
      warnings: [
        ...(normalizedSource.data.summary?.warnings || []),
        ...(normalizedTarget.data.summary?.warnings || []),
        ...warnings,
      ],
    },
  };
}

async function findSourceMap({
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
  source_stage,
  source_ref_id,
  target_table,
  target_ref_id,
  transaction,
} = {}) {
  const errors = [];
  const rpjmdIdNum = safeNumber(rpjmd_id);
  const renstraIdNum = safeNumber(renstra_id);
  const sourceRefIdNum = safeNumber(source_ref_id);
  const targetModuleValue = normalizeTargetModule(target_module);
  const sourceStageValue = normalizeText(source_stage);
  const targetRefIdNum = safeNumber(target_ref_id);
  const targetTableValue = normalizeText(target_table);

  if (!rpjmdIdNum || rpjmdIdNum <= 0) {
    errors.push({
      field: "rpjmd_id",
      message: "rpjmd_id wajib diisi dan harus angka positif.",
    });
  }

  if (!renstraIdNum || renstraIdNum <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (!sourceStageValue) {
    errors.push({
      field: "source_stage",
      message: "source_stage wajib diisi.",
    });
  } else if (!isSupportedStage(sourceStageValue)) {
    errors.push({
      field: "source_stage",
      message: `source_stage tidak didukung: ${sourceStageValue}`,
    });
  }

  if (!sourceRefIdNum || sourceRefIdNum <= 0) {
    errors.push({
      field: "source_ref_id",
      message: "source_ref_id wajib diisi dan harus angka positif.",
    });
  }

  if (targetModuleValue !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: `target_module tidak didukung: ${targetModuleValue}`,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: "Validasi pencarian source map gagal.",
      errors,
    };
  }

  const where = {
    rpjmd_id: rpjmdIdNum,
    renstra_id: renstraIdNum,
    target_module: targetModuleValue,
    source_stage: sourceStageValue,
    source_ref_id: sourceRefIdNum,
  };

  if (targetTableValue) {
    where.target_table = targetTableValue;
  }

  if (targetRefIdNum) {
    where.target_ref_id = targetRefIdNum;
  }

  const rows = await RpjmdSourceMap.findAll({
    where,
    order: [["updated_at", "DESC"], ["id", "DESC"]],
    raw: true,
    transaction,
  });

  if (rows.length > 1) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT",
      message: "Resolver menemukan lebih dari satu source map untuk source yang sama.",
      errors: [
        {
          field: "source_ref_id",
          message: "Ditemukan lebih dari satu baris source map untuk source ini.",
        },
      ],
    };
  }

  return {
    success: true,
    data: rows[0] || null,
  };
}

function buildResolverFailureData(row, extras = {}) {
  const chainStatus = normalizeText(row?.chain_status) || null;

  return {
    stage: row?.source_stage || extras.source_stage || null,
    source_stage: row?.source_stage || extras.source_stage || null,
    source_ref_id: safeNumber(row?.source_ref_id ?? extras.source_ref_id),
    source_code: row?.source_code || null,
    target_ref_id: safeNumber(row?.target_ref_id),
    target_code: row?.target_code || null,
    mapping_status: row?.mapping_status || extras.mapping_status || null,
    chain_status: chainStatus,
    diagnosis_status: row?.diagnosis_status || extras.diagnosis_status || null,
    target_module: row?.target_module || extras.target_module || VALID_TARGET_MODULE,
    rpjmd_id: safeNumber(row?.rpjmd_id ?? extras.rpjmd_id),
    renstra_id: safeNumber(row?.renstra_id ?? extras.renstra_id),
    parent_source_stage: row?.parent_source_stage || null,
    parent_source_ref_id: safeNumber(row?.parent_source_ref_id),
    parent_target_stage: row?.parent_target_stage || null,
    parent_target_ref_id: safeNumber(row?.parent_target_ref_id),
    parent_valid:
      chainStatus === "valid" || chainStatus === "parent_valid_target_missing",
  };
}

async function resolveTargetRefId({
  rpjmd_id,
  renstra_id,
  target_module = VALID_TARGET_MODULE,
  source_stage,
  source_ref_id,
  target_ref_id,
  include_parent = false,
  include_chain = false,
  transaction,
} = {}) {
  const result = await findSourceMap({
    rpjmd_id,
    renstra_id,
    target_module,
    source_stage,
    source_ref_id,
    target_ref_id,
    transaction,
  });

  if (!result.success) {
    return result;
  }

  const row = result.data;
  if (!row) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_NOT_FOUND",
      message: "Source map belum tersedia untuk source RPJMD ini.",
      data: {
        source_stage,
        source_ref_id,
      },
    };
  }

  if (row.mapping_status === "missing_target") {
    const isSubKegiatanMissingTarget =
      row.source_stage === "sub_kegiatan" &&
      safeNumber(row.target_ref_id) === null &&
      normalizeText(row.target_code) === null;
    const stageCode =
      row.diagnosis_status ||
      (isSubKegiatanMissingTarget ? "TARGET_SUB_KEGIATAN_NOT_FOUND" : "RPJMD_SOURCE_MAP_MISSING_TARGET");
    const stageMessage =
      stageCode === "TARGET_SUB_KEGIATAN_NOT_FOUND"
        ? "Target Renstra Sub Kegiatan belum ditemukan pada parent Kegiatan yang valid."
        : stageCode === "TARGET_SUB_KEGIATAN_CODE_MISMATCH"
          ? "Kode Sub Kegiatan Renstra tidak sama dengan source RPJMD."
          : stageCode === "TARGET_SUB_KEGIATAN_PARENT_MISMATCH"
            ? "Parent Kegiatan Renstra belum cocok untuk Sub Kegiatan ini."
            : "Target Renstra belum tersedia untuk source RPJMD ini.";
    return {
      success: false,
      code: stageCode,
      message: stageMessage,
      data: {
        ...buildResolverFailureData(row, {
          source_stage,
          source_ref_id,
          diagnosis_status: row.diagnosis_status || stageCode,
          target_module,
          rpjmd_id,
          renstra_id,
          mapping_status: row.mapping_status,
        }),
        provisionable: isSubKegiatanMissingTarget,
        provision_action: isSubKegiatanMissingTarget ? "sub_kegiatan_target_provision" : null,
      },
    };
  }

  if (!safeNumber(row.target_ref_id)) {
    return {
      success: false,
      code: row.diagnosis_status || "RPJMD_SOURCE_MAP_MISSING_TARGET",
      message:
        row.diagnosis_status === "TARGET_SUB_KEGIATAN_NOT_FOUND"
          ? "Target Renstra Sub Kegiatan belum ditemukan pada parent Kegiatan yang valid."
          : "Target Renstra belum tersedia untuk source RPJMD ini.",
      data: {
        ...buildResolverFailureData(row, {
          source_stage,
          source_ref_id,
          diagnosis_status:
            row.diagnosis_status ||
            (row.source_stage === "sub_kegiatan" ? "TARGET_SUB_KEGIATAN_NOT_FOUND" : null),
          target_module,
          rpjmd_id,
          renstra_id,
          mapping_status: row.mapping_status,
        }),
        provisionable: false,
        provision_action: null,
      },
    };
  }

  if (row.chain_status !== "valid") {
    const stageCode = row.diagnosis_status || "RPJMD_SOURCE_MAP_CHAIN_MISMATCH";
    const stageMessage =
      stageCode === "TARGET_SUB_KEGIATAN_PARENT_MISMATCH"
        ? "Parent Kegiatan Renstra belum cocok untuk Sub Kegiatan ini."
        : stageCode === "TARGET_SUB_KEGIATAN_CODE_MISMATCH"
          ? "Kode Sub Kegiatan Renstra tidak sama dengan source RPJMD."
          : "Mapping ditemukan tetapi chain parent-child tidak valid.";
    return {
      success: false,
      code: stageCode,
      message: stageMessage,
      data: {
        ...buildResolverFailureData(row, {
          source_stage,
          source_ref_id,
          diagnosis_status: row.diagnosis_status || null,
          target_module,
          rpjmd_id,
          renstra_id,
        }),
      },
    };
  }

  if (!["mapped", "mapped_valid", "ready_to_sync"].includes(row.mapping_status)) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: `Mapping status tidak dapat di-resolve: ${row.mapping_status}`,
      data: {
        source_stage: row.source_stage,
        source_ref_id: row.source_ref_id,
        mapping_status: row.mapping_status,
      },
    };
  }

  const responseData = {
    target_module: row.target_module,
    rpjmd_id: row.rpjmd_id,
    renstra_id: row.renstra_id,
    source_stage: row.source_stage,
    source_ref_id: row.source_ref_id,
    source_code: row.source_code,
    source_table: row.source_table,
    target_table: row.target_table,
    target_ref_id: row.target_ref_id,
    target_code: row.target_code,
    mapping_status: row.mapping_status,
    chain_status: row.chain_status,
    diagnosis_status: row.diagnosis_status || null,
    parent_source_stage: row.parent_source_stage,
    parent_source_ref_id: row.parent_source_ref_id,
    parent_target_stage: row.parent_target_stage,
    parent_target_ref_id: row.parent_target_ref_id,
  };

  if (include_parent) {
    const parentRow = row.parent_source_stage && row.parent_source_ref_id
      ? await findSourceMap({
          rpjmd_id: row.rpjmd_id,
          renstra_id: row.renstra_id,
          target_module: row.target_module,
          source_stage: row.parent_source_stage,
          source_ref_id: row.parent_source_ref_id,
          transaction,
        })
      : null;

    responseData.parent_source_map = parentRow?.success ? parentRow.data : null;
  }

  if (include_chain) {
    responseData.chain = {
      status: row.chain_status,
      parent_source_stage: row.parent_source_stage,
      parent_source_ref_id: row.parent_source_ref_id,
      parent_target_stage: row.parent_target_stage,
      parent_target_ref_id: row.parent_target_ref_id,
    };
  }

  return {
    success: true,
    data: responseData,
  };
}

async function upsertSourceMapRows({
  rows,
  transaction,
  actor_user_id,
} = {}) {
  if (!Array.isArray(rows)) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_VALIDATION_ERROR",
      message: "rows harus berupa array.",
    };
  }

  if (rows.length === 0) {
    return {
      success: true,
      data: {
        inserted_rows: 0,
        updated_rows: 0,
        total_rows: 0,
      },
    };
  }

  const sequelize = RpjmdSourceMap.sequelize;
  const run = async (tx) => {
    let insertedRows = 0;
    let updatedRows = 0;

    for (const row of rows) {
      const payload = normalizeSourceMapPayload(row);
      const uniqueWhere = {
        rpjmd_id: payload.rpjmd_id,
        target_module: payload.target_module,
        renstra_id: payload.renstra_id,
        source_stage: payload.source_stage,
        source_ref_id: payload.source_ref_id,
      };

      const existing = await RpjmdSourceMap.findOne({
        where: uniqueWhere,
        transaction: tx,
      });

      const timestamp = new Date();
      const upsertPayload = {
        ...payload,
        updated_by: safeNumber(actor_user_id) ?? payload.updated_by ?? null,
        last_checked_at: payload.last_checked_at || timestamp,
      };

      if (payload.mapping_status === "mapped" && payload.chain_status === "valid") {
        upsertPayload.last_synced_at = payload.last_synced_at || timestamp;
      }

      if (existing) {
        await existing.update(upsertPayload, { transaction: tx });
        updatedRows += 1;
      } else {
        await RpjmdSourceMap.create(
          {
            ...upsertPayload,
            created_by: safeNumber(actor_user_id) ?? payload.created_by ?? null,
          },
          { transaction: tx },
        );
        insertedRows += 1;
      }
    }

    return {
      success: true,
      data: {
        inserted_rows: insertedRows,
        updated_rows: updatedRows,
        total_rows: rows.length,
      },
    };
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction((tx) => run(tx));
}

async function refreshSourceMapFromTrees({
  rpjmd_id,
  renstra_id,
  scope = "all",
  include_indicators = true,
  include_pagu = false,
  target_module = VALID_TARGET_MODULE,
  actor_user_id,
  transaction,
  dry_run = true,
} = {}) {
  const sourceTree = await buildRpjmdSourceTree({
    rpjmd_id,
    scope,
    include_indicators,
  });

  if (!sourceTree.success) {
    return sourceTree.code
      ? sourceTree
      : {
          success: false,
          code: "RPJMD_SOURCE_MAP_BUILD_FAILED",
          message: "Gagal membangun source tree RPJMD.",
        };
  }

  const targetTree = await buildRenstraTargetTree({
    renstra_id,
    scope,
    include_indicators,
    include_pagu,
  });

  if (!targetTree.success) {
    return targetTree.code
      ? targetTree
      : {
          success: false,
          code: "RPJMD_SOURCE_MAP_BUILD_FAILED",
          message: "Gagal membangun target tree Renstra.",
        };
  }

  const rowsResult = buildSourceMapRows({
    sourceTree,
    targetTree,
    rpjmd_id,
    renstra_id,
    target_module,
  });

  if (!rowsResult.success) {
    return rowsResult;
  }

  const timestampedRows = rowsResult.data.rows.map((row) => ({
    ...row,
    last_checked_at: new Date(),
    ...(dry_run
      ? {}
      : row.mapping_status === "mapped" && row.chain_status === "valid"
        ? { last_synced_at: new Date() }
        : {}),
  }));

  if (dry_run) {
    return {
      success: true,
      data: {
        ...rowsResult.data,
        rows: timestampedRows,
        dry_run: true,
      },
    };
  }

  const upsertResult = await upsertSourceMapRows({
    rows: timestampedRows,
    transaction,
    actor_user_id,
  });

  if (!upsertResult.success) {
    return upsertResult.code
      ? upsertResult
      : {
          success: false,
          code: "RPJMD_SOURCE_MAP_UPSERT_FAILED",
          message: "Gagal menyimpan source map.",
        };
  }

  return {
    success: true,
    data: {
      ...rowsResult.data,
      rows: timestampedRows,
      dry_run: false,
      upsert: upsertResult.data,
    },
  };
}

module.exports = {
  findSourceMap,
  resolveTargetRefId,
  buildSourceMapRows,
  upsertSourceMapRows,
  refreshSourceMapFromTrees,
  getStructuralStageConfig,
  getIndicatorStageConfig,
  buildSourceMapKey,
  matchTargetRowForSource: filterRowsBySourceRef,
  matchIndicatorTargetRowForSource: filterIndicatorRows,
  buildMappingStatus: (sourceRow, targetRow) =>
    targetRow ? "mapped" : "missing_target",
  buildChainStatus,
  normalizeSourceMapPayload,
  safeNumber,
  normalizeText,
  normalizeStructureCode,
  stableStringify,
};
