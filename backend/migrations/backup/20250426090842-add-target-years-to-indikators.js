"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn("indikator", "target_tahun_1", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("indikator", "target_tahun_2", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("indikator", "target_tahun_3", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("indikator", "target_tahun_4", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn("indikator", "target_tahun_5", {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn("indikator", "target_tahun_1"),
      queryInterface.removeColumn("indikator", "target_tahun_2"),
      queryInterface.removeColumn("indikator", "target_tahun_3"),
      queryInterface.removeColumn("indikator", "target_tahun_4"),
      queryInterface.removeColumn("indikator", "target_tahun_5"),
    ]);
  },
};
