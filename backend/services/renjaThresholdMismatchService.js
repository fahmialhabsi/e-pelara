"use strict";

const { enrichRuleRegistry } = require("./renjaGovernanceSeverityService");

const RENJA_THRESHOLD_RULES = [
  {
    code: "TARGET_OUT_OF_RANGE_RENSTRA",
    description: "Deviasi target RENJA terhadap RENSTRA melewati ambang batas.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "TARGET_OUT_OF_RANGE_RKPD",
    description: "Deviasi target RENJA terhadap RKPD melewati ambang batas.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RKPD",
  },
  {
    code: "PAGU_OUT_OF_RANGE_RKPD",
    description: "Deviasi pagu RENJA terhadap RKPD melewati ambang batas.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RKPD",
  },
  {
    code: "PAGU_OUT_OF_RANGE_RENSTRA",
    description: "Deviasi pagu RENJA terhadap RENSTRA melewati ambang batas.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    description: "Indikator RENJA tidak selaras dengan indikator RENSTRA.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "INDIKATOR_NOT_ALIGNED_WITH_RKPD",
    description: "Indikator RENJA tidak selaras dengan indikator RKPD.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RKPD",
  },
  {
    code: "LOW_NAME_SIMILARITY",
    description: "Kemiripan nama antar dokumen terlalu rendah.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "INTERNAL",
  },
  {
    code: "INDIKATOR_MISSING",
    description: "Indikator wajib pada item RENJA belum diisi.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "INTERNAL",
  },
  {
    code: "INDIKATOR_DUPLICATE",
    description: "Terdapat indikator duplikat pada item sejenis.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "INTERNAL",
  },
  {
    code: "INDIKATOR_NOT_TRACEABLE",
    description: "Indikator tidak dapat ditelusuri ke sumber RENSTRA/RKPD.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "INDIKATOR_INCONSISTENT",
    description: "Indikator tidak konsisten dengan referensi sumber.",
    severity: "warning",
    is_blocking: false,
    scope: "item",
    source_type: "RENSTRA",
  },
  {
    code: "INDIKATOR_TARGET_MISSING",
    description: "Target indikator item RENJA belum terisi.",
    severity: "error",
    is_blocking: true,
    scope: "item",
    source_type: "INTERNAL",
  },
];

const DEFAULT_THRESHOLD_CONFIG = {
  target_warning_threshold_pct: 0.2,
  target_error_threshold_pct: 0.5,
  pagu_warning_threshold_pct: 0.1,
  pagu_error_threshold_pct: 0.25,
  indicator_similarity_warning_threshold: 0.8,
  indicator_similarity_error_threshold: 0.5,
  name_similarity_warning_threshold: 0.8,
  name_similarity_error_threshold: 0.5,
};

