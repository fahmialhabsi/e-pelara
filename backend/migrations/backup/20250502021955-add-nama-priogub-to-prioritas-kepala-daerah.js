"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("prioritas_kepala_daerah", "nama_priogub", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Nama Prioritas Gubernur",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "prioritas_kepala_daerah",
      "nama_priogub"
    );
  },
};
