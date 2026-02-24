"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_tabel_subkegiatan", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      program_id: { type: Sequelize.INTEGER, allowNull: false },
      kegiatan_id: { type: Sequelize.INTEGER, allowNull: false },
      subkegiatan_id: { type: Sequelize.INTEGER, allowNull: false },
      indikator_manual: { type: Sequelize.STRING(255), allowNull: true },
      baseline: { type: Sequelize.FLOAT, allowNull: true },
      // ... semua kolom lain sesuai model
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("renstra_tabel_subkegiatan");
  },
};
