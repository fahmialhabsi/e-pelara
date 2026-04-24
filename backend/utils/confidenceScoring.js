"use strict";

function toConfidenceLabel(score) {
  const s = Number(score || 0);
  if (s >= 0.85) return "HIGH";
  if (s >= 0.65) return "MEDIUM";
  return "LOW";
}

function canAutoApply(score, opts = {}) {
  const min = Number(opts.minAutoApplyScore ?? 0.85);
  return Number(score || 0) >= min;
}

function buildConfidence(score, opts = {}) {
  const numeric = Number(Number(score || 0).toFixed(4));
  const confidence = toConfidenceLabel(numeric);
  const auto = canAutoApply(numeric, opts);
  return {
    score: numeric,
    confidence,
    can_auto_apply: auto && confidence === "HIGH",
  };
}

module.exports = {
  toConfidenceLabel,
  canAutoApply,
  buildConfidence,
};