function normalizeText(x) {
  return String(x || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function deviationPct(expected, actual) {
  const e = Math.abs(toNum(expected));
  const a = Math.abs(toNum(actual));
  if (e === 0 && a === 0) return 0;
  if (e === 0 || a === 0) return 1;
  return Math.abs(a - e) / Math.max(e, a);
}

function makeBigrams(text) {
  const t = normalizeText(text);
  if (t.length <= 1) return [t];
  const out = [];
  for (let i = 0; i < t.length - 1; i += 1) out.push(t.slice(i, i + 2));
  return out;
}

function diceSimilarity(a, b) {
  const A = makeBigrams(a);
  const B = makeBigrams(b);
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const counts = new Map();
  for (const x of A) counts.set(x, (counts.get(x) || 0) + 1);
  let overlap = 0;
  for (const y of B) {
    const c = counts.get(y) || 0;
    if (c > 0) {
      overlap += 1;
      counts.set(y, c - 1);
    }
  }
  return (2 * overlap) / (A.length + B.length);
}

function resolveThresholdConfig(overrides = {}) {
  const env = process.env || {};
  const pick = (key, fallback) => {
    const fromOverride = overrides[key];
    if (Number.isFinite(Number(fromOverride))) return Number(fromOverride);
    if (Number.isFinite(Number(env[key?.toUpperCase()]))) return Number(env[key.toUpperCase()]);
    return fallback;
  };
  return {
    target_warning_threshold_pct: pick("target_warning_threshold_pct", DEFAULT_THRESHOLD_CONFIG.target_warning_threshold_pct),
    target_error_threshold_pct: pick("target_error_threshold_pct", DEFAULT_THRESHOLD_CONFIG.target_error_threshold_pct),
    pagu_warning_threshold_pct: pick("pagu_warning_threshold_pct", DEFAULT_THRESHOLD_CONFIG.pagu_warning_threshold_pct),
    pagu_error_threshold_pct: pick("pagu_error_threshold_pct", DEFAULT_THRESHOLD_CONFIG.pagu_error_threshold_pct),
    indicator_similarity_warning_threshold: pick(
      "indicator_similarity_warning_threshold",
      DEFAULT_THRESHOLD_CONFIG.indicator_similarity_warning_threshold,
    ),
    indicator_similarity_error_threshold: pick(
      "indicator_similarity_error_threshold",
      DEFAULT_THRESHOLD_CONFIG.indicator_similarity_error_threshold,
    ),
    name_similarity_warning_threshold: pick(
      "name_similarity_warning_threshold",
      DEFAULT_THRESHOLD_CONFIG.name_similarity_warning_threshold,
    ),
    name_similarity_error_threshold: pick(
      "name_similarity_error_threshold",
      DEFAULT_THRESHOLD_CONFIG.name_similarity_error_threshold,
    ),
  };
}

function evaluateNumericThreshold({
  expected,
  actual,
  warningThreshold,
  errorThreshold,
  code,
  field_name,
  source_type,
  messageLabel,
  document_pair,
}) {
  const e = toNum(expected);
  const a = toNum(actual);
  if (e <= 0 || a <= 0) return null;
  const pct = deviationPct(e, a);
  if (pct <= warningThreshold) return null;
  const severity = pct > errorThreshold ? "error" : "warning";
  return {
    mismatch_code: code,
    severity,
    is_blocking: severity === "error",
    mismatch_scope: "item",
    source_type,
    hierarchy_level: "sub_kegiatan",
    document_pair,
    field_name,
    message: `${messageLabel} deviasi ${(pct * 100).toFixed(2)}%.`,
    recommendation: `Sesuaikan ${field_name} agar deviasi <= ${(warningThreshold * 100).toFixed(0)}%.`,
    expected_value: String(e),
    actual_value: String(a),
    threshold_context: {
      metric: field_name,
      method: "percentage_deviation",
      deviation_pct: Number((pct * 100).toFixed(2)),
      warning_threshold_pct: Number((warningThreshold * 100).toFixed(2)),
      error_threshold_pct: Number((errorThreshold * 100).toFixed(2)),
    },
  };
}

function evaluateTextSimilarity({
  expected,
  actual,
  warningThreshold,
  errorThreshold,
  code,
  field_name,
  source_type,
  messageLabel,
  document_pair,
}) {
  const exp = normalizeText(expected);
  const act = normalizeText(actual);
  if (!exp || !act) return null;
  const similarity = diceSimilarity(exp, act);
  if (similarity >= warningThreshold) return null;
  const severity = similarity < errorThreshold ? "error" : "warning";
  return {
    mismatch_code: code,
    severity,
    is_blocking: severity === "error",
    mismatch_scope: "item",
    source_type,
    hierarchy_level: "sub_kegiatan",
    document_pair,
    field_name,
    message: `${messageLabel} similarity ${similarity.toFixed(3)} di bawah batas.`,
    recommendation: `Sesuaikan ${field_name} sesuai sumber referensi.`,
    expected_value: String(expected || ""),
    actual_value: String(actual || ""),
    threshold_context: {
      metric: field_name,
      method: "dice_similarity",
      similarity: Number(similarity.toFixed(4)),
      warning_threshold: Number(warningThreshold.toFixed(4)),
      error_threshold: Number(errorThreshold.toFixed(4)),
    },
  };
}

function compareIndicatorAlignment({
  expectedIndicatorId = null,
  actualIndicatorId = null,
  expectedText = null,
  actualText = null,
  warningThreshold,
  errorThreshold,
  code,
  source_type,
  document_pair,
}) {
  const expTxt = normalizeText(expectedText);
  const actTxt = normalizeText(actualText);
  const hasId = (v) => v !== null && v !== undefined && String(v) !== "" && Number.isFinite(Number(v));

  if (hasId(expectedIndicatorId) && hasId(actualIndicatorId) && Number(expectedIndicatorId) === Number(actualIndicatorId)) {
    return null;
  }

  if (hasId(expectedIndicatorId) && hasId(actualIndicatorId) && Number(expectedIndicatorId) !== Number(actualIndicatorId)) {
    return {
      mismatch_code: code,
      severity: "warning",
      is_blocking: false,
      mismatch_scope: "item",
      source_type,
      hierarchy_level: "sub_kegiatan",
      document_pair,
      field_name: "indikator",
      message: "ID indikator tidak selaras dengan referensi sumber.",
      recommendation: "Selaraskan referensi indikator terhadap sumber resmi.",
      expected_value: String(expectedIndicatorId),
      actual_value: String(actualIndicatorId),
      threshold_context: {
        metric: "indikator",
        method: "indicator_id_compare",
        expected_indicator_id: Number(expectedIndicatorId),
        actual_indicator_id: Number(actualIndicatorId),
      },
    };
  }

  if ((!expTxt && actTxt) || (expTxt && !actTxt)) {
    return {
      mismatch_code: code,
      severity: "warning",
      is_blocking: false,
      mismatch_scope: "item",
      source_type,
      hierarchy_level: "sub_kegiatan",
      document_pair,
      field_name: "indikator",
      message: "Padanan indikator belum lengkap antara RENJA dan sumber.",
      recommendation: "Lengkapi referensi indikator atau sesuaikan indikator item.",
      expected_value: expectedText == null ? null : String(expectedText),
      actual_value: actualText == null ? null : String(actualText),
      threshold_context: {
        metric: "indikator",
        method: "indicator_missing_pair",
      },
    };
  }

  return evaluateTextSimilarity({
    expected: expectedText,
    actual: actualText,
    warningThreshold,
    errorThreshold,
    code,
    field_name: "indikator",
    source_type,
    messageLabel: source_type === "RENSTRA" ? "Indikator RENJA vs RENSTRA" : "Indikator RENJA vs RKPD",
    document_pair,
  });
}

function evaluateThresholdForItem({
  item,
  rkpdItem = null,
  renstraTarget = null,
  renstraPagu = null,
  renstraIndicator = null,
  cfg,
}) {
  const issues = [];
  const targetRenja = toNum(item.target_numerik ?? item.target);
  const paguRenja = toNum(item.pagu_indikatif ?? item.pagu);
  const renstraIndicatorRef =
    renstraIndicator && typeof renstraIndicator === "object"
      ? {
          id: renstraIndicator.id ?? null,
          nama: renstraIndicator.nama || renstraIndicator.nama_indikator || null,
        }
      : { id: null, nama: renstraIndicator || null };

  if (Number(renstraTarget) > 0 && targetRenja > 0) {
    const x = evaluateNumericThreshold({
      expected: renstraTarget,
      actual: targetRenja,
      warningThreshold: cfg.target_warning_threshold_pct,
      errorThreshold: cfg.target_error_threshold_pct,
      code: "TARGET_OUT_OF_RANGE_RENSTRA",
      field_name: "target_numerik",
      source_type: "RENSTRA",
      messageLabel: "Target RENJA vs RENSTRA",
      document_pair: "RENSTRA-RENJA",
    });
    if (x) issues.push(x);
  }

  if (rkpdItem) {
    const targetRkpd = toNum(rkpdItem.target);
    const paguRkpd = toNum(rkpdItem.pagu);

    if (targetRkpd > 0 && targetRenja > 0) {
      const x = evaluateNumericThreshold({
        expected: targetRkpd,
        actual: targetRenja,
        warningThreshold: cfg.target_warning_threshold_pct,
        errorThreshold: cfg.target_error_threshold_pct,
        code: "TARGET_OUT_OF_RANGE_RKPD",
        field_name: "target_numerik",
        source_type: "RKPD",
        messageLabel: "Target RENJA vs RKPD",
        document_pair: "RKPD-RENJA",
      });
      if (x) issues.push(x);
    }

    if (paguRkpd > 0 && paguRenja > 0) {
      const x = evaluateNumericThreshold({
        expected: paguRkpd,
        actual: paguRenja,
        warningThreshold: cfg.pagu_warning_threshold_pct,
        errorThreshold: cfg.pagu_error_threshold_pct,
        code: "PAGU_OUT_OF_RANGE_RKPD",
        field_name: "pagu_indikatif",
        source_type: "RKPD",
        messageLabel: "Pagu RENJA vs RKPD",
        document_pair: "RKPD-RENJA",
      });
      if (x) issues.push(x);
    }

    const indikatorRkpd = rkpdItem.indikator;
    const indRkpdIssue = compareIndicatorAlignment({
      expectedText: indikatorRkpd,
      actualText: item.indikator,
      warningThreshold: cfg.indicator_similarity_warning_threshold,
      errorThreshold: cfg.indicator_similarity_error_threshold,
      code: "INDIKATOR_NOT_ALIGNED_WITH_RKPD",
      source_type: "RKPD",
      document_pair: "RKPD-RENJA",
    });
    if (indRkpdIssue) issues.push(indRkpdIssue);

    const nameIssue = evaluateTextSimilarity({
      expected: rkpdItem.sub_kegiatan || rkpdItem.kegiatan || rkpdItem.program,
      actual: item.sub_kegiatan || item.kegiatan || item.program,
      warningThreshold: cfg.name_similarity_warning_threshold,
      errorThreshold: cfg.name_similarity_error_threshold,
      code: "LOW_NAME_SIMILARITY",
      field_name: "sub_kegiatan",
      source_type: "INTERNAL",
      messageLabel: "Kemiripan nama RENJA vs RKPD",
      document_pair: "RKPD-RENJA",
    });
    if (nameIssue) issues.push(nameIssue);
  }

  if (Number(renstraPagu) > 0 && paguRenja > 0) {
    const x = evaluateNumericThreshold({
      expected: renstraPagu,
      actual: paguRenja,
      warningThreshold: cfg.pagu_warning_threshold_pct,
      errorThreshold: cfg.pagu_error_threshold_pct,
      code: "PAGU_OUT_OF_RANGE_RENSTRA",
      field_name: "pagu_indikatif",
      source_type: "RENSTRA",
      messageLabel: "Pagu RENJA vs RENSTRA",
      document_pair: "RENSTRA-RENJA",
    });
    if (x) issues.push(x);
  }

  const indRenstraIssue = compareIndicatorAlignment({
    expectedIndicatorId: renstraIndicatorRef.id,
    actualIndicatorId: item.source_indikator_renstra_id || null,
    expectedText: renstraIndicatorRef.nama,
    actualText: item.indikator,
    warningThreshold: cfg.indicator_similarity_warning_threshold,
    errorThreshold: cfg.indicator_similarity_error_threshold,
    code: "INDIKATOR_NOT_ALIGNED_WITH_RENSTRA",
    source_type: "RENSTRA",
    document_pair: "RENSTRA-RENJA",
  });
  if (indRenstraIssue) issues.push(indRenstraIssue);

  return issues;
}

module.exports = {
  RENJA_THRESHOLD_RULES: enrichRuleRegistry(RENJA_THRESHOLD_RULES),
  DEFAULT_THRESHOLD_CONFIG,
  normalizeText,
  deviationPct,
  diceSimilarity,
  resolveThresholdConfig,
  evaluateNumericThreshold,
  evaluateTextSimilarity,
  compareIndicatorAlignment,
  evaluateThresholdForItem,
};
