"use strict";

const assert = require("assert");
const svc = require("../services/rpjmdSubAutoMapService");

async function testValidationGuards() {
  let r = await svc.previewSubAutoMap({});
  assert.strictEqual(r.ok, false);
  assert.match(String(r.error || ""), /periode_id/i);

  r = await svc.executeSubAutoMap({
    dataset_key: svc.DEFAULT_DATASET_KEY,
    periode_id: 1,
    tahun: 2025,
    jenis_dokumen: "rpjmd",
    confirm: false,
  });
  assert.strictEqual(r.ok, false);
  assert.match(String(r.error || ""), /confirm/i);
}

async function testDbSmokeOptional() {
  if (process.env.RUN_RPJMD_SUB_AUTOMAP_DB_TEST !== "1") {
    console.log(
      "SKIP DB: set RUN_RPJMD_SUB_AUTOMAP_DB_TEST=1 untuk uji preview sub kegiatan.",
    );
    return;
  }

  const db = require("../models");
  const periode = await db.PeriodeRpjmd.findOne({ attributes: ["id"] });
  if (!periode) {
    console.log("SKIP DB: periode tidak ditemukan.");
    return;
  }
  const tahunRow = await db.SubKegiatan.findOne({
    attributes: ["tahun"],
    where: { periode_id: periode.id, jenis_dokumen: "rpjmd" },
    order: [["tahun", "DESC"]],
  });
  if (!tahunRow?.tahun) {
    console.log("SKIP DB: sub kegiatan RPJMD belum tersedia.");
    return;
  }

  const r = await svc.previewSubAutoMap({
    dataset_key: svc.DEFAULT_DATASET_KEY,
    periode_id: periode.id,
    tahun: Number(tahunRow.tahun),
    jenis_dokumen: "rpjmd",
  });
  assert.strictEqual(r.ok, true, r.error || "preview sub kegiatan harus sukses");
  assert.ok(r.data?.summary);
  assert.ok(Array.isArray(r.data?.ready_items));
}

async function main() {
  await testValidationGuards();
  await testDbSmokeOptional();
  console.log("rpjmdSubAutoMap.selfTest OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

