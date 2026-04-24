"use strict";

/**
 * Kolom realisasi di DPA e-PELARA untuk cross-check LRA vs BKU (opsional, bisa diisi manual/sync).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable("dpa").catch(() => null);
    if (!desc) {
      console.warn("[migration] ⏭️  tabel dpa tidak ada");
      return;
    }
    if (desc.realisasi) {
      console.log("[migration] ⏭️  dpa.realisasi sudah ada");
      return;
    }
    await queryInterface.addColumn("dpa", "realisasi", {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Realisasi silang dengan BKU/LRA (bukan sumber utama)",
    });
    console.log("[migration] ✅ dpa.realisasi ditambahkan");
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable("dpa").catch(() => null);
    if (!desc || !desc.realisasi) return;
    await queryInterface.removeColumn("dpa", "realisasi");
  },
};
