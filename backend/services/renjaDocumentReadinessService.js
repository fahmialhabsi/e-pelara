"use strict";

const { validateRenjaDocumentBusiness } = require("../validators/renjaBusinessValidator");
const { computeMismatchForDokumen, groupMismatchResults } = require("./renjaMismatchEngineService");
const { classifyGovernance, enrichRuleRegistry } = require("./renjaGovernanceSeverityService");

const RENJA_READINESS_RULES = [
  { code: "DOCUMENT_NOT_READY_FOR_SUBMIT", description: "Submit butuh tidak ada blocker validasi", severity: "error", is_blocking: true },
  { code: "DOCUMENT_NOT_READY_FOR_PUBLISH", description: "Publish butuh tidak ada blocker dan section wajib lengkap", severity: "error", is_blocking: true },
];

function groupByScope(results = []) {
  return {
    document: results.filter((x) => x.mismatch_scope === "document"),
    section: results.filter((x) => x.mismatch_scope === "section"),
    item: results.filter((x) => x.mismatch_scope === "item"),
  };
}

async function evaluateReadiness(db, renjaDokumenId, action = "submit", opts = {}) {
  const { RenjaDokumen } = db;
  const q = opts.transaction ? { transaction: opts.transaction } : {};
  const doc = await RenjaDokumen.findByPk(renjaDokumenId, q);
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  const [biz, mismatch] = await Promise.all([
    validateRenjaDocumentBusiness(db, doc, { action }),
    computeMismatchForDokumen(db, renjaDokumenId, opts),
  ]);

  const all = [...(biz.results || []), ...(mismatch.results || [])].map((x) => classifyGovernance(x));
  const blocker = all.filter((x) => x.severity_final === "BLOCKER");
  const warning = all.filter((x) => x.severity_final === "WARNING");
  const info = all.filter((x) => x.severity_final === "INFO");

  const readiness = {
    ready_for_submit: blocker.length === 0,
    ready_for_publish:
      blocker.length === 0 &&
      all.filter((x) => x.mismatch_code === "MISSING_REQUIRED_SECTION").length === 0 &&
      all.filter((x) => x.mismatch_code === "BAB4_ITEM_EMPTY").length === 0,
  };

  return {
    summary: {
      total: all.length,
      blocker_count: blocker.length,
      blocking_count: blocker.length,
      warning_count: warning.length,
      info_count: info.length,
    },
    readiness,
    grouped_results: groupByScope(all),
    ...groupMismatchResults(all),
    next_actions: blocker.slice(0, 10).map((x) => x.recommendation || x.message),
    rule_sets: {
      RENJA_READINESS_RULES: enrichRuleRegistry(RENJA_READINESS_RULES),
      ...(biz.rule_sets || {}),
      ...(mismatch.rule_sets || {}),
    },
    results: all,
  };
}

module.exports = {
  RENJA_READINESS_RULES,
  evaluateReadiness,
};
