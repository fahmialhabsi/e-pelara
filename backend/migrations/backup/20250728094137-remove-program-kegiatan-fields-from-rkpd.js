"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.removeColumn("rkpd", "program"),
      queryInterface.removeColumn("rkpd", "kegiatan"),
      queryInterface.removeColumn("rkpd", "sub_kegiatan"),
      queryInterface.removeColumn("rkpd", "indikator"),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await Promise.all([
      queryInterface.addColumn("rkpd", "program", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("rkpd", "kegiatan", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("rkpd", "sub_kegiatan", {
        type: Sequelize.STRING,
        allowNull: false,
      }),
      queryInterface.addColumn("rkpd", "indikator", {
        type: Sequelize.STRING,
        allowNull: true,
      }),
    ]);
  },
};
