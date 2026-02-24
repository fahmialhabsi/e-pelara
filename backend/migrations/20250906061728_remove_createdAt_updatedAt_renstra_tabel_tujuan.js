"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus kolom createdAt dan updatedAt
    await queryInterface.removeColumn("renstra_tabel_tujuan", "createdAt");
    await queryInterface.removeColumn("renstra_tabel_tujuan", "updatedAt");
  },

  async down(queryInterface, Sequelize) {
    // Jika rollback, tambahkan kembali kolom createdAt dan updatedAt
    await queryInterface.addColumn("renstra_tabel_tujuan", "createdAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.addColumn("renstra_tabel_tujuan", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    });
  },
};
