"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("prioritas_kepala_daerah", "opd_tujuan", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Nama OPD Tujuan",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("prioritas_kepala_daerah", "opd_tujuan");
  },
};
