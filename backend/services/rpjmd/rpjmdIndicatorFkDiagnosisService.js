"use strict";

const { Op } = require("sequelize");
const {
  Program,
  Kegiatan,
  SubKegiatan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
} = require("../../models");
const { resolveTargetRefId } = require("./rpjmdSourceMapService");
const {
  parseIndicatorCode,
  deriveHierarchyKey,
  isChildOf,
  normalizeIndicatorCode,
} = require("./rpjmdIndicatorCodeHierarchyParserService");

const VALID_TARGET_MODULE = "RENSTRA";
const VALID_SOURCE_STAGES = new Set(["kegiatan", "sub_kegiatan"]);

const SOURCE_STAGE_CONFIG = {
  kegiatan: {
    source_stage: "kegiatan",
    source_model: IndikatorKegiatan,
    source_fk_field: "kegiatan_id",
    source_code_prefix: "IK",
    source_structural_model: Kegiatan,
    source_structural_include: [{ model: Program, as: "program" }],
    source_structural_parent_field: "program_id",
    parent_structural_model: Program,
    parent_indicator_model: IndikatorProgram,
    parent_indicator_link_field: "indikator_program_id",
    parent_indicator_structural_link_field: "program_id",
    repair_fields: ["kegiatan_id"],
  },
  sub_kegiatan: {
    source_stage: "sub_kegiatan",
    source_model: IndikatorSubKegiatan,
    source_fk_field: "sub_kegiatan_id",
    source_code_prefix: "ISK",
    source_structural_model: SubKegiatan,
    source_structural_include: [
      {
        model: Kegiatan,
        as: "kegiatan",
        include: [{ model: Program, as: "program" }],
      },
    ],
    source_structural_parent_field: "kegiatan_id",
    parent_structural_model: Kegiatan,
    parent_indicator_model: IndikatorKegiatan,
    parent_indicator_link_field: "indikator_kegiatan_id",
    parent_indicator_structural_link_field: "kegiatan_id",
    repair_fields: ["sub_kegiatan_id", "kegiatan_id", "indikator_kegiatan_id"],
  },
};

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

function getSafeErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallbackMessage;
}

