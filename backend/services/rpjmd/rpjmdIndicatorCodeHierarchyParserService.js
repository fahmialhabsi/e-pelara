"use strict";

const PREFIX_CONFIGS = [
  { prefix: "ISK", level: "sub_kegiatan", parent_prefix: "IK", parent_level: "kegiatan" },
  { prefix: "IST", level: "strategi", parent_prefix: "IS", parent_level: "sasaran" },
  { prefix: "IP", level: "program", parent_prefix: "AR", parent_level: "kebijakan" },
  { prefix: "IK", level: "kegiatan", parent_prefix: "IP", parent_level: "program" },
  { prefix: "AR", level: "kebijakan", parent_prefix: "IST", parent_level: "strategi" },
  { prefix: "IS", level: "sasaran", parent_prefix: "IT", parent_level: "tujuan" },
  { prefix: "IT", level: "tujuan", parent_prefix: null, parent_level: null },
];

const PREFIX_ORDER = [...PREFIX_CONFIGS]
  .sort((a, b) => b.prefix.length - a.prefix.length)
  .map((item) => item.prefix);

function normalizeIndicatorCode(code) {
  if (code === null || code === undefined) {
    return null;
  }

  const text = String(code)
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, "");

  if (!text) {
    return null;
  }

  return text;
}

function splitIndicatorCode(normalizedCode) {
  if (!normalizedCode) {
    return { prefix: null, body: null };
  }

  for (const prefix of PREFIX_ORDER) {
    if (normalizedCode.startsWith(prefix)) {
      const body = normalizedCode.slice(prefix.length);
      return {
        prefix,
        body: body || null,
      };
    }
  }

  return {
    prefix: null,
    body: normalizedCode,
  };
}

function getPrefixConfig(prefix) {
  if (!prefix) {
    return null;
  }

  return PREFIX_CONFIGS.find((item) => item.prefix === prefix) || null;
}

function buildCodeFromParts(prefix, bodyParts) {
  const body = Array.isArray(bodyParts)
    ? bodyParts.filter((item) => item !== null && item !== undefined && String(item).trim() !== "").join("-")
    : "";

  if (!prefix || !body) {
    return null;
  }

  return `${prefix}${body}`;
}

function getIndicatorLevel(code) {
  const parsed = parseIndicatorCode(code);
  return parsed.level || null;
}

function deriveParentIndicatorCode(code) {
  const parsed = parseIndicatorCode(code);
  return parsed.parent_indicator_code || null;
}

function deriveHierarchyKey(code) {
  const parsed = parseIndicatorCode(code);
  if (!parsed.is_valid) {
    return null;
  }

  return [
    parsed.level,
    parsed.prefix,
    parsed.body,
    parsed.parent_indicator_code || "",
    parsed.grand_parent_indicator_code || "",
  ].join("|");
}

function isChildOf(childCode, parentCode) {
  const child = parseIndicatorCode(childCode);
  const parent = parseIndicatorCode(parentCode);

  if (!child.is_valid || !parent.is_valid) {
    return false;
  }

  let current = child.parent_indicator_code || null;
  while (current) {
    if (normalizeIndicatorCode(current) === normalizeIndicatorCode(parent.code)) {
      return true;
    }

    const next = parseIndicatorCode(current);
    current = next.parent_indicator_code || null;
  }

  return false;
}

function parseIndicatorCode(code) {
  const normalized = normalizeIndicatorCode(code);
  if (!normalized) {
    return {
      raw_code: code ?? null,
      code: null,
      prefix: null,
      level: null,
      body: null,
      parent_prefix: null,
      parent_level: null,
      parent_indicator_code: null,
      grand_parent_indicator_code: null,
      is_valid: false,
    };
  }

  const { prefix, body } = splitIndicatorCode(normalized);
  const config = getPrefixConfig(prefix);
  if (!config || !body) {
    return {
      raw_code: code ?? null,
      code: normalized,
      prefix: prefix || null,
      level: config?.level || null,
      body: body || null,
      parent_prefix: config?.parent_prefix || null,
      parent_level: config?.parent_level || null,
      parent_indicator_code: null,
      grand_parent_indicator_code: null,
      is_valid: false,
    };
  }

  const bodyParts = body.split("-").filter(Boolean);
  const parentBody = bodyParts.length > 1 ? bodyParts.slice(0, -1) : [];
  const parentIndicatorCode = buildCodeFromParts(config.parent_prefix, parentBody);

  let grandParentIndicatorCode = null;
  if (prefix === "ISK") {
    const grandParentBody = bodyParts.length > 2 ? bodyParts.slice(0, -2) : [];
    grandParentIndicatorCode = buildCodeFromParts("IP", grandParentBody);
  }

  return {
    raw_code: code ?? null,
    code: normalized,
    prefix,
    level: config.level,
    body,
    parent_prefix: config.parent_prefix,
    parent_level: config.parent_level,
    parent_indicator_code: parentIndicatorCode,
    grand_parent_indicator_code: grandParentIndicatorCode,
    is_valid: Boolean(parentIndicatorCode || prefix === "IT"),
  };
}

module.exports = {
  PREFIX_CONFIGS,
  normalizeIndicatorCode,
  parseIndicatorCode,
  getIndicatorLevel,
  deriveParentIndicatorCode,
  deriveHierarchyKey,
  isChildOf,
};
