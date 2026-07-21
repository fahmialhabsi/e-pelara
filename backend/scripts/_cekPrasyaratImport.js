"use strict";
const db = require("../models");
const { PeriodeRpjmd, KodeAkunBas } = db;

(async () => {
  console.log("=== PeriodeRpjmd tahun 2025 ===");
  const periode = await PeriodeRpjmd.findAll({ raw: true });
  console.log(JSON.stringify(periode, null, 2));

  console.log("\n=== KodeAkunBas yang cocok kode rekening SIPD (5.1.02.xx) ===");
  const akunBelanja = await KodeAkunBas.findAll({
    where: { kode: { [db.Sequelize.Op.like]: "5.1.02%" } },
    attributes: ["kode", "nama", "level", "jenis"],
    raw: true,
  });
  console.log(JSON.stringify(akunBelanja, null, 2));

  process.exit(0);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
