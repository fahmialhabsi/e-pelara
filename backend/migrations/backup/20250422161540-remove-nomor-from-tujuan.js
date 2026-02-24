"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus kolom nomor dari tabel tujuan
    await queryInterface.removeColumn("tujuan", "nomor");
  },

  async down(queryInterface, Sequelize) {
    // Untuk rollback, kita bisa menambahkan kolom nomor kembali
    await queryInterface.addColumn("tujuan", "nomor", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
