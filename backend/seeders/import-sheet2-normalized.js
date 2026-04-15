"use strict";

/**
 * Impor Sheet2_Normalized (XLSX atau CSV) ke master_program → master_kegiatan → master_sub_kegiatan → master_indikator.
 *
 * Sequelize CLI:
 *   npx sequelize-cli db:seed --seed import-sheet2-normalized.js
 *
 * Langsung dengan Node (dari folder backend):
 *   node seeders/import-sheet2-normalized.js
 *   set IMPORT_SHEET2_DRY_RUN=1 && node seeders/import-sheet2-normalized.js
 */

const path = require("path");

const { importSheet2Normalized, purgeDataset } = require("../services/importSheet2NormalizedService");

async function runStandalone() {
  require("dotenv").config({
    path: path.resolve(__dirname, "..", ".env"),
  });
  const db = require("../models");

  try {
    const result = await importSheet2Normalized({
      sequelize: db.sequelize,
      models: db,
      dryRun: process.env.IMPORT_SHEET2_DRY_RUN === "1",
      replaceExisting: process.env.IMPORT_SHEET2_APPEND !== "1",
      sourcePath: process.env.IMPORT_SHEET2_SOURCE || undefined,
      sheetName: process.env.IMPORT_SHEET2_SHEET || undefined,
      datasetKey: process.env.IMPORT_SHEET2_DATASET_KEY || undefined,
    });
    console.log("[import-sheet2-normalized]", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    console.error("[import-sheet2-normalized] GAGAL:", e.message);
    if (e.validationErrors) {
      console.error(
        "Detail validasi (maks 20):",
        JSON.stringify(e.validationErrors.slice(0, 20), null, 2),
      );
    }
    process.exit(1);
  }
}

module.exports = {
  async up(queryInterface) {
    const db = require("../models");
    const sequelize = queryInterface.sequelize;

    const result = await importSheet2Normalized({
      sequelize,
      models: db,
      dryRun: process.env.IMPORT_SHEET2_DRY_RUN === "1",
      replaceExisting: process.env.IMPORT_SHEET2_APPEND !== "1",
      sourcePath: process.env.IMPORT_SHEET2_SOURCE || undefined,
      sheetName: process.env.IMPORT_SHEET2_SHEET || undefined,
      datasetKey: process.env.IMPORT_SHEET2_DATASET_KEY || undefined,
    });

    console.log("[seed import-sheet2-normalized]", {
      rowCount: result.rowCount,
      programs: result.programs,
      kegiatans: result.kegiatans,
      subs: result.subs,
      indikators: result.indikators,
      dryRun: result.dryRun,
      filePath: result.filePath,
    });
  },

  async down(queryInterface) {
    await purgeDataset(
      queryInterface.sequelize,
      process.env.IMPORT_SHEET2_DATASET_KEY || "sekretariat_bidang_sheet2",
      null,
    );
    console.log("[seed import-sheet2-normalized] down: data dataset dihapus");
  },
};

if (require.main === module) {
  runStandalone();
}
