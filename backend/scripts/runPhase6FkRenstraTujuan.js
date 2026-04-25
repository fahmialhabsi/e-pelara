/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv() {
  try {
    // Optional dependency; many repos already have it.
    // eslint-disable-next-line global-require
    require("dotenv").config();
  } catch {
    // noop
  }
}

function readSqlFile(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  const content = fs.readFileSync(abs, "utf8");
  return content.replace(/^\uFEFF/, "");
}

function fmtRows(rows) {
  if (!rows) return rows;
  if (Array.isArray(rows)) return rows;
  return [rows];
}

function extractRowSets(multiResults) {
  const sets = [];
  const results = fmtRows(multiResults);
  for (const r of results) {
    if (Array.isArray(r)) {
      // RowDataPacket[]
      sets.push(r);
    } else if (r && typeof r === "object") {
      // OkPacket / ResultSetHeader — ignore
    }
  }
  return sets;
}

function hasKeyCI(obj, key) {
  if (!obj || typeof obj !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return true;
  const k = String(key).toLowerCase();
  return Object.keys(obj).some((x) => String(x).toLowerCase() === k);
}

function getCI(obj, key) {
  if (!obj || typeof obj !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  const k = String(key).toLowerCase();
  for (const kk of Object.keys(obj)) {
    if (String(kk).toLowerCase() === k) return obj[kk];
  }
  return undefined;
}

async function main() {
  loadEnv();

  // mysql2 is present as Sequelize dependency in this repo.
  // eslint-disable-next-line global-require
  const mysql = require("mysql2/promise");
  // eslint-disable-next-line global-require
  const appConfig = require("../config/config.json");

  const env = process.env.NODE_ENV || "development";
  const cfg = appConfig[env] || appConfig.development;

  const connInfo = {
    host: process.env.DB_HOST || cfg.host,
    port: Number(process.env.DB_PORT || cfg.port || 3306),
    user: process.env.DB_USER || cfg.username,
    password: process.env.DB_PASSWORD ?? cfg.password ?? "",
    database: process.env.DB_NAME || cfg.database,
  };

  console.log("== Phase 6 FK E2E ==");
  console.log("DB:", {
    host: connInfo.host,
    port: connInfo.port,
    user: connInfo.user,
    database: connInfo.database,
  });

  const connection = await mysql.createConnection({
    ...connInfo,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    // Step 0: Run migration (as requested), then re-run preflight.
    console.log("\n[0] RUN migration (type alignment):");
    console.log(
      "SQL file:",
      "scripts/sql/phase6_fk/02_migrate_renstra_tujuan_rpjmd_tujuan_id_type_to_match_tujuan_id.sql",
    );
    const migSql = readSqlFile(
      "scripts/sql/phase6_fk/02_migrate_renstra_tujuan_rpjmd_tujuan_id_type_to_match_tujuan_id.sql",
    );
    const [migResults] = await connection.query(migSql);
    const migSets = extractRowSets(migResults);
    const migInfo = migSets.find(
      (set) =>
        Array.isArray(set) &&
        set.length &&
        hasKeyCI(set[0], "invalid_format_count") &&
        hasKeyCI(set[0], "missing_parent_count"),
    );
    if (migInfo) {
      console.log("\nMigration summary (counts + target column_type):");
      console.table(migInfo);
    }
    const [migChosen] = await connection.query("SELECT @sql AS chosen_sql");
    console.log("\nChosen SQL (migration):");
    console.table(migChosen);

    console.log("\nVERIFY column_type after migration:");
    const [colAfter] = await connection.query(
      "SELECT c.table_name,c.column_name,c.data_type,c.column_type,c.is_nullable " +
        "FROM information_schema.columns c " +
        "WHERE c.table_schema = DATABASE() " +
        "  AND ((c.table_name='renstra_tujuan' AND c.column_name='rpjmd_tujuan_id') OR (c.table_name='tujuan' AND c.column_name='id')) " +
        "ORDER BY c.table_name, c.column_name",
    );
    console.table(colAfter);

    // Step 1: Preflight
    console.log("\n[1] RUN preflight (after migration):");
    console.log(
      "SQL file:",
      "scripts/sql/phase6_fk/01_preflight_phase6_fk_renstra_tujuan_rpjmd_tujuan_id.sql",
    );
    const preflightSql = readSqlFile(
      "scripts/sql/phase6_fk/01_preflight_phase6_fk_renstra_tujuan_rpjmd_tujuan_id.sql",
    );
    const [preflightResults] = await connection.query(preflightSql);
    const preflightSets = extractRowSets(preflightResults);

    const summarySet = preflightSets.find(
      (set) => Array.isArray(set) && set.length && Object.prototype.hasOwnProperty.call(set[0], "check_name"),
    );
    const decisionSet = preflightSets.find(
      (set) => Array.isArray(set) && set.length && Object.prototype.hasOwnProperty.call(set[0], "final_decision"),
    );
    if (summarySet) {
      const findIssue = (name) =>
        summarySet.find((r) => String(r.check_name) === String(name))?.issue_count ?? null;
      const findStatus = (name) =>
        summarySet.find((r) => String(r.check_name) === String(name))?.status ?? null;
      const nonNumeric = findIssue("phase6_non_numeric_renstra_tujuan_rpjmd_tujuan_id");
      const missingParent = findIssue("phase6_missing_parent_renstra_tujuan_rpjmd_tujuan_id__tujuan");
      const typeMismatch = findIssue("phase6_type_mismatch_renstra_tujuan_rpjmd_tujuan_id__tujuan");
      console.log("\nPreflight required checks:");
      console.log(
        "phase6_non_numeric_renstra_tujuan_rpjmd_tujuan_id =",
        nonNumeric,
        "(" + findStatus("phase6_non_numeric_renstra_tujuan_rpjmd_tujuan_id") + ")",
      );
      console.log(
        "phase6_missing_parent_renstra_tujuan_rpjmd_tujuan_id__tujuan =",
        missingParent,
        "(" + findStatus("phase6_missing_parent_renstra_tujuan_rpjmd_tujuan_id__tujuan") + ")",
      );
      console.log(
        "phase6_type_mismatch_renstra_tujuan_rpjmd_tujuan_id__tujuan =",
        typeMismatch,
        "(" + findStatus("phase6_type_mismatch_renstra_tujuan_rpjmd_tujuan_id__tujuan") + ")",
      );
    } else {
      console.log("\nPreflight summary: (not found in result sets)");
    }

    const finalDecision = decisionSet?.[0]?.final_decision;
    console.log("\nPreflight final_decision:", finalDecision);

    if (finalDecision !== "READY_FOR_FK_PHASE6") {
      console.log("\nSTOP: preflight is not READY_FOR_FK_PHASE6.");
      process.exitCode = 2;
      return;
    }

    // Step 2: Add index
    console.log("\n[2] RUN add index:");
    console.log("SQL file:", "scripts/sql/phase6_fk/03_add_fk_index_renstra_tujuan_rpjmd_tujuan_id.sql");
    const idxSql = readSqlFile(
      "scripts/sql/phase6_fk/03_add_fk_index_renstra_tujuan_rpjmd_tujuan_id.sql",
    );
    await connection.query(idxSql);
    const [chosenIdx] = await connection.query("SELECT @sql AS chosen_sql");
    console.log("\nChosen SQL (index):");
    console.log(chosenIdx?.[0]?.chosen_sql);

    console.log("\nVERIFY index exists (information_schema.statistics):");
    const [idxRows] = await connection.query(
      "SELECT index_name, column_name, seq_in_index, non_unique " +
        "FROM information_schema.statistics " +
        "WHERE table_schema = DATABASE() " +
        "  AND table_name = 'renstra_tujuan' " +
        "  AND index_name = 'idx_fk_renstra_tujuan__rpjmd_tujuan_id' " +
        "ORDER BY seq_in_index",
    );
    if (!idxRows?.length) {
      console.log("(not found)");
    } else {
      for (const r of idxRows) {
        console.log(
          `index_name=${getCI(r, "index_name")} column=${getCI(r, "column_name")} seq_in_index=${getCI(r, "seq_in_index")} non_unique=${getCI(r, "non_unique")}`,
        );
      }
    }

    // Step 3: Add FK
    console.log("\n[3] RUN add FK constraint:");
    console.log("SQL file:", "scripts/sql/phase6_fk/04_add_fk_renstra_tujuan_rpjmd_tujuan_id_to_tujuan.sql");
    const fkSql = readSqlFile(
      "scripts/sql/phase6_fk/04_add_fk_renstra_tujuan_rpjmd_tujuan_id_to_tujuan.sql",
    );
    await connection.query(fkSql);
    const [chosenFk] = await connection.query("SELECT @sql AS chosen_sql");
    console.log("\nChosen SQL (FK):");
    console.log(chosenFk?.[0]?.chosen_sql);

    console.log("\nSHOW CREATE TABLE renstra_tujuan:");
    const [createRows] = await connection.query("SHOW CREATE TABLE renstra_tujuan");
    const createSql = createRows?.[0]?.["Create Table"] || "";
    const constraintLines = String(createSql)
      .split("\n")
      .filter((l) => l.includes("CONSTRAINT") || l.includes("FOREIGN KEY"))
      .filter((l) => l.includes("fk_renstra_tujuan__rpjmd_tujuan_id__tujuan"));
    console.log(constraintLines.length ? constraintLines.join("\n") : "(constraint line not found)");

    // Step 4: Validations
    console.log("\n[4] RUN validations:");
    console.log("\nSQL (orphan check):");
    const orphanSql =
      "SELECT COUNT(*) AS orphan_renstra_tujuan__tujuan " +
      "FROM renstra_tujuan rt LEFT JOIN tujuan t ON t.id = rt.rpjmd_tujuan_id " +
      "WHERE rt.rpjmd_tujuan_id IS NOT NULL AND t.id IS NULL";
    console.log(orphanSql);
    const [orphanRows] = await connection.query(orphanSql);
    console.table(orphanRows);

    console.log("\nSQL (mismatch renstra_sasaran vs tujuan rpjmd):");
    const mismatchSasaranSql =
      "SELECT COUNT(*) AS mismatch_renstra_sasaran_vs_tujuan_rpjmd " +
      "FROM renstra_sasaran rs " +
      "JOIN renstra_tujuan rt ON rt.id = rs.tujuan_id " +
      "JOIN sasaran s ON s.id = rs.rpjmd_sasaran_id " +
      "WHERE CAST(rt.rpjmd_tujuan_id AS CHAR) REGEXP '^[0-9]+$' " +
      "  AND s.tujuan_id IS NOT NULL " +
      "  AND s.tujuan_id <> CAST(rt.rpjmd_tujuan_id AS UNSIGNED)";
    console.log(mismatchSasaranSql);
    const [mismatchSasaranRows] = await connection.query(mismatchSasaranSql);
    console.table(mismatchSasaranRows);

    console.log("\nSQL (mismatch renstra_strategi vs sasaran rpjmd):");
    const mismatchStrategiSql =
      "SELECT COUNT(*) AS mismatch_renstra_strategi_vs_sasaran_rpjmd " +
      "FROM renstra_strategi rstr " +
      "JOIN renstra_sasaran rs ON rs.id = rstr.sasaran_id " +
      "JOIN strategi st ON st.id = rstr.rpjmd_strategi_id " +
      "WHERE rs.rpjmd_sasaran_id IS NOT NULL " +
      "  AND st.sasaran_id IS NOT NULL " +
      "  AND st.sasaran_id <> rs.rpjmd_sasaran_id";
    console.log(mismatchStrategiSql);
    const [mismatchStrategiRows] = await connection.query(mismatchStrategiSql);
    console.table(mismatchStrategiRows);

    console.log("\nSQL (FK integrity check):");
    const fkIntegritySql =
      "SELECT COUNT(*) AS fk_exists " +
      "FROM information_schema.referential_constraints " +
      "WHERE constraint_schema = DATABASE() " +
      "  AND constraint_name = 'fk_renstra_tujuan__rpjmd_tujuan_id__tujuan'";
    console.log(fkIntegritySql);
    const [fkIntegrityRows] = await connection.query(fkIntegritySql);
    console.table(fkIntegrityRows);

    const orphan = Number(orphanRows?.[0]?.orphan_renstra_tujuan__tujuan || 0);
    const mm1 = Number(mismatchSasaranRows?.[0]?.mismatch_renstra_sasaran_vs_tujuan_rpjmd || 0);
    const mm2 = Number(mismatchStrategiRows?.[0]?.mismatch_renstra_strategi_vs_sasaran_rpjmd || 0);
    const fkExists = Number(fkIntegrityRows?.[0]?.fk_exists || 0);

    const allOk = orphan === 0 && mm1 === 0 && mm2 === 0 && fkExists === 1;
    console.log("\nVALIDATION_OK:", allOk ? "YES" : "NO");
    if (!allOk) process.exitCode = 3;
  } finally {
    await connection.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
});
