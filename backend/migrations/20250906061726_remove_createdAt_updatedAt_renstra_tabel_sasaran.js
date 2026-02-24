"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus kolom createdAt dan updatedAt
    await queryInterface.removeColumn("renstra_tabel_sasaran", "createdAt");
    await queryInterface.removeColumn("renstra_tabel_sasaran", "updatedAt");
  },

  async down(queryInterface, Sequelize) {
    // Mengembalikan kolom jika rollback diperlukan
    await queryInterface.addColumn("renstra_tabel_sasaran", "createdAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    await queryInterface.addColumn("renstra_tabel_sasaran", "updatedAt", {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal(
        "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      ),
    });
  },
};
