/**
 * Verifikasi kolom/tabel change tracking (pasca-migrasi).
 *   node scripts/verifyPlanningChangeTrackingSchema.js
 */
"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const path = require("path");
const allConfig = require(path.join(__dirname, "../config/config.json"));
const env = process.env.NODE_ENV || "development";
const config = allConfig[env];

const NEED_RENJA = [
  "change_state",
  "current_renja_item_version_id",
  "pagu_source",
  "pagu_line_version_id",
];
const NEED_RKPD = [
  "change_state",
  "current_rkpd_item_version_id",
  "pagu_source",
  "pagu_line_version_id",
];
const NEED_LOG = [
  "change_type",
  "version_before",
  "version_after",
  "entity_version_id",
  "is_active_version",
];
const NEED_TABLES = [
  "rkpd_dokumen_version",
  "renja_dokumen_version",
  "rkpd_item_version",
  "renja_item_version",
  "rkpd_renja_cascade_trace",
  "planning_line_item_change_log",
];

async function main() {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password === null || config.password === undefined ? "" : config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: false,
      dialectOptions: config.dialectOptions || {},
    },
  );

  await sequelize.authenticate();
  const dbName = config.database;

  const [renjaCols] = await sequelize.query("SHOW COLUMNS FROM renja_item");
  const renjaNames = new Set(renjaCols.map((c) => c.Field));
  const [rkpdCols] = await sequelize.query("SHOW COLUMNS FROM rkpd_item");
  const rkpdNames = new Set(rkpdCols.map((c) => c.Field));
  const [logCols] = await sequelize.query("SHOW COLUMNS FROM planning_line_item_change_log");
  const logNames = new Set(logCols.map((c) => c.Field));

  const placeholders = NEED_TABLES.map(() => "?").join(",");
  const [tables] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`,
    { replacements: [dbName, ...NEED_TABLES] },
  );
  const tableSet = new Set(tables.map((r) => r.TABLE_NAME));

  const miss = [];
  for (const c of NEED_RENJA) {
    if (!renjaNames.has(c)) miss.push(`renja_item.${c}`);
  }
  for (const c of NEED_RKPD) {
    if (!rkpdNames.has(c)) miss.push(`rkpd_item.${c}`);
  }
  for (const c of NEED_LOG) {
    if (!logNames.has(c)) miss.push(`planning_line_item_change_log.${c}`);
  }
  for (const t of NEED_TABLES) {
    if (!tableSet.has(t)) miss.push(`tabel hilang: ${t}`);
  }

  console.log(`[verifyPlanningChangeTrackingSchema] env=${env} db=${dbName}`);
  console.log("renja_item OK:", NEED_RENJA.filter((c) => renjaNames.has(c)).join(", "));
  console.log("rkpd_item OK:", NEED_RKPD.filter((c) => rkpdNames.has(c)).join(", "));
  console.log("planning_line_item_change_log OK:", NEED_LOG.filter((c) => logNames.has(c)).join(", "));
  console.log(
    "tabel:",
    NEED_TABLES.filter((t) => tableSet.has(t)).sort().join(", "),
  );

  if (miss.length) {
    console.error("GAGAL — kurang:", miss.join("; "));
    process.exit(1);
  }
  console.log("Semua pemeriksaan lulus.");
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
