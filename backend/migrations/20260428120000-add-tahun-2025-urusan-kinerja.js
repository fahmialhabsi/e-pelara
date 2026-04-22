"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("urusan_kinerja_2021_2024", "tahun_2025", {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("urusan_kinerja_2021_2024", "tahun_2025");
  },
};
