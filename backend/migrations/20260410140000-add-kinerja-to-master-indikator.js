"use strict";

/**
 * Kinerja pada level baris sumber dipetakan ke master_indikator (beserta indikator & satuan).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const existing = new Set(tables.map((t) => String(t).toLowerCase()));
    if (!existing.has("master_indikator")) {
      console.log("[migration] ⏭️  master_indikator belum ada, skip add kinerja");
      return;
    }
    const desc = await qi.describeTable("master_indikator").catch(() => null);
    if (desc && desc.kinerja) {
      console.log("[migration] ⏭️  master_indikator.kinerja sudah ada");
      return;
    }

    await qi.addColumn("master_indikator", "kinerja", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Kinerja dari baris sumber (bersama indikator/satuan)",
    });
    console.log("[migration] ✅ master_indikator.kinerja ditambahkan");
  },

  async down(queryInterface) {
    const desc = await queryInterface
      .describeTable("master_indikator")
      .catch(() => null);
    if (desc && desc.kinerja) {
      await queryInterface.removeColumn("master_indikator", "kinerja");
    }
  },
};
