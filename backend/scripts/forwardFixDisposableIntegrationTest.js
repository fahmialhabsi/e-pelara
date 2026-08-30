"use strict";

const assert = require("assert");
const { Sequelize } = require("sequelize");
const draft = require("../migrations/drafts/20260830120000-rpjmd-indicator-unique-forward-fix.draft.js");

const EXPECTED = Object.freeze({
  host: "127.0.0.1",
  database: "epelara_audit_v5",
  mode: "DISPOSABLE_ONLY",
  approved: "true",
  tables: ["indikatorstrategis", "indikatorarahkebijakans", "indikatorsubkegiatans"],
});

function assertEnvironment() {
  assert.strictEqual(process.env.EPELARA_TEST_HOST, EXPECTED.host, "test host must be loopback");
  assert.strictEqual(process.env.EPELARA_TEST_DATABASE, EXPECTED.database, "test database must be audit disposable");
  assert.strictEqual(process.env.EPELARA_FORWARD_FIX_MODE, EXPECTED.mode, "draft mode must be disposable only");
  assert.strictEqual(process.env.EPELARA_AUDIT_DATABASE, EXPECTED.database, "draft audit database must match target");
  assert.strictEqual(process.env.EPELARA_AUDIT_HOST, EXPECTED.host, "draft audit host must be loopback");
  assert.strictEqual(process.env.EPELARA_FORWARD_FIX_APPROVED, EXPECTED.approved, "approval flag must be explicit for disposable test");
  assert.ok(process.env.EPELARA_TEST_PASSWORD, "test password must be injected, never committed");
}

function queryInterfaceFor(sequelize) {
  return sequelize.getQueryInterface();
}

async function tableCount(sequelize) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('indikatorstrategis','indikatorarahkebijakans','indikatorsubkegiatans')",
  );
  return Number(rows[0].count);
}

async function indexNames(sequelize, table) {
  const [rows] = await sequelize.query(
    "SELECT DISTINCT INDEX_NAME AS name FROM information_schema.statistics WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME <> 'PRIMARY'",
    { replacements: [table] },
  );
  return rows.map((row) => row.name).sort();
}

async function createRepresentativeSchema(sequelize) {
  for (const table of EXPECTED.tables) {
    await sequelize.query(`CREATE TABLE \`${table}\` (id INT NOT NULL AUTO_INCREMENT, kode_indikator VARCHAR(100) NOT NULL, jenis_dokumen VARCHAR(50) NOT NULL, tahun VARCHAR(10) NOT NULL, PRIMARY KEY (id))`);
  }
  await sequelize.query("INSERT INTO `indikatorstrategis` (kode_indikator, jenis_dokumen, tahun) VALUES ('SYN-A-001', 'RPJMD', '2025')");
  await sequelize.query("INSERT INTO `indikatorarahkebijakans` (kode_indikator, jenis_dokumen, tahun) VALUES ('A-SYN-001', 'RPJMD', '2025')");
  await sequelize.query("INSERT INTO `indikatorsubkegiatans` (kode_indikator, jenis_dokumen, tahun) VALUES ('SK-SYN-001', 'RPJMD', '2025')");
}

async function cleanup(sequelize) {
  for (const table of [...EXPECTED.tables].reverse()) {
    await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
}

async function main() {
  assertEnvironment();
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: process.env.EPELARA_TEST_HOST,
    port: Number(process.env.EPELARA_TEST_PORT || 3306),
    database: process.env.EPELARA_TEST_DATABASE,
    username: process.env.EPELARA_TEST_USER,
    password: process.env.EPELARA_TEST_PASSWORD,
    logging: false,
  });
  try {
    await sequelize.authenticate();
    await cleanup(sequelize);
    assert.strictEqual(await tableCount(sequelize), 0, "empty scenario must start with zero target tables");

    let emptyFailure;
    try {
      await draft.up(queryInterfaceFor(sequelize));
    } catch (error) {
      emptyFailure = error;
    }
    assert.ok(emptyFailure, "empty schema must fail closed");
    assert.match(emptyFailure.message, /does not exist|dependency is not satisfied/i);
    assert.strictEqual(await tableCount(sequelize), 0, "empty failure must not create target tables");
    console.log("empty_database=PASS: draft failed closed before any schema mutation");

    await createRepresentativeSchema(sequelize);
    assert.strictEqual(await tableCount(sequelize), 3, "representative schema must have three target tables");
    await draft.up(queryInterfaceFor(sequelize));
    for (const table of EXPECTED.tables) {
      assert.deepStrictEqual(await indexNames(sequelize, table), [`uniq_rpjmd_kode_indikator_forward_fix_${table}`]);
    }
    console.log("representative_database=PASS: three unique indexes created after schema/key checks");

    await draft.up(queryInterfaceFor(sequelize));
    for (const table of EXPECTED.tables) {
      assert.deepStrictEqual(await indexNames(sequelize, table), [`uniq_rpjmd_kode_indikator_forward_fix_${table}`]);
    }
    console.log("idempotency=PASS: repeated up created no duplicate indexes");

    await draft.down(queryInterfaceFor(sequelize));
    for (const table of EXPECTED.tables) {
      assert.deepStrictEqual(await indexNames(sequelize, table), []);
    }
    console.log("down_path=PASS: draft removed only its own indexes");
  } finally {
    await cleanup(sequelize);
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(`forward-fix disposable integration test failed: ${error.message}`);
  process.exitCode = 1;
});
