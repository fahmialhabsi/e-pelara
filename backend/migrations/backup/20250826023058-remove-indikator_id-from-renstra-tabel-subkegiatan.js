"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Menghapus kolom indikator_id
    await queryInterface.removeColumn(
      "renstra_tabel_subkegiatan", // nama tabel
      "indikator_id" // nama kolom yang dihapus
    );
  },

  async down(queryInterface, Sequelize) {
    // Jika ingin rollback, tambahkan kembali kolom indikator_id
    await queryInterface.addColumn(
      "renstra_tabel_subkegiatan",
      "indikator_id",
      {
        type: Sequelize.INTEGER,
        allowNull: true, // sesuaikan dengan sebelumnya
        references: {
          model: "indikators", // sesuaikan dengan tabel referensi
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }
    );
  },
};
