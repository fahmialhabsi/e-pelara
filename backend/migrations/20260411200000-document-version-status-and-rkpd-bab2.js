"use strict";

/**
 * Status snapshot dokumen + narasi BAB II RKPD (validasi ekspor resmi).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const add = async (table, column, def) => {
      const d = await queryInterface.describeTable(table).catch(() => null);
      if (!d) return;
      if (d[column]) return;
      await queryInterface.addColumn(table, column, def);
    };

    await add("renja_dokumen_version", "status", {
      type: Sequelize.STRING(24),
      allowNull: false,
      defaultValue: "draft",
    });
    await add("rkpd_dokumen_version", "status", {
      type: Sequelize.STRING(24),
      allowNull: false,
      defaultValue: "draft",
    });
    await add("rkpd_dokumen", "text_bab2", {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Narasi analisis BAB II untuk dokumen resmi",
    });
  },

  async down(queryInterface, Sequelize) {
    const drop = async (table, col) => {
      const d = await queryInterface.describeTable(table).catch(() => null);
      if (d && d[col]) await queryInterface.removeColumn(table, col);
    };
    await drop("renja_dokumen_version", "status");
    await drop("rkpd_dokumen_version", "status");
    await drop("rkpd_dokumen", "text_bab2");
  },
};
