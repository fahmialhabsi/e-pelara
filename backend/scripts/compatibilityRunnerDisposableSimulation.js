"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Sequelize } = require("sequelize");

const EXPECTED = Object.freeze({
  container: "epelara-audit-v5-mysql",
  host: "127.0.0.1",
  port: 13317,
  database: "epelara_audit_v5",
});

function assertGuard() {
  assert.strictEqual(process.env.EPELARA_COMPAT_MODE, "UPGRADE_DISPOSABLE");
  assert.strictEqual(process.env.EPELARA_COMPAT_HOST, EXPECTED.host);
  assert.strictEqual(process.env.EPELARA_COMPAT_DATABASE, EXPECTED.database);
  assert.strictEqual(process.env.EPELARA_COMPAT_CONTAINER, EXPECTED.container);
  assert.strictEqual(process.env.EPELARA_PRODUCTION_ACCESS, "false");
  assert.ok(process.env.EPELARA_COMPAT_PASSWORD, "password must be process-injected");
}

async function main() {
  assertGuard();
  const fixturePath = path.join(__dirname, "..", "..", "audit", "fixtures", "sequelize-meta-upgrade-v5.json");
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.strictEqual(fixture.contains_credentials, false);
  assert.strictEqual(fixture.contains_application_data, false);
  assert.ok(Array.isArray(fixture.migration_names) && fixture.migration_names.length > 0);

  const sequelize = new Sequelize({
    dialect: "mysql",
    host: EXPECTED.host,
    port: EXPECTED.port,
    database: EXPECTED.database,
    username: process.env.EPELARA_COMPAT_USER || "root",
    password: process.env.EPELARA_COMPAT_PASSWORD,
    logging: false,
  });
  const ledgerPath = path.join(os.tmpdir(), `epelara-compat-decision-${process.pid}.json`);
  const historyPath = path.join(os.tmpdir(), `epelara-compat-history-${process.pid}.json`);
  try {
    await sequelize.authenticate();
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.query("CREATE TABLE `SequelizeMeta` (name VARCHAR(255) NOT NULL PRIMARY KEY)");
    for (const name of fixture.migration_names) {
      await sequelize.query("INSERT INTO `SequelizeMeta` (name) VALUES (?)", { replacements: [name] });
    }
    const [rows] = await sequelize.query("SELECT name FROM `SequelizeMeta` ORDER BY name");
    const applied = rows.map((row) => row.name);
    assert.deepStrictEqual(applied, [...fixture.migration_names].sort());
    fs.writeFileSync(historyPath, JSON.stringify(applied, null, 2) + "\n", { mode: 0o600 });

    const gate = spawnSync(process.execPath, [path.join(__dirname, "controlledMigrationChainGate.js")], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        EPELARA_MIGRATION_MODE: "UPGRADE_DISPOSABLE",
        EPELARA_MIGRATION_HOST: EXPECTED.host,
        EPELARA_MIGRATION_DATABASE: EXPECTED.database,
        EPELARA_APPLIED_HISTORY_FILE: historyPath,
        EPELARA_PRODUCTION_ACCESS: "false",
      },
      encoding: "utf8",
    });
    assert.strictEqual(gate.status, 2, "compatibility simulation must block unresolved chain");
    const decision = JSON.parse(gate.stdout);
    assert.strictEqual(decision.gate, "BLOCK");
    assert.strictEqual(decision.applied_history, "provided_sanitized_file");
    assert.ok(decision.decisions.some((item) => item.code === "DUPLICATE_ACTIVE_PREFIX"));
    assert.ok(decision.decisions.some((item) => item.code === "AUD-003_PREMATURE_DEDUPE"));
    assert.ok(!decision.decisions.some((item) => item.code === "APPLIED_HISTORY_NOT_VERIFIABLE"));

    const ledger = {
      mode: "UPGRADE_DISPOSABLE",
      target: EXPECTED,
      applied_history: { source: "sanitized_fixture", count: applied.length, names_hash: require("crypto").createHash("sha256").update(applied.join("\n")).digest("hex") },
      gate: { status: "BLOCK", exit_code: gate.status, silent_skip: false, active_migration_execution: "NOT_RUN" },
      decisions: decision.decisions.map((item) => ({ code: item.code, status: item.status })),
      raw_data_deletion: "NOT_RUN",
      production_access: "NOT_USED",
    };
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + "\n", { mode: 0o600 });
    assert.strictEqual(ledger.gate.silent_skip, false);
    assert.strictEqual(ledger.gate.active_migration_execution, "NOT_RUN");
    console.log("compatibility_applied_history=PASS: sanitized SequelizeMeta reconciled by exact migration name");
    console.log("compatibility_gate=PASS: unresolved duplicate-prefix/AUD-003 conflict explicitly blocked");
    console.log("silent_skip=NOT_OCCURRED");
    console.log("active_migration_execution=NOT_RUN");
    console.log("raw_data_deletion=NOT_RUN");
    console.log("production_access=NOT_USED");
  } finally {
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.close();
    if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);
  }
}

main().catch((error) => {
  console.error(`compatibility runner disposable simulation failed: ${error.message}`);
  process.exitCode = 1;
});
