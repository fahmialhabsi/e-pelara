"use strict";

const assert = require("assert");
const { Sequelize } = require("sequelize");

const TARGETS = Object.freeze([
  "indikatorstrategis",
  "indikatorarahkebijakans",
  "indikatorsubkegiatans",
]);

function assertDisposableEnvironment() {
  assert.strictEqual(process.env.EPELARA_INVARIANT_MODE, "DISPOSABLE_ONLY", "invariant mode must be DISPOSABLE_ONLY");
  assert.strictEqual(process.env.EPELARA_INVARIANT_HOST, "127.0.0.1", "invariant host must be loopback");
  assert.strictEqual(process.env.EPELARA_INVARIANT_DATABASE, "epelara_audit_v5", "invariant database must be epelara_audit_v5");
  assert.notStrictEqual(process.env.EPELARA_PRODUCTION_ACCESS, "true", "production access marker must not be true");
  assert.ok(process.env.EPELARA_INVARIANT_PASSWORD, "password must be process-injected and never committed");
}

async function main() {
  assertDisposableEnvironment();
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: process.env.EPELARA_INVARIANT_HOST,
    port: Number(process.env.EPELARA_INVARIANT_PORT || 3306),
    database: process.env.EPELARA_INVARIANT_DATABASE,
    username: process.env.EPELARA_INVARIANT_USER || "root",
    password: process.env.EPELARA_INVARIANT_PASSWORD,
    logging: false,
  });
  try {
    await sequelize.authenticate();
    const [tables] = await sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('indikatorstrategis','indikatorarahkebijakans','indikatorsubkegiatans') ORDER BY TABLE_NAME",
    );
    const [duplicates] = await sequelize.query(
      "SELECT TABLE_NAME, COUNT(*) AS duplicate_groups FROM (SELECT TABLE_NAME, kode_indikator FROM (SELECT 'indikatorstrategis' AS TABLE_NAME, kode_indikator FROM indikatorstrategis UNION ALL SELECT 'indikatorarahkebijakans', kode_indikator FROM indikatorarahkebijakans UNION ALL SELECT 'indikatorsubkegiatans', kode_indikator FROM indikatorsubkegiatans) AS all_indicators GROUP BY TABLE_NAME, kode_indikator HAVING COUNT(*) > 1) AS duplicate_summary GROUP BY TABLE_NAME ORDER BY TABLE_NAME",
    ).catch((error) => {
      if (/doesn't exist|does not exist/i.test(error.message)) return [[]];
      throw error;
    });
    const [indexes] = await sequelize.query(
      "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE FROM information_schema.statistics WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('indikatorstrategis','indikatorarahkebijakans','indikatorsubkegiatans') AND INDEX_NAME LIKE 'uniq_rpjmd_kode_indikator_forward_fix_%' GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME",
    );
    const [meta] = await sequelize.query(
      "SELECT COUNT(*) AS migration_count FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SequelizeMeta'",
    );
    console.log(JSON.stringify({
      database: process.env.EPELARA_INVARIANT_DATABASE,
      host: process.env.EPELARA_INVARIANT_HOST,
      target_tables: tables.map((row) => row.TABLE_NAME),
      expected_target_tables: TARGETS,
      duplicate_groups: duplicates,
      forward_fix_indexes: indexes,
      sequelize_meta_table_present: Number(meta[0].migration_count) === 1,
      migration_execution: "NOT_RUN_BY_THIS_CHECK",
      production_access: "NOT_USED",
    }, null, 2));
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(`invariant check failed: ${error.message}`);
  process.exitCode = 1;
});
