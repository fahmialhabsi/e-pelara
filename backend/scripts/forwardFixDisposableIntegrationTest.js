"use strict";

const assert = require("assert");
const { execFileSync } = require("child_process");
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
  assert.strictEqual(process.env.EPELARA_TEST_DOCKER_CONTAINER, "epelara-audit-v5-mysql", "docker container must be the named audit disposable");
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

async function createMissingColumnSchema(sequelize) {
  await sequelize.query("CREATE TABLE `indikatorstrategis` (id INT NOT NULL AUTO_INCREMENT, nama_indikator VARCHAR(100) NOT NULL, PRIMARY KEY (id))");
  await sequelize.query("CREATE TABLE `indikatorarahkebijakans` (id INT NOT NULL AUTO_INCREMENT, kode_indikator VARCHAR(100) NOT NULL, PRIMARY KEY (id))");
  await sequelize.query("CREATE TABLE `indikatorsubkegiatans` (id INT NOT NULL AUTO_INCREMENT, kode_indikator VARCHAR(100) NOT NULL, PRIMARY KEY (id))");
}

async function createSyntheticAppliedHistory(sequelize) {
  await sequelize.query("CREATE TABLE `SequelizeMeta` (name VARCHAR(255) NOT NULL PRIMARY KEY)");
  await sequelize.query("INSERT INTO `SequelizeMeta` (name) VALUES ('20260415110001-create-indikatorstrategis.js'), ('20260415110002-create-indikatorarahkebijakans.js'), ('20260415110003-create-indikatorsubkegiatans.js')");
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
    await sequelize.query("DROP TABLE IF EXISTS `" + table + "`");
  }
  await sequelize.query("DROP TABLE IF EXISTS `SequelizeMeta`");
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
    await sequelize.query("INSERT INTO `indikatorstrategis` (kode_indikator, jenis_dokumen, tahun) VALUES ('DUP-SYN-001', 'RPJMD', '2025'), ('DUP-SYN-001', 'RPJMD', '2025')");
    let duplicateFailure;
    try {
      await draft.up(queryInterfaceFor(sequelize));
    } catch (error) {
      duplicateFailure = error;
    }
    assert.ok(duplicateFailure, "duplicate business key must fail closed");
    assert.match(duplicateFailure.message, /duplicate kode_indikator/i);
    assert.deepStrictEqual(await indexNames(sequelize, "indikatorstrategis"), []);
    const [[duplicateCount]] = await sequelize.query("SELECT COUNT(*) AS count FROM `indikatorstrategis` WHERE kode_indikator = 'DUP-SYN-001'");
    assert.strictEqual(Number(duplicateCount.count), 2, "duplicate guard must not delete rows");
    console.log("duplicate_key=PASS: draft stopped before index mutation and preserved both synthetic rows");

    await cleanup(sequelize);
    await createSyntheticAppliedHistory(sequelize);
    await createRepresentativeSchema(sequelize);
    assert.strictEqual(await tableCount(sequelize), 3, "representative schema must have three target tables");
    const [[historyCount]] = await sequelize.query("SELECT COUNT(*) AS count FROM `SequelizeMeta`");
    assert.strictEqual(Number(historyCount.count), 3, "representative upgrade fixture must contain three applied migration markers");
    await draft.up(queryInterfaceFor(sequelize));
    for (const table of EXPECTED.tables) {
      assert.deepStrictEqual(await indexNames(sequelize, table), [`uniq_rpjmd_kode_indikator_forward_fix_${table}`]);
    }
    console.log("representative_upgrade=PASS: synthetic SequelizeMeta history and three target tables accepted");
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

    await cleanup(sequelize);
    await createMissingColumnSchema(sequelize);
    let missingColumnFailure;
    try {
      await draft.up(queryInterfaceFor(sequelize));
    } catch (error) {
      missingColumnFailure = error;
    }
    assert.ok(missingColumnFailure, "missing required column must fail closed");
    assert.match(missingColumnFailure.message, /missing required columns/i);
    assert.deepStrictEqual(await indexNames(sequelize, "indikatorstrategis"), []);
    console.log("missing_column=PASS: draft stopped before index mutation");

    await cleanup(sequelize);
    await createRepresentativeSchema(sequelize);
    const realQueryInterface = queryInterfaceFor(sequelize);
    let addIndexCalls = 0;
    const injectedFailureQueryInterface = new Proxy(realQueryInterface, {
      get(target, property, receiver) {
        if (property === "addIndex") {
          return async (...args) => {
            addIndexCalls += 1;
            if (addIndexCalls === 2) {
              throw new Error("synthetic injected failure before second index");
            }
            return target.addIndex(...args);
          };
        }
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    let injectedFailure;
    try {
      await draft.up(injectedFailureQueryInterface);
    } catch (error) {
      injectedFailure = error;
    }
    assert.ok(injectedFailure, "injected failure must stop the operation");
    assert.match(injectedFailure.message, /synthetic injected failure/i);
    assert.deepStrictEqual(await indexNames(sequelize, "indikatorstrategis"), [`uniq_rpjmd_kode_indikator_forward_fix_indikatorstrategis`]);
    assert.deepStrictEqual(await indexNames(sequelize, "indikatorarahkebijakans"), []);
    console.log("injected_failure=PASS: operation stopped with partial state visible for recovery");

    await cleanup(sequelize);
    await createRepresentativeSchema(sequelize);
    await draft.up(queryInterfaceFor(sequelize));
    const container = process.env.EPELARA_TEST_DOCKER_CONTAINER;
    const dump = execFileSync("docker", ["exec", "-e", `MYSQL_PWD=${process.env.EPELARA_TEST_PASSWORD}`, container, "mysqldump", "--no-tablespaces", "-uroot", process.env.EPELARA_TEST_DATABASE], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    assert.ok(dump.includes("indikatorstrategis"), "disposable dump must include synthetic target schema");
    await cleanup(sequelize);
    execFileSync("docker", ["exec", "-i", "-e", `MYSQL_PWD=${process.env.EPELARA_TEST_PASSWORD}`, container, "mysql", "-uroot", process.env.EPELARA_TEST_DATABASE], { input: dump, stdio: ["pipe", "ignore", "pipe"] });
    assert.strictEqual(await tableCount(sequelize), 3, "restore must recover all synthetic target tables");
    for (const table of EXPECTED.tables) {
      assert.deepStrictEqual(await indexNames(sequelize, table), [`uniq_rpjmd_kode_indikator_forward_fix_${table}`]);
    }
    console.log("restore_from_disposable_backup=PASS: synthetic schema and forward-fix indexes recovered");
  } finally {
    await cleanup(sequelize);
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(`forward-fix disposable integration test failed: ${error.message}`);
  process.exitCode = 1;
});
