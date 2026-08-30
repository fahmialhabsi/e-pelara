"use strict";

/**
 * DRAFT ONLY — not part of the active Sequelize migration chain.
 *
 * Purpose: safely remediate the AUD-003 dependency/uniqueness gap after the
 * authoritative chain has created the target tables. This draft deliberately
 * does not delete or deduplicate rows. It fails closed when a table is absent,
 * required columns are absent, or duplicate data requires owner-approved policy.
 *
 * To be considered for disposable execution only, the operator must set:
 *   EPELARA_FORWARD_FIX_MODE=DISPOSABLE_ONLY
 *   EPELARA_AUDIT_DATABASE=epelara_audit_v5
 *   EPELARA_AUDIT_HOST=127.0.0.1
 *   EPELARA_FORWARD_FIX_APPROVED=true
 *
 * Existing migration files must not be renamed or reordered. This file is under
 * migrations/drafts and is not active until owner/DBA review promotes it.
 */

const TARGETS = Object.freeze([
  "indikatorstrategis",
  "indikatorarahkebijakans",
  "indikatorsubkegiatans",
]);

const REQUIRED_COLUMNS = Object.freeze(["id", "kode_indikator"]);
const INDEX_PREFIX = "uniq_rpjmd_kode_indikator_forward_fix";

function quoteIdentifier(identifier) {
  if (!/^[a-z][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

function assertDisposableOnly() {
  const mode = process.env.EPELARA_FORWARD_FIX_MODE;
  const database = process.env.EPELARA_AUDIT_DATABASE;
  const host = process.env.EPELARA_AUDIT_HOST;
  const approved = process.env.EPELARA_FORWARD_FIX_APPROVED;

  if (mode !== "DISPOSABLE_ONLY") {
    throw new Error("Forward-fix blocked: EPELARA_FORWARD_FIX_MODE must be DISPOSABLE_ONLY.");
  }
  if (database !== "epelara_audit_v5") {
    throw new Error("Forward-fix blocked: database must be epelara_audit_v5.");
  }
  if (host !== "127.0.0.1") {
    throw new Error("Forward-fix blocked: host must be 127.0.0.1.");
  }
  if (approved !== "true") {
    throw new Error("Forward-fix blocked: EPELARA_FORWARD_FIX_APPROVED must be true after owner/DBA review.");
  }
}

function getIndexName(table) {
  return `${INDEX_PREFIX}_${table}`;
}

async function tableExists(queryInterface, table) {
  const tables = await queryInterface.showAllTables();
  return tables.some((candidate) => String(candidate).toLowerCase() === table.toLowerCase());
}

async function assertRequiredColumns(queryInterface, table) {
  const description = await queryInterface.describeTable(table);
  const missing = REQUIRED_COLUMNS.filter((column) => !description[column]);
  if (missing.length > 0) {
    throw new Error(`${table} is missing required columns: ${missing.join(", ")}`);
  }
}

async function assertNoDuplicateBusinessKeys(queryInterface, table) {
  const sequelize = queryInterface.sequelize;
  const quotedTable = quoteIdentifier(table);
  const [rows] = await sequelize.query(
    `SELECT ${quoteIdentifier("kode_indikator")} AS kode_indikator ` +
      `FROM ${quotedTable} ` +
      `WHERE ${quoteIdentifier("kode_indikator")} IS NOT NULL ` +
      `GROUP BY ${quoteIdentifier("kode_indikator")} ` +
      `HAVING COUNT(*) > 1 LIMIT 1`,
    { raw: true },
  );
  if (rows.length > 0) {
    throw new Error(`${table} contains duplicate kode_indikator values; owner-approved deduplication policy is required before adding a unique index.`);
  }
}

async function indexExists(queryInterface, table, indexName) {
  const indexes = await queryInterface.showIndex(table);
  return indexes.some((index) => index.name === indexName);
}

module.exports = {
  TARGETS,
  REQUIRED_COLUMNS,
  assertDisposableOnly,

  async up(queryInterface) {
    assertDisposableOnly();

    for (const table of TARGETS) {
      if (!(await tableExists(queryInterface, table))) {
        throw new Error(`${table} does not exist; authoritative create-table dependency is not satisfied.`);
      }
      await assertRequiredColumns(queryInterface, table);
      await assertNoDuplicateBusinessKeys(queryInterface, table);

      const indexName = getIndexName(table);
      if (!(await indexExists(queryInterface, table, indexName))) {
        await queryInterface.addIndex(table, ["kode_indikator"], {
          name: indexName,
          unique: true,
        });
      }
    }
  },

  async down(queryInterface) {
    assertDisposableOnly();

    for (const table of TARGETS) {
      if (!(await tableExists(queryInterface, table))) {
        continue;
      }
      const indexName = getIndexName(table);
      if (await indexExists(queryInterface, table, indexName)) {
        await queryInterface.removeIndex(table, indexName);
      }
    }
  },
};
