"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "tujuan", // nama tabel
      "no_tujuan", // nama kolom baru
      {
        type: Sequelize.STRING, // ganti ke INTEGER jika memang bilangan
        allowNull: false, // atau false jika wajib diisi
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("tujuan", "no_tujuan");
  },
};
