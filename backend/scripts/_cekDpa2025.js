"use strict";
const db = require("../models");
const { Dpa } = db;

(async () => {
  const kodeSubList = ["2.09.02.1.01.0003", "2.09.02.1.01.0006"];
  for (const kode of kodeSubList) {
    const rows = await Dpa.findAll({
      where: { tahun: "2025", kode_sub_kegiatan: kode },
      attributes: ["id", "tahun", "kode_sub_kegiatan", "kode_rekening", "anggaran", "sub_kegiatan"],
      raw: true,
    });
    console.log(`\n=== DPA tahun 2025, sub_kegiatan ${kode} ===`);
    console.log(JSON.stringify(rows, null, 2));
  }
  process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
