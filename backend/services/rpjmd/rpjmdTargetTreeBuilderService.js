"use strict";

const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  Renstra,
  RenstraTujuan,
  RenstraSasaran,
  RenstraStrategi,
  RenstraKebijakan,
  RenstraProgram,
  RenstraKegiatan,
  RenstraSubkegiatan,
  IndikatorRenstra,
  RenstraPaguCache,
} = require("../../models");

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

const ALL_STAGE_ORDER = [...STRUCTURAL_STAGE_ORDER, ...INDICATOR_STAGE_ORDER];

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
      if (seen.has(input)) {
        return "[Circular]";
      }

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

function buildTargetHash(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function toPlainRow(row) {
  if (!row) return {};
  if (typeof row.get === "function") {
    return row.get({ plain: true });
  }
  return { ...row };
}

function pickValue(row, candidates) {
  for (const field of candidates) {
    if (!field) continue;
    const value = row[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function getStageConfig(stage) {
  const configs = {
    tujuan: {
      target_stage: "tujuan",
      target_table: "renstra_tujuan",
      model: RenstraTujuan,
      code_candidates: ["no_tujuan", "kode_tujuan"],
      name_candidates: ["isi_tujuan", "nama_tujuan", "uraian"],
      link_field: "rpjmd_tujuan_id",
      source_ref_field: "rpjmd_tujuan_id",
      parent_target_stage: "renstra",
      parent_target_ref_field: "renstra_id",
      structural: true,
      allow_direct_renstra_filter: true,
    },
    sasaran: {
      target_stage: "sasaran",
      target_table: "renstra_sasaran",
      model: RenstraSasaran,
      code_candidates: ["nomor", "kode_sasaran"],
      name_candidates: ["isi_sasaran", "nama_sasaran", "uraian"],
      link_field: "rpjmd_sasaran_id",
      source_ref_field: "rpjmd_sasaran_id",
      parent_target_stage: "tujuan",
      parent_target_ref_field: "tujuan_id",
      structural: true,
    },
    strategi: {
      target_stage: "strategi",
      target_table: "renstra_strategi",
      model: RenstraStrategi,
      code_candidates: ["kode_strategi"],
      name_candidates: ["deskripsi", "nama_strategi", "uraian"],
      link_field: "rpjmd_strategi_id",
      source_ref_field: "rpjmd_strategi_id",
      parent_target_stage: "sasaran",
      parent_target_ref_field: "sasaran_id",
      structural: true,
    },
    kebijakan: {
      target_stage: "kebijakan",
      target_table: "renstra_kebijakan",
      model: RenstraKebijakan,
      code_candidates: ["kode_arah", "kode_kebijakan"],
      name_candidates: ["deskripsi", "nama_kebijakan", "uraian"],
      link_field: "rpjmd_arah_id",
      source_ref_field: "rpjmd_arah_id",
      parent_target_stage: "strategi",
      parent_target_ref_field: "strategi_id",
      structural: true,
    },
    program: {
      target_stage: "program",
      target_table: "renstra_program",
      model: RenstraProgram,
      code_candidates: ["kode_program"],
      name_candidates: ["nama_program"],
      link_field: "rpjmd_program_id",
      source_ref_field: "rpjmd_program_id",
      parent_target_stage: "renstra",
      parent_target_ref_field: "renstra_id",
      structural: true,
      allow_direct_renstra_filter: true,
    },
    kegiatan: {
      target_stage: "kegiatan",
      target_table: "renstra_kegiatan",
      model: RenstraKegiatan,
      code_candidates: ["kode_kegiatan"],
      name_candidates: ["nama_kegiatan"],
      link_field: "rpjmd_kegiatan_id",
      source_ref_field: "rpjmd_kegiatan_id",
      parent_target_stage: "program",
      parent_target_ref_field: "program_id",
      structural: true,
    },
    sub_kegiatan: {
      target_stage: "sub_kegiatan",
      target_table: "renstra_subkegiatan",
      model: RenstraSubkegiatan,
      code_candidates: ["kode_sub_kegiatan"],
      name_candidates: ["nama_sub_kegiatan"],
      link_field: "sub_kegiatan_id",
      source_ref_field: "sub_kegiatan_id",
      parent_target_stage: "kegiatan",
      parent_target_ref_field: "kegiatan_id",
      structural: true,
      use_renstra_program_chain: true,
    },
  };

  return configs[stage] || null;
}

function getIndicatorStageConfig(stage) {
  const configs = {
    indikator_tujuan: {
      target_stage: "indikator_tujuan",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "tujuan",
      parent_target_ref_field: "ref_id",
      structural_stage: "tujuan",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_sasaran: {
      target_stage: "indikator_sasaran",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "sasaran",
      parent_target_ref_field: "ref_id",
      structural_stage: "sasaran",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_strategi: {
      target_stage: "indikator_strategi",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "strategi",
      parent_target_ref_field: "ref_id",
      structural_stage: "strategi",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_kebijakan: {
      target_stage: "indikator_kebijakan",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "kebijakan",
      parent_target_ref_field: "ref_id",
      structural_stage: "kebijakan",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_program: {
      target_stage: "indikator_program",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "program",
      parent_target_ref_field: "ref_id",
      structural_stage: "program",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_kegiatan: {
      target_stage: "indikator_kegiatan",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "kegiatan",
      parent_target_ref_field: "ref_id",
      structural_stage: "kegiatan",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
    indikator_sub_kegiatan: {
      target_stage: "indikator_sub_kegiatan",
      target_table: "indikator_renstra",
      model: IndikatorRenstra,
      parent_target_stage: "sub_kegiatan",
      parent_target_ref_field: "ref_id",
      structural_stage: "sub_kegiatan",
      source_ref_field: "source_indikator_id",
      link_field: "source_indikator_id",
      indicator: true,
    },
  };

  return configs[stage] || null;
}

function normalizePayloadValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizePayloadValue);
  if (typeof value === "object") {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        const current = value[key];
        if (current === undefined) return;
        out[key] = normalizePayloadValue(current);
      });
    return out;
  }
  return value;
}

function normalizeTargetRow(row, stage) {
  const structuralCfg = getStageConfig(stage);
  const indicatorCfg = getIndicatorStageConfig(stage);
  const cfg = structuralCfg || indicatorCfg;

  if (!cfg) {
    throw new Error(`Stage target tidak dikenal: ${stage}`);
  }

  const raw = toPlainRow(row);

  if (cfg.indicator) {
    const targetRefId = safeNumber(raw.id);
    const sourceRefId = safeNumber(raw.source_indikator_id);
    const targetCode = normalizeText(pickValue(raw, ["kode_indikator"])) || null;
    const targetName = normalizeText(pickValue(raw, ["nama_indikator"])) || null;
    const paguCachePayload = raw._pagu_cache_payload
      ? normalizePayloadValue(raw._pagu_cache_payload)
      : null;

    const normalizedPayload = {
      target_stage: cfg.target_stage,
      target_table: cfg.target_table,
      target_ref_id: targetRefId,
      target_code: targetCode,
      target_name: targetName,
      link_field: cfg.link_field,
      source_ref_id: sourceRefId,
      parent_target_stage: cfg.parent_target_stage,
      parent_target_ref_id: safeNumber(raw.ref_id),
      renstra_id: safeNumber(raw.renstra_id),
      stage: normalizeText(raw.stage) || cfg.target_stage,
      ref_id: safeNumber(raw.ref_id),
      source_indikator_id: sourceRefId,
      kode_indikator: targetCode,
      nama_indikator: targetName,
      baseline: normalizePayloadValue(raw.baseline ?? null),
      satuan: normalizePayloadValue(raw.satuan ?? null),
      target_tahun_1: normalizePayloadValue(raw.target_tahun_1 ?? null),
      target_tahun_2: normalizePayloadValue(raw.target_tahun_2 ?? null),
      target_tahun_3: normalizePayloadValue(raw.target_tahun_3 ?? null),
      target_tahun_4: normalizePayloadValue(raw.target_tahun_4 ?? null),
      target_tahun_5: normalizePayloadValue(raw.target_tahun_5 ?? null),
      target_tahun_6: normalizePayloadValue(raw.target_tahun_6 ?? null),
    };

    if (paguCachePayload) {
      normalizedPayload.pagu_cache_payload = paguCachePayload;
    }

    const hashPayload = {
      target_stage: normalizedPayload.target_stage,
      target_ref_id: normalizedPayload.target_ref_id,
      target_code: normalizedPayload.target_code,
      target_name: normalizedPayload.target_name,
      baseline: normalizedPayload.baseline,
      satuan: normalizedPayload.satuan,
      target_tahun_1: normalizedPayload.target_tahun_1,
      target_tahun_2: normalizedPayload.target_tahun_2,
      target_tahun_3: normalizedPayload.target_tahun_3,
      target_tahun_4: normalizedPayload.target_tahun_4,
      target_tahun_5: normalizedPayload.target_tahun_5,
      target_tahun_6: normalizedPayload.target_tahun_6,
      source_indikator_id: normalizedPayload.source_indikator_id,
      renstra_id: normalizedPayload.renstra_id,
      stage: normalizedPayload.stage,
      ref_id: normalizedPayload.ref_id,
      parent_target_stage: normalizedPayload.parent_target_stage,
      parent_target_ref_id: normalizedPayload.parent_target_ref_id,
    };

    return {
      target_stage: cfg.target_stage,
      target_table: cfg.target_table,
      target_ref_id: targetRefId,
      target_code: targetCode,
      target_name: targetName,
      link_field: cfg.link_field,
      source_ref_id: sourceRefId,
      parent_target_stage: cfg.parent_target_stage,
      parent_target_ref_id: safeNumber(raw.ref_id),
      parent_key: "ref_id",
      raw,
      normalized_payload: normalizedPayload,
      target_hash: buildTargetHash(hashPayload),
    };
  }

  const targetRefId = safeNumber(raw.id);
  const sourceRefId = safeNumber(raw[cfg.source_ref_field]);
  const targetCode = normalizeText(pickValue(raw, cfg.code_candidates)) || null;
  const targetName = normalizeText(pickValue(raw, cfg.name_candidates)) || null;
  const parentTargetRefId = safeNumber(raw[cfg.parent_target_ref_field]);

  const normalizedPayload = {
    target_stage: cfg.target_stage,
    target_table: cfg.target_table,
    target_ref_id: targetRefId,
    target_code: targetCode,
    target_name: targetName,
    link_field: cfg.link_field,
    source_ref_id: sourceRefId,
    parent_target_stage: cfg.parent_target_stage,
    parent_target_ref_id: parentTargetRefId,
    renstra_id: safeNumber(raw.renstra_id),
  };

  const hashPayload = {
    target_stage: normalizedPayload.target_stage,
    target_ref_id: normalizedPayload.target_ref_id,
    target_code: normalizedPayload.target_code,
    target_name: normalizedPayload.target_name,
    link_field: normalizedPayload.link_field,
    source_ref_id: normalizedPayload.source_ref_id,
    parent_target_stage: normalizedPayload.parent_target_stage,
    parent_target_ref_id: normalizedPayload.parent_target_ref_id,
  };

  return {
    target_stage: cfg.target_stage,
    target_table: cfg.target_table,
    target_ref_id: targetRefId,
    target_code: targetCode,
    target_name: targetName,
    link_field: cfg.link_field,
    source_ref_id: sourceRefId,
    parent_target_stage: cfg.parent_target_stage,
    parent_target_ref_id: parentTargetRefId,
    parent_key: cfg.parent_target_ref_field,
    raw,
    normalized_payload: normalizedPayload,
    target_hash: buildTargetHash(hashPayload),
  };
}

function initStageBuckets() {
  return ALL_STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {});
}

function assertModelAvailable(model, name) {
  if (!model) {
    const error = new Error(`Model tidak tersedia: ${name}`);
    error.code = "RENSTRA_TARGET_TREE_MODEL_NOT_AVAILABLE";
    throw error;
  }
}

async function buildPaguCacheMap(renstraId, includePagu, warnings) {
  if (!includePagu) {
    return new Map();
  }

  assertModelAvailable(RenstraPaguCache, "RenstraPaguCache");

  const rows = await RenstraPaguCache.findAll({
    where: { renstra_id: renstraId },
    raw: true,
    order: [["id", "ASC"]],
  });

  const cache = new Map();
  rows.forEach((row) => {
    const plain = toPlainRow(row);
    const stage = normalizeText(plain.stage);
    const refId = safeNumber(plain.ref_id);
    if (!stage || !refId) return;

    cache.set(`${stage}:${refId}`, {
      id: safeNumber(plain.id),
      renstra_id: safeNumber(plain.renstra_id),
      stage,
      ref_id: refId,
      pagu_tahun_1: normalizePayloadValue(plain.pagu_tahun_1 ?? null),
      pagu_tahun_2: normalizePayloadValue(plain.pagu_tahun_2 ?? null),
      pagu_tahun_3: normalizePayloadValue(plain.pagu_tahun_3 ?? null),
      pagu_tahun_4: normalizePayloadValue(plain.pagu_tahun_4 ?? null),
      pagu_tahun_5: normalizePayloadValue(plain.pagu_tahun_5 ?? null),
      pagu_tahun_6: normalizePayloadValue(plain.pagu_tahun_6 ?? null),
      pagu_akhir_renstra: normalizePayloadValue(plain.pagu_akhir_renstra ?? null),
      cached_at: normalizePayloadValue(plain.cached_at ?? null),
    });
  });

  if (rows.length === 0) {
    warnings.push({
      stage: "pagu_cache",
      code: "RENSTRA_TARGET_TREE_PAGU_CACHE_EMPTY",
      message: "renstra_pagu_cache belum memiliki baris untuk renstra_id ini.",
    });
  }

  return cache;
}

async function buildStructuralTargetTree({
  renstraId,
}) {
  const stages = {};
  const stageRows = {};
  const stageIds = {};

  const targetTujuan = await RenstraTujuan.findAll({
    where: { renstra_id: renstraId },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.tujuan = targetTujuan.map((row) => normalizeTargetRow(row, "tujuan"));
  stageIds.tujuan = stageRows.tujuan.map((row) => row.target_ref_id).filter(Boolean);
  stages.tujuan = stageRows.tujuan;

  const targetSasaran = await RenstraSasaran.findAll({
    where: {
      renstra_id: renstraId,
      tujuan_id: { [Op.in]: stageIds.tujuan.length > 0 ? stageIds.tujuan : [0] },
    },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.sasaran = targetSasaran.map((row) => normalizeTargetRow(row, "sasaran"));
  stageIds.sasaran = stageRows.sasaran.map((row) => row.target_ref_id).filter(Boolean);
  stages.sasaran = stageRows.sasaran;

  const targetStrategi = await RenstraStrategi.findAll({
    where: {
      renstra_id: renstraId,
      sasaran_id: { [Op.in]: stageIds.sasaran.length > 0 ? stageIds.sasaran : [0] },
    },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.strategi = targetStrategi.map((row) => normalizeTargetRow(row, "strategi"));
  stageIds.strategi = stageRows.strategi.map((row) => row.target_ref_id).filter(Boolean);
  stages.strategi = stageRows.strategi;

  const targetKebijakan = await RenstraKebijakan.findAll({
    where: {
      renstra_id: renstraId,
      strategi_id: { [Op.in]: stageIds.strategi.length > 0 ? stageIds.strategi : [0] },
    },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.kebijakan = targetKebijakan.map((row) => normalizeTargetRow(row, "kebijakan"));
  stageIds.kebijakan = stageRows.kebijakan.map((row) => row.target_ref_id).filter(Boolean);
  stages.kebijakan = stageRows.kebijakan;

  const targetProgram = await RenstraProgram.findAll({
    where: { renstra_id: renstraId },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.program = targetProgram.map((row) => normalizeTargetRow(row, "program"));
  stageIds.program = stageRows.program.map((row) => row.target_ref_id).filter(Boolean);
  stages.program = stageRows.program;

  const targetKegiatan = await RenstraKegiatan.findAll({
    where: {
      renstra_id: renstraId,
      program_id: { [Op.in]: stageIds.program.length > 0 ? stageIds.program : [0] },
    },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.kegiatan = targetKegiatan.map((row) => normalizeTargetRow(row, "kegiatan"));
  stageIds.kegiatan = stageRows.kegiatan.map((row) => row.target_ref_id).filter(Boolean);
  stages.kegiatan = stageRows.kegiatan;

  const targetSubKegiatan = await RenstraSubkegiatan.findAll({
    where: {
      renstra_program_id: {
        [Op.in]: stageIds.program.length > 0 ? stageIds.program : [0],
      },
      kegiatan_id: { [Op.in]: stageIds.kegiatan.length > 0 ? stageIds.kegiatan : [0] },
    },
    raw: true,
    order: [["id", "ASC"]],
  });

  stageRows.sub_kegiatan = targetSubKegiatan.map((row) => normalizeTargetRow(row, "sub_kegiatan"));
  stageIds.sub_kegiatan = stageRows.sub_kegiatan
    .map((row) => row.target_ref_id)
    .filter(Boolean);
  stages.sub_kegiatan = stageRows.sub_kegiatan;

  return {
    stages,
    stageRows,
    stageIds,
  };
}

async function buildIndicatorTargetTree({
  renstraId,
  structuralStageIds,
  includePagu,
  paguCacheMap,
  warnings,
}) {
  const stages = {};
  const stageIds = {};

  for (const indicatorStage of INDICATOR_STAGE_ORDER) {
    const indicatorCfg = getIndicatorStageConfig(indicatorStage);
    const structuralStage = indicatorCfg?.structural_stage;
    const parentIds = structuralStageIds[structuralStage] || [];

    if (!indicatorCfg) {
      stages[indicatorStage] = [];
      stageIds[indicatorStage] = [];
      continue;
    }

    if (parentIds.length === 0) {
      stages[indicatorStage] = [];
      stageIds[indicatorStage] = [];
      warnings.push({
        stage: indicatorStage,
        code: "RENSTRA_TARGET_TREE_SCOPE_WARNING",
        message: `Indikator ${indicatorStage} tidak dibangun karena parent structural ${structuralStage} belum tersedia.`,
      });
      continue;
    }

    const rows = await IndikatorRenstra.findAll({
      where: {
        renstra_id: renstraId,
        stage: structuralStage,
        ref_id: { [Op.in]: parentIds },
      },
      raw: true,
      order: [["id", "ASC"]],
    });

    const normalized = rows.map((row) => {
      const cacheKey = `${structuralStage}:${safeNumber(row.ref_id)}`;
      const cachedPagu = includePagu ? paguCacheMap.get(cacheKey) || null : null;
      const preparedRow = cachedPagu
        ? { ...row, _pagu_cache_payload: cachedPagu }
        : row;
      return normalizeTargetRow(preparedRow, indicatorStage);
    });

    stages[indicatorStage] = normalized;
    stageIds[indicatorStage] = normalized.map((row) => row.target_ref_id).filter(Boolean);
  }

  return {
    stages,
    stageIds,
  };
}

function collectSummary(stages, includeIndicators, includePagu, paguRowCount) {
  const totalStructuralRows = STRUCTURAL_STAGE_ORDER.reduce(
    (sum, stage) => sum + (stages[stage]?.length || 0),
    0,
  );
  const totalIndicatorRows = includeIndicators
    ? INDICATOR_STAGE_ORDER.reduce((sum, stage) => sum + (stages[stage]?.length || 0), 0)
    : 0;

  return {
    total_structural_rows: totalStructuralRows,
    total_indicator_rows: totalIndicatorRows,
    total_rows: totalStructuralRows + totalIndicatorRows,
    total_pagu_rows: includePagu ? paguRowCount : 0,
  };
}

async function buildRenstraTargetTree({
  renstra_id,
  scope = "all",
  include_indicators = true,
  include_pagu = false,
} = {}) {
  try {
    const errors = [];
    const warnings = [];
    const renstraIdNum = safeNumber(renstra_id);
    const scopeValue = normalizeText(scope) || "all";
    const includeIndicators = Boolean(include_indicators);
    const includePagu = Boolean(include_pagu);

    if (!renstraIdNum || renstraIdNum <= 0) {
      errors.push({
        field: "renstra_id",
        message: "renstra_id wajib diisi dan harus angka positif.",
      });
    }

    if (!VALID_SCOPES.has(scopeValue)) {
      errors.push({
        field: "scope",
        message: `Scope target tidak valid: ${scopeValue}`,
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        code: "RENSTRA_TARGET_TREE_VALIDATION_ERROR",
        message: "Validasi input target tree gagal.",
        errors,
      };
    }

    assertModelAvailable(Renstra, "Renstra");
    assertModelAvailable(RenstraTujuan, "RenstraTujuan");
    assertModelAvailable(RenstraSasaran, "RenstraSasaran");
    assertModelAvailable(RenstraStrategi, "RenstraStrategi");
    assertModelAvailable(RenstraKebijakan, "RenstraKebijakan");
    assertModelAvailable(RenstraProgram, "RenstraProgram");
    assertModelAvailable(RenstraKegiatan, "RenstraKegiatan");
    assertModelAvailable(RenstraSubkegiatan, "RenstraSubkegiatan");
    assertModelAvailable(IndikatorRenstra, "IndikatorRenstra");

    const renstraExists = await Renstra.findByPk(renstraIdNum, { raw: true });
    if (!renstraExists) {
      return {
        success: false,
        code: "RENSTRA_TARGET_TREE_VALIDATION_ERROR",
        message: `Renstra dengan id ${renstraIdNum} tidak ditemukan.`,
        errors: [{ field: "renstra_id", message: "Renstra tidak ditemukan." }],
      };
    }

    const paguCacheMap = await buildPaguCacheMap(renstraIdNum, includePagu, warnings);
    const paguRowCount = includePagu ? paguCacheMap.size : 0;

    const stages = initStageBuckets();
    const structural = await buildStructuralTargetTree({
      renstraId: renstraIdNum,
    });

    stages.tujuan = structural.stages.tujuan;
    stages.sasaran = structural.stages.sasaran;
    stages.strategi = structural.stages.strategi;
    stages.kebijakan = structural.stages.kebijakan;
    stages.program = structural.stages.program;
    stages.kegiatan = structural.stages.kegiatan;
    stages.sub_kegiatan = structural.stages.sub_kegiatan;

    let indicator = {
      stages: initStageBuckets(),
      stageIds: {},
    };

    if (includeIndicators) {
      indicator = await buildIndicatorTargetTree({
        renstraId: renstraIdNum,
        structuralStageIds: {
          tujuan: structural.stageIds.tujuan,
          sasaran: structural.stageIds.sasaran,
          strategi: structural.stageIds.strategi,
          kebijakan: structural.stageIds.kebijakan,
          program: structural.stageIds.program,
          kegiatan: structural.stageIds.kegiatan,
          sub_kegiatan: structural.stageIds.sub_kegiatan,
        },
        includePagu,
        paguCacheMap,
        warnings,
      });

      stages.indikator_tujuan = indicator.stages.indikator_tujuan;
      stages.indikator_sasaran = indicator.stages.indikator_sasaran;
      stages.indikator_strategi = indicator.stages.indikator_strategi;
      stages.indikator_kebijakan = indicator.stages.indikator_kebijakan;
      stages.indikator_program = indicator.stages.indikator_program;
      stages.indikator_kegiatan = indicator.stages.indikator_kegiatan;
      stages.indikator_sub_kegiatan = indicator.stages.indikator_sub_kegiatan;
    }

    const summary = {
      ...collectSummary(stages, includeIndicators, includePagu, paguRowCount),
      warnings,
    };

    return {
      success: true,
      data: {
        renstra_id: renstraIdNum,
        scope: scopeValue,
        include_indicators: includeIndicators,
        include_pagu: includePagu,
        generated_at: new Date().toISOString(),
        stages,
        summary,
      },
    };
  } catch (error) {
    if (error?.code === "RENSTRA_TARGET_TREE_MODEL_NOT_AVAILABLE") {
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      success: false,
      code: "RENSTRA_TARGET_TREE_BUILD_FAILED",
      message: error?.message || "Gagal membangun target tree Renstra.",
    };
  }
}

module.exports = {
  buildRenstraTargetTree,
  normalizeTargetRow,
  buildTargetHash,
  getStageConfig,
  getIndicatorStageConfig,
  buildPaguCacheMap,
  safeNumber,
  normalizeText,
  stableStringify,
};
