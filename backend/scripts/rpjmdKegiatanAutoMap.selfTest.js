"use strict";

const assert = require("assert");
const svc = require("../services/rpjmdKegiatanAutoMapService");

async function testValidationGuards() {
  let r = await svc.previewKegiatanAutoMap({});
  assert.strictEqual(r.ok, false);
  assert.match(String(r.error || ""), /periode_id/i);

  r = await svc.executeKegiatanAutoMap({
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
  if (process.env.RUN_RPJMD_KEGIATAN_AUTOMAP_DB_TEST !== "1") {
    console.log(
      "SKIP DB: set RUN_RPJMD_KEGIATAN_AUTOMAP_DB_TEST=1 untuk uji preview kegiatan.",
    );
    return;
  }

  const db = require("../models");
  const periode = await db.PeriodeRpjmd.findOne({ attributes: ["id"] });
  if (!periode) {
    console.log("SKIP DB: periode tidak ditemukan.");
    return;
  }
  const tahunRow = await db.Kegiatan.findOne({
    attributes: ["tahun"],
    where: { periode_id: periode.id, jenis_dokumen: "rpjmd" },
    order: [["tahun", "DESC"]],
  });
  if (!tahunRow?.tahun) {
    console.log("SKIP DB: kegiatan RPJMD belum tersedia.");
    return;
  }

  const r = await svc.previewKegiatanAutoMap({
    dataset_key: svc.DEFAULT_DATASET_KEY,
    periode_id: periode.id,
    tahun: Number(tahunRow.tahun),
    jenis_dokumen: "rpjmd",
  });
  assert.strictEqual(r.ok, true, r.error || "preview kegiatan harus sukses");
  assert.ok(r.data?.summary);
  assert.ok(Array.isArray(r.data?.ready_items));
}

async function main() {
  await testValidationGuards();
  await testDbSmokeOptional();
  console.log("rpjmdKegiatanAutoMap.selfTest OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

