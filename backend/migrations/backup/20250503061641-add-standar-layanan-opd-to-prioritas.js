"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "prioritas_kepala_daerah",
      "standar_layanan_opd",
      {
        type: Sequelize.STRING, // atau TEXT jika panjang
        allowNull: true,
      }
    );
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "prioritas_kepala_daerah",
      "standar_layanan_opd"
    );
  },
};
