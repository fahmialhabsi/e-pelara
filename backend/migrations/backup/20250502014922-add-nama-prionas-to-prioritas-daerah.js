"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "prioritas_daerah", // nama tabel
      "nama_prioda", // nama kolom baru
      {
        type: Sequelize.STRING, // tipe data
        allowNull: true, // sesuaikan apakah boleh null
        comment: "Nama lengkap prioritas daerah",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("prioritas_daerah", "nama_prioda");
  },
};
