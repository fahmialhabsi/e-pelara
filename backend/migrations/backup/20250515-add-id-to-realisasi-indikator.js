"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cek apakah kolom 'id' sudah ada
    const tableDesc = await queryInterface.describeTable("realisasi_indikator");
    if (!tableDesc.id) {
      await queryInterface.addColumn(
        "realisasi_indikator",
        "id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        { before: "indikator_id" }
      );
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable("realisasi_indikator");
    if (tableDesc.id) {
      await queryInterface.removeColumn("realisasi_indikator", "id");
    }
  },
};
