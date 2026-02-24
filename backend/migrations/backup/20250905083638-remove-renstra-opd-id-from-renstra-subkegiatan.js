"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Pastikan kolomnya benar-benar hilang
    await queryInterface.removeColumn("renstra_subkegiatan", "renstra_opd_id");
  },

  async down(queryInterface, Sequelize) {
    // Kalau rollback, tambahkan lagi
    await queryInterface.addColumn("renstra_subkegiatan", "renstra_opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
};
