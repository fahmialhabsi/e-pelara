"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "prioritas_nasional", // nama tabel
      "nama_prionas", // nama kolom baru
      {
        type: Sequelize.STRING, // tipe data
        allowNull: true, // sesuaikan apakah boleh null
        comment: "Nama lengkap prioritas nasional",
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("prioritas_nasional", "nama_prionas");
  },
};
