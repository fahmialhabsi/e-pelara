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
  network: "epelara-audit-v5-net",
});

function assertGuard() {
  assert.strictEqual(process.env.EPELARA_UPGRADE_MODE, "UPGRADE_DISPOSABLE");
  assert.strictEqual(process.env.EPELARA_UPGRADE_HOST, EXPECTED.host);
  assert.strictEqual(process.env.EPELARA_UPGRADE_DATABASE, EXPECTED.database);
  assert.strictEqual(process.env.EPELARA_UPGRADE_CONTAINER, EXPECTED.container);
  assert.ok(process.env.EPELARA_UPGRADE_PASSWORD, "password must be process-injected");
}

async function main() {
  assertGuard();
  const sanitizedHistory = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "audit", "fixtures", "sequelize-meta-upgrade-v5.json"), "utf8"));
  assert.strictEqual(sanitizedHistory.contains_credentials, false);
  assert.strictEqual(sanitizedHistory.contains_application_data, false);
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: EXPECTED.host,
    port: EXPECTED.port,
    database: EXPECTED.database,
    username: process.env.EPELARA_UPGRADE_USER || "root",
    password: process.env.EPELARA_UPGRADE_PASSWORD,
    logging: false,
  });
  const historyFile = path.join(os.tmpdir(), `epelara-sanitized-sequelizemeta-${process.pid}.json`);
  try {
    await sequelize.authenticate();
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.query("CREATE TABLE `SequelizeMeta` (name VARCHAR(255) NOT NULL PRIMARY KEY)");
    for (const name of sanitizedHistory.migration_names) {
      await sequelize.query("INSERT INTO `SequelizeMeta` (name) VALUES (?)", { replacements: [name] });
    }
    const [historyRows] = await sequelize.query("SELECT name FROM `SequelizeMeta` ORDER BY name");
    assert.deepStrictEqual(historyRows.map((row) => row.name), [...sanitizedHistory.migration_names].sort());
    fs.writeFileSync(historyFile, JSON.stringify(historyRows.map((row) => row.name), null, 2) + "\n", { mode: 0o600 });

    const result = spawnSync(process.execPath, [path.join(__dirname, "controlledMigrationChainGate.js")], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        EPELARA_MIGRATION_MODE: "UPGRADE_DISPOSABLE",
        EPELARA_MIGRATION_HOST: EXPECTED.host,
        EPELARA_MIGRATION_DATABASE: EXPECTED.database,
        EPELARA_APPLIED_HISTORY_FILE: historyFile,
        EPELARA_PRODUCTION_ACCESS: "false",
      },
      encoding: "utf8",
    });
    assert.strictEqual(result.status, 2, "controlled gate must block unresolved active chain");
    const decision = JSON.parse(result.stdout);
    assert.strictEqual(decision.gate, "BLOCK");
    assert.strictEqual(decision.mode, "UPGRADE_DISPOSABLE");
    assert.strictEqual(decision.applied_history, "provided_sanitized_file");
    assert.ok(decision.decisions.some((item) => item.code === "DUPLICATE_ACTIVE_PREFIX"));
    assert.ok(decision.decisions.some((item) => item.code === "AUD-003_PREMATURE_DEDUPE"));
    assert.ok(!decision.decisions.some((item) => item.code === "APPLIED_HISTORY_NOT_VERIFIABLE"));
    console.log("sanitized_sequelize_meta=PASS: three migration names loaded with no credentials/application data");
    console.log("upgrade_gate=PASS: applied history accepted but unresolved active chain explicitly blocked");
    console.log("active_migration_execution=NOT_RUN");
    console.log("production_access=NOT_USED");
  } finally {
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.close();
    if (fs.existsSync(historyFile)) fs.unlinkSync(historyFile);
  }
}

main().catch((error) => {
  console.error(`upgrade gate disposable simulation failed: ${error.message}`);
  process.exitCode = 1;
});