function normalizeRole(value) {
  const text = normalizeText(value)?.toUpperCase() || null;
  if (!text) {
    return null;
  }

  if (text === "SUPERADMIN") {
    return "SUPER_ADMIN";
  }

  return text.replace(/[^A-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function extractActorRole(source = {}) {
  const candidates = [
    source.actor_role,
    source.actor_role_name,
    source.actor_roleName,
    source.actor_role_code,
    source.actor_roleCode,
    source.role,
    source.role_name,
    source.roleName,
    source.role_code,
    source.roleCode,
    source?.user?.role,
    source?.user?.role_name,
    source?.user?.roleName,
    source?.user?.role_code,
    source?.user?.roleCode,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRole(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function validateSmartQuery(params = {}, options = {}) {
  const source = params && typeof params === "object" ? params : {};
  const requireSuperAdmin = options.requireSuperAdmin !== false;
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const renstra_id = safeNumber(source.renstra_id);
  const target_module = normalizeText(source.target_module)?.toUpperCase() || null;
  const source_stage = normalizeText(source.source_stage)?.toLowerCase() || null;
  const source_ref_id = safeNumber(source.source_ref_id);
  const target_ref_id = safeNumber(source.target_ref_id);
  const auto_repair = source.auto_repair !== false;
  const repair_mode = normalizeText(source.repair_mode)?.toLowerCase() || "safe_only";
  const reason = normalizeText(source.reason) || "Smart auto-healing indikator berdasarkan hirarki kode.";
  const actor_user_id = safeNumber(source.actor_user_id);
  const actor_role = extractActorRole(source);
  const errors = [];

  if (!rpjmd_id || rpjmd_id <= 0) {
    errors.push({ field: "rpjmd_id", message: "rpjmd_id wajib diisi dan harus angka positif." });
  }

  if (!renstra_id || renstra_id <= 0) {
    errors.push({ field: "renstra_id", message: "renstra_id wajib diisi dan harus angka positif." });
  }

  if (target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: "target_module wajib RENSTRA untuk smart-sync indikator.",
    });
  }

  if (!source_stage || !VALID_SOURCE_STAGES.has(source_stage)) {
    errors.push({
      field: "source_stage",
      message: `source_stage tidak valid untuk smart-sync indikator: ${source_stage || "-"}.`,
    });
  }

  if (!source_ref_id || source_ref_id <= 0) {
    errors.push({
      field: "source_ref_id",
      message: "source_ref_id wajib diisi dan harus angka positif.",
    });
  }

  if (target_ref_id !== null && target_ref_id !== undefined && target_ref_id <= 0) {
    errors.push({
      field: "target_ref_id",
      message: "target_ref_id harus angka positif jika disediakan.",
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
  } else if (requireSuperAdmin && actor_role !== "SUPER_ADMIN") {
    errors.push({
      field: "actor_role",
      message: "Smart auto-healing hanya dapat dijalankan oleh SUPER_ADMIN.",
    });
  }

  if (!["safe_only", "strict"].includes(repair_mode)) {
    errors.push({
      field: "repair_mode",
      message: "repair_mode hanya boleh safe_only atau strict.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      status: 400,
      code: "RPJMD_INDICATOR_SMART_SYNC_VALIDATION_ERROR",
      message: "Validasi smart auto-healing indikator gagal.",
      errors,
    };
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module,
      source_stage,
      source_ref_id,
      target_ref_id,
      auto_repair,
      repair_mode,
      reason,
      actor_user_id,
      actor_role,
    },
  };
}

function getStageConfig(sourceStage) {
  return SOURCE_STAGE_CONFIG[sourceStage] || null;
}

function toPlain(row) {
  if (!row) return null;
  if (typeof row.get === "function") {
    return row.get({ plain: true });
  }
  return { ...row };
}

function buildSourceWhere(cfg, sourceRefId) {
  return {
    [cfg.source_fk_field]: sourceRefId,
    jenis_dokumen: {
      [Op.like]: "%RPJMD%",
    },
  };
}

async function loadSourceStructuralContext(cfg, sourceRefId) {
  const row = await cfg.source_structural_model.findByPk(sourceRefId, {
    include: cfg.source_structural_include,
  });
  return toPlain(row);
}

async function loadParentStructuralContext(cfg, sourceStructural) {
  if (!sourceStructural) {
    return null;
  }

  const parentStructuralId = safeNumber(sourceStructural[cfg.source_structural_parent_field]);
  if (!parentStructuralId) {
    return null;
  }

  const row = await cfg.parent_structural_model.findByPk(parentStructuralId, {
    raw: true,
  });
  return row ? { ...row } : null;
}

async function loadParentIndicatorContext({
  cfg,
  sourceStructural,
  sourceMapResult,
  renstra_id,
  rpjmd_id,
  target_module,
  actor_user_id,
  transaction,
}) {
  if (!sourceStructural) {
    return {
      status: "PARENT_INDICATOR_NOT_FOUND",
      repairable: false,
      requires_super_admin_confirmation: false,
      indicator_rows: [],
      indicator_row: null,
      source_stage: null,
    };
  }

  if (cfg.source_stage === "kegiatan") {
    const parentStructural = await loadParentStructuralContext(cfg, sourceStructural);
    if (!parentStructural) {
      return {
        status: "PARENT_INDICATOR_NOT_FOUND",
        repairable: false,
        requires_super_admin_confirmation: false,
        indicator_rows: [],
        indicator_row: null,
        source_stage: "program",
        source_ref_id: safeNumber(sourceStructural[cfg.source_structural_parent_field]),
      };
    }

    const parentIndicatorRows = await cfg.parent_indicator_model.findAll({
      where: {
        program_id: safeNumber(parentStructural.id),
        jenis_dokumen: "RPJMD",
      },
      order: [
        ["id", "ASC"],
      ],
      raw: true,
      transaction,
    });

    if (parentIndicatorRows.length === 0) {
      return {
        status: "PARENT_INDICATOR_NOT_FOUND",
        repairable: false,
        requires_super_admin_confirmation: false,
        indicator_rows: [],
        indicator_row: null,
        source_stage: "program",
        source_ref_id: safeNumber(parentStructural.id),
        structural_row: parentStructural,
      };
    }

    return {
      status: "SOURCE_OK",
      repairable: true,
      requires_super_admin_confirmation: false,
      indicator_rows: parentIndicatorRows,
      indicator_row: parentIndicatorRows[0],
      source_stage: "program",
      source_ref_id: safeNumber(parentStructural.id),
      structural_row: parentStructural,
    };
  }

  const kegiatanId = safeNumber(sourceStructural[cfg.source_structural_parent_field]);
  if (!kegiatanId) {
    return {
      status: "PARENT_INDICATOR_NOT_FOUND",
      repairable: false,
      requires_super_admin_confirmation: false,
      indicator_rows: [],
      indicator_row: null,
      source_stage: "kegiatan",
      source_ref_id: null,
    };
  }

  const parentDiagnosis = await analyzeIndicatorRepair(
    {
      rpjmd_id,
      renstra_id,
      target_module,
      source_stage: "kegiatan",
      source_ref_id: kegiatanId,
      actor_user_id,
      transaction,
      auto_repair: false,
      include_candidates: true,
      nested_parent_check: false,
    },
    {
      requireSuperAdmin: false,
    },
  );

  const parentData = parentDiagnosis?.data || null;
  const selectedParentRow =
    parentData?.source_rows?.[0] ||
    parentData?.diagnosis?.selected_candidate?.row ||
    parentData?.candidates?.[0]?.row ||
    null;

  if (!selectedParentRow) {
    return {
      status: parentData?.diagnosis?.status || "PARENT_INDICATOR_NOT_FOUND",
      repairable: Boolean(parentData?.diagnosis?.repairable),
      requires_super_admin_confirmation: Boolean(
        parentData?.diagnosis?.requires_super_admin_confirmation,
      ),
      indicator_rows: [],
      indicator_row: null,
      source_stage: "kegiatan",
      source_ref_id: kegiatanId,
      diagnosis: parentData?.diagnosis || null,
    };
  }

  return {
    status: parentData?.diagnosis?.status || "SOURCE_OK",
    repairable: Boolean(parentData?.diagnosis?.repairable),
    requires_super_admin_confirmation: Boolean(
      parentData?.diagnosis?.requires_super_admin_confirmation,
    ),
    indicator_rows: parentData?.source_rows || [],
    indicator_row: selectedParentRow,
    source_stage: "kegiatan",
    source_ref_id: kegiatanId,
    diagnosis: parentData?.diagnosis || null,
  };
}

function computeConfidence({
  directMatch,
  codeMatch,
  parentMatch,
  parentChainValid,
  sourceMapValid,
  currentFkNull,
  currentFkWrong,
  uniqueCandidate,
}) {
  let score = 0;

  if (codeMatch) score += 30;
  if (parentMatch) score += 30;
  if (parentChainValid) score += 20;
  if (sourceMapValid) score += 10;
  if (uniqueCandidate) score += 5;
  if (currentFkNull) score += 5;
  if (currentFkWrong) score += 5;
  if (directMatch) score = 100;

  return Math.min(score, 100);
}

function buildCandidateView({
  row,
  cfg,
  sourceStructural,
  parentContext,
  sourceMapResult,
  sourceRefId,
}) {
  const parsed = parseIndicatorCode(row.kode_indikator);
  if (!parsed.is_valid || parsed.prefix !== cfg.source_code_prefix) {
    return null;
  }

  const currentFk = safeNumber(row[cfg.source_fk_field]);
  const parentIndicatorId = safeNumber(row[cfg.parent_indicator_link_field]);
  const parentIndicatorCode = normalizeIndicatorCode(parentContext?.indicator_row?.kode_indikator);
  const codeMatch =
    parsed.level === cfg.source_stage &&
    Boolean(parsed.parent_indicator_code) &&
    Boolean(parentIndicatorCode) &&
    normalizeIndicatorCode(parsed.parent_indicator_code) === parentIndicatorCode;
  const parentMatch =
    safeNumber(parentContext?.indicator_row?.id) &&
    (parentIndicatorId === safeNumber(parentContext.indicator_row.id) ||
      normalizeIndicatorCode(parsed.parent_indicator_code) === parentIndicatorCode ||
      isChildOf(row.kode_indikator, parentContext.indicator_row.kode_indikator));

  const parentChainValid = Boolean(parentMatch && parentContext?.status !== "PARENT_CHAIN_INVALID");
  const sourceMapValid =
    Boolean(sourceMapResult?.success) &&
    sourceMapResult?.data?.mapping_status &&
    sourceMapResult?.data?.chain_status === "valid";
  const currentFkNull = currentFk === null;
  const currentFkWrong = currentFk !== null && currentFk !== sourceRefId;
  const uniqueCandidate = true;
  const confidence = computeConfidence({
    directMatch: currentFk === sourceRefId,
    codeMatch,
    parentMatch,
    parentChainValid,
    sourceMapValid,
    currentFkNull,
    currentFkWrong,
    uniqueCandidate,
  });
  const repairValues =
    cfg.source_stage === "kegiatan"
      ? {
          kegiatan_id: sourceRefId,
        }
      : {
          sub_kegiatan_id: sourceRefId,
          kegiatan_id: safeNumber(sourceStructural?.kegiatan_id) || null,
          indikator_kegiatan_id: safeNumber(parentContext?.indicator_row?.id) || null,
        };
  const repairValuesValid =
    cfg.source_stage === "kegiatan"
      ? safeNumber(repairValues.kegiatan_id) === sourceRefId
      : safeNumber(repairValues.sub_kegiatan_id) === sourceRefId &&
        safeNumber(repairValues.kegiatan_id) !== null;

  return {
    row,
    parsed,
    code_match: codeMatch,
    parent_match: Boolean(parentMatch),
    parent_chain_valid: parentChainValid,
    source_map_valid: sourceMapValid,
    current_fk: currentFk,
    current_fk_null: currentFkNull,
    current_fk_wrong: currentFkWrong,
    confidence,
    hierarchy_key: deriveHierarchyKey(row.kode_indikator),
    repair_values: repairValues,
    repair_values_valid: repairValuesValid,
    eligible_for_auto_repair:
      Boolean(codeMatch) &&
      Boolean(parentMatch) &&
      Boolean(parentChainValid) &&
      Boolean(sourceMapValid) &&
      confidence >= 90 &&
      Boolean(repairValuesValid) &&
      (cfg.source_stage === "kegiatan"
        ? safeNumber(repairValues.kegiatan_id) === sourceRefId
        : safeNumber(repairValues.sub_kegiatan_id) === sourceRefId &&
          safeNumber(repairValues.kegiatan_id) !== null),
  };
}

async function findCandidateIndicators({
  cfg,
  sourceStructural,
  parentContext,
  sourceMapResult,
  sourceRefId,
  transaction,
}) {
  const rows = await cfg.source_model.findAll({
    where: {
      jenis_dokumen: "RPJMD",
      kode_indikator: {
        [Op.like]: `${cfg.source_code_prefix}%`,
      },
    },
    raw: true,
    transaction,
    order: [["id", "ASC"]],
  });

  const candidates = [];
  for (const row of rows) {
    const currentFk = safeNumber(row[cfg.source_fk_field]);
    if (currentFk === sourceRefId) {
      continue;
    }

    const candidate = buildCandidateView({
      row,
      cfg,
      sourceStructural,
      parentContext,
      sourceMapResult,
      sourceRefId,
    });

    if (!candidate) {
      continue;
    }

    if (
      candidate.parent_match ||
      candidate.code_match ||
      candidate.current_fk_null ||
      candidate.current_fk_wrong
    ) {
      candidates.push(candidate);
    }
  }

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    return Number(a.row.id) - Number(b.row.id);
  });

  return candidates;
}

function filterEligibleCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  return candidates
    .filter((candidate) => Boolean(candidate?.eligible_for_auto_repair))
    .sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }

      return Number(a.row?.id || 0) - Number(b.row?.id || 0);
    });
}

