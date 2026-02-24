"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("sub_kegiatan", "realisasi_awal");
    await queryInterface.removeColumn("sub_kegiatan", "realisasi_akhir");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("sub_kegiatan", "realisasi_awal", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("sub_kegiatan", "realisasi_akhir", {
      type: Sequelize.DECIMAL(20, 2),
      allowNull: true,
    });
  },
};
