"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Perintah untuk menghapus kolom 'no_strategi' dari tabel 'renstra_strategi'.
     */
    await queryInterface.removeColumn("renstra_strategi", "no_strategi");
  },

  async down(queryInterface, Sequelize) {
    /**
     * Perintah untuk mengembalikan kolom 'no_strategi' jika migrasi dibatalkan.
     */
    await queryInterface.addColumn("renstra_strategi", "no_strategi", {
      type: Sequelize.STRING,
      allowNull: true, // Sesuaikan dengan definisi kolom sebelumnya
    });
  },
};