function buildNoSourceDiagnosis({
  sourceMapResult,
  sourceStructural,
  parentContext,
  candidates,
  eligibleCandidates,
  sourceRows,
}) {
  if (!sourceMapResult?.success) {
    return {
      status: "SOURCE_MAP_INVALID",
      repairable: false,
      requires_super_admin_confirmation: false,
      confidence: 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      source_structural: sourceStructural,
      parent_context: parentContext,
    };
  }

  if (!sourceStructural) {
    return {
      status: "UNRESOLVED_HIERARCHY",
      repairable: false,
      requires_super_admin_confirmation: false,
      confidence: 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      source_structural: null,
      parent_context: parentContext,
    };
  }

  if (!parentContext?.indicator_row) {
    return {
      status: "PARENT_INDICATOR_NOT_FOUND",
      repairable: false,
      requires_super_admin_confirmation: false,
      confidence: 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      source_structural: sourceStructural,
      parent_context: parentContext,
    };
  }

  if (candidates.length === 0) {
    return {
      status: "NO_SOURCE_INDICATOR",
      repairable: false,
      requires_super_admin_confirmation: false,
      confidence: 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      eligible_candidates: eligibleCandidates,
      source_structural: sourceStructural,
      parent_context: parentContext,
    };
  }

  if (eligibleCandidates.length > 1) {
    return {
      status: "AMBIGUOUS_HIERARCHY_MATCH",
      repairable: false,
      requires_super_admin_confirmation: true,
      confidence: eligibleCandidates[0]?.confidence || 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      eligible_candidates: eligibleCandidates,
      source_structural: sourceStructural,
      parent_context: parentContext,
    };
  }

  if (eligibleCandidates.length === 0) {
    return {
      status: "UNRESOLVED_HIERARCHY",
      repairable: false,
      requires_super_admin_confirmation: false,
      confidence: candidates[0]?.confidence || 0,
      source_rows: sourceRows,
      candidate_rows: candidates,
      eligible_candidates: eligibleCandidates,
      source_structural: sourceStructural,
      parent_context: parentContext,
    };
  }

  const best = eligibleCandidates[0];
  const currentStatus = best.current_fk_null
    ? "SOURCE_FK_NULL_BUT_CODE_MATCH_FOUND"
    : "SOURCE_FK_WRONG_BUT_CODE_MATCH_FOUND";

  return {
    status: "READY_TO_AUTO_REPAIR",
    repairable: true,
    requires_super_admin_confirmation: false,
    confidence: best.confidence,
    source_rows: sourceRows,
    candidate_rows: candidates,
    eligible_candidates: eligibleCandidates,
    selected_candidate: best,
    source_structural: sourceStructural,
    parent_context: parentContext,
    current_status: currentStatus,
  };
}

