"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("renstra_bab", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bab: {
        type: Sequelize.STRING(8),
        allowNull: false,
      },
      judul_bab: {
        type: Sequelize.STRING(100),
      },
      subbab: {
        type: Sequelize.STRING(64), // contoh: latar_belakang, landasan_hukum, dst
      },
      isi: {
        type: Sequelize.JSON, // pakai .JSON (atau .TEXT jika ingin text panjang saja)
      },
      updated_by: {
        type: Sequelize.STRING(64),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("renstra_bab");
  },
};
