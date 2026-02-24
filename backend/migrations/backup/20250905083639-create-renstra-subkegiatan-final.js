// backend/migrations/20250905083639-create-renstra-subkegiatan-final.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("renstra_subkegiatan", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      kode_sub_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      nama_sub_kegiatan: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sub_bidang_opd: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_opd: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      nama_bidang_opd: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      renstra_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sub_kegiatan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
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
    await queryInterface.dropTable("renstra_subkegiatan");
  },
};
