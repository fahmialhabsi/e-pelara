"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("prioritas_kepala_daerah", "nama_priogub", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Nama lengkap prioritas gubernur",
    });

    await queryInterface.addColumn("prioritas_kepala_daerah", "opd_tujuan", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Nama OPD Tujuan",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      "prioritas_kepala_daerah",
      "nama_priogub"
    );
    await queryInterface.removeColumn("prioritas_kepala_daerah", "opd_tujuan");
  },
};
