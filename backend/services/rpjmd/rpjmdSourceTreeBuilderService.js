"use strict";

const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  RPJMD,
  PeriodeRpjmd,
  Tujuan,
  Sasaran,
  Strategi,
  ArahKebijakan,
  Program,
  Kegiatan,
  SubKegiatan,
  IndikatorTujuan,
  IndikatorSasaran,
  IndikatorStrategi,
  IndikatorArahKebijakan,
  IndikatorProgram,
  IndikatorKegiatan,
  IndikatorSubKegiatan,
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
  if (value === null || value === undefined) return null;
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

function buildSourceHash(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function toPlainRow(row) {
  if (!row) return {};
  if (typeof row.get === "function") {
    return row.get({ plain: true });
  }
  return { ...row };
}

function getStageConfig(stage) {
  const configs = {
    tujuan: {
      source_stage: "tujuan",
      source_table: "tujuan",
      model: Tujuan,
      source_code_field: "no_tujuan",
      source_name_field: "isi_tujuan",
      parent_source_stage: "rpjmd",
      parent_source_ref_field: "rpjmd_id",
      parent_key: "rpjmd_id",
      direct_rpjmd: true,
      structural: true,
    },
    sasaran: {
      source_stage: "sasaran",
      source_table: "sasaran",
      model: Sasaran,
      source_code_field: "nomor",
      source_name_field: "isi_sasaran",
      parent_source_stage: "tujuan",
      parent_source_ref_field: "tujuan_id",
      parent_key: "tujuan_id",
      direct_rpjmd: true,
      structural: true,
    },
    strategi: {
      source_stage: "strategi",
      source_table: "strategi",
      model: Strategi,
      source_code_field: "kode_strategi",
      source_name_field: "deskripsi",
      parent_source_stage: "sasaran",
      parent_source_ref_field: "sasaran_id",
      parent_key: "sasaran_id",
      direct_rpjmd: false,
      structural: true,
    },
    kebijakan: {
      source_stage: "kebijakan",
      source_table: "arah_kebijakan",
      model: ArahKebijakan,
      source_code_field: "kode_arah",
      source_name_field: "deskripsi",
      parent_source_stage: "strategi",
      parent_source_ref_field: "strategi_id",
      parent_key: "strategi_id",
      direct_rpjmd: false,
      structural: true,
    },
    program: {
      source_stage: "program",
      source_table: "program",
      model: Program,
      source_code_field: "kode_program",
      source_name_field: "nama_program",
      parent_source_stage: "sasaran",
      parent_source_ref_field: "sasaran_id",
      parent_key: "sasaran_id",
      direct_rpjmd: false,
      structural: true,
    },
    kegiatan: {
      source_stage: "kegiatan",
      source_table: "kegiatan",
      model: Kegiatan,
      source_code_field: "kode_kegiatan",
      source_name_field: "nama_kegiatan",
      parent_source_stage: "program",
      parent_source_ref_field: "program_id",
      parent_key: "program_id",
      direct_rpjmd: false,
      structural: true,
    },
    sub_kegiatan: {
      source_stage: "sub_kegiatan",
      source_table: "sub_kegiatan",
      model: SubKegiatan,
      source_code_field: "kode_sub_kegiatan",
      source_name_field: "nama_sub_kegiatan",
      parent_source_stage: "kegiatan",
      parent_source_ref_field: "kegiatan_id",
      parent_key: "kegiatan_id",
      direct_rpjmd: false,
      structural: true,
    },
  };

  return configs[stage] || null;
}

function getIndicatorStageConfig(stage) {
  const configs = {
    indikator_tujuan: {
      source_stage: "indikator_tujuan",
      source_table: "indikator_tujuan",
      model: IndikatorTujuan,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "tujuan",
      parent_source_ref_field: "tujuan_id",
      parent_key: "tujuan_id",
      source_stage_parent_model_field: "tujuan_id",
      structural_target_stage: "tujuan",
      indicator: true,
    },
    indikator_sasaran: {
      source_stage: "indikator_sasaran",
      source_table: "indikator_sasaran",
      model: IndikatorSasaran,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "sasaran",
      parent_source_ref_field: "sasaran_id",
      parent_key: "sasaran_id",
      source_stage_parent_model_field: "sasaran_id",
      structural_target_stage: "sasaran",
      indicator: true,
    },
    indikator_strategi: {
      source_stage: "indikator_strategi",
      source_table: "indikator_strategi",
      model: IndikatorStrategi,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "strategi",
      parent_source_ref_field: "strategi_id",
      parent_key: "strategi_id",
      source_stage_parent_model_field: "strategi_id",
      structural_target_stage: "strategi",
      indicator: true,
    },
    indikator_kebijakan: {
      source_stage: "indikator_kebijakan",
      source_table: "indikator_arah_kebijakan",
      model: IndikatorArahKebijakan,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "kebijakan",
      parent_source_ref_field: "arah_kebijakan_id",
      parent_key: "arah_kebijakan_id",
      source_stage_parent_model_field: "arah_kebijakan_id",
      structural_target_stage: "kebijakan",
      indicator: true,
    },
    indikator_program: {
      source_stage: "indikator_program",
      source_table: "indikator_program",
      model: IndikatorProgram,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "program",
      parent_source_ref_field: "program_id",
      parent_key: "program_id",
      source_stage_parent_model_field: "program_id",
      structural_target_stage: "program",
      indicator: true,
    },
    indikator_kegiatan: {
      source_stage: "indikator_kegiatan",
      source_table: "indikator_kegiatan",
      model: IndikatorKegiatan,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "kegiatan",
      parent_source_ref_field: "kegiatan_id",
      parent_key: "kegiatan_id",
      source_stage_parent_model_field: "kegiatan_id",
      structural_target_stage: "kegiatan",
      indicator: true,
    },
    indikator_sub_kegiatan: {
      source_stage: "indikator_sub_kegiatan",
      source_table: "indikator_sub_kegiatan",
      model: IndikatorSubKegiatan,
      source_code_field: "kode_indikator",
      source_name_field: "nama_indikator",
      parent_source_stage: "sub_kegiatan",
      parent_source_ref_field: "sub_kegiatan_id",
      parent_key: "sub_kegiatan_id",
      source_stage_parent_model_field: "sub_kegiatan_id",
      structural_target_stage: "sub_kegiatan",
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

function normalizeSourceRow(row, stage) {
  const cfg = getStageConfig(stage) || getIndicatorStageConfig(stage);
  if (!cfg) {
    throw new Error(`Stage tidak dikenal: ${stage}`);
  }

  const raw = toPlainRow(row);
  const sourceRefId = safeNumber(raw.id);
  const sourceCode = normalizeText(raw[cfg.source_code_field]) || null;
  const sourceName = normalizeText(raw[cfg.source_name_field]) || null;
  const parentRefId = safeNumber(raw[cfg.parent_source_ref_field]);

  const normalizedPayload = cfg.indicator
    ? {
        source_stage: cfg.source_stage,
        source_table: cfg.source_table,
        source_ref_id: sourceRefId,
        source_code: sourceCode,
        source_name: sourceName,
        parent_source_stage: cfg.parent_source_stage,
        parent_source_ref_id: parentRefId,
        baseline: normalizePayloadValue(raw.baseline ?? null),
        satuan: normalizePayloadValue(raw.satuan ?? null),
        target_tahun_1: normalizePayloadValue(raw.target_tahun_1 ?? null),
        target_tahun_2: normalizePayloadValue(raw.target_tahun_2 ?? null),
        target_tahun_3: normalizePayloadValue(raw.target_tahun_3 ?? null),
        target_tahun_4: normalizePayloadValue(raw.target_tahun_4 ?? null),
        target_tahun_5: normalizePayloadValue(raw.target_tahun_5 ?? null),
        target_tahun_6: normalizePayloadValue(raw.target_tahun_6 ?? null),
        pagu_cached: normalizePayloadValue(raw.pagu_cached ?? null),
        periode_id: normalizePayloadValue(raw.periode_id ?? null),
        jenis_dokumen: normalizePayloadValue(raw.jenis_dokumen ?? null),
        tahun: normalizePayloadValue(raw.tahun ?? null),
        target_stage: cfg.structural_target_stage,
      }
    : {
        source_stage: cfg.source_stage,
        source_table: cfg.source_table,
        source_ref_id: sourceRefId,
        source_code: sourceCode,
        source_name: sourceName,
        parent_source_stage: cfg.parent_source_stage,
        parent_source_ref_id: parentRefId,
        periode_id: normalizePayloadValue(raw.periode_id ?? null),
        jenis_dokumen: normalizePayloadValue(raw.jenis_dokumen ?? null),
        tahun: normalizePayloadValue(raw.tahun ?? null),
      };

  const sourceHash = buildSourceHash(normalizedPayload);

  return {
    source_stage: cfg.source_stage,
    source_table: cfg.source_table,
    source_ref_id: sourceRefId,
    source_code: sourceCode,
    source_name: sourceName,
    parent_source_stage: cfg.parent_source_stage,
    parent_source_ref_id: parentRefId,
    parent_key: cfg.parent_key,
    raw,
    normalized_payload: normalizedPayload,
    source_hash: sourceHash,
  };
}

async function resolveRpjmdPeriod(rpjmdRow, warnings) {
  if (!rpjmdRow) return null;

  const periodeAwal = safeNumber(rpjmdRow.periode_awal);
  const periodeAkhir = safeNumber(rpjmdRow.periode_akhir);
  if (!periodeAwal || !periodeAkhir) {
    warnings.push({
      stage: "rpjmd",
      message: "RPJMD tidak memiliki periode_awal/periode_akhir yang valid.",
    });
    return null;
  }

  let periode = await PeriodeRpjmd.findOne({
    where: {
      tahun_awal: periodeAwal,
      tahun_akhir: periodeAkhir,
    },
  });

  if (!periode) {
    periode = await PeriodeRpjmd.findOne({
      where: {
        tahun_awal: { [Op.lte]: periodeAwal },
        tahun_akhir: { [Op.gte]: periodeAkhir },
      },
    });
  }

  if (!periode) {
    warnings.push({
      stage: "periode",
      message:
        "Periode RPJMD tidak ditemukan dari periode_awal/periode_akhir; filter periode_id akan dilewati.",
    });
  }

  return periode || null;
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
    error.code = "RPJMD_SOURCE_TREE_MODEL_NOT_AVAILABLE";
    throw error;
  }
}

async function buildStructuralStageRows({
  stage,
  rpjmdId,
  periodId,
  parentRows,
  warnings,
}) {
  const cfg = getStageConfig(stage);
  assertModelAvailable(cfg?.model, stage);

  const where = {};
  const includePeriod = periodId ? { periode_id: periodId } : {};

  if (cfg.direct_rpjmd) {
    where.rpjmd_id = rpjmdId;
    Object.assign(where, includePeriod);
    where.jenis_dokumen = "rpjmd";
  } else {
    const parentIds = parentRows.map((row) => safeNumber(row.source_ref_id)).filter(Boolean);
    if (parentIds.length === 0) return [];

    where[cfg.parent_source_ref_field] = { [Op.in]: parentIds };
    Object.assign(where, includePeriod);
    where.jenis_dokumen = "rpjmd";

    warnings.push({
      stage,
      message: `Filter ${stage} menggunakan parent chain ${cfg.parent_source_ref_field}.`,
    });
  }

  const rows = await cfg.model.findAll({ where, raw: true });
  return rows.map((row) => normalizeSourceRow(row, stage));
}

async function buildIndicatorStageRows({
  stage,
  rpjmdId,
  periodId,
  parentRows,
  warnings,
}) {
  const cfg = getIndicatorStageConfig(stage);
  assertModelAvailable(cfg?.model, stage);

  const parentIds = parentRows.map((row) => safeNumber(row.source_ref_id)).filter(Boolean);
  if (parentIds.length === 0) return [];

  const where = {
    [cfg.source_stage_parent_model_field]: { [Op.in]: parentIds },
    jenis_dokumen: "rpjmd",
  };

  if (periodId) {
    where.periode_id = periodId;
  } else {
    where.rpjmd_id = rpjmdId;
  }

  warnings.push({
    stage,
    message: `Filter ${stage} menggunakan parent chain ${cfg.source_stage_parent_model_field}.`,
  });

  const rows = await cfg.model.findAll({ where, raw: true });
  return rows.map((row) => normalizeSourceRow(row, stage));
}

function collectSummary(stages, includeIndicators) {
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
  };
}

async function buildRpjmdSourceTree({
  rpjmd_id,
  scope = "all",
  include_indicators = true,
} = {}) {
  try {
    const errors = [];
    const scopeValue = normalizeText(scope) || "all";
    const rpjmdIdNum = safeNumber(rpjmd_id);
    const includeIndicators = Boolean(include_indicators);

    if (!rpjmdIdNum || rpjmdIdNum <= 0) {
      errors.push({
        field: "rpjmd_id",
        message: "rpjmd_id wajib diisi dan harus angka positif.",
      });
    }

    if (!VALID_SCOPES.has(scopeValue)) {
      errors.push({
        field: "scope",
        message: `Scope tidak valid: ${scopeValue}`,
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        code: "RPJMD_SOURCE_TREE_VALIDATION_ERROR",
        message: "Validasi input source tree gagal.",
        errors,
      };
    }

    assertModelAvailable(RPJMD, "RPJMD");
    assertModelAvailable(PeriodeRpjmd, "PeriodeRpjmd");

    const rpjmdRow = await RPJMD.findByPk(rpjmdIdNum, { raw: true });
    if (!rpjmdRow) {
      return {
        success: false,
        code: "RPJMD_SOURCE_TREE_VALIDATION_ERROR",
        message: `RPJMD dengan id ${rpjmdIdNum} tidak ditemukan.`,
        errors: [{ field: "rpjmd_id", message: "RPJMD tidak ditemukan." }],
      };
    }

    const warnings = [];
    const period = await resolveRpjmdPeriod(rpjmdRow, warnings);
    const periodId = safeNumber(period?.id);

    const stages = initStageBuckets();

    stages.tujuan = await buildStructuralStageRows({
      stage: "tujuan",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: [],
      warnings,
    });

    stages.sasaran = await buildStructuralStageRows({
      stage: "sasaran",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.tujuan,
      warnings,
    });

    stages.strategi = await buildStructuralStageRows({
      stage: "strategi",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.sasaran,
      warnings,
    });

    stages.kebijakan = await buildStructuralStageRows({
      stage: "kebijakan",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.strategi,
      warnings,
    });

    stages.program = await buildStructuralStageRows({
      stage: "program",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.sasaran,
      warnings,
    });

    stages.kegiatan = await buildStructuralStageRows({
      stage: "kegiatan",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.program,
      warnings,
    });

    stages.sub_kegiatan = await buildStructuralStageRows({
      stage: "sub_kegiatan",
      rpjmdId: rpjmdIdNum,
      periodId,
      parentRows: stages.kegiatan,
      warnings,
    });

    if (includeIndicators) {
      stages.indikator_tujuan = await buildIndicatorStageRows({
        stage: "indikator_tujuan",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.tujuan,
        warnings,
      });

      stages.indikator_sasaran = await buildIndicatorStageRows({
        stage: "indikator_sasaran",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.sasaran,
        warnings,
      });

      stages.indikator_strategi = await buildIndicatorStageRows({
        stage: "indikator_strategi",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.strategi,
        warnings,
      });

      stages.indikator_kebijakan = await buildIndicatorStageRows({
        stage: "indikator_kebijakan",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.kebijakan,
        warnings,
      });

      stages.indikator_program = await buildIndicatorStageRows({
        stage: "indikator_program",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.program,
        warnings,
      });

      stages.indikator_kegiatan = await buildIndicatorStageRows({
        stage: "indikator_kegiatan",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.kegiatan,
        warnings,
      });

      stages.indikator_sub_kegiatan = await buildIndicatorStageRows({
        stage: "indikator_sub_kegiatan",
        rpjmdId: rpjmdIdNum,
        periodId,
        parentRows: stages.sub_kegiatan,
        warnings,
      });
    }

    const summary = {
      ...collectSummary(stages, includeIndicators),
      warnings,
    };

    return {
      success: true,
      data: {
        rpjmd_id: rpjmdIdNum,
        scope: scopeValue,
        include_indicators: includeIndicators,
        generated_at: new Date().toISOString(),
        stages,
        summary,
      },
    };
  } catch (error) {
    if (error?.code === "RPJMD_SOURCE_TREE_MODEL_NOT_AVAILABLE") {
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }

    return {
      success: false,
      code: "RPJMD_SOURCE_TREE_BUILD_FAILED",
      message: error?.message || "Gagal membangun source tree RPJMD.",
    };
  }
}

module.exports = {
  buildRpjmdSourceTree,
  normalizeSourceRow,
  buildSourceHash,
  // helper exports untuk kebutuhan internal/test ringan bila diperlukan
  getStageConfig,
  getIndicatorStageConfig,
  safeNumber,
  normalizeText,
  stableStringify,
};
