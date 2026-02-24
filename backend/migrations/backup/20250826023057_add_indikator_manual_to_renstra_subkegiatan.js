"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "renstra_tabel_subkegiatan",
      "indikator_manual",
      {
        type: Sequelize.STRING,
        allowNull: true,
        after: "indikator_id", // posisi kolom baru
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "renstra_tabel_subkegiatan",
      "indikator_manual"
    );
  },
};
