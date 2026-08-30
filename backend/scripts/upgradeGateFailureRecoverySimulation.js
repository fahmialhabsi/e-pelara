"use strict";

const assert = require("assert");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Sequelize } = require("sequelize");

const TARGET = Object.freeze({
  container: "epelara-audit-v5-mysql",
  host: "127.0.0.1",
  port: 13317,
  database: "epelara_audit_v5",
});
const APPLIED = Object.freeze([
  "20260415110001-create-indikatorstrategis.js",
  "20260415110002-create-indikatorarahkebijakans.js",
  "20260415110003-create-indikatorsubkegiatans.js",
]);

function assertGuard() {
  assert.strictEqual(process.env.EPELARA_RECOVERY_MODE, "DISPOSABLE_ONLY");
  assert.strictEqual(process.env.EPELARA_RECOVERY_HOST, TARGET.host);
  assert.strictEqual(process.env.EPELARA_RECOVERY_DATABASE, TARGET.database);
  assert.strictEqual(process.env.EPELARA_RECOVERY_CONTAINER, TARGET.container);
  assert.strictEqual(process.env.EPELARA_PRODUCTION_ACCESS, "false");
  assert.ok(process.env.EPELARA_RECOVERY_PASSWORD, "password must be process-injected");
}

function rowsToNames(rows) {
  return rows.map((row) => row.name).sort();
}

async function main() {
  assertGuard();
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: TARGET.host,
    port: TARGET.port,
    database: TARGET.database,
    username: process.env.EPELARA_RECOVERY_USER || "root",
    password: process.env.EPELARA_RECOVERY_PASSWORD,
    logging: false,
  });
  const historyFile = path.join(os.tmpdir(), `epelara-recovery-history-${process.pid}.json`);
  let dump;
  try {
    await sequelize.authenticate();
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.query("CREATE TABLE `SequelizeMeta` (name VARCHAR(255) NOT NULL PRIMARY KEY)");
    for (const name of APPLIED) {
      await sequelize.query("INSERT INTO `SequelizeMeta` (name) VALUES (?)", { replacements: [name] });
    }
    const [beforeRows] = await sequelize.query("SELECT name FROM `SequelizeMeta` ORDER BY name");
    const beforeNames = rowsToNames(beforeRows);
    fs.writeFileSync(historyFile, JSON.stringify(beforeNames, null, 2) + "\n", { mode: 0o600 });

    dump = execFileSync("docker", ["exec", "-e", `MYSQL_PWD=${process.env.EPELARA_RECOVERY_PASSWORD}`, TARGET.container, "mysqldump", "--no-tablespaces", "-uroot", TARGET.database], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    assert.ok(dump.includes("SequelizeMeta"), "backup must contain synthetic SequelizeMeta");
    console.log("pre_failure_snapshot=PASS: disposable SequelizeMeta dump captured");

    let injectedFailure;
    try {
      await sequelize.transaction(async (transaction) => {
        await sequelize.query("INSERT INTO `SequelizeMeta` (name) VALUES (?)", { replacements: [APPLIED[0]], transaction });
      });
    } catch (error) {
      injectedFailure = error;
    }
    assert.ok(injectedFailure, "duplicate metadata insert must inject a failure");
    const [afterFailureRows] = await sequelize.query("SELECT name FROM `SequelizeMeta` ORDER BY name");
    assert.deepStrictEqual(rowsToNames(afterFailureRows), beforeNames, "transaction failure must preserve metadata rows");
    console.log("injected_failure_rollback=PASS: duplicate metadata failure rolled back without row loss");

    const gate = spawnSync(process.execPath, [path.join(__dirname, "controlledMigrationChainGate.js")], {
      cwd: __dirname,
      env: {
        ...process.env,
        EPELARA_MIGRATION_MODE: "UPGRADE_DISPOSABLE",
        EPELARA_MIGRATION_HOST: TARGET.host,
        EPELARA_MIGRATION_DATABASE: TARGET.database,
        EPELARA_APPLIED_HISTORY_FILE: historyFile,
        EPELARA_PRODUCTION_ACCESS: "false",
      },
      encoding: "utf8",
    });
    assert.strictEqual(gate.status, 2, "controlled gate must block unresolved migration conflict");
    const decision = JSON.parse(gate.stdout);
    assert.strictEqual(decision.gate, "BLOCK");
    assert.ok(decision.decisions.some((item) => item.code === "DUPLICATE_ACTIVE_PREFIX"));
    assert.ok(decision.decisions.some((item) => item.code === "AUD-003_PREMATURE_DEDUPE"));
    assert.ok(!decision.decisions.some((item) => item.code === "APPLIED_HISTORY_NOT_VERIFIABLE"));
    console.log("conflict_gate=PASS: migration conflict blocked explicitly with applied history present");

    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    execFileSync("docker", ["exec", "-i", "-e", `MYSQL_PWD=${process.env.EPELARA_RECOVERY_PASSWORD}`, TARGET.container, "mysql", "-uroot", TARGET.database], { input: dump, stdio: ["pipe", "ignore", "pipe"] });
    const [restoredRows] = await sequelize.query("SELECT name FROM `SequelizeMeta` ORDER BY name");
    assert.deepStrictEqual(rowsToNames(restoredRows), beforeNames, "restore must recover the pre-failure metadata");
    console.log("restore_recovery=PASS: sanitized disposable dump restored applied-history markers");
    console.log("active_migration_execution=NOT_RUN");
    console.log("production_access=NOT_USED");
  } finally {
    await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
    await sequelize.close();
    if (fs.existsSync(historyFile)) fs.unlinkSync(historyFile);
  }
}

main().catch((error) => {
  console.error(`upgrade failure/recovery simulation failed: ${error.message}`);
  process.exitCode = 1;
});
