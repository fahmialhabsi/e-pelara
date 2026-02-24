"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "renstra_tabel_subkegiatan",
      "renstra_opd_id",
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "renstra_tabel_subkegiatan",
      "renstra_opd_id"
    );
  },
};
