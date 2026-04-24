"use strict";

const GOVERNANCE_SEVERITY_OVERRIDES = Object.freeze({
  // BLOCKER
  POLICY_CHAIN_BROKEN: "BLOCKER",
  POLICY_CHAIN_INCOMPLETE: "BLOCKER",
  POLICY_CHAIN_EXISTS: "BLOCKER",
  POLICY_CHAIN_CONSISTENT: "BLOCKER",
  PROGRAM_WITHOUT_ARAH_KEBIJAKAN: "BLOCKER",
  ARAH_KEBIJAKAN_WITHOUT_STRATEGI: "BLOCKER",
  STRATEGI_WITHOUT_SASARAN: "BLOCKER",
  SASARAN_WITHOUT_TUJUAN: "BLOCKER",
  TUJUAN_WITHOUT_MISI: "BLOCKER",
  INVALID_PARENT_CHILD: "BLOCKER",
  KEGIATAN_NOT_FOUND: "BLOCKER",
  SUB_KEGIATAN_NOT_FOUND: "BLOCKER",
  RKPD_ITEM_WRONG_DOCUMENT: "BLOCKER",
  INDIKATOR_MISSING: "BLOCKER",
  INDIKATOR_TARGET_MISSING: "BLOCKER",
  MISSING_REQUIRED_SECTION: "BLOCKER",
  BAB4_ITEM_EMPTY: "BLOCKER",
  TARGET_NEGATIVE: "BLOCKER",
  TARGET_INVALID: "BLOCKER",
  PAGU_NEGATIVE: "BLOCKER",
  DOCUMENT_MISSING_RENSTRA: "BLOCKER",
  DOCUMENT_MISSING_RKPD: "BLOCKER",
  DOCUMENT_NOT_READY_FOR_SUBMIT: "BLOCKER",
  DOCUMENT_NOT_READY_FOR_PUBLISH: "BLOCKER",
  PUBLISH_PHASE_MUST_BE_FINAL: "BLOCKER",

  // WARNING
  TARGET_OUT_OF_RANGE_RENSTRA: "WARNING",
  TARGET_OUT_OF_RANGE_RKPD: "WARNING",
  PAGU_OUT_OF_RANGE_RKPD: "WARNING",
  PAGU_OUT_OF_RANGE_RENSTRA: "WARNING",
  STRATEGY_NOT_ALIGNED: "WARNING",
  ARAH_KEBIJAKAN_NOT_ALIGNED: "WARNING",
  INDIKATOR_NOT_ALIGNED_WITH_RENSTRA: "WARNING",
  INDIKATOR_NOT_ALIGNED_WITH_RKPD: "WARNING",
  LOW_NAME_SIMILARITY: "WARNING",
  REQUIRED_RKPD_ITEMS_NOT_PULLED: "WARNING",
  INDIKATOR_NOT_TRACEABLE: "WARNING",
  INDIKATOR_INCONSISTENT: "WARNING",
  INDIKATOR_DUPLICATE: "WARNING",
  RKPD_ITEM_NOT_FOUND: "WARNING",
  RENSTRA_ITEM_NOT_FOUND: "WARNING",

  // INFO
  CODE_CHANGED: "INFO",
  NAME_CHANGED: "INFO",
  MANUAL_OVERRIDE: "INFO",
});

function severityFromLegacy(legacySeverity) {
  const x = String(legacySeverity || "").toLowerCase();
  if (x === "error") return "BLOCKER";
  if (x === "warning") return "WARNING";
  return "INFO";
}

function governanceLevelFromFinal(finalSeverity) {
  if (finalSeverity === "BLOCKER") return "hard";
  if (finalSeverity === "WARNING") return "soft";
  return "informational";
}

function classifyGovernance(input = {}) {
  const code = String(input.mismatch_code || input.code || "");
  const severityFinal =
    GOVERNANCE_SEVERITY_OVERRIDES[code] || input.severity_final || severityFromLegacy(input.severity);
  const governanceLevel = governanceLevelFromFinal(severityFinal);

  return {
    ...input,
    severity_final: severityFinal,
    governance_level: governanceLevel,
    is_blocking: severityFinal === "BLOCKER",
  };
}

function enrichRuleRegistry(rules = []) {
  return (rules || []).map((rule) => {
    const governed = classifyGovernance({
      mismatch_code: rule.code,
      severity: rule.severity,
      is_blocking: rule.is_blocking,
    });
    return {
      ...rule,
      severity_final: governed.severity_final,
      governance_level: governed.governance_level,
      is_blocking: governed.is_blocking,
    };
  });
}

module.exports = {
  GOVERNANCE_SEVERITY_OVERRIDES,
  classifyGovernance,
  enrichRuleRegistry,
};

