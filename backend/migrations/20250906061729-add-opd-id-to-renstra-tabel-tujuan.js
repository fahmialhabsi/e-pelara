"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("renstra_tabel_tujuan", "opd_id", {
      type: Sequelize.INTEGER,
      allowNull: true, // bisa diisi nanti, tidak wajib langsung ada nilainya
      references: {
        model: "renstra_opd", // nama tabel relasi
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL", // kalau OPD dihapus, kolom ini jadi NULL
      after: "tujuan_id", // posisikan setelah tujuan_id (opsional)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("renstra_tabel_tujuan", "opd_id");
  },
};
