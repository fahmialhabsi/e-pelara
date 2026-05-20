"use strict";

const { RpjmdSourceMap } = require("../../models");
const { resolveTargetRefId } = require("./rpjmdSourceMapService");

const VALID_TARGET_MODULE = "RENSTRA";

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

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "1";
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

function validateResolverQuery(query) {
  const source = query && typeof query === "object" ? query : {};
  const target_module = normalizeText(source.target_module)?.toUpperCase() || null;
  const renstra_id = safeNumber(source.renstra_id);
  const source_stage = normalizeText(source.source_stage);
  const source_ref_id = safeNumber(source.source_ref_id);
  const target_ref_id = safeNumber(source.target_ref_id);
  const rpjmd_id = safeNumber(source.rpjmd_id);
  const errors = [];

  if (target_module !== VALID_TARGET_MODULE) {
    errors.push({
      field: "target_module",
      message: "Resolver hanya mendukung target_module RENSTRA.",
    });
  }

  if (!renstra_id || renstra_id <= 0) {
    errors.push({
      field: "renstra_id",
      message: "renstra_id wajib diisi dan harus angka positif.",
    });
  }

  if (!source_stage) {
    errors.push({
      field: "source_stage",
      message: "source_stage wajib diisi.",
    });
  }

  if (!source_ref_id || source_ref_id <= 0) {
    errors.push({
      field: "source_ref_id",
      message: "source_ref_id wajib diisi dan harus angka positif.",
    });
  }

  if (target_ref_id !== null && target_ref_id <= 0) {
    errors.push({
      field: "target_ref_id",
      message: "target_ref_id harus angka positif jika disediakan.",
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_DROPDOWN_SCOPE_INVALID",
      message: "Validasi resolver source map gagal.",
      errors,
    };
  }

  return {
    success: true,
    data: {
      rpjmd_id,
      renstra_id,
      target_module: VALID_TARGET_MODULE,
      source_stage,
      source_ref_id,
      target_ref_id,
      include_parent: normalizeBoolean(source.include_parent),
      include_chain: normalizeBoolean(source.include_chain),
    },
  };
}

async function resolveDropdownSourceMap(params) {
  const normalized = validateResolverQuery(params);
  if (!normalized.success) {
    return normalized;
  }

  const query = normalized.data;

  try {
    if (query.rpjmd_id) {
      return resolveTargetRefId({
        rpjmd_id: query.rpjmd_id,
        renstra_id: query.renstra_id,
        target_module: query.target_module,
        source_stage: query.source_stage,
        source_ref_id: query.source_ref_id,
        target_ref_id: query.target_ref_id,
        include_parent: query.include_parent,
        include_chain: query.include_chain,
      });
    }

    const rows = await RpjmdSourceMap.findAll({
      where: {
        renstra_id: query.renstra_id,
        target_module: query.target_module,
        source_stage: query.source_stage,
        source_ref_id: query.source_ref_id,
        ...(query.target_ref_id
          ? {
              target_ref_id: query.target_ref_id,
            }
          : {}),
      },
      order: [
        ["updated_at", "DESC"],
        ["id", "DESC"],
      ],
      raw: true,
    });

    if (rows.length > 1) {
      return {
        success: false,
        code: "RPJMD_SOURCE_MAP_RESOLVER_CONFLICT",
        message: "Resolver menemukan lebih dari satu target untuk source yang sama.",
        data: {
          source_stage: query.source_stage,
          source_ref_id: query.source_ref_id,
        },
      };
    }

    if (rows.length === 0) {
      return {
        success: false,
        code: "RPJMD_SOURCE_MAP_NOT_FOUND",
        message: "Source map belum tersedia untuk source RPJMD ini.",
        data: {
          source_stage: query.source_stage,
          source_ref_id: query.source_ref_id,
        },
      };
    }

    return resolveTargetRefId({
      rpjmd_id: rows[0].rpjmd_id,
      renstra_id: query.renstra_id,
      target_module: query.target_module,
      source_stage: query.source_stage,
      source_ref_id: query.source_ref_id,
      target_ref_id: query.target_ref_id,
      include_parent: query.include_parent,
      include_chain: query.include_chain,
    });
  } catch (error) {
    return {
      success: false,
      code: "RPJMD_SOURCE_MAP_FAILED",
      message: getSafeErrorMessage(error, "Resolver source map gagal."),
    };
  }
}

module.exports = {
  resolveDropdownSourceMap,
  validateResolverQuery,
  getSafeErrorMessage,
};
