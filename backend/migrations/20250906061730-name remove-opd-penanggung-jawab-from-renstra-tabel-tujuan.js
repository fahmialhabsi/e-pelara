"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 🔹 Hapus kolom
    await queryInterface.removeColumn(
      "renstra_tabel_tujuan", // nama tabel di DB
      "opd_penanggung_jawab" // nama kolom yang dihapus
    );
  },

  async down(queryInterface, Sequelize) {
    // 🔹 Tambah kembali kolom jika rollback
    await queryInterface.addColumn(
      "renstra_tabel_tujuan",
      "opd_penanggung_jawab",
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },
};
