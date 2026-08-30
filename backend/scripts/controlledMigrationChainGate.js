"use strict";

const fs = require("fs");
const path = require("path");

const ACTIVE_MIGRATION_DIR = path.join(__dirname, "..", "migrations");
const AUDIT_DATABASE = "epelara_audit_v5";
const AUDIT_HOST = "127.0.0.1";
const PREFIX_RE = /^(\d{8,14}(?:-\d{3})?)[-_].+\.js$/i;
const AUD_003 = "20260218120000-rpjmd-indikator-kode-dedupe-unique.js";
const TABLE_CREATORS = new Set([
  "20260415110001-create-indikatorstrategis.js",
  "20260415110002-create-indikatorarahkebijakans.js",
  "20260415110003-create-indikatorsubkegiatans.js",
]);

function readActiveMigrations() {
  return fs
    .readdirSync(ACTIVE_MIGRATION_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort();
}

function groupPrefixes(files) {
  const groups = new Map();
  for (const file of files) {
    const match = PREFIX_RE.exec(file);
    if (!match) continue;
    const group = groups.get(match[1]) || [];
    group.push(file);
    groups.set(match[1], group);
  }
  return groups;
}

function assertDisposableTarget() {
  if (process.env.EPELARA_MIGRATION_MODE !== "FRESH_DISPOSABLE" && process.env.EPELARA_MIGRATION_MODE !== "UPGRADE_DISPOSABLE") {
    throw new Error("Migration gate blocked: EPELARA_MIGRATION_MODE must be FRESH_DISPOSABLE or UPGRADE_DISPOSABLE.");
  }
  if (process.env.EPELARA_MIGRATION_HOST !== AUDIT_HOST) {
    throw new Error(`Migration gate blocked: EPELARA_MIGRATION_HOST must be ${AUDIT_HOST}.`);
  }
  if (process.env.EPELARA_MIGRATION_DATABASE !== AUDIT_DATABASE) {
    throw new Error(`Migration gate blocked: EPELARA_MIGRATION_DATABASE must be ${AUDIT_DATABASE}.`);
  }
  if (process.env.EPELARA_PRODUCTION_ACCESS === "true") {
    throw new Error("Migration gate blocked: production access marker is true.");
  }
}

function loadAppliedHistory() {
  const historyPath = process.env.EPELARA_APPLIED_HISTORY_FILE;
  if (!historyPath) return null;
  const resolved = path.resolve(historyPath);
  const payload = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (!Array.isArray(payload)) {
    throw new Error("Migration gate blocked: applied history file must contain a JSON array of migration names.");
  }
  return payload.map(String);
}

function evaluate({ files, mode, appliedHistory }) {
  const groups = groupPrefixes(files);
  const duplicates = [...groups.entries()].filter(([, group]) => group.length > 1);
  const decisions = [];
  if (duplicates.length > 0) {
    decisions.push({
      code: "DUPLICATE_ACTIVE_PREFIX",
      status: "BLOCK",
      details: duplicates.map(([prefix, group]) => `${prefix}: ${group.join(" | ")}`).join("; "),
      action: "Do not rename/reorder or silently choose an order; owner/DBA must approve compatibility/forward-fix policy.",
    });
  }

  if (files.includes(AUD_003) && TABLE_CREATORS.size > 0) {
    decisions.push({
      code: "AUD-003_PREMATURE_DEDUPE",
      status: "BLOCK",
      details: `${AUD_003} may operate before ${[...TABLE_CREATORS].join(", ")}`,
      action: "Do not silently skip the old migration. Stop the active chain and use the separately approved forward-fix/compatibility path.",
    });
  }

  if (mode === "UPGRADE_DISPOSABLE" && appliedHistory === null) {
    decisions.push({
      code: "APPLIED_HISTORY_NOT_VERIFIABLE",
      status: "BLOCK",
      details: "No sanitized per-environment applied-history file was provided.",
      action: "Do not infer unapplied state from filenames; provide SequelizeMeta/equivalent history for the target disposable environment.",
    });
  }

  if (mode === "FRESH_DISPOSABLE") {
    decisions.push({
      code: "FRESH_CHAIN_REQUIRES_EXPLICIT_POLICY",
      status: duplicates.length > 0 || files.includes(AUD_003) ? "BLOCK" : "PASS",
      details: "Fresh install must not bypass a known premature migration or duplicate ordering conflict.",
      action: "Use a clean approved baseline or controlled compatibility gate; never silently skip a migration.",
    });
  }

  return { mode, active_count: files.length, duplicates, decisions, allow_active_chain: decisions.every((decision) => decision.status === "PASS") };
}

function main() {
  assertDisposableTarget();
  const files = readActiveMigrations();
  const appliedHistory = loadAppliedHistory();
  const result = evaluate({ files, mode: process.env.EPELARA_MIGRATION_MODE, appliedHistory });
  console.log(JSON.stringify({
    gate: result.allow_active_chain ? "PASS" : "BLOCK",
    mode: result.mode,
    active_count: result.active_count,
    duplicate_prefix_count: result.duplicates.length,
    applied_history: appliedHistory ? "provided_sanitized_file" : "not_provided",
    decisions: result.decisions,
    migration_execution: "NOT_RUN",
    production_access: "NOT_USED",
  }, null, 2));
  if (!result.allow_active_chain) process.exitCode = 2;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

module.exports = { assertDisposableTarget, evaluate, readActiveMigrations };
