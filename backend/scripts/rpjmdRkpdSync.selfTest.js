"use strict";

/**
 * Uji mandiri modul sync RPJMD→RKPD (tanpa DB untuk sebagian besar).
 *
 *   node scripts/rpjmdRkpdSync.selfTest.js
 *
 * Uji transaksi rollback (butuh DB):
 *   RUN_RPJMD_RKPD_SYNC_DB_TEST=1 node scripts/rpjmdRkpdSync.selfTest.js
 */

const assert = require("assert");
const svc = require("../services/rpjmdRkpdSyncService");

function testClassifySubCollision() {
  const src = {
    master_sub_kegiatan_id: 10,
    kode_sub_kegiatan: "X",
    nama_sub_kegiatan: "N",
  };

  let r = svc.classifySubCollision(null, src, true);
  assert.strictEqual(r.status, "would_import");

  r = svc.classifySubCollision(
    {
      id: 1,
      jenis_dokumen: "rkpd",
      master_sub_kegiatan_id: 10,
      kode_sub_kegiatan: "X",
    },
    src,
    true,
  );
  assert.strictEqual(r.status, "skipped");
  assert.strictEqual(r.classification.category, "duplicate_mapped");

  r = svc.classifySubCollision(
    {
      id: 2,
      jenis_dokumen: "rpjmd",
      master_sub_kegiatan_id: null,
      kode_sub_kegiatan: "X",
    },
    src,
    true,
  );
  assert.strictEqual(r.status, "error");
  assert.strictEqual(r.classification.category, "cross_document_sub_slot");

  r = svc.classifySubCollision(
    {
      id: 3,
      jenis_dokumen: "rkpd",
      master_sub_kegiatan_id: 99,
      kode_sub_kegiatan: "X",
    },
    src,
    true,
  );
  assert.strictEqual(r.status, "skipped");
  assert.strictEqual(r.classification.category, "duplicate_by_code");

  r = svc.classifySubCollision(
    {
      id: 4,
      jenis_dokumen: "rkpd",
      master_sub_kegiatan_id: 77,
      nama_sub_kegiatan: "N",
    },
    src,
    true,
    "nama",
  );
  assert.strictEqual(r.status, "skipped");
  assert.strictEqual(r.classification.category, "duplicate_by_name");

  r = svc.classifySubCollision(
    {
      id: 5,
      jenis_dokumen: "rpjmd",
      master_sub_kegiatan_id: null,
      nama_sub_kegiatan: "N",
    },
    src,
    true,
    "nama",
  );
  assert.strictEqual(r.status, "error");
  assert.strictEqual(r.classification.category, "cross_document_sub_slot");
}

function testValidateBody() {
  const bad = svc.validateAndBuildContext({});
  assert.strictEqual(bad.ok, false);

  const ok = svc.validateAndBuildContext({
    source: { periode_id: 1, tahun: 2025, jenis_dokumen: "rpjmd" },
    target: { periode_id: 2, tahun: 2025, jenis_dokumen: "rkpd" },
    filters: {
      program_ids: [9],
      kegiatan_ids: [10],
      sub_kegiatan_ids: [11],
      master_program_ids: [12],
      master_kegiatan_ids: [13],
      master_sub_kegiatan_ids: [14],
    },
  });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.ctx.source.jenis_dokumen, "rpjmd");
  assert.strictEqual(ok.ctx.target.jenis_dokumen, "rkpd");
  assert.deepStrictEqual(ok.ctx.filters, {
    program_ids: [9],
    kegiatan_ids: [10],
    sub_kegiatan_ids: [11],
    master_program_ids: [12],
    master_kegiatan_ids: [13],
    master_sub_kegiatan_ids: [14],
  });
}

function testNamingConsistency() {
  const allCategories = Object.values(svc.SYNC_CAT || {});
  assert.ok(allCategories.includes("source_unmapped"));
  assert.ok(!allCategories.includes("legacy_source_unmapped"));
  assert.ok(allCategories.includes("cross_document_program_slot"));
  assert.ok(allCategories.includes("cross_document_sub_slot"));
}

async function testTransactionRollback() {
  if (process.env.RUN_RPJMD_RKPD_SYNC_DB_TEST !== "1") {
    console.log("SKIP DB: set RUN_RPJMD_RKPD_SYNC_DB_TEST=1 untuk uji rollback.");
    return;
  }
  const db = require("../models");
  const t = await db.sequelize.transaction();
  try {
    await db.sequelize.query("SELECT 1 as ok", { transaction: t });
    throw new Error("force_rollback_sync_test");
  } catch (e) {
    await t.rollback();
    assert.match(String(e.message), /force_rollback/);
  }
  console.log("OK: transaction rollback");
}

async function testPreviewNoWrite() {
  if (process.env.RUN_RPJMD_RKPD_SYNC_DB_TEST !== "1") {
    return;
  }
  const db = require("../models");
  const periode = await db.PeriodeRpjmd.findOne({ attributes: ["id"] });
  if (!periode) {
    console.log("SKIP preview read-only: tidak ada baris periode di DB.");
    return;
  }
  const tahunRow = await db.Program.findOne({
    attributes: ["tahun"],
    where: { periode_id: periode.id },
    order: [["tahun", "DESC"]],
  });
  const tahun = tahunRow?.tahun || new Date().getFullYear();

  const before = await db.SubKegiatan.unscoped().count();
  const res = await svc.runPreview({
    source: { periode_id: periode.id, tahun, jenis_dokumen: "rpjmd" },
    target: { periode_id: periode.id, tahun, jenis_dokumen: "rkpd" },
    options: { allow_create_missing_parents: false },
  });
  assert.strictEqual(res.ok, true, res.error || "preview harus sukses");
  const after = await db.SubKegiatan.unscoped().count();
  assert.strictEqual(after, before, "preview tidak boleh mengubah jumlah sub");
  console.log("OK: preview read-only (count sub)");
}

async function main() {
  testClassifySubCollision();
  testValidateBody();
  testNamingConsistency();
  console.log("OK: classifySubCollision + validateAndBuildContext + naming");
  await testTransactionRollback();
  await testPreviewNoWrite();
  console.log("\nrpjmdRkpdSync.selfTest selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