async function analyzeIndicatorRepair(params = {}, options = {}) {
  const normalized = validateSmartQuery(params, {
    requireSuperAdmin: options.requireSuperAdmin !== false,
  });
  if (!normalized.success) {
    return normalized;
  }

  const {
    rpjmd_id,
    renstra_id,
    target_module,
    source_stage,
    source_ref_id,
    target_ref_id,
    actor_user_id,
    auto_repair = false,
    transaction,
  } = normalized.data;

  const cfg = getStageConfig(source_stage);
  if (!cfg) {
    return {
      success: false,
      status: 400,
      code: "RPJMD_INDICATOR_SMART_SYNC_VALIDATION_ERROR",
      message: `source_stage tidak didukung untuk smart-sync indikator: ${source_stage}`,
      errors: [
        {
          field: "source_stage",
          message: `source_stage tidak didukung untuk smart-sync indikator: ${source_stage}`,
        },
      ],
    };
  }

  const sourceMapResult = await resolveTargetRefId({
    rpjmd_id,
    renstra_id,
    target_module,
    source_stage,
    source_ref_id,
    target_ref_id,
    include_parent: true,
    include_chain: true,
    transaction: params.transaction || transaction || null,
  });

  if (!sourceMapResult.success) {
    return {
      success: false,
      status: sourceMapResult.code === "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT" ? 409 : 400,
      code:
        sourceMapResult.code === "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT"
          ? "SOURCE_MAP_INVALID"
          : sourceMapResult.code || "SOURCE_MAP_INVALID",
      message:
        sourceMapResult.message || "Mapping source RPJMD terhadap Renstra tidak valid.",
      data: {
        diagnosis: {
          status: "SOURCE_MAP_INVALID",
          repairable: false,
          requires_super_admin_confirmation: false,
          confidence: 0,
        },
        source_map: sourceMapResult.data || null,
      },
      errors: sourceMapResult.errors || [],
    };
  }

  if (sourceMapResult.data?.chain_status !== "valid") {
    return {
      success: true,
      status: 200,
      code: "PARENT_CHAIN_INVALID",
      message: "Chain parent-child belum valid untuk auto-healing indikator.",
      data: {
        diagnosis: {
          status: "PARENT_CHAIN_INVALID",
          repairable: false,
          requires_super_admin_confirmation: false,
          confidence: 0,
        },
        source_map: sourceMapResult.data,
        repair: {
          updated_source_rows: 0,
          ambiguous: 0,
          unresolved: 0,
        },
        sync: {
          created: 0,
          updated: 0,
          skipped: 0,
          blocked: 0,
          source_count: 0,
        },
        verify: {
          renstra_id,
          stage: source_stage,
          ref_id: safeNumber(sourceMapResult.data?.target_ref_id),
          indicator_count: 0,
          status: "PARENT_CHAIN_INVALID",
        },
      },
    };
  }

  const sourceStructural = await loadSourceStructuralContext(cfg, source_ref_id);
  const directRows = await cfg.source_model.findAll({
    where: buildSourceWhere(cfg, source_ref_id),
    raw: true,
    order: [["id", "ASC"]],
  });

  if (directRows.length > 0) {
    return {
      success: true,
      status: 200,
      code: "SOURCE_OK",
      message: "Sumber indikator RPJMD sudah tersedia untuk sinkronisasi.",
      data: {
        diagnosis: {
          status: "SOURCE_OK",
          repairable: false,
          requires_super_admin_confirmation: false,
          confidence: 100,
        },
        source_map: sourceMapResult.data,
        source_rows: directRows,
        source_structural: sourceStructural,
        repair: {
          updated_source_rows: 0,
          ambiguous: 0,
          unresolved: 0,
        },
        sync: {
          created: 0,
          updated: 0,
          skipped: 0,
          blocked: 0,
          source_count: directRows.length,
        },
      },
    };
  }

  const parentContext = await loadParentIndicatorContext({
    cfg,
    sourceStructural,
    sourceMapResult,
    renstra_id,
    rpjmd_id,
    target_module,
    actor_user_id,
    transaction: params.transaction || null,
  });

  const candidateRows = await findCandidateIndicators({
    cfg,
    sourceStructural,
    parentContext,
    sourceMapResult,
    sourceRefId: source_ref_id,
    transaction: params.transaction || null,
  });
  const eligibleCandidateRows = filterEligibleCandidates(candidateRows);

  const diagnosis = buildNoSourceDiagnosis({
    sourceMapResult,
    sourceStructural,
    parentContext,
    candidates: candidateRows,
    eligibleCandidates: eligibleCandidateRows,
    sourceRows: directRows,
  });

  return {
    success: true,
    status: 200,
    code: diagnosis.status,
    message:
      diagnosis.status === "NO_SOURCE_INDICATOR"
        ? "Tidak ada indikator RPJMD sumber yang dapat dikenali untuk level ini."
        : diagnosis.status === "AMBIGUOUS_HIERARCHY_MATCH"
          ? "Sistem menemukan lebih dari satu kandidat relasi indikator. Perlu konfirmasi Super Admin."
          : diagnosis.status === "SOURCE_FK_NULL_BUT_CODE_MATCH_FOUND" ||
              diagnosis.status === "SOURCE_FK_WRONG_BUT_CODE_MATCH_FOUND"
            ? "Indikator sumber ditemukan berdasarkan kode hirarki dan siap diperbaiki."
            : "Diagnostik indikator selesai.",
    data: {
      diagnosis,
      source_map: sourceMapResult.data,
      source_rows: directRows,
      source_structural: sourceStructural,
      parent_context: parentContext,
      candidates: candidateRows,
      eligible_candidates: eligibleCandidateRows,
      target_ref_id: safeNumber(sourceMapResult.data?.target_ref_id),
      repairable: Boolean(diagnosis.repairable),
    },
  };
}

module.exports = {
  analyzeIndicatorRepair,
  validateSmartQuery,
  getStageConfig,
  getSafeErrorMessage,
  safeNumber,
  normalizeText,
  VALID_SOURCE_STAGES,
};
