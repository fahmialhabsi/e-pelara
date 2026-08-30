"use strict";

const assert = require("assert");
const { Sequelize } = require("sequelize");

const TARGET = Object.freeze({
  container: "epelara-audit-v5-mysql",
  host: "127.0.0.1",
  port: 13317,
  database: "epelara_audit_v5",
});
const TABLES = Object.freeze({
  parent: "audit_indicator_parent",
  child: "audit_indicator_child",
  quarantine: "audit_indicator_quarantine",
  mapping: "audit_indicator_fk_mapping",
});

function assertGuard() {
  assert.strictEqual(process.env.EPELARA_RECON_MODE, "DISPOSABLE_ONLY");
  assert.strictEqual(process.env.EPELARA_RECON_HOST, TARGET.host);
  assert.strictEqual(process.env.EPELARA_RECON_DATABASE, TARGET.database);
  assert.strictEqual(process.env.EPELARA_RECON_CONTAINER, TARGET.container);
  assert.strictEqual(process.env.EPELARA_PRODUCTION_ACCESS, "false");
  assert.ok(process.env.EPELARA_RECON_PASSWORD);
}

async function main() {
  assertGuard();
  const sequelize = new Sequelize({
    dialect: "mysql",
    host: TARGET.host,
    port: TARGET.port,
    database: TARGET.database,
    username: process.env.EPELARA_RECON_USER || "root",
    password: process.env.EPELARA_RECON_PASSWORD,
    logging: false,
  });
  const quoted = Object.values(TABLES).map((name) => `\`${name}\``);
  try {
    await sequelize.authenticate();
    for (const table of quoted) await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
    await sequelize.query(`CREATE TABLE \`${TABLES.parent}\` (id BIGINT PRIMARY KEY, tenant_id VARCHAR(32) NOT NULL, kode_indikator VARCHAR(64) NOT NULL, source_ref VARCHAR(128) NOT NULL, approved_at DATETIME NULL)`);
    await sequelize.query(`CREATE TABLE \`${TABLES.child}\` (id BIGINT PRIMARY KEY, parent_id BIGINT NOT NULL, payload VARCHAR(128) NOT NULL, CONSTRAINT fk_audit_child_parent FOREIGN KEY (parent_id) REFERENCES \`${TABLES.parent}\`(id))`);
    await sequelize.query(`CREATE TABLE \`${TABLES.quarantine}\` (parent_id BIGINT PRIMARY KEY, candidate_group VARCHAR(160) NOT NULL, decision VARCHAR(32) NOT NULL, raw_snapshot VARCHAR(1024) NOT NULL)`);
    await sequelize.query(`CREATE TABLE \`${TABLES.mapping}\` (child_id BIGINT PRIMARY KEY, old_parent_id BIGINT NOT NULL, new_parent_id BIGINT NULL, decision VARCHAR(32) NOT NULL)`);
    await sequelize.query(`INSERT INTO \`${TABLES.parent}\` (id, tenant_id, kode_indikator, source_ref, approved_at) VALUES (101, 'tenant-a', 'IND-001', 'import-a', NULL), (102, 'tenant-a', 'IND-001', 'import-b', NULL)`);
    await sequelize.query(`INSERT INTO \`${TABLES.child}\` (id, parent_id, payload) VALUES (201, 101, 'child-a'), (202, 102, 'child-b')`);

    const [duplicates] = await sequelize.query(`SELECT tenant_id, kode_indikator, COUNT(*) AS candidates FROM \`${TABLES.parent}\` GROUP BY tenant_id, kode_indikator HAVING COUNT(*) > 1`);
    assert.strictEqual(duplicates.length, 1);
    await sequelize.query(`INSERT INTO \`${TABLES.quarantine}\` (parent_id, candidate_group, decision, raw_snapshot) VALUES (?, ?, 'CONFLICT', ?), (?, ?, 'CONFLICT', ?)`, {
      replacements: [101, "tenant-a|IND-001", JSON.stringify({ id: 101, source_ref: "import-a" }), 102, "tenant-a|IND-001", JSON.stringify({ id: 102, source_ref: "import-b" })],
    });
    const [quarantined] = await sequelize.query(`SELECT parent_id, decision FROM \`${TABLES.quarantine}\` ORDER BY parent_id`);
    assert.deepStrictEqual(quarantined.map((row) => [row.parent_id, row.decision]), [[101, "CONFLICT"], [102, "CONFLICT"]]);
    console.log("quarantine_conflict=PASS: both raw duplicate candidates preserved with CONFLICT decisions");

    const [beforeChildren] = await sequelize.query(`SELECT id, parent_id FROM \`${TABLES.child}\` ORDER BY id`);
    const [emptyMapping] = await sequelize.query(`SELECT child_id, old_parent_id, new_parent_id FROM \`${TABLES.mapping}\``);
    assert.strictEqual(emptyMapping.length, 0);
    assert.deepStrictEqual(beforeChildren.map((row) => [row.id, row.parent_id]), [[201, 101], [202, 102]]);
    console.log("fk_reconciliation_block=PASS: unresolved authority prevented any child remapping");

    let authorityRejected = false;
    try {
      await sequelize.transaction(async (transaction) => {
        const [rows] = await sequelize.query(`SELECT decision FROM \`${TABLES.quarantine}\` WHERE decision <> 'AUTHORITATIVE' FOR UPDATE`, { transaction });
        if (rows.length > 0) throw new Error("authoritative decision required before FK reconciliation");
      });
    } catch (error) {
      authorityRejected = error.message.includes("authoritative decision required");
    }
    assert.strictEqual(authorityRejected, true);
    const [afterChildren] = await sequelize.query(`SELECT id, parent_id FROM \`${TABLES.child}\` ORDER BY id`);
    assert.deepStrictEqual(afterChildren.map((row) => [row.id, row.parent_id]), [[201, 101], [202, 102]]);
    assert.strictEqual((await sequelize.query(`SELECT COUNT(*) AS count FROM \`${TABLES.parent}\``))[0][0].count, 2);
    console.log("authority_gate=PASS: transaction rejected unresolved candidates without changing parent/child rows");
    console.log("raw_data_deletion=NOT_RUN");
    console.log("production_access=NOT_USED");
  } finally {
    for (const table of quoted.reverse()) await sequelize.query(`DROP TABLE IF EXISTS ${table}`);
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(`quarantine/FK disposable simulation failed: ${error.message}`);
  process.exitCode = 1;
});
